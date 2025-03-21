/**
 * API route for organization call statistics
 * 
 * Provides call statistics grouped by organization for different time periods
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { VALID_RESULT_CODES, ORG_STATS_CACHE_TTL } from "@/lib/config";
import { ApiResponse } from "@/lib/api";

// 定义数据类型
interface OrgStat {
  org_id: string;
  org_name: string;
  total_calls: number;
  valid_calls: number;
  invalid_calls: number;
  two_factor_calls: number;
  three_factor_calls: number;
  avgResponseTime: number;
}

interface PrevOrgStat {
  org_id: string;
  total_calls: number;
}

interface ResultCode {
  org_id: string;
  result_code: string;
  result_msg: string;
  count: number;
}

interface FormattedOrgStat {
  org_id: string;
  org_name: string;
  total_calls: number;
  valid_calls: number;
  invalid_calls: number;
  valid_percentage: number;
  two_factor_calls: number;
  three_factor_calls: number;
  avgResponseTime: number;
  change: number;
  change_percentage: number;
  result_codes: {
    result_code: string;
    result_msg: string;
    count: number;
  }[];
}

// 数据库查询结果类型
interface DbOrgStat {
  org_id: string;
  org_name: string;
  total_calls: number;
  valid_calls: number;
  invalid_calls: number;
  avgResponseTime: number;
}

interface DbPrevStat {
  org_id: string;
  total_calls: number;
}

interface DbResultCode {
  org_id: string;
  result_code: string;
  result_msg: string;
  count: number;
}

// 带有变化信息的组织统计
interface OrgStatWithChange extends DbOrgStat {
  change: number;
  change_percentage: number;
}

/**
 * 获取组织调用统计API（GET）
 * 
 * - 支持按年、月、日级别汇总所有组织的调用数据
 * - 包含各组织的总调用次数、有效调用次数、无效调用次数、二因素/三因素调用次数、平均响应时间
 * - 支持与上一个周期的数据比较
 */
export async function GET(request: NextRequest) {
  try {
    // 获取请求URL和参数
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day';
    const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    
    // 添加数据刷新时间标记
    const fetchTime = new Date().toISOString();
    
    console.log(`组织统计API请求参数: period=${period}, date=${dateParam}`);
    
    // 解析日期
    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { success: false, message: '无效的日期格式' },
        { status: 400 }
      );
    }
    
    try {
      // 有效结果码列表
      const validCodesStr = VALID_RESULT_CODES.map(code => `'${code}'`).join(',');
      
      // 根据不同时间周期构建日期筛选条件
      let dateFilter;
    if (period === 'year') {
        const year = dateParam.split('-')[0];
        dateFilter = `YEAR(exec_start_time) = ${year}`;
    } else if (period === 'month') {
        const [year, month] = dateParam.split('-');
        dateFilter = `YEAR(exec_start_time) = ${year} AND MONTH(exec_start_time) = ${month}`;
      } else { // day
        dateFilter = `DATE(exec_start_time) = '${dateParam}'`;
      }
  
      // 查询组织调用统计
      const orgStatsQuery = `
      SELECT 
          o.org_id,
          o.org_name AS organizationName,
          COUNT(*) AS total,
          SUM(CASE WHEN l.result_code IN (${validCodesStr}) THEN 1 ELSE 0 END) AS validTotal,
          SUM(CASE WHEN l.result_code NOT IN (${validCodesStr}) THEN 1 ELSE 0 END) AS invalidTotal,
          AVG(l.cost_time) AS avgResponseTime
        FROM 
          t_service_log l
        JOIN 
          t_org_info o ON l.org_id = o.org_id
      WHERE 
          ${dateFilter}
      GROUP BY 
          o.org_id, o.org_name
      ORDER BY 
          total DESC
      `;
      
      console.log('执行SQL查询:', orgStatsQuery);
      
      // 执行查询
      const orgData = await query(
        orgStatsQuery,
        [],
        ORG_STATS_CACHE_TTL
      );
  
      // 处理查询结果，确保返回的数据格式正确
      const formattedData = orgData.map(org => {
        const total = Number(org.total || 0);
        const validTotal = Number(org.validTotal || 0);
        const invalidTotal = Number(org.invalidTotal || 0);
        
        // 计算有效率
        const validPercentage = total > 0 ? (validTotal / total) * 100 : 0;
        
        return {
          org_id: org.org_id,
          organizationName: org.organizationName || '未知客户',
          total,
          validTotal,
          invalidTotal,
          validPercentage: parseFloat(validPercentage.toFixed(1)),
          avgResponseTime: Number(org.avgResponseTime || 0)
        };
      });
      
      console.log(`查询到 ${formattedData.length} 条组织数据`);
      
      // 如果查询结果为空，提供提示
      if (formattedData.length === 0) {
        console.log('未查询到组织数据，尝试检查数据库连接和表数据');
      }
      
      // 返回结果时包含元数据
      return NextResponse.json({
        success: true,
        data: formattedData,
        meta: {
          fetchTime,
          period,
          date: dateParam,
          ttl: ORG_STATS_CACHE_TTL
        }
      });
    } catch (queryError: any) {
      console.error('组织统计数据库查询错误:', queryError);
      return NextResponse.json({
        success: false,
        error: `数据库查询失败: ${queryError.message || queryError}`
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('组织统计API错误:', error);
    return NextResponse.json({
      success: false,
      error: `获取组织统计失败: ${error.message || error}`
    }, { status: 500 });
  }
} 