/**
 * 对账单自动生成脚本
 * 
 * 根据配置的时间，生成前一天的对账单，并导出为Excel格式或Markdown格式
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import { format, subDays } from 'date-fns';
import { query } from '../src/lib/db';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 对账单存储目录
const EXPORT_DIR = process.env.RECONCILIATION_EXPORT_DIR || './exports';

// 对账单自动生成时间
const AUTO_GENERATE_TIME = process.env.RECONCILIATION_AUTO_GENERATE_TIME || '01:00';

/**
 * 获取所有客户名
 */
async function getAllCustomers() {
  try {
    const customerQuery = `
      SELECT DISTINCT
        org_name
      FROM 
        t_org_info
      ORDER BY 
        org_name
    `;
    
    return await query<{ org_name: string }>(customerQuery);
  } catch (error) {
    console.error('获取客户列表失败:', error);
    return [];
  }
}

/**
 * 生成对账单数据
 */
async function generateReconciliationData(customerName: string, startDate: string, endDate: string) {
  try {
    console.log(`生成 ${customerName} 从 ${startDate} 到 ${endDate} 的对账单数据`);
    
    // 查询服务日志，按日期、认证模式、返回码分组
    // 确保ORDER BY与GROUP BY中的表达式一致
    const reconciliationQuery = `
      SELECT 
        oi.org_name,
        oi.org_id,
        sl.auth_mode,
        DATE(sl.exec_start_time) as auth_date,
        sl.result_code,
        sl.result_msg,
        COUNT(*) as count
      FROM 
        t_service_log sl
      JOIN
        t_org_info oi ON sl.org_id = oi.org_id
      WHERE 
        oi.org_name = ?
        AND sl.exec_start_time >= ?
        AND sl.exec_start_time <= ?
      GROUP BY 
        oi.org_name, oi.org_id, sl.auth_mode, auth_date, sl.result_code, sl.result_msg
      ORDER BY 
        auth_date DESC, 
        sl.auth_mode ASC,
        CASE WHEN sl.result_code = '0' THEN '0' ELSE '1' || sl.result_code END ASC
    `;
    
    const reconciliationData = await query<{
      org_name: string;
      org_id: string;
      auth_mode: string;
      auth_date: string;
      result_code: string;
      result_msg: string;
      count: number;
    }>(reconciliationQuery, [
      customerName,
      startDate,
      endDate
    ]);
    
    console.log(`获取到 ${customerName} 对账单数据条目数: ${reconciliationData.length}`);
    
    // 格式化返回数据
    const formattedData = reconciliationData.map(item => ({
      org_name: item.org_name,
      org_id: item.org_id,
      auth_mode: item.auth_mode,
      exec_start_time: item.auth_date,
      result_code: item.result_code,
      result_msg: item.result_msg || '',
      count: Number(item.count)
    }));
    
    return {
      customerName,
      periodStart: startDate,
      periodEnd: endDate,
      items: formattedData
    };
  } catch (error) {
    console.error(`对账单数据生成失败 (${customerName}):`, error);
    throw error;
  }
}

/**
 * 格式化认证模式显示
 */
function formatAuthMode(mode: string) {
  switch(mode) {
    case '0x40': return '二要素';
    case '0x42': return '三要素';
    default: return mode;
  }
}

/**
 * 导出对账单为Excel
 */
