/**
 * Billing service for bill generation and export
 */

import { post } from '@/lib/api';
import { BillingConfig } from '@/types';

// 获取每页显示的记录数，默认为20
const DEFAULT_PAGE_SIZE = typeof window !== 'undefined' 
  ? parseInt(process.env.NEXT_PUBLIC_RECONCILIATION_PAGE_SIZE || '20', 10) 
  : 20;

/**
 * Generate bill PDF and return download URL
 */
export async function generateBill(config: BillingConfig) {
  return post<{ url: string; fileName: string }>('/api/billing/generate', config);
}

/**
 * Get bill preview data
 */
export async function getBillPreview(config: BillingConfig) {
  return post<{
    orgName: string;
    orgId: string;
    periodStart: string;
    periodEnd: string;
    totalAmount: number;
    totalValidCount: number;
    // 二要素数据
    twoFactorItems: Array<{
      mode: string;
      result_code: string;
      result_msg: string;
      count: number;
      valid_count?: number;
    }>;
    twoFactorPrice: number;
    twoFactorTotal: number;
    twoFactorValidTotal: number;
    twoFactorAmount: number;
    // 三要素数据
    threeFactorItems: Array<{
      mode: string;
      result_code: string;
      result_msg: string;
      count: number;
      valid_count?: number;
    }>;
    threeFactorPrice: number;
    threeFactorTotal: number;
    threeFactorValidTotal: number;
    threeFactorAmount: number;
  }>('/api/billing/preview', config);
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
) {
  type ReconciliationResponse = {
    success: boolean;
    message: string;
    data: {
      orgId: string;
      orgName: string;
      periodStart: string;
      periodEnd: string;
      items: Array<{
        org_name: string;
        auth_mode: string;
        exec_start_time: string;
        result_code: string;
        result_msg: string;
        count: number;
      }>;
      totalCount: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    }
  };

  const response = await post<ReconciliationResponse>('/api/billing/reconciliation', {
    config,
    page,
    pageSize
  });
  
  return response.data.data;
} 