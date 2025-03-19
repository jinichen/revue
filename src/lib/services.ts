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
 * Fetches call statistics by period
 */
export const getCallStats = async (
  period: 'year' | 'month' | 'day',
  date?: string,
  orgId?: string
): Promise<{
  data: Array<{
    date: string;
    validCalls: number;
    invalidCalls: number;
  }>,
  summary: {
    total: number;
    validTotal: number;
    invalidTotal: number;
    change: number;
    changePercentage: number;
  },
  resultCodes: Array<{
    result_code: string;
    result_msg: string;
    count: number;
    percentage: number;
  }>,
  organization?: {
    org_id: string;
    org_name: string;
  }
}> => {
  const queryParams = new URLSearchParams();
  queryParams.append('period', period);
  
  if (date) {
    queryParams.append('date', date);
  }
  
  if (orgId) {
    queryParams.append('org_id', orgId);
  }
  
  const response = await fetchApi<{
    data: Array<{
      date: string;
      validCalls: number;
      invalidCalls: number;
    }>,
    summary: {
      total: number;
      validTotal: number;
      invalidTotal: number;
      change: number;
      changePercentage: number;
    },
    resultCodes: Array<{
      result_code: string;
      result_msg: string;
      count: number;
      percentage: number;
    }>,
    organization?: {
      org_id: string;
      org_name: string;
    }
  }>(`/api/analytics/call-stats?${queryParams.toString()}`);
  return response.data;
};

/**
 * Fetches statistics for all organizations
 */
export const getOrgCallStats = async (
  period: 'year' | 'month' | 'day',
  date?: string
): Promise<{
  period: string;
  startDate: string;
  endDate: string;
  data: Array<{
    org_id: string;
    org_name: string;
    total_calls: number;
    valid_calls: number;
    invalid_calls: number;
    avg_response_time_ms: number;
    change: number;
    changePercentage: number;
    top_result_codes: Array<{
      result_code: string;
      result_msg: string;
      count: number;
    }>
  }>
}> => {
  console.log('getOrgCallStats called with params:', { period, date });
  
  const queryParams = new URLSearchParams();
  queryParams.append('period', period);
  
  if (date) {
    queryParams.append('date', date);
  }
  
  const apiUrl = `/api/analytics/org-stats?${queryParams.toString()}`;
  console.log('Requesting organization stats from:', apiUrl);
  
  try {
    const response = await fetchApi<{
      period: string;
      startDate: string;
      endDate: string;
      data: Array<{
        org_id: string;
        org_name: string;
        total_calls: number;
        valid_calls: number;
        invalid_calls: number;
        avg_response_time_ms: number;
        change: number;
        changePercentage: number;
        top_result_codes: Array<{
          result_code: string;
          result_msg: string;
          count: number;
        }>
      }>
    }>(apiUrl);
    
    console.log('Organization stats API response:', response);
    return response.data;
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    throw error;
  }
};

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