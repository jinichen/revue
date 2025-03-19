/**
 * API route for organization call statistics
 * 
 * Provides call statistics grouped by organization for different time periods
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, queryCache } from '@/lib/db';

interface OrgStat {
  org_id: string;
  org_name?: string;
  total_calls: number;
  valid_calls?: number;
  invalid_calls?: number;
  two_factor_calls?: number;
  three_factor_calls?: number;
  avg_response_time_ms?: number;
}

interface ResultCode {
  result_code: string;
  result_msg: string;
  count: number;
  two_factor_count: number;
  three_factor_count: number;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Org Stats API called with URL:', request.url);
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'day';
    let date = searchParams.get('date');
    
    console.log('Org Stats API parameters:', { period, date });
    
    // If no date provided, use current date
    if (!date) {
      const now = new Date();
      date = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    }
    
    // 缓存时间（15分钟）
    const CACHE_TTL = 15 * 60 * 1000;
    
    // 缓存键 - 基于请求参数
    const cacheKey = `org-stats:${period}:${date}`;
    
    // 尝试从缓存获取
    const cachedResult = queryCache.get(cacheKey, []);
    if (cachedResult) {
      console.log(`Returning cached result for ${cacheKey}`);
      return NextResponse.json(cachedResult);
    }
    
    // Set up date ranges based on period
    let startDate, endDate;
    const currentDate = new Date(date);
    
    if (period === 'year') {
      // Get the year from the date
      const year = currentDate.getFullYear();
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    } else if (period === 'month') {
      // Get year and month from the date
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate(); // Last day of month
      
      startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
    } else {
      // Default to day: just use the provided date
      startDate = date;
      endDate = date;
    }
    
    console.log('Org Stats date range:', { startDate, endDate });
    
    // 有效认证返回码列表
    const validResultCodes = ['0', '200004', '210001', '210002', '210004', '210005', '210006', '210009'];
    const validResultCodesStr = validResultCodes.map(code => `'${code}'`).join(',');
    
    // Query for organization call statistics
    const orgStats = await query(
      `SELECT 
        t_service_log.org_id,
        t_org_info.org_name,
        COUNT(*) as total_calls,
        SUM(CASE WHEN result_code IN (${validResultCodesStr}) THEN 1 ELSE 0 END) as valid_calls,
        SUM(CASE WHEN result_code NOT IN (${validResultCodesStr}) THEN 1 ELSE 0 END) as invalid_calls,
        SUM(CASE WHEN auth_mode = '0x40' THEN 1 ELSE 0 END) as two_factor_calls,
        SUM(CASE WHEN auth_mode = '0x42' THEN 1 ELSE 0 END) as three_factor_calls,
        AVG(TIMESTAMPDIFF(MICROSECOND, exec_start_time, exec_end_time) / 1000) as avg_response_time_ms
      FROM 
        t_service_log
      LEFT JOIN 
        t_org_info ON t_service_log.org_id = t_org_info.org_id
      WHERE 
        DATE(exec_start_time) BETWEEN ? AND ?
      GROUP BY 
        t_service_log.org_id, t_org_info.org_name
      ORDER BY 
        total_calls DESC`,
      [startDate, endDate],
      CACHE_TTL // 启用缓存
    );
    
    // Get result codes per organization
    const resultCodesQuery = `
      SELECT 
        org_id,
        result_code,
        result_msg,
        COUNT(*) as count,
        SUM(CASE WHEN auth_mode = '0x40' THEN 1 ELSE 0 END) as two_factor_count,
        SUM(CASE WHEN auth_mode = '0x42' THEN 1 ELSE 0 END) as three_factor_count
      FROM 
        t_service_log
      WHERE 
        DATE(exec_start_time) BETWEEN ? AND ?
      GROUP BY 
        org_id, result_code, result_msg
      ORDER BY 
        org_id, count DESC
    `;
    
    const resultCodesData = await query(
      `SELECT 
        org_id,
        result_code,
        result_msg,
        COUNT(*) as count,
        SUM(CASE WHEN auth_mode = '0x40' THEN 1 ELSE 0 END) as two_factor_count,
        SUM(CASE WHEN auth_mode = '0x42' THEN 1 ELSE 0 END) as three_factor_count
      FROM 
        t_service_log
      WHERE 
        DATE(exec_start_time) BETWEEN ? AND ?
      GROUP BY 
        org_id, result_code, result_msg
      ORDER BY 
        org_id, count DESC`,
      [startDate, endDate],
      CACHE_TTL // 启用缓存
    );
    
    // Organize result codes by org_id
    const resultCodesByOrg: Record<string, ResultCode[]> = {};
    for (const row of resultCodesData as any[]) {
      if (row?.org_id) {
        const orgId = String(row.org_id);
        if (!resultCodesByOrg[orgId]) {
          resultCodesByOrg[orgId] = [];
        }
        if (resultCodesByOrg[orgId].length < 5) { // Limit to top 5 per org
          resultCodesByOrg[orgId].push({
            result_code: String(row.result_code || ''),
            result_msg: String(row.result_msg || ''),
            count: Number(row.count || 0),
            two_factor_count: Number(row.two_factor_count || 0),
            three_factor_count: Number(row.three_factor_count || 0)
          });
        }
      }
    }
    
    // Get previous period for comparison
    let prevStartDate, prevEndDate;
    
    if (period === 'year') {
      const year = currentDate.getFullYear() - 1;
      prevStartDate = `${year}-01-01`;
      prevEndDate = `${year}-12-31`;
    } else if (period === 'month') {
      // Previous month
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const year = prevMonth.getFullYear();
      const month = prevMonth.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();
      
      prevStartDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      prevEndDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
    } else {
      // Previous day
      const prevDay = new Date(currentDate);
      prevDay.setDate(prevDay.getDate() - 1);
      prevStartDate = prevDay.toISOString().split('T')[0];
      prevEndDate = prevDay.toISOString().split('T')[0];
    }
    
    // Get previous period stats for comparison
    const prevOrgStats = await query(
      `SELECT 
        org_id,
        COUNT(*) as total_calls
      FROM 
        t_service_log
      WHERE 
        DATE(exec_start_time) BETWEEN ? AND ?
      GROUP BY 
        org_id`,
      [prevStartDate, prevEndDate],
      CACHE_TTL // 启用缓存
    );
    
    // Create a map of previous period stats by org_id for easier lookup
    const prevStatsMap: Record<string, number> = {};
    for (const stat of prevOrgStats as any[]) {
      if (stat?.org_id && typeof stat.total_calls !== 'undefined') {
        prevStatsMap[String(stat.org_id)] = Number(stat.total_calls);
      }
    }
    
    // Calculate change percentages for each organization
    const enrichedOrgStats = (orgStats as any[]).map(org => {
      const orgId = org?.org_id ? String(org.org_id) : '';
      const total_calls = Number(org?.total_calls || 0);
      const prevTotal = orgId ? (prevStatsMap[orgId] || 0) : 0;
      
      let change = 0;
      let changePercentage = 0;
      
      if (prevTotal > 0) {
        change = total_calls - prevTotal;
        changePercentage = (change / prevTotal) * 100;
      }
      
      return {
        ...org,
        change,
        changePercentage,
        top_result_codes: orgId ? (resultCodesByOrg[orgId] || []) : []
      };
    });
    
    // 构造结果
    const result = {
      period,
      startDate,
      endDate,
      data: enrichedOrgStats
    };
    
    // 将结果存入缓存
    queryCache.set(cacheKey, [], result, CACHE_TTL);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching organization statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization statistics' },
      { status: 500 }
    );
  }
} 