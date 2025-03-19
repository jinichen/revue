import { NextRequest, NextResponse } from 'next/server';
import { query, queryCache } from '@/lib/db';
import { RevenueByDate, RevenueSummary } from '@/types';

// 辅助函数：将日期对象格式化为MySQL日期字符串 (YYYY-MM-DD HH:MM:SS)
function formatDateForMySQL(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * GET handler for revenue analytics
 * Provides revenue data grouped by date and summary statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || 'day'; // day, week, month
    
    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }
    
    // 缓存TTL - 30分钟
    const CACHE_TTL = 30 * 60 * 1000;
    
    // 生成缓存键
    const cacheKey = `revenue:${startDate}:${endDate}:${period}`;
    
    // 尝试从缓存获取
    const cachedResult = queryCache.get(cacheKey, []);
    if (cachedResult) {
      console.log(`Returning cached result for ${cacheKey}`);
      return NextResponse.json(cachedResult);
    }
    
    // Format SQL for date grouping based on period
    let dateFormat: string;
    switch (period) {
      case 'week':
        dateFormat = '%Y-%u'; // Year-Week
        break;
      case 'month':
        dateFormat = '%Y-%m'; // Year-Month
        break;
      default:
        dateFormat = '%Y-%m-%d'; // Year-Month-Day
    }
    
    // 批量查询优化：合并多个查询为一个事务
    const [revenueByDate, currentPeriodResult, previousPeriodResult] = await Promise.all([
      // 1. 按日期查询收入
      query<RevenueByDate>(
        `SELECT 
          DATE_FORMAT(exec_start_time, ?) as date,
          COUNT(*) as value
        FROM t_service_log
        WHERE exec_start_time >= ? AND exec_start_time <= ?
        GROUP BY DATE_FORMAT(exec_start_time, ?)
        ORDER BY date ASC`,
        [dateFormat, startDate, endDate, dateFormat],
        CACHE_TTL
      ),
      
      // 2. 当前时间段总量
      query<{total: number}>(
        `SELECT COUNT(*) as total
        FROM t_service_log
        WHERE exec_start_time >= ? AND exec_start_time <= ?`,
        [startDate, endDate],
        CACHE_TTL
      ),
      
      // 3. 上一个时间段总量
      (async () => {
        // Calculate previous period dates (same length before startDate)
        const startDateTime = new Date(startDate).getTime();
        const endDateTime = new Date(endDate).getTime();
        const periodLength = endDateTime - startDateTime;
        
        const prevStartDate = new Date(startDateTime - periodLength);
        const prevEndDate = new Date(startDateTime - 1); // One millisecond before current startDate
        
        const prevStartDateStr = formatDateForMySQL(prevStartDate);
        const prevEndDateStr = formatDateForMySQL(prevEndDate);
        
        return query<{total: number}>(
          `SELECT COUNT(*) as total
          FROM t_service_log
          WHERE exec_start_time >= ? AND exec_start_time <= ?`,
          [prevStartDateStr, prevEndDateStr],
          CACHE_TTL
        );
      })()
    ]);
    
    // Calculate summary including change
    const currentTotal = currentPeriodResult[0]?.total || 0;
    const previousTotal = previousPeriodResult[0]?.total || 0;
    const change = currentTotal - previousTotal;
    const changePercentage = previousTotal === 0 
      ? 100 
      : (change / previousTotal) * 100;
    
    const summary: RevenueSummary = {
      total: currentTotal,
      change: change,
      changePercentage: parseFloat(changePercentage.toFixed(2)),
      average: revenueByDate.length > 0 ? parseFloat((currentTotal / revenueByDate.length).toFixed(2)) : 0
    };
    
    // 准备结果
    const result = {
      byDate: revenueByDate,
      summary: summary
    };
    
    // 缓存结果
    queryCache.set(cacheKey, [], result, CACHE_TTL);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue analytics' },
      { status: 500 }
    );
  }
} 