/**
 * API route for getting reconciliation data
 * 
 * Provides detailed service log data for reconciliation
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, queryCache } from '@/lib/db';
import { BillingConfig } from '@/types';

// 从环境变量读取默认分页大小，默认为20条
const DEFAULT_PAGE_SIZE = parseInt(process.env.RECONCILIATION_PAGE_SIZE || '20', 10);

interface ReconciliationItem {
  org_name: string;
  auth_mode: string;
  exec_start_time: string;
  result_code: string;
  result_msg: string;
  count: number;
}

interface ReconciliationResult {
  orgId: string;
  orgName: string;
  periodStart: string;
  periodEnd: string;
  items: ReconciliationItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  summary: Array<{
    auth_mode: string;
    total: number;
    success: number;
    fail: number;
    details: Array<{
      result_code: string;
      result_msg: string;
      count: number;
    }>;
  }>;
}

interface ServiceLogItem {
  org_name: string;
  auth_mode: string;
  auth_date: string;
  success_count: number;
  error_details: string | null;
  total_count: number;
}

// 格式化日期为MySQL格式
const formatDateForMySQL = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    // 如果是未来日期，使用当前日期
    if (date > now) {
      console.log('检测到未来日期，使用当前日期:', {
        inputDate: dateString,
        currentDate: now.toISOString().split('T')[0]
      });
      return now.toISOString().split('T')[0];
    }
    
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.error('Invalid date format:', dateString);
    return '';
  }
};

// 格式化开始和结束日期
const formatDateRange = (startDate: string, endDate: string) => {
  const start = formatDateForMySQL(startDate);
  const end = formatDateForMySQL(endDate);
  
  console.log('格式化日期范围:', {
    原始开始日期: startDate,
    原始结束日期: endDate,
    处理后开始日期: start,
    处理后结束日期: end
  });
  
  // 如果开始和结束日期相同，结束日期要加上23:59:59
  if (start === end) {
    return {
      start: `${start} 00:00:00`,
      end: `${end} 23:59:59`
    };
  }
  
  return {
    start: `${start} 00:00:00`,
    end: `${end} 23:59:59`
  };
};

/**
 * 从t_service_log表获取对账单数据，支持分页
 */
const generateReconciliationData = async (
  config: BillingConfig, 
  page: number = 1, 
  pageSize: number = DEFAULT_PAGE_SIZE
) => {
  try {
    if (!config.orgId) {
      throw new Error('缺少组织ID');
    }

    console.log('生成对账单数据，参数:', {
      orgId: config.orgId,
      periodStart: config.periodStart,
      periodEnd: config.periodEnd
    });
    
    // 处理日期范围
    const dateRange = formatDateRange(config.periodStart, config.periodEnd);
    console.log('处理后的日期范围:', dateRange);

    // 先查询组织信息
    const orgQuery = `
      SELECT org_id, org_name
      FROM t_org_info
      WHERE org_id = ?
    `;

    const orgs = await query<{ org_id: string; org_name: string }>(orgQuery, [config.orgId]);
    if (orgs.length === 0) {
      throw new Error('找不到指定的客户');
    }
    
    const orgName = orgs[0].org_name;
    
    // 查询服务调用记录
    const serviceQuery = `
      SELECT 
        oi.org_name,
        sl.auth_mode,
        DATE(sl.exec_start_time) as auth_date,
        sl.result_code,
        sl.result_msg,
        COUNT(*) as count
      FROM 
        t_service_log sl
      JOIN
        t_org_info oi ON sl.org_id = oi.org_id
      WHERE 
        sl.org_id = ?
        AND sl.exec_start_time BETWEEN ? AND ?
      GROUP BY 
        oi.org_name,
        sl.auth_mode,
        DATE(sl.exec_start_time),
        sl.result_code,
        sl.result_msg
      ORDER BY 
        sl.auth_mode ASC,
        sl.result_code ASC
    `;

    console.log('执行服务记录查询:', {
      query: serviceQuery,
      params: [config.orgId, dateRange.start, dateRange.end]
    });

    const serviceData = await query<{
      org_name: string;
      auth_mode: string;
      auth_date: string;
      result_code: string;
      result_msg: string;
      count: number;
    }>(serviceQuery, [config.orgId, dateRange.start, dateRange.end]);

    console.log('查询结果:', {
      totalRows: serviceData.length,
      firstRow: serviceData[0] || null,
      dateRange,
      orgName
    });

    // 如果没有数据，返回空结果
    if (serviceData.length === 0) {
      return {
        success: true,
        message: `未找到${orgName}在${config.periodStart}的对账单数据`,
        data: {
          orgId: config.orgId,
          orgName,
          periodStart: config.periodStart,
          periodEnd: config.periodEnd,
          items: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          pageSize,
          summary: []
        }
      };
    }
    
    // 格式化返回数据
    const formattedData: ReconciliationItem[] = serviceData.map(item => ({
      org_name: item.org_name,
      auth_mode: item.auth_mode,
      exec_start_time: item.auth_date,
      result_code: item.result_code,
      result_msg: item.result_msg,
      count: Number(item.count)
    }));
    
    // 计算分页
    const totalItems = serviceData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pagedData = formattedData.slice(start, end);

    // 生成汇总数据，按认证方式分组
    const summary = formattedData.reduce((acc, item) => {
      // 查找当前认证方式的汇总记录
      let modeEntry = acc.find(entry => entry.auth_mode === item.auth_mode);
      
      // 如果不存在，创建一个新的汇总记录
      if (!modeEntry) {
        modeEntry = {
          auth_mode: item.auth_mode,
          total: 0,
          success: 0,
          fail: 0,
          details: []
        };
        acc.push(modeEntry);
      }
      
      // 有效认证返回码列表
      const validResultCodes = ['0', '200004', '210001', '210002', '210004', '210005', '210006', '210009'];
      
      // 更新总数
      modeEntry.total += item.count;
      
      // 根据返回码判断成功或失败
      if (validResultCodes.includes(item.result_code)) {
        modeEntry.success += item.count;
      } else {
        modeEntry.fail += item.count;
      }
      
      // 添加到明细中
      const detailEntry = modeEntry.details.find(d => 
        d.result_code === item.result_code && d.result_msg === item.result_msg
      );
      
      if (detailEntry) {
        detailEntry.count += item.count;
      } else {
        modeEntry.details.push({
          result_code: item.result_code,
          result_msg: item.result_msg,
          count: item.count
        });
      }
      
      return acc;
    }, [] as Array<{
      auth_mode: string;
      total: number;
      success: number;
      fail: number;
      details: Array<{
        result_code: string;
        result_msg: string;
        count: number;
      }>;
    }>);

    // 返回完整的响应结构
    return {
      success: true,
      message: '获取对账单数据成功',
      data: {
      orgId: config.orgId,
      orgName,
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
        items: pagedData,
      totalCount: totalItems,
      totalPages,
      currentPage: page,
        pageSize,
        summary
      }
    };
  } catch (error) {
    console.error('对账单数据生成失败:', error);
    throw error;
  }
};

/**
 * POST handler for reconciliation data
 */
export async function POST(req: NextRequest) {
  try {
    const { config, page = 1, pageSize = DEFAULT_PAGE_SIZE } = await req.json();
    
    if (!config.orgId) {
      return NextResponse.json(
        { success: false, message: '请选择客户' },
        { status: 400 }
      );
    }
    
    // 使用已经实现的函数生成对账单数据
    const result = await generateReconciliationData(config, page, pageSize);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('获取对账单数据失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '获取对账单数据失败'
      },
      { status: 500 }
    );
  }
} 