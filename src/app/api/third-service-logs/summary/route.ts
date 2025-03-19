/**
 * API route for third-party service logs summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { RevenueSummary } from '@/types';
import { query } from '@/lib/db';

/**
 * GET handler for third-party service logs summary
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';
    const orgId = searchParams.get('orgId');
    
    // Construct the SQL query based on period and optional orgId
    let sql = `
      SELECT 
        COUNT(*) as count,
        SUM(cost_time) as total_cost_time
      FROM 
        t_third_service_log
      WHERE 1=1
    `;
    
    const params: Array<string | number> = [];
    
    // Add time constraints based on period
    let timeFilterClause = '';
    const now = new Date();
    
    if (period === 'year') {
      timeFilterClause = `
        AND YEAR(exec_start_time) = YEAR(NOW())
      `;
    } else if (period === 'month') {
      timeFilterClause = `
        AND YEAR(exec_start_time) = YEAR(NOW())
        AND MONTH(exec_start_time) = MONTH(NOW())
      `;
    } else if (period === 'day') {
      timeFilterClause = `
        AND DATE(exec_start_time) = CURDATE()
      `;
    }
    
    sql += timeFilterClause;
    
    // Add organization filter if provided
    if (orgId) {
      sql += ` AND org_id = ?`;
      params.push(orgId);
    }
    
    // Execute query
    const result = await query(sql, params);
    const data = result[0] as any;
    
    // Calculate change and change percentage (assuming no previous data for now)
    const total = Number(data?.total_cost_time || 0);
    const count = Number(data?.count || 0);
    const average = count > 0 ? total / count : 0;
    
    // Create summary object
    const summary: RevenueSummary = {
      total: total,
      average: average,
      change: 0, // No historical data for comparison yet
      changePercentage: 0 // No historical data for comparison yet
    };
    
    // Return response with period information in message
    let periodText = '';
    if (period === 'year') {
      periodText = `${now.getFullYear()}`;
    } else if (period === 'month') {
      periodText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    } else {
      periodText = `${now.toISOString().split('T')[0]}`;
    }
    
    return NextResponse.json({
      data: summary,
      period: periodText, // Include period in response
      success: true,
      message: '获取第三方服务日志汇总成功',
      status: 200
    });
  } catch (error) {
    console.error('Error fetching third-party service logs summary:', error);
    return NextResponse.json(
      {
        data: null,
        success: false,
        message: '获取第三方服务日志汇总失败',
        status: 500
      },
      { status: 500 }
    );
  }
} 