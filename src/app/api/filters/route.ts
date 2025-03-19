import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET handler for filter options
 * Returns distinct values for biztype, auth_mode, and success_flag
 * for filter dropdowns in the UI
 */
export async function GET() {
  try {
    // Get distinct biztype values
    const biztypeSql = `
      SELECT DISTINCT biztype 
      FROM t_service_log 
      WHERE biztype IS NOT NULL
      ORDER BY biztype
    `;
    const bizTypes = await query<{ biztype: string }>(biztypeSql);
    
    // Get distinct auth_mode values
    const authModeSql = `
      SELECT DISTINCT auth_mode 
      FROM t_service_log 
      WHERE auth_mode IS NOT NULL
      ORDER BY auth_mode
    `;
    const authModes = await query<{ auth_mode: string }>(authModeSql);
    
    // Get distinct success_flag values
    const successFlagSql = `
      SELECT DISTINCT success_flag
      FROM t_service_log
      WHERE success_flag IS NOT NULL
      ORDER BY success_flag
    `;
    const successFlags = await query<{ success_flag: string }>(successFlagSql);
    
    return NextResponse.json({
      bizTypes: bizTypes.map(item => item.biztype),
      authModes: authModes.map(item => item.auth_mode),
      successFlags: successFlags.map(item => item.success_flag)
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
} 