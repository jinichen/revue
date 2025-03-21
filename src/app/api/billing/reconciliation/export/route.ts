/**
 * API route for exporting reconciliation data
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { BillingConfig } from '@/types';
import { formatDateForMySQL } from '@/lib/utils';
import path from 'path';
import fs from 'fs/promises';

// 从环境变量获取导出目录
const EXPORT_DIR = path.join(process.cwd(), 'public', 'exports', 'reconciliation');
const DOWNLOAD_PATH = '/exports/reconciliation/';

// 确保导出目录存在
try {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
} catch (error) {
  console.error('创建导出目录失败:', error);
}

/**
 * 生成对账单文件名
 */
function generateFileName(orgName: string, date: string, format: string = 'markdown'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${orgName}_对账单_${date}_${timestamp}.${format === 'markdown' ? 'md' : 'xlsx'}`;
}

/**
 * 生成 Markdown 格式的对账单
 */
async function generateMarkdownReport(data: any): Promise<string> {
  const { orgName, periodStart, summary, totalCount } = data;
  
  let markdown = `# ${orgName} - 对账单\n\n`;
  markdown += `## 账单日期: ${periodStart}\n\n`;
  
  // 添加总体统计信息
  markdown += `### 总体统计\n\n`;
  markdown += `- 总调用次数: ${totalCount}\n`;
  
  // 按认证方式统计
  markdown += '\n### 认证方式统计\n\n';
  markdown += '| 认证方式 | 总次数 | 成功 | 失败 | 成功率 |\n';
  markdown += '|---------|--------|------|------|--------|\n';
  
  summary.forEach((stats: any) => {
    const successRate = ((stats.success / stats.total) * 100).toFixed(2);
    markdown += `| ${stats.auth_mode} | ${stats.total} | ${stats.success} | ${stats.fail} | ${successRate}% |\n`;
  });
  
  // 详细记录
  markdown += '\n### 详细记录\n\n';
  
  // 按认证方式分组显示详细信息
  for (const stats of summary) {
    markdown += `\n#### ${stats.auth_mode}\n\n`;
    markdown += '| 结果代码 | 结果描述 | 是否有效 | 次数 |\n';
    markdown += '|----------|----------|----------|------|\n';
    
    // 有效认证返回码列表
    const validResultCodes = ['0', '200004', '210001', '210002', '210004', '210005', '210006', '210009'];
    
    stats.details.forEach((detail: any) => {
      const isValid = validResultCodes.includes(detail.result_code) ? '是' : '否';
      markdown += `| ${detail.result_code} | ${detail.result_msg} | ${isValid} | ${detail.count} |\n`;
    });
  }
  
  return markdown;
}

/**
 * POST handler for reconciliation data export
 */
export async function POST(req: NextRequest) {
  try {
    const config = await req.json() as BillingConfig & { format?: 'markdown' | 'excel' };
    
    if (!config.orgId) {
      return NextResponse.json(
        { success: false, message: '请选择客户' },
        { status: 400 }
      );
    }
    
    // 查询组织信息
    const orgs = await query<{ org_id: string; org_name: string }>(`
      SELECT org_id, org_name
      FROM t_org_info
      WHERE org_id = ?
    `, [config.orgId]);
    
    if (orgs.length === 0) {
      return NextResponse.json(
        { success: false, message: '找不到指定的客户' },
        { status: 404 }
      );
    }
    
    const orgName = orgs[0].org_name;
    
    // 格式化日期
    const startDate = formatDateForMySQL(config.periodStart);
    
    // 按认证方式和结果代码分组统计
    const items = await query(`
      SELECT 
        oi.org_name,
        sl.auth_mode,
        sl.result_code,
        sl.result_msg,
        COUNT(*) as count
      FROM 
        t_service_log sl
      JOIN
        t_org_info oi ON sl.org_id = oi.org_id
      WHERE 
        sl.org_id = ?
        AND DATE(sl.exec_start_time) = ?
      GROUP BY 
        oi.org_name,
        sl.auth_mode,
        sl.result_code,
        sl.result_msg
      ORDER BY 
        sl.auth_mode ASC,
        sl.result_code ASC
    `, [config.orgId, startDate]);
    
    // 如果没有数据，返回错误
    if (items.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `未找到${orgName}在${config.periodStart}的对账单数据`
        },
        { status: 404 }
      );
    }
    
    // 按认证方式分组处理数据
    const authModeStats = items.reduce((acc: any, item: any) => {
      const key = item.auth_mode;
      if (!acc[key]) {
        acc[key] = {
          auth_mode: key,
          total: 0,
          success: 0,
          fail: 0,
          details: []
        };
      }
      
      // 有效认证返回码列表
      const validResultCodes = ['0', '200004', '210001', '210002', '210004', '210005', '210006', '210009'];
      
      acc[key].total += item.count;
      // 检查结果码是否为有效认证
      if (validResultCodes.includes(item.result_code)) {
        acc[key].success += item.count;
      } else {
        acc[key].fail += item.count;
      }
      
      acc[key].details.push({
        result_code: item.result_code,
        result_msg: item.result_msg,
        count: item.count
      });
      
      return acc;
    }, {});
    
    // 转换为数组格式
    const summaryData = Object.values(authModeStats);
    
    // 计算总调用次数
    const totalCount = summaryData.reduce((sum: number, item: any) => sum + item.total, 0);
    
    // 准备导出数据
    const exportData = {
      orgName,
      periodStart: config.periodStart,
      periodEnd: config.periodEnd || config.periodStart,
      totalCount,
      summary: summaryData,
      items
    };
    
    // 生成报告
    const format = config.format || 'markdown';
    let content: string;
    
    if (format === 'markdown') {
      content = await generateMarkdownReport(exportData);
    } else {
      throw new Error('暂不支持的导出格式');
    }
    
    // 确保导出目录存在
    await fs.mkdir(EXPORT_DIR, { recursive: true });
    
    // 生成文件名和保存文件
    const fileName = generateFileName(orgName, config.periodStart, format);
    const filePath = path.join(EXPORT_DIR, fileName);
    
    await fs.writeFile(filePath, content, 'utf8');
    
    // 返回文件下载信息
    return NextResponse.json({
      success: true,
      message: '对账单生成成功',
      data: {
        url: `${DOWNLOAD_PATH}${fileName}`,
        fileName
      }
    });
    
  } catch (error) {
    console.error('生成对账单失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '生成对账单失败'
      },
      { status: 500 }
    );
  }
} 