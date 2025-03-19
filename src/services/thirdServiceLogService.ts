/**
 * Third Service Log service for third-party service log data
 */

import { get } from '@/lib/api';
import { ThirdServiceLog, RevenueSummary, TrendDataPoint, ComparisonAnalysis, OrgUsageData } from '@/types';

/**
 * Get third-party service logs with filter
 */
export async function getThirdServiceLogs(params: {
  orgId?: string;
  startDate?: string;
  endDate?: string;
  biztype?: string;
  page?: number;
  pageSize?: number;
}) {
  return get<{
    logs: ThirdServiceLog[];
    total: number;
    page: number;
    pageSize: number;
  }>('/third-service-logs', params);
}

/**
 * Get summary by time period (year, month, day)
 */
export async function getThirdServiceLogSummary(period: 'year' | 'month' | 'day', orgId?: string) {
  return get<RevenueSummary>('/third-service-logs/summary', { period, orgId });
}

/**
 * Get trend data for a specific period
 */
export async function getThirdServiceLogTrend(
  period: 'year' | 'month' | 'day',
  startDate: string,
  endDate: string,
  orgId?: string
) {
  return get<TrendDataPoint[]>('/third-service-logs/trend', {
    period,
    startDate,
    endDate,
    orgId,
  });
}

/**
 * Get comparison data (YoY, MoM, DoD)
 */
export async function getThirdServiceLogComparison(
  period: 'year' | 'month' | 'day',
  date: string,
  orgId?: string
) {
  return get<ComparisonAnalysis>('/third-service-logs/comparison', {
    period,
    date,
    orgId,
  });
}

/**
 * Get organization usage data
 */
export async function getThirdOrgUsageData(
  startDate: string,
  endDate: string
) {
  return get<OrgUsageData[]>('/third-service-logs/org-usage', {
    startDate,
    endDate,
  });
} 