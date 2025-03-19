/**
 * Reconciliation service for data retrieval and export
 */

import { fetchApi } from '@/lib/api';
import { BillingConfig } from '@/types';

// 获取每页显示的记录数，默认为20
const DEFAULT_PAGE_SIZE = typeof window !== 'undefined' 
  ? parseInt(process.env.NEXT_PUBLIC_RECONCILIATION_PAGE_SIZE || '20', 10) 
  : 20;

// 对账单数据类型
export interface ReconciliationData {
  items: Array<{
    org_name: string;
    auth_mode: string;
    exec_start_time: string;
    result_code: string;
    result_msg: string;
    count: number;
  }>;
  totalCount: number;
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
  page: number;
  pageSize: number;
}

export interface ReconciliationResponse {
  success: boolean;
  message: string;
  data?: ReconciliationData;
}

export interface ExportResponse {
  success: boolean;
  message: string;
  data?: {
    url: string;
    fileName: string;
  };
}

/**
 * 获取对账单数据
 * @param config 账单配置
 * @param page 页码（默认1）
 * @param pageSize 每页条数（默认从环境变量获取，如未设置则为20）
 * @returns 对账单数据
 */
export async function getReconciliation(
  config: BillingConfig, 
  page: number = 1, 
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<ReconciliationResponse> {
  return fetchApi('/api/billing/reconciliation', {
    method: 'POST',
    body: JSON.stringify({
      config,
      page,
      pageSize
    })
  });
}

/**
 * Export reconciliation data for a specific customer
 * @param config Billing configuration with organization and time period
 * @returns Promise with file URL and name
 */
export async function exportReconciliation(
  config: BillingConfig & { format?: 'markdown' | 'excel' }
): Promise<ExportResponse> {
  return fetchApi('/api/billing/reconciliation/export', {
    method: 'POST',
    body: JSON.stringify(config)
  });
} 