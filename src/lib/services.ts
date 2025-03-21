import { fetchApi, ApiResponse } from './api';
import { 
  Organization, 
  ServiceLog, 
  FilterParams, 
  OrgUsageData, 
  BillInfo, 
  RevenueByDate, 
  RevenueSummary,
  CallStatsByDate
} from '@/types';
import { format } from 'date-fns';

/**
 * Fetches organizations
 */
export const getOrganizations = async (): Promise<Organization[]> => {
  try {
    console.log('开始获取组织列表');
    const response = await fetchApi<{
      success: boolean;
      message: string;
      data: Organization[];
    }>('/api/organizations');
    
    console.log('组织列表API响应:', response);
    
    if (!response.success) {
      throw new Error(response.message || '获取组织列表失败');
    }
    
    if (!Array.isArray(response.data)) {
      console.error('组织列表数据格式错误:', response.data);
      throw new Error('组织列表数据格式错误');
    }
    
    return response.data;
  } catch (error) {
    console.error('获取组织列表异常:', error);
    throw error;
  }
};

/**
 * Fetches service logs with optional filters
 */
export const getServiceLogs = async (params?: FilterParams): Promise<ServiceLog[]> => {
  const queryParams = new URLSearchParams();
  
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate.toISOString());
  }
  
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate.toISOString());
  }
  
  if (params?.org_id) {
    queryParams.append('org_id', params.org_id);
  }
  
  if (params?.biztype) {
    queryParams.append('biztype', params.biztype);
  }
  
  if (params?.auth_mode) {
    queryParams.append('auth_mode', params.auth_mode);
  }
  
  if (params?.success_flag) {
    queryParams.append('success_flag', params.success_flag);
  }
  
  const query = queryParams.toString();
  const response = await fetchApi<ServiceLog[]>(`/api/service-logs${query ? `?${query}` : ''}`);
  return response.data;
};

/**
 * Fetches organization usage data
 */
export const getOrgUsageData = async (startDate?: Date, endDate?: Date): Promise<OrgUsageData[]> => {
  const queryParams = new URLSearchParams();
  
  if (startDate) {
    queryParams.append('startDate', startDate.toISOString());
  }
  
  if (endDate) {
    queryParams.append('endDate', endDate.toISOString());
  }
  
  const query = queryParams.toString();
  const response = await fetchApi<OrgUsageData[]>(`/api/analytics/usage${query ? `?${query}` : ''}`);
  return response.data;
};

/**
 * Fetches revenue data for trends and summary
 */
export const getRevenueData = async (
  startDate: Date, 
  endDate: Date, 
  period: 'day' | 'week' | 'month' = 'day'
): Promise<{
  byDate: RevenueByDate[],
  summary: RevenueSummary
}> => {
  const queryParams = new URLSearchParams();
  queryParams.append('startDate', startDate.toISOString());
  queryParams.append('endDate', endDate.toISOString());
  queryParams.append('period', period);
  
  const response = await fetchApi<{
    byDate: RevenueByDate[],
    summary: RevenueSummary
  }>(`/api/analytics/revenue?${queryParams.toString()}`);
  return response.data;
};

/**
 * 获取调用统计数据
 * @param period 统计周期 (day/month/year)
 * @param date 日期，格式为YYYY-MM-DD
 * @param orgId 组织ID (可选)
 */
export async function getCallStats(
  period: 'year' | 'month' | 'day' = 'day',
  date: string = format(new Date(), 'yyyy-MM-dd')
): Promise<ApiResponse<any>> {
  console.log(`调用getCallStats API - 周期: ${period}, 日期: ${date}`);
  
  try {
    const response = await fetch(`/api/analytics/call-stats?period=${period}&date=${date}`);
    
    console.log(`getCallStats API响应状态: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`获取调用统计失败: ${response.status} ${response.statusText}\n${errorText}`);
      throw new Error(`获取调用统计失败: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`getCallStats API返回数据:`, result);
    
    return result;
  } catch (error) {
    console.error('getCallStats API错误:', error);
    return {
      success: false,
      error: `${error}`
    };
  }
}

/**
 * 获取组织调用统计数据
 * @param period 统计周期 (day/month/year)
 * @param date 日期，格式为YYYY-MM-DD
 */
export async function getOrgCallStats(
  period: 'day' | 'month' | 'year',
  date?: string
) {
  try {
    // 默认使用当前日期
    const currentDate = date || format(new Date(), 'yyyy-MM-dd');
    
    // 构建API请求URL
    const url = new URL('/api/analytics/org-stats', window.location.origin);
    url.searchParams.append('period', period);
    url.searchParams.append('date', currentDate);
    
    // 发送请求
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`获取组织统计失败: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('获取组织调用统计数据错误:', error);
    throw error;
  }
}

/**
 * Fetches filter options for dropdowns
 */
export const getFilterOptions = async (): Promise<{
  bizTypes: string[],
  authModes: string[],
  successFlags: string[]
}> => {
  const response = await fetchApi<{
    bizTypes: string[],
    authModes: string[],
    successFlags: string[]
  }>('/api/filters');
  return response.data;
}; 