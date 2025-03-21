/**
 * API route for call statistics
 * 
 * Provides valid and invalid call statistics by date for different periods (year/month/day)
 */
import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { VALID_RESULT_CODES, CACHE_TTL, STATS_CACHE_TTL } from "@/lib/config";
import { ApiResponse } from "@/lib/api";

// 定义结果类型
interface DbQueryResult {
  [key: string]: any;
}

interface TotalResult {
  total: number;
  validTotal: number;
  invalidTotal: number;
}

interface PrevTotalResult {
  total: number;
  validTotal?: number;
}

// 修复类型定义问题
// 处理查询结果
interface StatsData {
  total?: number;
  valid?: number;
  invalid?: number;
  avgResponseTime?: number;
}

interface ProcessedStats {
  total: number;
  valid: number;
  invalid: number;
  validPercentage: number;
  avgResponseTime: number;
  summary?: {
    total: number;
    valid: number;
    invalid: number;
    validPercentage: number;
    validChangePercentage: number;
  };
}

// 添加更详细的数据库配置日志
console.log('数据库配置信息:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  serviceLogsTable: process.env.SERVICE_LOGS_TABLE || 't_service_log'
});

/**
 * 处理获取调用统计的API请求
 * 支持按年、月、日查询统计数据
 */
export async function GET(request: NextRequest) {
  console.log('接收到调用统计API请求');
  
  try {
    // 获取URL查询参数
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

    // 添加标记表示数据更新时间
    const fetchTime = new Date().toISOString();

    console.log(`调用统计API请求参数: period=${period}, date=${dateParam}`);

    // 构建有效结果码条件
    const validCodesStr = VALID_RESULT_CODES.map(code => `'${code}'`).join(',');
    console.log('有效结果码:', validCodesStr);

    // 解析日期参数
    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      console.error(`无效的日期参数: ${dateParam}`);
      return NextResponse.json({
        success: false,
        error: `无效的日期格式: ${dateParam}`,
      }, { status: 400 });
    }

    // 使用表名变量，从环境变量获取
    const tableNameSL = process.env.SERVICE_LOGS_TABLE || 't_service_log';
    console.log(`使用服务日志表: ${tableNameSL}`);

    // 根据不同时间周期构建日期筛选条件
    // 年份筛选
    const year = date.getFullYear();
    const yearFilter = {
      dateField: "$exec_start_time",
      year: year,
    };

    // 月份筛选
    const month = date.getMonth() + 1; // JavaScript月份从0开始
    const monthFilter = {
      dateField: "$exec_start_time",
      year: year,
      month: month,
    };

    // 日期筛选
    const day = date.getDate();
    const dayFilter = {
      dateField: "$exec_start_time",
      year: year,
      month: month,
      day: day,
    };

    console.log('日期过滤条件:', { year, month, day });

    try {
      // 构建年度统计查询
      const yearStatsQuery = `
      SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN result_code IN (${validCodesStr}) THEN 1 ELSE 0 END) AS valid,
          SUM(CASE WHEN result_code NOT IN (${validCodesStr}) THEN 1 ELSE 0 END) AS invalid,
          AVG(cost_time) AS avgResponseTime
      FROM
          ${tableNameSL}
      WHERE
          YEAR(exec_start_time) = ${yearFilter.year}
      `;

      // 构建月份统计查询
      const monthStatsQuery = `
      SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN result_code IN (${validCodesStr}) THEN 1 ELSE 0 END) AS valid,
          SUM(CASE WHEN result_code NOT IN (${validCodesStr}) THEN 1 ELSE 0 END) AS invalid,
          AVG(cost_time) AS avgResponseTime
      FROM
          ${tableNameSL}
      WHERE
          YEAR(exec_start_time) = ${monthFilter.year} AND MONTH(exec_start_time) = ${monthFilter.month}
      `;

      // 构建日统计查询
      const dayStatsQuery = `
      SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN result_code IN (${validCodesStr}) THEN 1 ELSE 0 END) AS valid,
          SUM(CASE WHEN result_code NOT IN (${validCodesStr}) THEN 1 ELSE 0 END) AS invalid,
          AVG(cost_time) AS avgResponseTime
      FROM
          ${tableNameSL}
      WHERE
          YEAR(exec_start_time) = ${dayFilter.year} AND MONTH(exec_start_time) = ${dayFilter.month} AND DAY(exec_start_time) = ${dayFilter.day}
      `;

      // 执行查询并处理结果
      console.log('执行SQL查询 - 年度统计', yearStatsQuery);
      let yearStats: DbQueryResult[] = [];
      try {
        yearStats = await query<DbQueryResult>(yearStatsQuery, [], CACHE_TTL);
        console.log('年度统计查询结果:', yearStats);
      } catch (error: any) {
        console.error('年度统计查询失败:', error);
        return NextResponse.json({
          success: false,
          error: `年度统计查询失败: ${error.message || '数据库错误'}`,
          query: yearStatsQuery
        }, { status: 500 });
      }
      
      console.log('执行SQL查询 - 月度统计', monthStatsQuery);
      let monthStats: DbQueryResult[] = [];
      try {
        monthStats = await query<DbQueryResult>(monthStatsQuery, [], CACHE_TTL);
        console.log('月度统计查询结果:', monthStats);
      } catch (error: any) {
        console.error('月度统计查询失败:', error);
        return NextResponse.json({
          success: false,
          error: `月度统计查询失败: ${error.message || '数据库错误'}`,
          query: monthStatsQuery
        }, { status: 500 });
      }

      console.log('执行SQL查询 - 日度统计', dayStatsQuery);
      let dayStats: DbQueryResult[] = [];
      try {
        dayStats = await query<DbQueryResult>(dayStatsQuery, [], CACHE_TTL);
        console.log('日度统计查询结果:', dayStats);
      } catch (error: any) {
        console.error('日度统计查询失败:', error);
        return NextResponse.json({
          success: false,
          error: `日度统计查询失败: ${error.message || '数据库错误'}`,
          query: dayStatsQuery
        }, { status: 500 });
      }

      // 处理查询结果
      const processStats = (statsData: StatsData[]): ProcessedStats => {
        const stats = statsData[0] || {};
        const total = Number(stats.total || 0);
        const valid = Number(stats.valid || 0);
        const invalid = Number(stats.invalid || 0);
        const avgResponseTime = Number(stats.avgResponseTime || 0);
        const validPercentage = total > 0 ? Math.round((valid / total) * 1000) / 10 : 0;

        return {
          total,
          valid,
          invalid,
          validPercentage,
          avgResponseTime
        };
      };

      // 处理结果
      const yearStatsProcessed = processStats(yearStats);
      const monthStatsProcessed = processStats(monthStats);
      const dayStatsProcessed = processStats(dayStats);

      // 构建响应对象
      const responseData = {
        success: true,
        data: {
          year: yearStatsProcessed,
          month: monthStatsProcessed,
          day: dayStatsProcessed
        },
        meta: {
          fetchTime,
          ttl: STATS_CACHE_TTL,
          query: {
            period,
            date: dateParam
          }
        }
      };

      console.log('API响应数据:', responseData);
      return NextResponse.json(responseData);
    } catch (dbError: any) {
      console.error('数据库查询错误:', dbError);
      return NextResponse.json({
        success: false,
        error: `数据库查询错误: ${dbError.message || '未知错误'}`,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('API处理错误:', error);
    return NextResponse.json({
      success: false,
      error: `处理API请求时出错: ${error.message || '未知错误'}`,
    }, { status: 500 });
  }
} 