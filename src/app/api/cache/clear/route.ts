import { NextRequest, NextResponse } from "next/server";
import { queryCache } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 清除所有查询缓存
    queryCache.clearAll();
    
    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: '缓存已成功清除',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('清除缓存时出错:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '清除缓存失败'
      },
      { status: 500 }
    );
  }
} 