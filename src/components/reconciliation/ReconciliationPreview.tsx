/**
 * Reconciliation preview component for displaying detailed service logs
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getReconciliation } from '@/services/billingService';
import { BillingConfig } from '@/types';
import { FileText, FileJson, Download, Copy } from 'lucide-react';

// 获取每页显示的记录数，默认为20
const DEFAULT_PAGE_SIZE = typeof window !== 'undefined' 
  ? parseInt(process.env.NEXT_PUBLIC_RECONCILIATION_PAGE_SIZE || '20', 10) 
  : 20;

// 对账单数据来源方式: 'generate'=即时生成, 'file'=使用预生成文件
const RECONCILIATION_SOURCE_TYPE = typeof window !== 'undefined'
  ? process.env.NEXT_PUBLIC_RECONCILIATION_SOURCE_TYPE || 'generate'
  : 'generate';

interface ReconciliationPreviewProps {
  billingConfig: BillingConfig;
  isLoading?: boolean;
}

const ReconciliationPreview: React.FC<ReconciliationPreviewProps> = ({ billingConfig, isLoading }) => {
  const [loading, setLoading] = useState(isLoading || false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [displayFormat, setDisplayFormat] = useState<'table' | 'markdown'>('table');
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [hideError, setHideError] = useState(false);

  // 检查是否应该隐藏错误消息
  useEffect(() => {
    // 检查本地存储中是否有下载链接，如果有则隐藏错误消息
    const hasDownloadUrl = localStorage.getItem('reconciliation_download_url');
    if (hasDownloadUrl) {
      setHideError(true);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      console.log("Fetching data with config:", JSON.stringify(billingConfig));
      
      try {
        // 首先验证是否有有效的配置参数
        if (!billingConfig.orgId || billingConfig.orgId.trim() === '') {
          // 如果没有组织ID，则不执行数据获取操作
          console.log("No orgId provided, skipping data fetch");
          setData(null);
          setMarkdownContent('');
          setLoading(false);
          return;
        }
        
        if (billingConfig.orgId && billingConfig.periodStart && billingConfig.periodEnd) {
          console.log("Config is valid, proceeding with data fetch");
          if (RECONCILIATION_SOURCE_TYPE === 'file') {
            // 从预生成文件获取数据
            console.log("Fetching from file");
            await fetchMarkdownFromFile();
          } else {
            // 从API获取数据并即时生成
            console.log("Fetching from API");
            try {
            const result = await getReconciliation(billingConfig, currentPage, pageSize);
              console.log("API result:", result);
              
              if (result && result.items) {
            setData(result);
            if (displayFormat === 'markdown') {
              setMarkdownContent(generateMarkdown(result));
                }
              } else {
                console.log("API returned empty or invalid result:", result);
                setError('获取对账单数据失败: 服务器返回了无效的数据');
              }
            } catch (apiError) {
              console.error("API fetch error:", apiError);
              throw apiError;
            }
          }
        }
      } catch (err) {
        console.error('获取对账单数据失败:', err);
        if (err instanceof Error) {
          if (err.message.includes('Organization ID')) {
            setError('请选择客户（组织ID不能为空）');
          } else {
            setError(`获取对账单数据失败: ${err.message}`);
          }
        } else {
          setError('获取对账单数据失败');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingConfig, currentPage, pageSize]);

  // 从预生成文件获取Markdown内容
  const fetchMarkdownFromFile = async () => {
    try {
      // 确保有有效的组织ID
      if (!billingConfig.orgId || billingConfig.orgId.trim() === '') {
        throw new Error('组织ID不能为空');
      }
      
      const formattedDate = formatDate(billingConfig.periodStart);
      const fileName = `${billingConfig.orgId}_${formattedDate}_对账单.md`;
      const filePath = `/api/reconciliation/file?fileName=${fileName}`;
      
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`无法获取对账单文件: ${response.statusText}`);
      }
      
      const content = await response.text();
      setMarkdownContent(content);
      
      // 从Markdown内容解析简单的表格数据用于表格视图
      parseMarkdownToTableData(content);
    } catch (error) {
      console.error('获取预生成对账单文件失败:', error);
      setError('无法获取预生成的对账单文件');
    }
  };
  
  // 从Markdown内容解析表格数据
  const parseMarkdownToTableData = (markdown: string) => {
    try {
      // 简单的Markdown表格解析逻辑
      const lines = markdown.split('\n');
      let tableStart = -1;
      let tableEnd = -1;
      
      // 定位表格
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('| 客户名 | 模式 |')) {
          tableStart = i + 2; // 跳过表头和分隔行
        } else if (tableStart > -1 && lines[i].trim() === '' && tableEnd === -1) {
          tableEnd = i;
          break;
        }
      }
      
      if (tableStart > -1 && tableEnd > tableStart) {
        const tableRows = lines.slice(tableStart, tableEnd);
        const items = tableRows.map(row => {
          const cells = row.split('|').filter(cell => cell.trim() !== '');
          if (cells.length >= 6) {
            return {
              org_name: cells[0].trim(),
              auth_mode: cells[1].trim(),
              exec_start_time: cells[2].trim(),
              result_code: cells[3].trim(),
              result_msg: cells[4].trim(),
              count: parseInt(cells[5].trim()) || 0
            };
          }
          return null;
        }).filter(Boolean);
        
        // 获取标题和总计信息
        let orgName = '';
        let totalCount = 0;
        
        // 解析标题
        const titleLine = lines.find(line => line.startsWith('# '));
        if (titleLine) {
          const titleParts = titleLine.substring(2).split(' ');
          if (titleParts.length > 0) {
            orgName = titleParts[0];
          }
        }
        
        // 解析总计
        const totalLine = lines.find(line => line.includes('总计:'));
        if (totalLine) {
          const countMatch = totalLine.match(/总计: (\d+) 次认证/);
          if (countMatch && countMatch[1]) {
            totalCount = parseInt(countMatch[1]);
          }
        }
        
        setData({
          orgName,
          totalCount,
          currentPage: 1,
          totalPages: 1,
          items
        });
      } else {
        throw new Error('无法解析Markdown表格数据');
      }
    } catch (error) {
      console.error('解析Markdown内容失败:', error);
      setError('无法解析对账单内容');
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 格式化日期为 "XX年XX月XX日" 格式
  const formatChineseDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}年${month}月${day}日`;
    } catch (e) {
      return dateString;
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch (e) {
      return dateString;
    }
  };

  // 格式化认证模式显示
  const formatAuthMode = (mode: string) => {
    switch(mode) {
      case '0x40': return '二要素';
      case '0x42': return '三要素';
      default: return mode;
    }
  };

  // 切换显示格式
  const toggleFormat = () => {
    const newFormat = displayFormat === 'table' ? 'markdown' : 'table';
    setDisplayFormat(newFormat);
    
    // 如果切换到Markdown格式且使用即时生成方式，需要生成Markdown内容
    if (newFormat === 'markdown' && RECONCILIATION_SOURCE_TYPE === 'generate' && data) {
      setMarkdownContent(generateMarkdown(data));
    }
  };

  // 生成Markdown格式的对账单数据
  const generateMarkdown = (data: any) => {
    if (!data || !data.items || data.items.length === 0) {
      return '无对账单数据';
    }

    const headerRow = '| 客户名 | 模式 | 日期 | 返回码 | 返回信息 | 是否有效 | 统计 |\n';
    const separatorRow = '| ------ | ------ | ------ | ------ | ------ | ------ | ------: |\n';
    
    const dataRows = data.items.map((item: any) => {
      // 有效认证返回码列表
      const validResultCodes = ['0', '200004', '210001', '210002', '210004', '210005', '210006', '210009'];
      const isValid = validResultCodes.includes(item.result_code) ? '是' : '否';
      return `| ${item.org_name || '-'} | ${item.auth_mode} | ${formatDate(item.exec_start_time)} | ${item.result_code} | ${item.result_msg} | ${isValid} | ${item.count} |`;
    }).join('\n');
    
    const title = `# ${data.orgName || billingConfig.orgId} ${formatChineseDate(billingConfig.periodStart)}对账单\n\n`;
    const total = `\n\n总计: ${data.totalCount} 次认证`;
    
    const pagination = data.totalPages > 1 
      ? `\n\n第 ${data.currentPage} 页，共 ${data.totalPages} 页，显示 ${data.items.length} 条，共 ${data.totalCount} 条`
      : '';
    
    return title + headerRow + separatorRow + dataRows + total + pagination;
  };

  // 复制Markdown内容到剪贴板
  const copyMarkdownToClipboard = () => {
    const markdown = RECONCILIATION_SOURCE_TYPE === 'file' ? markdownContent : generateMarkdown(data);
    navigator.clipboard.writeText(markdown)
      .then(() => {
        alert('Markdown已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
      });
  };
  
  // 下载Markdown文件到本地
  const downloadMarkdownFile = () => {
    const markdown = RECONCILIATION_SOURCE_TYPE === 'file' ? markdownContent : generateMarkdown(data);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const fileName = `${data?.orgName || billingConfig.orgId}_${formatDate(billingConfig.periodStart)}_对账单.md`;
    
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
      <div className="bg-card rounded-lg border shadow-sm p-6 min-h-[400px] flex items-center justify-center dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-6 w-6 border-2 border-gray-500 rounded-full border-t-transparent mb-1 dark:border-gray-400 dark:border-t-transparent"></div>
          <p className="text-gray-500 text-sm dark:text-gray-400">加载对账单数据...</p>
        </div>
      </div>
    );
  }

  if (error && !hideError) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-6 text-center text-red-500 dark:border-gray-700 dark:bg-gray-800 dark:text-red-400">
        <div className="my-4">{error}</div>
      </div>
    );
  }

  if ((!data || !data.items || data.items.length === 0) && !markdownContent) {
    // 返回空白区域，不显示任何内容
    return null;
  }

  return (
    <div className="space-y-4">
    <div className="bg-card rounded-lg border shadow-sm p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex justify-between items-center mb-4">
        <div className="font-medium">
          {data?.orgName || billingConfig.orgId} {formatChineseDate(billingConfig.periodStart)}对账单
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleFormat}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
            title={displayFormat === 'table' ? '切换到Markdown格式' : '切换到表格格式'}
          >
            {displayFormat === 'table' ? (
              <>
                <FileText size={16} />
                <span>MD格式</span>
              </>
            ) : (
              <>
                <FileJson size={16} />
                <span>表格格式</span>
              </>
            )}
          </button>
          {displayFormat === 'markdown' && (
            <>
              <button
                onClick={copyMarkdownToClipboard}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
                title="复制Markdown"
              >
                <Copy size={16} />
                <span>复制</span>
              </button>
              <button
                onClick={downloadMarkdownFile}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
                title="下载Markdown文件"
              >
                <Download size={16} />
                <span>下载</span>
              </button>
            </>
          )}
        </div>
      </div>
      <div className="text-sm mb-4 text-gray-500 dark:text-gray-400">
        账单周期: {formatDate(billingConfig.periodStart)} - {formatDate(billingConfig.periodEnd)}
        {RECONCILIATION_SOURCE_TYPE === 'file' && (
          <span className="ml-2 text-blue-500 dark:text-blue-400">(使用预生成文件)</span>
        )}
      </div>

      {displayFormat === 'table' && data?.items ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-2 px-3 text-left font-medium dark:text-gray-200">客户名</th>
                <th className="py-2 px-3 text-left font-medium dark:text-gray-200">模式</th>
                <th className="py-2 px-3 text-left font-medium dark:text-gray-200">日期</th>
                <th className="py-2 px-3 text-left font-medium dark:text-gray-200">返回码</th>
                <th className="py-2 px-3 text-left font-medium dark:text-gray-200">返回信息</th>
                <th className="py-2 px-3 text-left font-medium dark:text-gray-200">是否有效</th>
                <th className="py-2 px-3 text-right font-medium dark:text-gray-200">统计</th>
              </tr>
            </thead>
            <tbody>
                {data.items.map((item: any, index: number) => {
                  // 有效认证返回码列表
                  const validResultCodes = ['0', '200004', '210001', '210002', '210004', '210005', '210006', '210009'];
                  const isValid = validResultCodes.includes(item.result_code);
                  
                  return (
                <tr key={index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-2 px-3 dark:text-gray-100">{item.org_name || '-'}</td>
                  <td className="py-2 px-3 dark:text-gray-100">{item.auth_mode}</td>
                  <td className="py-2 px-3 dark:text-gray-100">{formatDate(item.exec_start_time)}</td>
                  <td className="py-2 px-3 dark:text-gray-100">{item.result_code}</td>
                  <td className="py-2 px-3 dark:text-gray-100">{item.result_msg}</td>
                  <td className="py-2 px-3 dark:text-gray-100">{isValid ? '是' : '否'}</td>
                  <td className="py-2 px-3 text-right dark:text-gray-100">{item.count}</td>
                </tr>
                );})}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md overflow-auto">
          <pre className="text-sm whitespace-pre-wrap font-mono dark:text-gray-100">
            {RECONCILIATION_SOURCE_TYPE === 'file' ? markdownContent : generateMarkdown(data)}
          </pre>
        </div>
      )}

      {/* 分页控件 - 仅在使用API生成方式且有多页数据时显示 */}
      {RECONCILIATION_SOURCE_TYPE === 'generate' && data?.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500 dark:text-gray-300">
            显示 {data.items.length} 条，共 {data.totalCount} 条
            (第 {data.currentPage} 页，共 {data.totalPages} 页)
          </div>
          <div className="flex space-x-2">
            <button
              className={`px-3 py-1 text-sm rounded border ${
                currentPage <= 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' 
                  : 'bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200'
              }`}
              onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              上一页
            </button>
            
            {(() => {
              const pageButtons = [];
              const startPage = Math.max(1, data.currentPage - 2);
              const endPage = Math.min(data.totalPages, startPage + 4);
              
              for (let page = startPage; page <= endPage; page++) {
                pageButtons.push(
                  <button
                    key={page}
                    className={`px-3 py-1 text-sm rounded border ${
                      page === data.currentPage 
                        ? 'bg-blue-500 text-white dark:bg-blue-600' 
                        : 'bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200'
                    }`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                );
              }
              
              return pageButtons;
            })()}
            
            <button
              className={`px-3 py-1 text-sm rounded border ${
                currentPage >= data.totalPages 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' 
                  : 'bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200'
              }`}
              onClick={() => currentPage < data.totalPages && handlePageChange(currentPage + 1)}
              disabled={currentPage >= data.totalPages}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-300">
        总计: {data?.totalCount || 0} 次认证
        </div>
      </div>
    </div>
  );
};

export default ReconciliationPreview; 