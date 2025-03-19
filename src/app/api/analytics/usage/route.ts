import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { OrgUsageData } from '@/types';

/**
 * GET handler for organization usage analytics
 * Provides aggregated usage statistics for organizations 
 * within a specified date range
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Build SQL query with conditions
    let sql = `
      SELECT 
        s.org_id,
        o.org_name,
        COUNT(*) as total_usage,
        SUM(CASE WHEN s.success_flag = 'Y' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN s.success_flag != 'Y' THEN 1 ELSE 0 END) as failure_count,
        AVG(s.cost_time) as avg_response_time
      FROM t_service_log s
      JOIN t_org_info o ON s.org_id = o.org_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Add filter conditions if provided
    if (startDate) {
      sql += ' AND s.exec_start_time >= ?';
      params.push(new Date(startDate));
    }
    
    if (endDate) {
      sql += ' AND s.exec_start_time <= ?';
      params.push(new Date(endDate));
    }
    
    // Group by organization and order by total usage
    sql += ' GROUP BY s.org_id, o.org_name ORDER BY total_usage DESC';
    
    const usageData = await query<OrgUsageData>(sql, params);
    
    return NextResponse.json(usageData);
  } catch (error) {
    console.error('Error fetching organization usage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization usage data' },
      { status: 500 }
    );
  }
} 