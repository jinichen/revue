/**
 * Service Log service for service log data
 */

import { get } from '@/lib/api';
import { ServiceLog, RevenueSummary, TrendDataPoint, ComparisonAnalysis, OrgUsageData } from '@/types';

/**
 * Get service logs with filter
 */
export async function getServiceLogs(params: {
  orgId?: string;
  startDate?: string;
  endDate?: string;
  biztype?: string;
  page?: number;
  pageSize?: number;
}) {
  return get<{
    logs: ServiceLog[];
    total: number;
    page: number;
    pageSize: number;
  }>('/service-logs', params);
}

/**
 * Get summary by time period (year, month, day)
 */
export async function getServiceLogSummary(period: 'year' | 'month' | 'day', orgId?: string) {
  return get<RevenueSummary>('/service-logs/summary', { period, orgId });
}

/**
 * Get trend data for a specific period
 */
export async function getServiceLogTrend(
  period: 'year' | 'month' | 'day',
  startDate: string,
  endDate: string,
  orgId?: string
) {
  return get<TrendDataPoint[]>('/service-logs/trend', {
    period,
    startDate,
    endDate,
    orgId,
  });
}

/**
 * Get comparison data (YoY, MoM, DoD)
 */
export async function getServiceLogComparison(
  period: 'year' | 'month' | 'day',
  date: string,
  orgId?: string
) {
  return get<ComparisonAnalysis>('/service-logs/comparison', {
    period,
    date,
    orgId,
  });
}

/**
 * Get organization usage data
 */
export async function getOrgUsageData(
  startDate: string,
  endDate: string
) {
  return get<OrgUsageData[]>('/service-logs/org-usage', {
    startDate,
    endDate,
  });
} 