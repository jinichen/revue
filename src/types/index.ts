/**
 * Organization information type definition
 */
export interface Organization {
  org_id: string;
  org_name: string;
}

/**
 * Service log type definition
 */
export interface ServiceLog {
  uuid: string;
  bsn?: string;
  biztype?: string;
  auth_mode?: string;
  org_id?: string;
  app_id?: string;
  auth_result?: string;
  success_flag?: string;
  result_code?: string;
  result_msg?: string;
  exec_start_time?: Date;
  exec_end_time?: Date;
  cost_time?: number;
  rec_insert_time?: Date;
}

/**
 * Third party service log type definition
 * Same structure as ServiceLog
 */
export interface ThirdServiceLog {
  uuid: string;
  bsn?: string;
  biztype?: string;
  auth_mode?: string;
  org_id?: string;
  app_id?: string;
  auth_result?: string;
  success_flag?: string;
  result_code?: string;
  result_msg?: string;
  exec_start_time?: Date;
  exec_end_time?: Date;
  cost_time?: number;
  rec_insert_time?: Date;
}

/**
 * Time period type
 */
export type TimePeriod = 'year' | 'month' | 'day';

/**
 * Revenue summary type
 */
export interface RevenueSummary {
  total: number;
  average: number;
  change: number;
  changePercentage: number;
}

/**
 * Trend data point type
 */
export interface TrendDataPoint {
  date: string;
  value: number;
}

/**
 * Comparison analysis type
 */
export interface ComparisonAnalysis {
  current: number;
  previous: number;
  percentage: number;
  isIncrease: boolean;
}

/**
 * Organization usage data type
 */
export interface OrgUsageData {
  org_id: string;
  org_name: string;
  total_usage: number;
  success_count: number;
  failure_count: number;
  avg_response_time: number;
}

/**
 * Billing configuration type
 */
export interface BillingConfig {
  orgId: string;
  periodStart: string;
  periodEnd: string;
  includeDetails?: boolean;
  includeCharts?: boolean;
  twoFactorPrice: number;  // 二要素认证单价（分/次）
  threeFactorPrice: number; // 三要素认证单价（分/次）
  format?: 'excel' | 'markdown'; // 导出格式
}

/**
 * Bill information type
 */
export interface BillInfo {
  id: string;
  org_id: string;
  month: string;
  year: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  generated_at: Date;
  due_date: Date;
  payment_date?: Date;
}

/**
 * Filter parameters type
 */
export interface FilterParams {
  startDate?: Date;
  endDate?: Date;
  org_id?: string;
  biztype?: string;
  auth_mode?: string;
  success_flag?: string;
}

/**
 * Period selector properties type
 */
export interface PeriodSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Date range type
 */
export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

/**
 * Billing form data type
 */
export interface BillingFormData {
  org_id: string;
  title: string;
  description: string;
  items: BillingItem[];
  tax_rate: number;
  due_date: Date;
  notes: string;
}

/**
 * Billing item type
 */
export interface BillingItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

/**
 * Revenue by date type
 */
export interface RevenueByDate {
  date: string;
  revenue: number;
}

/**
 * Aggregated usage type
 */
export interface AggregatedUsage {
  org_id: string;
  org_name: string;
  total_calls: number;
  successful_calls: number;
  avg_response_time: number;
}

/**
 * Represents call statistics data by date
 */
export interface CallStatsByDate {
  date: string;
  validCalls: number;
  invalidCalls: number;
}

/**
 * Represents call statistics summary
 */
export interface CallStatsSummary {
  total: number;
  validTotal: number;
  invalidTotal: number;
  change: number;
  changePercentage: number;
} 