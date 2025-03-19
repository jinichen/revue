/**
 * API route for generating bill PDFs
 * 
 * Takes billing configuration and generates a PDF file for download
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { BillingConfig } from '@/types';

// 辅助函数：将日期对象或字符串格式化为MySQL日期字符串 (YYYY-MM-DD HH:MM:SS)
function formatDateForMySQL(date: Date | string): string {
  if (typeof date === 'string') {
    return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// 定义有效认证的返回码
const validResultCodes = ['0', '200004', '210001', '210002', '210004', '210005', '210006', '210009'];

// 定义返回码信息映射
interface ResultCodeItem {
  code: string;
  message: string;
  count: number;
  valid_count?: number;
  mode?: string;
}

/**
 * 从t_service_log表获取账单数据，关联t_org_info获取组织名称
 * 按照客户(org_id) + 认证模式(auth_mode) + 返回码(result_code)进行统计
 */
const generateBillData = async (config: BillingConfig) => {
  try {
    console.log('生成账单数据，参数:', config);
    
    // 获取组织信息
    const orgQuery = `
      SELECT 
        org_id,
        org_name
      FROM 
        t_org_info
      WHERE 
        org_id = ?
      LIMIT 1
    `;
    
    console.log('执行组织查询:', orgQuery, [config.orgId]);
    const orgs = await query<{org_id: string, org_name: string}>(orgQuery, [config.orgId]);
    console.log('组织查询结果:', orgs);
    
    if (orgs.length === 0) {
      throw new Error('找不到指定的客户');
    }
    
    const orgName = orgs[0].org_name;
    console.log('找到客户:', orgName);
    
    // 统计指定日期范围内的认证数据（按客户 + 认证模式 + 返回码分组）
    const serviceLogsQuery = `
      SELECT 
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
        CASE WHEN sl.result_code = '0' THEN '0' ELSE '1' || sl.result_code END ASC
    `;
    
    console.log('执行服务日志查询:', serviceLogsQuery, [
      config.orgId,
      formatDateForMySQL(config.periodStart),
      formatDateForMySQL(config.periodEnd)
    ]);
    
    const serviceLogs = await query<{
      org_id: string;
      org_name: string;
      auth_mode: string;
      result_code: string;
      result_msg: string;
      count: number;
    }>(serviceLogsQuery, [
      config.orgId,
      formatDateForMySQL(config.periodStart),
      formatDateForMySQL(config.periodEnd)
    ]);
    
    console.log('获取到服务日志数:', serviceLogs.length);
    
    // 处理数据库查询结果
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
    serviceLogs.forEach(log => {
      const isValidAuth = validResultCodes.includes(log.result_code);
      const item: ResultCodeItem = {
        code: log.result_code,
        message: log.result_msg || '',
        count: Number(log.count)
      };
      
      if (isValidAuth) {
        item.valid_count = Number(log.count);
      }
      
      // 严格按认证模式分组
      if (log.auth_mode === '0x40') {
        twoFactorItems.push(item);
        twoFactorTotal += Number(log.count);
        if (isValidAuth) {
          twoFactorValidTotal += Number(log.count);
        }
      } else if (log.auth_mode === '0x42') {
        threeFactorItems.push(item);
        threeFactorTotal += Number(log.count);
        if (isValidAuth) {
          threeFactorValidTotal += Number(log.count);
        }
      }
    });
    
    // 确保返回码按正确顺序排序（0放最前面，其他按数值升序）
    const sortByResultCode = (a: ResultCodeItem, b: ResultCodeItem) => {
      if (a.code === '0') return -1;
      if (b.code === '0') return 1;
      return parseInt(a.code) - parseInt(b.code);
    };
    
    twoFactorItems.sort(sortByResultCode);
    threeFactorItems.sort(sortByResultCode);
    
    // 最终返回格式化的数据
    return {
      orgId: config.orgId,
      orgName,
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
      twoFactorItems,
      threeFactorItems,
      twoFactorTotal,
      twoFactorValidTotal,
      threeFactorTotal,
      threeFactorValidTotal,
      // 计算两要素和三要素认证的金额
      twoFactorAmount: twoFactorValidTotal * (config.twoFactorPrice / 100),
      threeFactorAmount: threeFactorValidTotal * (config.threeFactorPrice / 100),
      // 总金额
      totalAmount: (twoFactorValidTotal * (config.twoFactorPrice / 100)) + 
                   (threeFactorValidTotal * (config.threeFactorPrice / 100))
    };
  } catch (error) {
    console.error('账单数据生成失败:', error);
    throw error;
  }
};

/**
 * POST handler for bill generation
 */
export async function POST(req: NextRequest) {
  try {
    const config = await req.json() as BillingConfig;
    console.log('收到账单生成请求:', config);
    
    // 验证必要的参数
    if (!config.orgId || !config.periodStart || !config.periodEnd) {
      return NextResponse.json(
        { error: '缺少必要的参数' }, 
        { status: 400 }
      );
    }
    
    // 获取账单数据
    const billData = await generateBillData(config);
    
    console.log('账单数据:', billData);
    
    // TODO: 生成账单PDF并返回下载链接（简化示例）
    const fileName = `bill_${config.orgId}_${config.periodStart.replace(/-/g, '')}_${config.periodEnd.replace(/-/g, '')}.pdf`;
    
    // 返回模拟的下载链接（实际项目中需要实现PDF生成并存储）
    return NextResponse.json({
      success: true,
      message: '账单生成成功',
      data: {
        url: `/api/download/${fileName}`,
        fileName
      }
    });
    
  } catch (error) {
    console.error('账单生成失败:', error);
    return NextResponse.json(
      { success: false, message: '账单生成失败', error: error instanceof Error ? error.message : '未知错误' }, 
      { status: 500 }
    );
  }
} 