/**
 * API route for getting reconciliation data
 * 
 * Provides detailed service log data for reconciliation
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, queryCache } from '@/lib/db';
import { BillingConfig } from '@/types';

// 从环境变量读取默认分页大小，默认为20条
const DEFAULT_PAGE_SIZE = parseInt(process.env.RECONCILIATION_PAGE_SIZE || '20', 10);

interface ReconciliationItem {
  org_name: string;
  auth_mode: string;
  exec_start_time: string;
  result_code: string;
  result_msg: string;
  count: number;
}

// 格式化日期为MySQL格式
const formatDateForMySQL = (dateString: string): string => {
  if (!dateString) return '';
  // 检查是否已经是MySQL日期格式（YYYY-MM-DD）
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.error('Invalid date format:', dateString);
    return '';
  }
};

/**
 * 从t_service_log表获取对账单数据，支持分页
 */
const generateReconciliationData = async (config: BillingConfig, page: number = 1, pageSize: number = DEFAULT_PAGE_SIZE) => {
  try {
    console.log('生成对账单数据，参数:', config, '页码:', page, '每页条数:', pageSize);
    
    // 缓存TTL - 30分钟
    const CACHE_TTL = 30 * 60 * 1000;
    
    // 生成缓存键 - 包含分页信息
    const cacheKey = `reconciliation:${config.orgId}:${config.periodStart}:${config.periodEnd}:${page}:${pageSize}`;
    
    // 尝试从缓存获取
    const cachedResult = queryCache.get(cacheKey, []);
    if (cachedResult) {
      console.log(`Returning cached reconciliation data for ${cacheKey}`);
      return cachedResult;
    }
    
    // 获取组织信息
    const orgQuery = `
      SELECT 
        org_id,
        org_name
      FROM 
        t_org_info
      WHERE 
        org_id = ?
      LIMIT 1
    `;
    
    console.log('执行组织查询:', orgQuery, [config.orgId]);
    const orgs = await query(orgQuery, [config.orgId]);
    console.log('组织查询结果:', orgs);
    
    if (orgs.length === 0) {
      throw new Error('找不到指定的客户');
    }
    
    const orgName = orgs[0].org_name;
    console.log('找到客户:', orgName);
    
    // 优化： 先查询总条数，用于分页
    const countQuery = `
      SELECT 
        COUNT(*) as total
      FROM (
        SELECT 
          oi.org_name,
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
          sl.org_id = ?
          AND sl.exec_start_time >= ?
          AND sl.exec_start_time <= ?
        GROUP BY 
          oi.org_name, sl.auth_mode, auth_date, sl.result_code, sl.result_msg
      ) as subquery
    `;
    
    const [totalResult] = await query<{ total: number }>(
      countQuery,
      [
        config.orgId,
        formatDateForMySQL(config.periodStart),
        formatDateForMySQL(config.periodEnd)
      ],
      CACHE_TTL
    );
    
    const totalItems = totalResult?.total || 0;
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    
    // 修改查询SQL，确保SELECT、GROUP BY和ORDER BY的表达式一致
    // 使用DATE函数处理日期，确保所有引用相同列的表达式都一致
    const reconciliationQuery = `
      SELECT 
        oi.org_name,
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
        sl.org_id = ?
        AND sl.exec_start_time >= ?
        AND sl.exec_start_time <= ?
      GROUP BY 
        oi.org_name, sl.auth_mode, auth_date, sl.result_code, sl.result_msg
      ORDER BY 
        auth_date DESC, 
        sl.auth_mode ASC,
        CASE WHEN sl.result_code = '0' THEN '0' ELSE '1' || sl.result_code END ASC
      LIMIT ?, ?
    `;
    
    console.log('执行对账单查询:', reconciliationQuery, [
      config.orgId,
      formatDateForMySQL(config.periodStart),
      formatDateForMySQL(config.periodEnd),
      offset,
      pageSize
    ]);
    
    const reconciliationData = await query<{
      org_name: string;
      auth_mode: string;
      auth_date: string;
      result_code: string;
      result_msg: string;
      count: number;
    }>(reconciliationQuery, [
      config.orgId,
      formatDateForMySQL(config.periodStart),
      formatDateForMySQL(config.periodEnd),
      offset,
      pageSize
    ], CACHE_TTL);
    
    console.log('获取到对账单数据条目数:', reconciliationData.length);
    
    if (reconciliationData.length > 0) {
      console.log('对账单数据示例:', reconciliationData[0]);
    } else {
      console.log('未找到对账单数据');
    }
    
    // 格式化返回数据
    const formattedData: ReconciliationItem[] = reconciliationData.map(item => ({
      org_name: item.org_name,
      auth_mode: item.auth_mode,
      exec_start_time: item.auth_date,
      result_code: item.result_code,
      result_msg: item.result_msg || '',
      count: Number(item.count)
    }));
    
    // 准备结果
    const result = {
      orgId: config.orgId,
      orgName,
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
      items: formattedData,
      totalCount: totalItems,
      totalPages,
      currentPage: page,
      pageSize
    };
    
    // 缓存结果
    queryCache.set(cacheKey, [], result, CACHE_TTL);
    
    return result;
  } catch (error) {
    console.error('对账单数据生成失败:', error);
    throw error;
  }
};

/**
 * POST handler for reconciliation data
 */
export async function POST(req: NextRequest) {
  try {
    const requestData = await req.json();
    const config = requestData.config as BillingConfig;
    const page = Number(requestData.page || 1);
    // 从请求参数或环境变量获取分页大小
    const pageSize = Number(requestData.pageSize || DEFAULT_PAGE_SIZE);
    
    console.log('收到对账单请求:', config, '页码:', page, '每页条数:', pageSize);
    
    // 验证必要的参数
    if (!config.orgId || !config.periodStart || !config.periodEnd) {
      return NextResponse.json(
        { error: '缺少必要的参数' }, 
        { status: 400 }
      );
    }
    
    // 确保页码和每页条数是合理的值
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: '无效的分页参数' },
        { status: 400 }
      );
    }
    
    // 获取对账单数据
    const reconciliationData = await generateReconciliationData(config, page, pageSize);
    
    // 响应对账单数据
    return NextResponse.json({
      success: true,
      message: '对账单数据生成成功',
      data: reconciliationData
    });
    
  } catch (error) {
    console.error('对账单生成失败:', error);
    return NextResponse.json(
      { success: false, message: '对账单生成失败', error: error instanceof Error ? error.message : '未知错误' }, 
      { status: 500 }
    );
  }
} 