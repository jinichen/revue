/**
 * Bill preview component for displaying bill preview
 */

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { FileText, Loader2, Download } from 'lucide-react';
import { BillingConfig } from '@/types';
import { getBillPreview } from '@/services/billingService';

interface BillPreviewProps {
  config: BillingConfig;
}

interface ResultCodeItem {
  mode: string;
  result_code: string;
  result_msg: string;
  count: number;
  valid_count?: number;
}

interface PreviewData {
  orgName: string;
  orgId: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  totalValidCount: number;
  // 区分二要素和三要素
  twoFactorItems: ResultCodeItem[];
  threeFactorItems: ResultCodeItem[];
  // 价格信息
  twoFactorPrice: number;
  threeFactorPrice: number;
  // 统计
  twoFactorTotal: number;
  twoFactorValidTotal: number;
  twoFactorAmount: number;
  threeFactorTotal: number;
  threeFactorValidTotal: number;
  threeFactorAmount: number;
}

export default function BillPreview({ config }: BillPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  
  // Fetch preview data when config changes
  useEffect(() => {
    if (!config.orgId) return;
    
    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      
      console.log('开始请求账单预览数据:', config);
      
      try {
        const response = await getBillPreview(config);
        console.log('账单预览API响应:', response);
        
        if (response.success) {
          console.log('获取到账单预览数据:', response.data);
          setPreviewData(response.data);
        } else {
          console.error('账单预览API返回错误:', response.message);
          setError(response.message);
        }
      } catch (error) {
        console.error('获取账单预览失败:', error);
        setError('获取账单预览失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPreview();
  }, [config]);
  
  // 获取年月显示
  const getYearMonthDisplay = () => {
    if (!config.periodStart) return '';
    
    const date = new Date(config.periodStart);
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount);
  };
  
  // 生成Markdown格式的账单
  const generateMarkdown = () => {
    if (!previewData) return '';
    
    // 标题和基本信息
    let markdown = `# ${previewData.orgName} 账单\n\n`;
    markdown += `**账期**: ${format(new Date(previewData.periodStart), 'yyyy-MM-dd')} 至 ${format(new Date(previewData.periodEnd), 'yyyy-MM-dd')}\n\n`;
    markdown += `**客户名**: ${previewData.orgName}\n\n`;
    
    // 二要素认证表格
    markdown += `## 二要素认证\n\n`;
    markdown += `| 模式 | 返回码 | 返回信息 | 统计 | 有效认证 |\n`;
    markdown += `| ---- | ------ | -------- | ---: | -------: |\n`;
    
    previewData.twoFactorItems.forEach(item => {
      markdown += `| ${item.mode} | ${item.result_code} | ${item.result_msg} | ${item.count.toLocaleString()} | ${item.valid_count?.toLocaleString() || ''} |\n`;
    });
    
    markdown += `\n**二要素有效合计**: ${previewData.twoFactorValidTotal.toLocaleString()} 次\n`;
    markdown += `**单价**: ${previewData.twoFactorPrice.toFixed(3)} 元/次\n`;
    markdown += `**应结算额**: ${previewData.twoFactorAmount.toFixed(3)} 元\n\n`;
    
    // 三要素认证表格
    markdown += `## 三要素认证\n\n`;
    markdown += `| 模式 | 返回码 | 返回信息 | 统计 | 有效认证 |\n`;
    markdown += `| ---- | ------ | -------- | ---: | -------: |\n`;
    
    previewData.threeFactorItems.forEach(item => {
      markdown += `| ${item.mode} | ${item.result_code} | ${item.result_msg} | ${item.count.toLocaleString()} | ${item.valid_count?.toLocaleString() || ''} |\n`;
    });
    
    markdown += `\n**三要素有效合计**: ${previewData.threeFactorValidTotal.toLocaleString()} 次\n`;
    markdown += `**单价**: ${previewData.threeFactorPrice.toFixed(3)} 元/次\n`;
    markdown += `**应结算额**: ${previewData.threeFactorAmount.toFixed(3)} 元\n\n`;
    
    // 总计
    markdown += `## 总计\n\n`;
    markdown += `**总计结算金额**: ${previewData.totalAmount.toFixed(3)} 元\n`;
    markdown += `**总有效认证次数**: ${previewData.totalValidCount.toLocaleString()} 次\n`;
    
    return markdown;
  };
  
  // 下载Markdown文件
  const downloadMarkdownFile = () => {
    if (!previewData) return;
    
    const markdown = generateMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const fileName = `${previewData.orgName}_账单_${format(new Date(previewData.periodStart), 'yyyyMMdd')}_${format(new Date(previewData.periodEnd), 'yyyyMMdd')}.md`;
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // 释放URL对象
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };
  
  if (loading) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-6 min-h-[400px] flex items-center justify-center dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col items-center">
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-1 dark:text-gray-400" />
          <p className="text-muted-foreground text-sm dark:text-gray-400">加载预览...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center py-4">
          <div className="text-red-500 mb-1 text-sm dark:text-red-400">获取预览失败</div>
          <p className="text-muted-foreground text-xs dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }
  
  if (!config.orgId) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-6 min-h-[400px] flex items-center justify-center dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center py-4">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 dark:text-gray-400" />
          <p className="text-muted-foreground text-sm dark:text-gray-400">请选择客户生成账单预览</p>
        </div>
      </div>
    );
  }
  
  if (!previewData) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-3 dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center py-4">
          <div className="text-amber-500 mb-1 text-sm dark:text-amber-400">无账单数据</div>
          <p className="text-muted-foreground text-xs dark:text-gray-400">所选时间段内没有查询到账单数据</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-card rounded-lg border shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="p-2 overflow-auto">
        {/* 账单标题和下载按钮 */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-medium dark:text-gray-200">账单明细</h3>
          <button
            onClick={downloadMarkdownFile}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
            title="下载Markdown格式账单"
          >
            <Download size={16} />
            <span>下载MD</span>
          </button>
        </div>
        
        {/* 账单内容表格 */}
        <table className="w-full border-collapse border text-sm dark:border-gray-700">
          <tbody>
            <tr>
              <td colSpan={4} className="border p-1 text-xs dark:border-gray-700 dark:text-gray-300">
                {previewData.periodStart.substring(0, 10)}-{previewData.periodEnd.substring(0, 10)}
              </td>
              <td className="border p-1 dark:border-gray-700"></td>
              <td className="border p-1 dark:border-gray-700"></td>
            </tr>
            <tr>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">客户名</td>
              <td colSpan={3} className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">{previewData.orgName}</td>
              <td className="border p-1 dark:border-gray-700"></td>
              <td className="border p-1 dark:border-gray-700"></td>
            </tr>
            
            {/* 表头 */}
            <tr className="bg-gray-100 dark:bg-gray-700">
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100"></td>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">模式</td>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">返回码</td>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">返回信息</td>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">统计</td>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">有效认证</td>
            </tr>
            
            {/* 二要素数据 - 先显示成功返回码0的记录，然后是其他返回码 */}
            {previewData.twoFactorItems.map((item, index) => (
              <tr key={`two-${index}`}>
                <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100"></td>
                <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">{item.mode}</td>
                <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">{item.result_code}</td>
                <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">{item.result_msg}</td>
                <td className="border p-1 text-right dark:border-gray-700 dark:text-gray-100">{item.count.toLocaleString()}</td>
                <td className="border p-1 text-right dark:border-gray-700 dark:text-gray-100">{item.valid_count?.toLocaleString() || ''}</td>
              </tr>
            ))}
            
            {/* 二要素合计 */}
            <tr>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">二要素有效合计</td>
              <td colSpan={3} className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100"></td>
              <td className="border p-1 dark:border-gray-700"></td>
              <td className="border p-1 text-right font-bold dark:border-gray-700 dark:text-gray-100">{previewData.twoFactorValidTotal.toLocaleString()}</td>
            </tr>
            
            {/* 二要素单价 */}
            <tr>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">单价</td>
              <td colSpan={3} className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100"></td>
              <td colSpan={2} className="border p-1 text-right dark:border-gray-700 dark:text-gray-100">{previewData.twoFactorPrice.toFixed(3)}</td>
            </tr>
            
            {/* 二要素金额 */}
            <tr>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">应结算额</td>
              <td colSpan={3} className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100"></td>
              <td colSpan={2} className="border p-1 text-right dark:border-gray-700 dark:text-gray-100">{previewData.twoFactorAmount.toFixed(3)}</td>
            </tr>
            
            {/* 三要素数据 - 先显示成功返回码0的记录，然后是其他返回码 */}
            {previewData.threeFactorItems.map((item, index) => (
              <tr key={`three-${index}`}>
                <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100"></td>
                <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">{item.mode}</td>
                <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">{item.result_code}</td>
                <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">{item.result_msg}</td>
                <td className="border p-1 text-right dark:border-gray-700 dark:text-gray-100">{item.count.toLocaleString()}</td>
                <td className="border p-1 text-right dark:border-gray-700 dark:text-gray-100">{item.valid_count?.toLocaleString() || ''}</td>
              </tr>
            ))}
            
            {/* 三要素合计 */}
            <tr>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">三要素有效合计</td>
              <td colSpan={3} className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100"></td>
              <td className="border p-1 dark:border-gray-700"></td>
              <td className="border p-1 text-right font-bold dark:border-gray-700 dark:text-gray-100">{previewData.threeFactorValidTotal.toLocaleString()}</td>
            </tr>
            
            {/* 三要素单价 */}
            <tr>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">单价</td>
              <td colSpan={3} className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100"></td>
              <td colSpan={2} className="border p-1 text-right dark:border-gray-700 dark:text-gray-100">{previewData.threeFactorPrice.toFixed(3)}</td>
            </tr>
            
            {/* 三要素金额 */}
            <tr>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">应结算额</td>
              <td colSpan={3} className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100"></td>
              <td colSpan={2} className="border p-1 text-right dark:border-gray-700 dark:text-gray-100">{previewData.threeFactorAmount.toFixed(3)}</td>
            </tr>
            
            {/* 总计 */}
            <tr>
              <td className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100">总计结算金额</td>
              <td colSpan={3} className="border p-1 text-xs dark:border-gray-700 dark:text-gray-100"></td>
              <td colSpan={2} className="border p-1 text-right font-bold dark:border-gray-700 dark:text-gray-100">{previewData.totalAmount.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
} 