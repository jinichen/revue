/**
 * Reconciliation API route handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取正确的表名
const SERVICE_LOGS_TABLE = process.env.SERVICE_LOGS_TABLE || 'service_logs';
const ORGANIZATIONS_TABLE = process.env.ORGANIZATIONS_TABLE || 'organizations';

// 列名映射
const COLUMN_MAPPINGS = {
  // 从环境变量获取列名映射
  org_name: process.env.COLUMN_ORG_NAME || 'org_name',
  org_id: process.env.COLUMN_ORG_ID || 'org_id',
  auth_mode: process.env.COLUMN_AUTH_MODE || 'auth_mode',
  exec_start_time: process.env.COLUMN_EXEC_START_TIME || 'exec_start_time',
  result_code: process.env.COLUMN_RESULT_CODE || 'result_code',
  result_msg: process.env.COLUMN_RESULT_MSG || 'result_msg'
};

// 如果是t_org_info表和t_service_log表，使用不同的列名映射
if (ORGANIZATIONS_TABLE === 't_org_info') {
  COLUMN_MAPPINGS.org_name = 'org_name'; // 修改为实际的列名
}

if (SERVICE_LOGS_TABLE === 't_service_log') {
  COLUMN_MAPPINGS.auth_mode = 'auth_mode'; // 修改为实际的列名
  COLUMN_MAPPINGS.exec_start_time = 'exec_start_time'; // 修改为实际的列名
  COLUMN_MAPPINGS.result_code = 'result_code'; // 修改为实际的列名
  COLUMN_MAPPINGS.result_msg = 'result_msg'; // 修改为实际的列名
}

export async function POST(req: NextRequest) {
  const { config, page = 1, pageSize = 20 } = await req.json();
  
  if (!config?.orgId) {
    return NextResponse.json(
      { success: false, message: 'Organization ID is required' },
      { status: 400 }
    );
  }
  
  // Parse page information
  const currentPage = parseInt(page.toString(), 10);
  const limit = parseInt(pageSize.toString(), 10);
  const offset = (currentPage - 1) * limit;
  
  try {
    console.log(`Fetching reconciliation data for org ${config.orgId}`, {
      orgId: config.orgId,
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
      page: currentPage,
      pageSize: limit,
      serviceLogsTable: SERVICE_LOGS_TABLE,
      organizationsTable: ORGANIZATIONS_TABLE,
      columnMappings: COLUMN_MAPPINGS
    });
    
    // 模拟数据模式
    if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
      console.log('Using mock data, skipping real database query');
      
      // 生成模拟数据
      const mockItems = Array.from({ length: 5 }, (_, i) => ({
        org_name: 'Mock Organization',
        auth_mode: i % 2 === 0 ? '0x40' : '0x42', // 交替二要素和三要素
        exec_start_time: new Date().toISOString().substring(0, 19),
        result_code: '0',
        result_msg: '成功',
        count: Math.floor(Math.random() * 100) + 1
      }));
      
      return NextResponse.json({
        success: true,
        message: 'Mock reconciliation data retrieved successfully',
        data: {
          orgId: config.orgId,
          orgName: 'Mock Organization',
          periodStart: config.periodStart,
          periodEnd: config.periodEnd,
          items: mockItems,
          totalCount: mockItems.length,
          totalPages: 1,
          currentPage: 1,
          pageSize: mockItems.length
        }
      });
    }
    
    // 先检查表是否存在
    try {
      const checkTableQuery = `
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = ? 
        LIMIT 1
      `;
      
      const [serviceLogsExists] = await Promise.all([
        query(checkTableQuery, [SERVICE_LOGS_TABLE])
      ]);
      
      if (!serviceLogsExists || serviceLogsExists.length === 0) {
        console.error(`Table '${SERVICE_LOGS_TABLE}' does not exist in the database`);
        return NextResponse.json(
          { 
            success: false, 
            message: `Database table '${SERVICE_LOGS_TABLE}' does not exist. Please check database configuration.` 
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error checking database tables:', error);
      // 继续执行，让主查询可能有更具体的错误
    }
    
    // 检查列名是否存在
    try {
      const checkColumnsQuery = `
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ?
      `;
      
      const columns = await query(checkColumnsQuery, [SERVICE_LOGS_TABLE]);
      console.log(`Columns in ${SERVICE_LOGS_TABLE}:`, columns);
      
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
    
    // 查询数据
    try {
      // 查询组织名称
      const orgQuerySQL = `
        SELECT ${COLUMN_MAPPINGS.org_name} as org_name 
        FROM ${ORGANIZATIONS_TABLE} 
        WHERE ${COLUMN_MAPPINGS.org_id} = ? 
        LIMIT 1
      `;
      
      const orgResult = await query(orgQuerySQL, [config.orgId]);
      
      if (!orgResult || orgResult.length === 0) {
        console.error(`Organization with ID ${config.orgId} not found`);
        return NextResponse.json(
          { success: false, message: `Organization with ID ${config.orgId} not found` },
          { status: 404 }
        );
      }
      
      const orgName = orgResult[0]?.org_name || '';
      
      // 修改查询SQL，确保SELECT、GROUP BY和ORDER BY的表达式一致
      // 使用DATE函数处理日期，确保表达式完全一致
      const querySQL = `
        SELECT 
          org.${COLUMN_MAPPINGS.org_name} as org_name,
          sl.${COLUMN_MAPPINGS.auth_mode} as auth_mode,
          DATE(sl.${COLUMN_MAPPINGS.exec_start_time}) as exec_start_time,
          sl.${COLUMN_MAPPINGS.result_code} as result_code,
          sl.${COLUMN_MAPPINGS.result_msg} as result_msg,
          COUNT(*) as count
        FROM 
          ${SERVICE_LOGS_TABLE} sl
        JOIN
          ${ORGANIZATIONS_TABLE} org ON sl.${COLUMN_MAPPINGS.org_id} = org.${COLUMN_MAPPINGS.org_id}
        WHERE 
          sl.${COLUMN_MAPPINGS.org_id} = ?
          AND sl.${COLUMN_MAPPINGS.exec_start_time} BETWEEN ? AND ?
        GROUP BY 
          org.${COLUMN_MAPPINGS.org_name}, sl.${COLUMN_MAPPINGS.auth_mode}, 
          DATE(sl.${COLUMN_MAPPINGS.exec_start_time}), sl.${COLUMN_MAPPINGS.result_code}, 
          sl.${COLUMN_MAPPINGS.result_msg}
        ORDER BY 
          DATE(sl.${COLUMN_MAPPINGS.exec_start_time}) DESC
        LIMIT ? OFFSET ?
      `;
      
      // 获取总记录数
      const countQuerySQL = `
        SELECT 
          COUNT(*) as total
        FROM (
          SELECT 
            COUNT(*) 
          FROM 
            ${SERVICE_LOGS_TABLE} sl
          JOIN
            ${ORGANIZATIONS_TABLE} org ON sl.${COLUMN_MAPPINGS.org_id} = org.${COLUMN_MAPPINGS.org_id}
          WHERE 
            sl.${COLUMN_MAPPINGS.org_id} = ?
            AND sl.${COLUMN_MAPPINGS.exec_start_time} BETWEEN ? AND ?
          GROUP BY 
            org.${COLUMN_MAPPINGS.org_name}, sl.${COLUMN_MAPPINGS.auth_mode}, 
            DATE(sl.${COLUMN_MAPPINGS.exec_start_time}), sl.${COLUMN_MAPPINGS.result_code}, 
            sl.${COLUMN_MAPPINGS.result_msg}
        ) as subquery
      `;
      
      // 执行查询
      const [items, countResult] = await Promise.all([
        query(querySQL, [
          config.orgId,
          config.periodStart,
          config.periodEnd,
          limit,
          offset
        ]),
        query(countQuerySQL, [
          config.orgId,
          config.periodStart,
          config.periodEnd
        ])
      ]);
      
      // 获取总记录数和总页数
      const totalCount = Number(countResult[0]?.total || 0);
      const totalPages = Math.ceil(totalCount / limit);
      
      // 返回数据
      return NextResponse.json({
        success: true,
        message: 'Reconciliation data retrieved successfully',
        data: {
          orgId: config.orgId,
          orgName,
          periodStart: config.periodStart,
          periodEnd: config.periodEnd,
          items,
          totalCount,
          totalPages,
          currentPage,
          pageSize: limit
        }
      });
    } catch (queryError) {
      console.error('Query execution error:', queryError);
      
      // 检查是否是列不存在错误
      const errorStr = String(queryError);
      if (errorStr.includes("Unknown column")) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Database column mapping error: ${errorStr}. Please check database schema and update column mappings.`
          },
          { status: 500 }
        );
      }
      
      throw queryError; // 重新抛出以便外层捕获
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to get reconciliation data: ${errorMessage}`, {
      orgId: config.orgId,
      error
    });
    
    // 检查是否是表不存在错误
    const errorStr = String(error);
    if (errorStr.includes("Table") && errorStr.includes("doesn't exist")) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Failed to get reconciliation data: Database table configuration error. Please contact system administrator.`
        },
        { status: 500 }
      );
    }
    
    // 检查是否是列不存在错误
    if (errorStr.includes("Unknown column")) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Failed to get reconciliation data: Database column mapping error. Please check database schema and update column mappings.`
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: `Failed to get reconciliation data: ${errorMessage}` },
      { status: 500 }
    );
  }
}