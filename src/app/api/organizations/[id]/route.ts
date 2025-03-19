/**
 * API route for single organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Organization } from '@/types';

/**
 * GET handler for specific organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    
    // Query database for the organization
    const organizations = await query<Organization>(`
      SELECT 
        org_id, 
        org_name
      FROM 
        t_org_info
      WHERE 
        org_id = ?
    `, [orgId]);
    
    // Check if we found the organization
    if (!organizations || organizations.length === 0) {
      return NextResponse.json(
        {
          data: null,
          success: false,
          message: '未找到指定组织',
          status: 404
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      data: organizations[0],
      success: true,
      message: '获取组织信息成功',
      status: 200
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      {
        data: null,
        success: false,
        message: '获取组织信息失败',
        status: 500
      },
      { status: 500 }
    );
  }
} 