/**
 * API route for call statistics
 * 
 * Provides valid and invalid call statistics by date for different periods (year/month/day)
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'day';
    let date = searchParams.get('date');
    const orgId = searchParams.get('org_id'); // Get org_id for filtering
    
    // If no date provided, use current date
    if (!date) {
      const now = new Date();
      date = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    }
    
    // Set up date ranges and SQL format based on period
    let startDate, endDate, groupFormat;
    const currentDate = new Date(date);
    
    if (period === 'year') {
      // Get the year from the date
      const year = currentDate.getFullYear();
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
      groupFormat = '%Y-%m'; // Group by month within year
    } else if (period === 'month') {
      // Get year and month from the date
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate(); // Last day of month
      
      startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      groupFormat = '%Y-%m-%d'; // Group by day within month
    } else {
      // Default to day: just use the provided date
      startDate = date;
      endDate = date;
      groupFormat = '%H'; // Group by hour within day
    }
    
    // Create the base WHERE clause condition for the date range
    const whereConditions = ['DATE(exec_start_time) BETWEEN ? AND ?'];
    const queryParams = [startDate, endDate];
    
    // Add org_id filter if provided
    if (orgId) {
      whereConditions.push('t_service_log.org_id = ?');
      queryParams.push(orgId);
    }
    
    // Build the WHERE clause
    const whereClause = whereConditions.join(' AND ');
    
    // 有效认证返回码列表
    const validResultCodes = ['0', '200004', '210001', '210002', '210004', '210005', '210006', '210009'];
    const validResultCodesStr = validResultCodes.map(code => `'${code}'`).join(',');
    
    // Query for call statistics by date with optional org_id filter and joined org_name
    const callStats = await query(`
      SELECT 
        DATE_FORMAT(exec_start_time, '${groupFormat}') as date,
        SUM(CASE WHEN result_code IN (${validResultCodesStr}) THEN 1 ELSE 0 END) as validCalls,
        SUM(CASE WHEN result_code NOT IN (${validResultCodesStr}) THEN 1 ELSE 0 END) as invalidCalls,
        SUM(CASE WHEN auth_mode = '0x40' THEN 1 ELSE 0 END) as twoFactorCalls,
        SUM(CASE WHEN auth_mode = '0x42' THEN 1 ELSE 0 END) as threeFactorCalls
      FROM 
        t_service_log
      WHERE 
        ${whereClause}
      GROUP BY 
        DATE_FORMAT(exec_start_time, '${groupFormat}')
      ORDER BY 
        date ASC
    `, queryParams);
    
    // Get summary for the current period
    const summary = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN result_code IN (${validResultCodesStr}) THEN 1 ELSE 0 END) as validTotal,
        SUM(CASE WHEN result_code NOT IN (${validResultCodesStr}) THEN 1 ELSE 0 END) as invalidTotal,
        SUM(CASE WHEN auth_mode = '0x40' THEN 1 ELSE 0 END) as twoFactorTotal,
        SUM(CASE WHEN auth_mode = '0x42' THEN 1 ELSE 0 END) as threeFactorTotal
      FROM 
        t_service_log
      WHERE 
        ${whereClause}
    `, queryParams);
    
    // Get result code statistics
    const resultCodeStats = await query(`
      SELECT 
        result_code,
        result_msg,
        COUNT(*) as count,
        ROUND((COUNT(*) / (SELECT COUNT(*) FROM t_service_log WHERE ${whereClause})) * 100, 2) as percentage
      FROM 
        t_service_log
      WHERE 
        ${whereClause}
      GROUP BY 
        result_code, result_msg
      ORDER BY 
        count DESC
      LIMIT 10
    `, [...queryParams, ...queryParams]);
    
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
    
    // Create previous period WHERE clause
    const prevWhereConditions = ['DATE(exec_start_time) BETWEEN ? AND ?'];
    const prevQueryParams = [prevStartDate, prevEndDate];
    
    // Add org_id filter to previous period query if provided
    if (orgId) {
      prevWhereConditions.push('t_service_log.org_id = ?');
      prevQueryParams.push(orgId);
    }
    
    // Build the previous period WHERE clause
    const prevWhereClause = prevWhereConditions.join(' AND ');
    
    // Get summary for the previous period
    const prevSummary = await query(`
      SELECT 
        COUNT(*) as total
      FROM 
        t_service_log
      WHERE 
        ${prevWhereClause}
    `, prevQueryParams);
    
    // Calculate change percentage
    const currentTotal = Number(summary[0]?.total || 0);
    const previousTotal = Number(prevSummary[0]?.total || 0);
    
    let change = 0;
    let changePercentage = 0;
    
    if (previousTotal > 0) {
      change = currentTotal - previousTotal;
      changePercentage = (change / previousTotal) * 100;
    }
    
    // If orgId is provided, get org_name for reference
    let orgName = null;
    if (orgId) {
      const orgResult = await query(`
        SELECT org_name 
        FROM t_org_info 
        WHERE org_id = ?
      `, [orgId]);
      
      if (orgResult.length > 0) {
        orgName = orgResult[0].org_name;
      }
    }
    
    return NextResponse.json({
      data: callStats,
      summary: {
        total: currentTotal,
        validTotal: summary[0]?.validTotal || 0,
        invalidTotal: summary[0]?.invalidTotal || 0,
        twoFactorTotal: summary[0]?.twoFactorTotal || 0,
        threeFactorTotal: summary[0]?.threeFactorTotal || 0,
        change,
        changePercentage
      },
      resultCodes: resultCodeStats,
      organization: orgId ? { org_id: orgId, org_name: orgName } : null
    });
  } catch (error) {
    console.error('Error fetching call statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call statistics' },
      { status: 500 }
    );
  }
} 