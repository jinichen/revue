/**
 * Reconciliation form component for selecting options
 */

import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { BillingConfig } from '@/types';
import { getOrganizations } from '@/lib/services';
import { exportReconciliation } from '@/services/reconciliationService';
import useAppStore from '@/hooks/useAppStore';

interface ReconciliationFormProps {
  initialConfig?: BillingConfig;
  onConfigChange?: (config: BillingConfig) => void;
}

export default function ReconciliationForm({ initialConfig, onConfigChange }: ReconciliationFormProps) {
  const { organizations, setOrganizations } = useAppStore();
  
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
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
      periodEnd: getYesterdayDateString(), // 保持和开始日期一致，只使用一天
      twoFactorPrice: 1.4,  // 默认二要素认证单价：1.4分/次
      threeFactorPrice: 3.5, // 默认三要素认证单价：3.5分/次
    }
  );
  
  // 设置当前组织的名称
  const [selectedOrgName, setSelectedOrgName] = useState<string>('');
  
  // 获取对账单
  const fetchReconciliation = async () => {
    if (!formState.orgId) {
      setError('请选择客户');
      return;
    }

    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    setFileName(null);

    console.log('导出对账单, 配置:', {
      orgId: formState.orgId,
      selectedOrgName,
      periodStart: formState.periodStart,
      periodEnd: formState.periodEnd
    });

    try {
      // 确保orgId有效
      if (!formState.orgId || formState.orgId.trim() === '') {
        throw new Error('请选择有效的客户');
      }
      
      // 检查是否是测试环境，如果是测试环境则显示模拟数据
      if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
        // 模拟成功响应
        setDownloadUrl('#');
        setFileName(`模拟对账单_${selectedOrgName || formState.orgId}_${formState.periodStart}.md`);
        console.log('使用模拟数据，跳过API调用');
        setLoading(false);
        return;
      }
      
      const result = await exportReconciliation({ ...formState, format: 'markdown' });
      console.log('导出对账单结果:', result);
      
      // 检查result是否有效
      if (!result) {
        throw new Error('服务器返回空结果');
      }
      
      if (!result.url || !result.fileName) {
        throw new Error('服务器返回的数据格式不正确');
      }
      
      setDownloadUrl(result.url);
      setFileName(result.fileName.replace('.xlsx', '.md'));
      
      // 自动下载文件
      const downloadLink = document.createElement('a');
      downloadLink.href = result.url;
      downloadLink.download = result.fileName.replace('.xlsx', '.md');
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
    } catch (err) {
      console.error('获取对账单失败:', err);
      if (err instanceof Error) {
        // 提供更具体的错误信息
        if (err.message.includes('Organization ID')) {
          setError('请选择客户（组织ID不能为空）');
        } else if (err.message.includes('Table') && err.message.includes('doesn\'t exist')) {
          setError('数据库表配置错误，请联系系统管理员');
        } else {
          setError(`获取对账单失败: ${err.message}`);
        }
      } else {
        setError('获取对账单失败，请检查客户和日期选择');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Load organizations data
  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoadingOrgs(true);
      
      try {
        const orgs = await getOrganizations();
        setOrganizations(orgs);
      } catch (error) {
        console.error('Failed to load organizations:', error);
      } finally {
        setLoadingOrgs(false);
      }
    };
    
    if (organizations.length === 0) {
      fetchOrganizations();
    } else {
      setLoadingOrgs(false);
    }
  }, [organizations.length, setOrganizations]);
  
  // Update parent component when form state changes
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(formState);
    }
  }, [formState, onConfigChange]);
  
  // 当客户或日期变化时自动获取对账单
  useEffect(() => {
    // 确保有客户和日期选择后再自动调用
    if (formState.orgId && formState.periodStart) {
      fetchReconciliation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.orgId, formState.periodStart]);
  
  // Handle form input changes
  const handleChange = (field: keyof BillingConfig, value: any) => {
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
  };
  
  return (
    <div className="bg-card rounded-lg border p-2 shadow-sm text-sm">
      <h3 className="text-base font-medium mb-2">对账单选项</h3>
      
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">
          {error}
        </div>
      )}
      
      {downloadUrl && fileName && (
        <div className="mb-2 p-2 bg-green-50 border border-green-200 text-green-700 rounded-md text-xs">
          对账单已生成: <a href={downloadUrl} download={fileName} className="underline">点击此处下载</a>
        </div>
      )}
      
      <form className="space-y-2">
        {/* 客户选择 */}
        <div className="space-y-1">
          <label className="text-xs font-medium">客户</label>
          <select
            className="w-full p-1 border rounded-md bg-background text-sm"
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
        
        {/* 日期选择（单日） */}
        <div className="space-y-1">
          <label className="text-xs font-medium">对账日期</label>
          <input
            type="date"
            className="w-full p-1 border rounded-md bg-background text-sm"
            value={formState.periodStart}
            onChange={(e) => handleChange('periodStart', e.target.value)}
            disabled={loading}
          />
        </div>
        
        {/* 加载状态 */}
        {loading && (
          <div className="pt-2 flex items-center justify-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在获取对账单...
          </div>
        )}
      </form>
    </div>
  );
} 