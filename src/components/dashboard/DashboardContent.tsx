import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import PeriodSelector from '@/components/dashboard/PeriodSelector';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { RevenueCard } from '@/components/dashboard/RevenueCard';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { getRevenueData, getCallStats, getOrgCallStats } from '@/lib/services';
import { DateRange, RevenueByDate, RevenueSummary, CallStatsByDate } from '@/types';

/**
 * Main dashboard content component
 * Manages data fetching and display of dashboard elements
 */
export default function DashboardContent() {
  // State for selected organization and time period
  const [selectedPeriod, setSelectedPeriod] = useState<'year' | 'month' | 'day'>('day');
  
  // State for call statistics data
  const [yearStats, setYearStats] = useState<{
    data: CallStatsByDate[];
    summary: {
      total: number;
      validTotal: number;
      invalidTotal: number;
      change: number;
      changePercentage: number;
    };
  } | null>(null);
  
  const [monthStats, setMonthStats] = useState<{
    data: CallStatsByDate[];
    summary: {
      total: number;
      validTotal: number;
      invalidTotal: number;
      change: number;
      changePercentage: number;
    };
  } | null>(null);
  
  const [dayStats, setDayStats] = useState<{
    data: CallStatsByDate[];
    summary: {
      total: number;
      validTotal: number;
      invalidTotal: number;
      change: number;
      changePercentage: number;
    };
  } | null>(null);
  
  // State for organization statistics data
  const [orgStats, setOrgStats] = useState<{
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
    }>;
  } | null>(null);
  
  // State for loading indicators
  const [isYearLoading, setIsYearLoading] = useState(true);
  const [isMonthLoading, setIsMonthLoading] = useState(true);
  const [isDayLoading, setIsDayLoading] = useState(true);
  const [isOrgStatsLoading, setIsOrgStatsLoading] = useState(true);
  
  // Fetch all call statistics data on component mount
  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        // Fetch year stats
        setIsYearLoading(true);
        const yearData = await getCallStats('year');
        setYearStats(yearData);
        setIsYearLoading(false);
        
        // Fetch month stats
        setIsMonthLoading(true);
        const monthData = await getCallStats('month');
        setMonthStats(monthData);
        setIsMonthLoading(false);
        
        // Fetch day stats
        setIsDayLoading(true);
        const dayData = await getCallStats('day');
        setDayStats(dayData);
        setIsDayLoading(false);
      } catch (error) {
        console.error('Error fetching call statistics:', error);
        setIsYearLoading(false);
        setIsMonthLoading(false);
        setIsDayLoading(false);
      }
    };
    
    fetchAllStats();
  }, []);
  
  // Fetch organization statistics data based on selected period
  useEffect(() => {
    const fetchOrgStats = async () => {
      setIsOrgStatsLoading(true);
      try {
        console.log(`Fetching organization stats for period: ${selectedPeriod}`);
        const orgStatsData = await getOrgCallStats(selectedPeriod);
        console.log('Organization stats data received:', orgStatsData);
        setOrgStats(orgStatsData);
      } catch (error) {
        console.error('Error fetching organization statistics:', error);
      } finally {
        setIsOrgStatsLoading(false);
      }
    };
    
    fetchOrgStats();
  }, [selectedPeriod]);
  
  // Get the currently selected statistics based on period
  const getSelectedStats = () => {
    switch (selectedPeriod) {
      case 'year':
        return {
          data: yearStats?.data ?? [],
          isLoading: isYearLoading,
          title: `${new Date().getFullYear()}年调用统计`
        };
      case 'month':
        return {
          data: monthStats?.data ?? [],
          isLoading: isMonthLoading,
          title: `${format(new Date(), 'yyyy年M月')}调用统计`
        };
      case 'day':
      default:
        return {
          data: dayStats?.data ?? [],
          isLoading: isDayLoading,
          title: `${format(new Date(), 'yyyy年M月d日')}调用统计`
        };
    }
  };
  
  const selectedStats = getSelectedStats();
  
  // Get period title for org chart
  const getOrgChartTitle = () => {
    switch (selectedPeriod) {
      case 'year':
        return `${new Date().getFullYear()}年各组织调用统计`;
      case 'month':
        return `${format(new Date(), 'yyyy年M月')}各组织调用统计`;
      case 'day':
      default:
        return `${format(new Date(), 'yyyy年M月d日')}各组织调用统计`;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Period Cards */}
      <div className="grid grid-cols-3 gap-4">
        <RevenueCard
          title="年度调用统计"
          period="year"
          total={yearStats?.summary?.total ?? 0}
          changePercentage={yearStats?.summary?.changePercentage ?? 0}
          isSelected={selectedPeriod === 'year'}
          onClick={() => setSelectedPeriod('year')}
        />
        <RevenueCard
          title="月度调用统计"
          period="month"
          total={monthStats?.summary?.total ?? 0}
          changePercentage={monthStats?.summary?.changePercentage ?? 0}
          isSelected={selectedPeriod === 'month'}
          onClick={() => setSelectedPeriod('month')}
        />
        <RevenueCard
          title="日度调用统计"
          period="day"
          total={dayStats?.summary?.total ?? 0}
          changePercentage={dayStats?.summary?.changePercentage ?? 0}
          isSelected={selectedPeriod === 'day'}
          onClick={() => setSelectedPeriod('day')}
        />
      </div>
      
      {/* 按客户显示的柱状图 */}
      <TrendChart
        title={`${selectedPeriod === 'year' ? '年度' : selectedPeriod === 'month' ? '月度' : '日度'}客户调用统计`}
        data={orgStats?.data ?? []}
        mode="org"
        isLoading={isOrgStatsLoading}
      />
    </div>
  );
} 