import { NextRequest, NextResponse } from 'next/server';
import { ServiceLog, FilterParams } from '@/types';
import { query } from '@/lib/db';

/**
 * GET handler for service logs
 * Supports filtering by date range, organization, business type, and authentication mode
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const org_id = searchParams.get('org_id');
    const biztype = searchParams.get('biztype');
    const auth_mode = searchParams.get('auth_mode');
    const success_flag = searchParams.get('success_flag');
    
    // Build SQL query with conditions
    let sql = `
      SELECT * 
      FROM t_service_log 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Add filter conditions if provided
    if (startDate) {
      sql += ' AND exec_start_time >= ?';
      params.push(new Date(startDate));
    }
    
    if (endDate) {
      sql += ' AND exec_start_time <= ?';
      params.push(new Date(endDate));
    }
    
    if (org_id) {
      sql += ' AND org_id = ?';
      params.push(org_id);
    }
    
    if (biztype) {
      sql += ' AND biztype = ?';
      params.push(biztype);
    }
    
    if (auth_mode) {
      sql += ' AND auth_mode = ?';
      params.push(auth_mode);
    }
    
    if (success_flag) {
      sql += ' AND success_flag = ?';
      params.push(success_flag);
    }
    
    // Order by execution start time, most recent first
    sql += ' ORDER BY exec_start_time DESC LIMIT 1000';
    
    const logs = await query<ServiceLog>(sql, params);
    
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching service logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service logs' },
      { status: 500 }
    );
  }
} 