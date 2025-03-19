/**
 * Reconciliation export API route handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { spawn } from 'child_process';
import { join } from 'path';
import fs from 'fs';

// 获取正确的表名
const ORGANIZATIONS_TABLE = process.env.ORGANIZATIONS_TABLE || 'organizations';

// 列名映射
const COLUMN_MAPPINGS = {
  // 从环境变量获取列名映射
  org_name: process.env.COLUMN_ORG_NAME || 'org_name',
  org_id: process.env.COLUMN_ORG_ID || 'org_id'
};

// 如果是t_org_info表，使用不同的列名映射
if (ORGANIZATIONS_TABLE === 't_org_info') {
  COLUMN_MAPPINGS.org_name = 'org_name'; // 修改为实际的列名
  COLUMN_MAPPINGS.org_id = 'org_id'; // 修改为实际的列名
}

export async function POST(req: NextRequest) {
  const { config } = await req.json();
  
  if (!config?.orgId) {
    return NextResponse.json(
      { success: false, message: 'Organization ID is required' },
      { status: 400 }
    );
  }
  
  try {
    console.log(`Exporting reconciliation data for org ${config.orgId}`, {
      orgId: config.orgId,
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
      format: config.format || 'excel',
      organizationsTable: ORGANIZATIONS_TABLE,
      columnMappings: COLUMN_MAPPINGS
    });
    
    // 检查列名是否存在
    try {
      const checkColumnsQuery = `
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ?
      `;
      
      const columns = await query(checkColumnsQuery, [ORGANIZATIONS_TABLE]);
      console.log(`Columns in ${ORGANIZATIONS_TABLE}:`, columns);
      
      // 更新列名映射
      if (columns && columns.length > 0) {
        const columnNames = columns.map((col: any) => col.COLUMN_NAME.toLowerCase());
        
        // 打印列名和映射信息
        console.log('Available columns:', columnNames);
        console.log('Using column mappings:', COLUMN_MAPPINGS);
      }
    } catch (error) {
      console.error('Error checking columns:', error);
    }
    
    // 在开发环境，直接使用模拟数据
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_EXPORTS === 'true') {
      console.log('Using mock export in development mode');
      
      // 使用模拟组织名称
      const orgName = "模拟组织";
      // 生成安全的文件名
      const safeCustomerName = orgName.replace(/[\/\\:*?"<>|]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      
      // 根据格式选择文件扩展名
      const isMarkdownFormat = config.format === 'markdown';
      const fileExt = isMarkdownFormat ? 'md' : 'xlsx';
      const fileName = `reconciliation_${safeCustomerName}_${dateStr}.${fileExt}`;
      
      // 生成模拟数据路径
      const exportsDir = join(process.cwd(), 'exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      
      const mockFilePath = join(exportsDir, fileName);
      let content = '';
      
      if (isMarkdownFormat) {
        content = `# ${orgName} 对账单\n\n`;
        content += `账单周期: ${config.periodStart} - ${config.periodEnd}\n\n`;
        content += '| 客户名 | 模式 | 认证日期 | 返回码 | 返回码信息 | 合计 |\n';
        content += '| ------ | ------ | ------ | ------ | ------ | ------: |\n';
        content += `| ${orgName} | 二要素 | ${config.periodStart} | 0 | 成功 | 100 |\n`;
        content += `| ${orgName} | 三要素 | ${config.periodStart} | 0 | 成功 | 50 |\n\n`;
        content += '**总计**: 150 次认证\n\n';
        content += `*导出时间: ${new Date().toISOString().replace('T', ' ').substr(0, 19)}*`;
      } else {
        // 简单的Excel文件模拟内容
        content = 'This is a mock Excel file';
      }
      
      fs.writeFileSync(mockFilePath, content);
      
      // 构造下载URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const downloadUrl = `${baseUrl}/downloads/reconciliations/${fileName}`;
      
      return NextResponse.json({
        success: true,
        message: 'Mock reconciliation exported successfully',
        data: {
          url: downloadUrl,
          fileName
        }
      });
    }
    
    // 查询组织名称
    const orgQuerySQL = `
      SELECT ${COLUMN_MAPPINGS.org_name} as org_name 
      FROM ${ORGANIZATIONS_TABLE} 
      WHERE ${COLUMN_MAPPINGS.org_id} = ? 
      LIMIT 1
    `;
    
    try {
      const orgResult = await query(orgQuerySQL, [config.orgId]);
      
      if (!orgResult || orgResult.length === 0) {
        console.error(`Organization with ID ${config.orgId} not found`);
        return NextResponse.json(
          { success: false, message: `Organization with ID ${config.orgId} not found` },
          { status: 404 }
        );
      }
      
      const orgName = String(orgResult[0]?.org_name || 'unknown');
      
      // 生成安全的文件名（去除可能导致文件路径问题的字符）
      const safeCustomerName = orgName.replace(/[\/\\:*?"<>|]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      
      // 根据格式选择文件扩展名和命令参数
      const isMarkdownFormat = config.format === 'markdown';
      const fileExt = isMarkdownFormat ? 'md' : 'xlsx';
      const fileName = `reconciliation_${safeCustomerName}_${dateStr}.${fileExt}`;
      
      // 调用导出脚本
      const scriptPath = join(process.cwd(), 'scripts', 'reconciliation-exporter.ts');
      
      return new Promise<Response>((resolve) => {
        // 构建命令参数
        const args = [
          'ts-node',
          scriptPath,
          '--customer', orgName,
          '--startDate', config.periodStart,
          '--endDate', config.periodEnd
        ];
        
        // 如果是Markdown格式，添加相应的参数
        if (isMarkdownFormat) {
          args.push('--format', 'markdown');
        }
        
        // 使用 ts-node 运行脚本
        const child = spawn('npx', args);
        
        let stdoutData = '';
        let stderrData = '';
        
        child.stdout.on('data', (data) => {
          stdoutData += data.toString();
          console.log(`Reconciliation export stdout: ${data.toString()}`);
        });
        
        child.stderr.on('data', (data) => {
          stderrData += data.toString();
          console.error(`Reconciliation export stderr: ${data.toString()}`);
        });
        
        child.on('close', (code) => {
          if (code !== 0) {
            console.error(`Reconciliation export failed with code ${code}`, {
              stderr: stderrData
            });
            
            resolve(NextResponse.json(
              { success: false, message: `Failed to export reconciliation: Process exited with code ${code}` },
              { status: 500 }
            ));
            return;
          }
          
          console.log(`Reconciliation export completed`);
          
          // 检查文件是否存在
          const expectedFilePath = join(process.cwd(), 'exports', fileName);
          
          if (!fs.existsSync(expectedFilePath)) {
            console.error(`Expected export file not found`, {
              path: expectedFilePath
            });
            
            resolve(NextResponse.json(
              { success: false, message: 'Export completed but file not found' },
              { status: 500 }
            ));
            return;
          }
          
          // 构造下载 URL
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
          const downloadUrl = `${baseUrl}/downloads/reconciliations/${fileName}`;
          
          resolve(NextResponse.json({
            success: true,
            message: 'Reconciliation exported successfully',
            data: {
              url: downloadUrl,
              fileName
            }
          }));
        });
        
        child.on('error', (err) => {
          console.error(`Failed to start reconciliation export process`, {
            error: err
          });
          
          resolve(NextResponse.json(
            { success: false, message: `Failed to start export process: ${err.message}` },
            { status: 500 }
          ));
        });
      });
    } catch (dbError) {
      console.error('Database error when querying organization:', dbError);
      
      // 检查是否是列不存在错误
      const errorStr = String(dbError);
      if (errorStr.includes("Unknown column")) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Database column mapping error. Please check database schema and update column mappings.`
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to export reconciliation data: ${errorMessage}`, {
      orgId: config.orgId,
      error
    });
    
    return NextResponse.json(
      { success: false, message: `Failed to export reconciliation data: ${errorMessage}` },
      { status: 500 }
    );
  }
}; 