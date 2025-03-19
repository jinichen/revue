/**
 * Reconciliation form component for selecting options
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BillingConfig } from '@/types';
import { getOrganizations } from '@/lib/services';
import { exportReconciliation, getReconciliation, ReconciliationData, ReconciliationResponse, ExportResponse } from '@/services/reconciliationService';
import useAppStore from '@/hooks/useAppStore';

interface ReconciliationFormProps {
  initialConfig?: BillingConfig;
  onConfigChange?: (config: BillingConfig) => void;
}

// 扩展BillingConfig类型以支持导出格式
interface ExportConfig extends BillingConfig {
  format?: 'markdown' | 'excel';
}

export default function ReconciliationForm({ initialConfig, onConfigChange }: ReconciliationFormProps) {
  const { organizations, setOrganizations } = useAppStore();
  
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);
  
  // 使用 ref 来存储上次请求的配置
  const lastFetchConfigRef = useRef<string>('');
  
  // 获取昨天的日期作为默认值
  const getYesterdayDateString = () => {
    const yesterday = subDays(new Date(), 1);
    return format(yesterday, 'yyyy-MM-dd');
  };
  
  // Form state
  const [formState, setFormState] = useState<BillingConfig>(
    initialConfig || {
      orgId: '',
      periodStart: getYesterdayDateString(),
      periodEnd: getYesterdayDateString(),
      twoFactorPrice: 1.4,
      threeFactorPrice: 3.5,
    }
  );
  
  // 设置当前组织的名称
  const [selectedOrgName, setSelectedOrgName] = useState<string>('');
  
  // 获取对账单数据
  const fetchReconciliationData = useCallback(async () => {
    if (!formState.orgId) {
      setError('请选择客户');
      return;
    }

    // 检查是否与上次请求相同
    const currentConfig = JSON.stringify({ orgId: formState.orgId, periodStart: formState.periodStart });
    if (currentConfig === lastFetchConfigRef.current) {
      return;
    }
    lastFetchConfigRef.current = currentConfig;

    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    setFileName(null);
    setReconciliationData(null);

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const response = await getReconciliation(formState);
        console.log('获取到对账单数据:', response);
        
        if (!response.success) {
          setError(response.message || '获取对账单数据失败');
          break;
        }
        
        if (response.data) {
          setReconciliationData(response.data);
          
          // 如果有数据，自动触发导出
          if (response.data.items && response.data.items.length > 0) {
            try {
              const exportConfig: ExportConfig = { ...formState, format: 'markdown' };
              const exportResult = await exportReconciliation(exportConfig);
              
              if (exportResult.success && exportResult.data) {
                setDownloadUrl(exportResult.data.url);
                setFileName(exportResult.data.fileName);
                
                // 将下载链接存储到localStorage中
                localStorage.setItem('reconciliation_download_url', exportResult.data.url);
                
                // 获取Markdown内容以供预览
                fetchMarkdownContent(exportResult.data.url);
              } else {
                setError(exportResult.message || '导出对账单失败');
              }
            } catch (exportErr) {
              console.error('导出失败:', exportErr);
              setError('对账单导出失败，请重试');
            }
          } else {
            // 显示没有数据的提示信息
            setError(`未找到${selectedOrgName}在${formState.periodStart}的对账单数据`);
          }
        } else {
          setError('返回的数据格式不正确');
        }
        break;
        
      } catch (err) {
        console.error(`获取对账单失败 (尝试 ${retryCount + 1}/${maxRetries}):`, err);
        
        if (retryCount === maxRetries - 1) {
          if (err instanceof Error) {
            if (err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT')) {
              setError('网络连接不稳定，请检查网络后重试');
            } else {
              setError(err.message);
            }
          } else {
            setError('获取对账单失败，请稍后重试');
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          retryCount++;
          continue;
        }
      }
    }

    setLoading(false);
  }, [formState, selectedOrgName]);
  
  // 获取Markdown内容
  const fetchMarkdownContent = async (url: string) => {
    setLoadingMarkdown(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('获取Markdown内容失败');
      }
      const content = await response.text();
      setMarkdownContent(content);
    } catch (err) {
      console.error('获取Markdown内容失败:', err);
      setError(err instanceof Error ? err.message : '获取Markdown内容失败');
    } finally {
      setLoadingMarkdown(false);
    }
  };
  
  // Load organizations data
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (organizations.length > 0) {
        setLoadingOrgs(false);
        return;
      }

      setLoadingOrgs(true);
      setError(null);
      
      try {
        const orgs = await getOrganizations();
        setOrganizations(orgs);
      } catch (error) {
        console.error('获取组织列表失败:', error);
        setError(error instanceof Error ? error.message : '获取组织列表失败');
      } finally {
        setLoadingOrgs(false);
      }
    };
    
    fetchOrganizations();
  }, [organizations.length, setOrganizations]);
  
  // Update parent component when form state changes
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(formState);
    }
  }, [formState, onConfigChange]);
  
  // 当客户或日期变化时获取对账单数据
  useEffect(() => {
    if (formState.orgId && formState.periodStart) {
      const currentConfig = JSON.stringify({ orgId: formState.orgId, periodStart: formState.periodStart });
      if (currentConfig !== lastFetchConfigRef.current) {
        fetchReconciliationData();
      }
    }
  }, [formState.orgId, formState.periodStart, fetchReconciliationData]);
  
  // Handle form input changes
  const handleChange = useCallback((field: keyof BillingConfig, value: any) => {
    // 如果修改的是开始日期，同时也更新结束日期，保持为同一天
    if (field === 'periodStart') {
      const newState = { 
        ...formState, 
        periodStart: value,
        periodEnd: value 
      };
      setFormState(newState);
    } else {
      const newState = { ...formState, [field]: value };
      setFormState(newState);
    }
    
    // Update selected org name
    if (field === 'orgId') {
      const org = organizations.find(org => org.org_id === value);
      setSelectedOrgName(org?.org_name || '');
    }
  }, [formState, organizations]);
  
  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row gap-6">
        {/* 左侧选项面板 */}
        <div className="w-full md:w-64">
          <div className="bg-card rounded-lg border p-4 shadow-sm">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {/* 客户选择 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">客户名</label>
                <select
                  className="w-full p-2 border rounded-md bg-background text-sm"
                  value={formState.orgId}
                  onChange={(e) => handleChange('orgId', e.target.value)}
                  disabled={loadingOrgs || loading}
                >
                  <option value="">选择客户</option>
                  {organizations.map((org) => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.org_name}
                    </option>
                  ))}
                </select>
                {loadingOrgs && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    加载客户...
                  </div>
                )}
              </div>
              
              {/* 日期选择 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">对账日期</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-md bg-background text-sm"
                  value={formState.periodStart}
                  onChange={(e) => handleChange('periodStart', e.target.value)}
                  disabled={loading}
                />
              </div>
            </form>

            {/* 错误提示 - 仅在没有下载链接时显示 */}
            {error && !downloadUrl && (
              <div className="mt-4 p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">
                {error}
              </div>
            )}
            
            {/* 下载链接 */}
            {downloadUrl && fileName && (
              <div className="mt-4 p-2 bg-green-50 border border-green-200 text-green-700 rounded-md text-xs">
                对账单已生成: <a href={downloadUrl} download={fileName} className="underline">点击此处下载</a>
              </div>
            )}
            
            {/* 数据加载指示器 */}
            {loading && (
              <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                加载对账单数据...
              </div>
            )}
          </div>
        </div>
        
        {/* 右侧预览区域 */}
        <div className="flex-1">
          <div className="bg-card rounded-lg border p-4 shadow-sm">
            <h3 className="text-lg font-medium mb-4">对账单预览</h3>
            
            {loadingMarkdown && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>加载预览内容...</span>
              </div>
            )}
            
            {!markdownContent && !loadingMarkdown && (
              <div className="text-center p-8 text-gray-500">
                {downloadUrl 
                  ? "正在加载预览内容..." 
                  : "生成对账单后将在此处显示预览"}
              </div>
            )}
            
            {markdownContent && (
              <div className="markdown-preview border rounded-md p-4 bg-white overflow-auto max-h-[600px]">
                <div className="markdown-content prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdownContent}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 