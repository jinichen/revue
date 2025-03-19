/**
 * API route for generating bill previews
 * 
 * Provides bill preview data including:
 * - Organization details
 * - Two-factor authentication statistics
 * - Three-factor authentication statistics
 * - Pricing and total calculations
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, queryCache } from '@/lib/db';
import { BillingConfig } from '@/types';

interface ResultCodeItem {
  mode: string;
  result_code: string;
  result_msg: string;
  count: number;
  valid_count?: number;
}

// 定义有效认证的返回码
const VALID_RESULT_CODES = [0, 200004, 210001, 210002, 210004, 210005, 210006, 210009];

// 辅助函数：将日期对象或字符串格式化为MySQL日期字符串 (YYYY-MM-DD HH:MM:SS)
function formatDateForMySQL(date: Date | string): string {
  if (typeof date === 'string') {
    return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * 从t_service_log表获取账单数据，关联t_org_info获取组织名称
 * 按照客户(org_id) + 认证模式(auth_mode) + 返回码(result_code)进行统计
 */
const generateBillPreview = async (config: BillingConfig) => {
  try {
    console.log('生成账单预览，参数:', config);
    
    // 缓存TTL - 1小时
    const CACHE_TTL = 60 * 60 * 1000;
    
    // 生成缓存键
    const cacheKey = `bill-preview:${config.orgId}:${config.periodStart}:${config.periodEnd}`;
    
    // 尝试从缓存获取
    const cachedResult = queryCache.get(cacheKey, []);
    if (cachedResult) {
      console.log(`Returning cached bill preview for ${cacheKey}`);
      return cachedResult;
    }
    
    // 优化：将多个查询合并为一个事务
    const [orgs, serviceLogs] = await Promise.all([
      // 1. 获取组织信息
      query<{org_id: string, org_name: string}>(
        `SELECT 
          org_id,
          org_name
        FROM 
          t_org_info
        WHERE 
          org_id = ?
        LIMIT 1`,
        [config.orgId]
      ),
      
      // 2. 获取服务日志
      query(
        `SELECT 
          sl.org_id,
          oi.org_name,
          sl.auth_mode,
          sl.result_code,
          sl.result_msg,
          COUNT(*) as count
        FROM 
          t_service_log sl
        JOIN
          t_org_info oi ON sl.org_id = oi.org_id
        WHERE 
          sl.org_id = ?
          AND sl.exec_start_time >= ?
          AND sl.exec_start_time <= ?
        GROUP BY 
          sl.org_id, sl.auth_mode, sl.result_code, sl.result_msg
        ORDER BY 
          sl.auth_mode ASC, 
          CASE WHEN sl.result_code = '0' THEN '0' ELSE '1' || sl.result_code END ASC`,
        [
          config.orgId,
          formatDateForMySQL(config.periodStart),
          formatDateForMySQL(config.periodEnd)
        ],
        CACHE_TTL // 启用缓存
      )
    ]);
    
    console.log('组织查询结果:', orgs);
    
    if (orgs.length === 0) {
      throw new Error('找不到指定的客户');
    }
    
    const orgName = orgs[0].org_name;
    console.log('找到客户:', orgName);
    
    console.log('获取到服务日志数:', serviceLogs.length);
    
    // 分离两要素和三要素认证记录
    const twoFactorItems: ResultCodeItem[] = [];
    const threeFactorItems: ResultCodeItem[] = [];
    
    let twoFactorTotal = 0;
    let twoFactorValidTotal = 0;
    let threeFactorTotal = 0;
    let threeFactorValidTotal = 0;
    
    if (serviceLogs.length > 0) {
      console.log('服务日志示例:', serviceLogs[0]);
    } else {
      console.log('未找到服务日志记录');
    }
    
    // 按照认证模式分组处理数据
    serviceLogs.forEach((log: any) => {
      const isValidAuth = VALID_RESULT_CODES.includes(Number(log.result_code || 0));
      const item: ResultCodeItem = {
        mode: String(log.auth_mode || ''),
        result_code: String(log.result_code || ''),
        result_msg: String(log.result_msg || ''),
        count: Number(log.count || 0)
      };
      
      if (isValidAuth) {
        item.valid_count = Number(log.count || 0);
      }
      
      // 严格按认证模式分组
      if (log.auth_mode === '0x40') {
        twoFactorItems.push(item);
        twoFactorTotal += Number(log.count || 0);
        if (isValidAuth) {
          twoFactorValidTotal += Number(log.count || 0);
        }
      } else if (log.auth_mode === '0x42') {
        threeFactorItems.push(item);
        threeFactorTotal += Number(log.count || 0);
        if (isValidAuth) {
          threeFactorValidTotal += Number(log.count || 0);
        }
      }
    });
    
    // 确保返回码按正确顺序排序（0放最前面，其他按数值升序）
    const sortByResultCode = (a: ResultCodeItem, b: ResultCodeItem) => {
      if (a.result_code === '0') return -1;
      if (b.result_code === '0') return 1;
      return parseInt(a.result_code) - parseInt(b.result_code);
    };
    
    twoFactorItems.sort(sortByResultCode);
    threeFactorItems.sort(sortByResultCode);
    
    // 最终结果
    const result = {
      orgId: config.orgId,
      orgName,
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
      // 二要素数据
      twoFactorItems,
      twoFactorTotal,
      twoFactorValidTotal,
      twoFactorPrice: config.twoFactorPrice / 100, // 将分转换为元
      twoFactorAmount: twoFactorValidTotal * (config.twoFactorPrice / 100),
      // 三要素数据
      threeFactorItems,
      threeFactorTotal,
      threeFactorValidTotal,
      threeFactorPrice: config.threeFactorPrice / 100, // 将分转换为元
      threeFactorAmount: threeFactorValidTotal * (config.threeFactorPrice / 100),
      // 总计
      totalAmount: (twoFactorValidTotal * (config.twoFactorPrice / 100)) + 
                   (threeFactorValidTotal * (config.threeFactorPrice / 100)),
      totalValidCount: twoFactorValidTotal + threeFactorValidTotal
    };
    
    // 缓存结果
    queryCache.set(cacheKey, [], result, CACHE_TTL);
    
    return result;
  } catch (error) {
    console.error('Error generating bill preview:', error);
    throw error;
  }
};

/**
 * POST handler for bill preview
 */
export async function POST(request: NextRequest) {
  try {
    const config: BillingConfig = await request.json();
    
    // Validate required fields
    if (!config.orgId) {
      return NextResponse.json({
        success: false,
        message: '请选择客户'
      }, { status: 400 });
    }
    
    if (!config.periodStart || !config.periodEnd) {
      return NextResponse.json({
        success: false,
        message: '请选择账单周期'
      }, { status: 400 });
    }
    
    const previewData = await generateBillPreview(config);
    
    return NextResponse.json({
      success: true,
      message: 'Bill preview generated successfully',
      data: previewData
    });
    
  } catch (error) {
    console.error('Failed to generate bill preview:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate bill preview'
    }, { status: 500 });
  }
} 