async function exportToExcel(data: any, filePath: string) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'OpenV Platform';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet(`${data.customerName}对账单`);
    
    // 设置标题和账单信息
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `${data.customerName} 对账单`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    worksheet.mergeCells('A2:G2');
    const periodCell = worksheet.getCell('A2');
    periodCell.value = `账单周期: ${data.periodStart} - ${data.periodEnd}`;
    periodCell.font = { size: 12 };
    periodCell.alignment = { horizontal: 'center' };
    
    // 添加表头
    worksheet.addRow(['客户名', '组织ID', '认证模式', '认证日期', '返回码', '返回码信息', '合计']);
    
    // 设置表头样式
    const headerRow = worksheet.getRow(3);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // 添加数据行
    if (data.items && data.items.length > 0) {
      data.items.forEach((item: { 
        org_name: string;
        org_id: string;
        auth_mode: string;
        exec_start_time: string;
        result_code: string;
        result_msg: string;
        count: number;
      }) => {
        worksheet.addRow([
          item.org_name,
          item.org_id,
          formatAuthMode(item.auth_mode),
          item.exec_start_time,
          item.result_code,
          item.result_msg,
          item.count
        ]);
      });
    } else {
      worksheet.addRow(['无对账数据', '', '', '', '', '', '']);
    }
    
    // 设置列宽
    worksheet.columns = [
      { key: 'customerName', width: 20 },
      { key: 'orgId', width: 15 },
      { key: 'authMode', width: 15 },
      { key: 'authDate', width: 15 },
      { key: 'resultCode', width: 10 },
      { key: 'resultMsg', width: 30 },
      { key: 'count', width: 10 }
    ];
    
    // 添加合计行
    const totalRow = worksheet.addRow(['', '', '', '', '', '总计', 
      data.items.reduce((sum: number, item: { count: number }) => sum + item.count, 0)
    ]);
    totalRow.font = { bold: true };
    
    // 保存文件
    await workbook.xlsx.writeFile(filePath);
    console.log(`已生成Excel对账单: ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('导出Excel失败:', error);
    throw error;
  }
}

/**
 * 导出对账单为Markdown
 */
async function exportToMarkdown(data: any, filePath: string) {
  try {
    // 标题和账单信息
    let markdown = `# ${data.customerName} 对账单\n\n`;
    markdown += `账单周期: ${data.periodStart} - ${data.periodEnd}\n\n`;
    
    // 添加表头
    markdown += '| 客户名 | 组织ID | 认证模式 | 认证日期 | 返回码 | 返回码信息 | 合计 |\n';
    markdown += '| ------ | ------ | ------ | ------ | ------ | ------ | ------: |\n';
    
    // 添加数据行
    if (data.items && data.items.length > 0) {
      data.items.forEach((item: { 
        org_name: string;
        org_id: string;
        auth_mode: string;
        exec_start_time: string;
        result_code: string;
        result_msg: string;
        count: number;
      }) => {
        markdown += `| ${item.org_name} | ${item.org_id} | ${formatAuthMode(item.auth_mode)} | ${item.exec_start_time} | ${item.result_code} | ${item.result_msg} | ${item.count} |\n`;
      });
    } else {
      markdown += '| 无对账数据 | | | | | | |\n';
    }
    
    // 添加合计行
    const totalCount = data.items.reduce((sum: number, item: { count: number }) => sum + item.count, 0);
    markdown += `\n\n**总计**: ${totalCount} 次认证\n`;
    
    // 生成导出时间
    markdown += `\n\n---\n\n*导出时间: ${new Date().toISOString().replace('T', ' ').substr(0, 19)}*`;
    
    // 保存文件
    fs.writeFileSync(filePath, markdown, 'utf8');
    console.log(`已生成Markdown对账单: ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('导出Markdown失败:', error);
    throw error;
  }
}

/**
 * 获取前一天的日期范围
 */
function getPreviousDayRange() {
  const yesterday = subDays(new Date(), 1);
  const startDate = format(yesterday, 'yyyy-MM-dd 00:00:00');
  const endDate = format(yesterday, 'yyyy-MM-dd 23:59:59');
  return { startDate, endDate, dateStr: format(yesterday, 'yyyyMMdd') };
}

/**
 * 确保导出目录存在
 */
function ensureExportDirExists() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    console.log(`创建对账单导出目录: ${EXPORT_DIR}`);
  }
}

/**
 * 将客户名转换为安全的文件名
 */
function safeFileName(customerName: string): string {
  // 移除或替换文件名中不安全的字符
  return customerName.replace(/[\\/:*?"<>|]/g, '_').trim();
}

/**
 * 处理命令行参数
 */
function parseArguments() {
  const args: { [key: string]: string } = {};
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') 
        ? process.argv[i + 1] 
        : 'true';
      
      args[key] = value;
      
      if (value !== 'true') {
        i++; // 跳过下一个参数，因为它是当前参数的值
      }
    }
  }
  
  return args;
}

/**
 * 主函数逻辑
 */
async function main() {
  try {
    console.log('对账单生成脚本启动');
    ensureExportDirExists();
    
    // 解析命令行参数
    const args = parseArguments();
    
    let customerName = args.customer;
    let startDate = args.startDate;
    let endDate = args.endDate;
    const exportFormat = args.format || 'excel';
    
    // 如果没有指定参数，则处理所有客户的前一天数据
    if (!customerName || !startDate || !endDate) {
      console.log('使用默认参数生成前一天的对账单');
      
      const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousDayRange();
      startDate = prevStartDate;
      endDate = prevEndDate;
      
      if (!customerName) {
        const customers = await getAllCustomers();
        console.log(`找到 ${customers.length} 个客户`);
        
        // 为每个客户生成对账单
        for (const customer of customers) {
          try {
            const data = await generateReconciliationData(customer.org_name, startDate, endDate);
            const safeCustomerName = safeFileName(customer.org_name);
            const dateStr = format(new Date(), 'yyyyMMdd');
            
            // 根据格式选择导出方法
            if (exportFormat === 'markdown') {
              const mdFilePath = path.join(EXPORT_DIR, `reconciliation_${safeCustomerName}_${dateStr}.md`);
              await exportToMarkdown(data, mdFilePath);
            } else {
              const excelFilePath = path.join(EXPORT_DIR, `reconciliation_${safeCustomerName}_${dateStr}.xlsx`);
              await exportToExcel(data, excelFilePath);
            }
          } catch (error) {
            console.error(`处理客户 ${customer.org_name} 数据失败:`, error);
          }
        }
      }
    }
    
    // 处理单个客户的指定日期数据
    if (customerName) {
      console.log(`使用指定参数生成 ${customerName} 从 ${startDate} 到 ${endDate} 的对账单`);
      
      const data = await generateReconciliationData(customerName, startDate, endDate);
      const safeCustomerName = safeFileName(customerName);
      const dateStr = format(new Date(), 'yyyyMMdd');
      
      // 根据格式选择导出方法
      if (exportFormat === 'markdown') {
        const mdFilePath = path.join(EXPORT_DIR, `reconciliation_${safeCustomerName}_${dateStr}.md`);
        await exportToMarkdown(data, mdFilePath);
      } else {
        const excelFilePath = path.join(EXPORT_DIR, `reconciliation_${safeCustomerName}_${dateStr}.xlsx`);
        await exportToExcel(data, excelFilePath);
      }
    }
    
    console.log('对账单生成完成');
  } catch (error) {
    console.error('对账单生成脚本执行失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main().catch(error => {
  console.error('未处理的错误:', error);
  process.exit(1);
}).finally(() => {
  process.exit(0);
}); 