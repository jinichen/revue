/**
 * API route for organizations
 * 
 * Provides a list of all organizations from t_org_info table
 */
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Organization } from '@/types';

/**
 * GET handler for organizations endpoint
 * Fetches all organizations from the database
 */
export async function GET() {
  try {
    console.log('Organizations API called');
    
    // Query for all organizations
    const organizations = await query<Organization>(`
      SELECT 
        org_id,
        org_name
      FROM 
        t_org_info
      ORDER BY 
        org_name
    `);
    
    console.log(`Organizations API: Found ${organizations.length} organizations`);
    
    return NextResponse.json({
      success: true,
      message: '获取组织列表成功',
      data: organizations
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { 
        success: false,
        message: '获取组织列表失败',
        error: 'Failed to fetch organizations' 
      },
      { status: 500 }
    );
  }
} 