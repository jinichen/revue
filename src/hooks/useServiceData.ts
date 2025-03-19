/**
 * Custom hooks for fetching service data
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  getServiceLogSummary, 
  getServiceLogTrend, 
  getServiceLogComparison,
  getOrgUsageData
} from '@/services/serviceLogService';
import { 
  getThirdServiceLogSummary, 
  getThirdServiceLogTrend, 
  getThirdServiceLogComparison,
  getThirdOrgUsageData  
} from '@/services/thirdServiceLogService';
import { RevenueSummary, TimePeriod, ComparisonAnalysis, TrendDataPoint, OrgUsageData } from '@/types';

/**
 * Hook for fetching revenue summary by time period
 */
export function useRevenueSummary(period: TimePeriod, orgId?: string) {
  return useQuery({
    queryKey: ['revenue-summary', period, orgId],
    queryFn: async () => {
      const [serviceData, thirdServiceData] = await Promise.all([
        getServiceLogSummary(period, orgId),
        getThirdServiceLogSummary(period, orgId)
      ]);
      
      if (!serviceData.success || !thirdServiceData.success) {
        throw new Error('获取数据失败');
      }
      
      // 使用类型断言获取需要的数据
      const serviceTotal = (serviceData.data as any).total || 0;
      const thirdServiceTotal = (thirdServiceData.data as any).total || 0;
      const serviceCount = (serviceData.data as any).count || 0;
      const thirdServiceCount = (thirdServiceData.data as any).count || 0;
      
      // Combine data from both services
      const combinedData: RevenueSummary = {
        total: serviceTotal + thirdServiceTotal,
        average: (serviceTotal + thirdServiceTotal) / 
                ((serviceCount + thirdServiceCount) || 1),
        change: 0, // We're not calculating change in the combined view
        changePercentage: 0 // We're not calculating change percentage in the combined view
      };
      
      return combinedData;
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    gcTime: 30 * 60 * 1000, // 30分钟保持在缓存中，即使数据过期
    refetchOnWindowFocus: false, // 窗口聚焦时不重新获取数据
    retry: 2, // 失败时最多重试2次
    refetchOnMount: true // 组件挂载时重新获取数据
  });
}

/**
 * Hook for fetching trend data
 */
export function useTrendData(period: TimePeriod, startDate: string, endDate: string, orgId?: string) {
  return useQuery({
    queryKey: ['trend-data', period, startDate, endDate, orgId],
    queryFn: async () => {
      const [serviceData, thirdServiceData] = await Promise.all([
        getServiceLogTrend(period, startDate, endDate, orgId),
        getThirdServiceLogTrend(period, startDate, endDate, orgId)
      ]);
      
      if (!serviceData.success || !thirdServiceData.success) {
        throw new Error('获取趋势数据失败');
      }
      
      // Combine trend data
      const combinedTrend: Record<string, number> = {};
      
      // Process service data
      serviceData.data.forEach(point => {
        combinedTrend[point.date] = (combinedTrend[point.date] || 0) + point.value;
      });
      
      // Add third-party service data
      thirdServiceData.data.forEach(point => {
        combinedTrend[point.date] = (combinedTrend[point.date] || 0) + point.value;
      });
      
      // Convert back to array format
      const result: TrendDataPoint[] = Object.entries(combinedTrend).map(([date, value]) => ({
        date,
        value
      }));
      
      // Sort by date
      return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    staleTime: 15 * 60 * 1000, // 15分钟缓存
    gcTime: 60 * 60 * 1000, // 1小时保持在缓存中
    refetchOnWindowFocus: false,
    retry: 2
  });
}

/**
 * Hook for fetching comparison analysis
 */
export function useComparisonAnalysis(period: TimePeriod, date: string, orgId?: string) {
  return useQuery({
    queryKey: ['comparison-analysis', period, date, orgId],
    queryFn: async () => {
      const [serviceData, thirdServiceData] = await Promise.all([
        getServiceLogComparison(period, date, orgId),
        getThirdServiceLogComparison(period, date, orgId)
      ]);
      
      if (!serviceData.success || !thirdServiceData.success) {
        throw new Error('获取对比分析数据失败');
      }
      
      // Combine comparison data
      const current = serviceData.data.current + thirdServiceData.data.current;
      const previous = serviceData.data.previous + thirdServiceData.data.previous;
      
      const percentage = previous === 0 
        ? current > 0 ? 100 : 0 
        : ((current - previous) / previous) * 100;
      
      const combinedData: ComparisonAnalysis = {
        current,
        previous,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        isIncrease: current >= previous
      };
      
      return combinedData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching organization usage data
 */
export function useOrgUsageData(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['org-usage', startDate, endDate],
    queryFn: async () => {
      const [serviceData, thirdServiceData] = await Promise.all([
        getOrgUsageData(startDate, endDate),
        getThirdOrgUsageData(startDate, endDate)
      ]);
      
      if (!serviceData.success || !thirdServiceData.success) {
        throw new Error('获取组织使用数据失败');
      }
      
      // Combine organization usage data
      const orgMap: Record<string, OrgUsageData> = {};
      
      // Process service data
      serviceData.data.forEach((org: any) => {
        orgMap[org.org_id] = {
          org_id: org.org_id,
          org_name: org.org_name,
          total_usage: org.total || 0,
          success_count: org.success_count || 0,
          failure_count: org.failure_count || 0,
          avg_response_time: org.avg_response_time || 0
        };
      });
      
      // Add or update with third-party service data
      thirdServiceData.data.forEach((org: any) => {
        if (orgMap[org.org_id]) {
          orgMap[org.org_id].total_usage += (org.total || 0);
          orgMap[org.org_id].success_count += (org.success_count || 0);
          orgMap[org.org_id].failure_count += (org.failure_count || 0);
          // Average the response times
          const totalResponses = orgMap[org.org_id].success_count + orgMap[org.org_id].failure_count;
          if (totalResponses > 0) {
            orgMap[org.org_id].avg_response_time = 
              (orgMap[org.org_id].avg_response_time * (totalResponses - org.success_count - org.failure_count) + 
              (org.avg_response_time || 0) * (org.success_count + org.failure_count)) / totalResponses;
          }
        } else {
          orgMap[org.org_id] = {
            org_id: org.org_id,
            org_name: org.org_name,
            total_usage: org.total || 0,
            success_count: org.success_count || 0,
            failure_count: org.failure_count || 0,
            avg_response_time: org.avg_response_time || 0
          };
        }
      });
      
      // Convert to array and sort by total usage
      return Object.values(orgMap).sort((a, b) => b.total_usage - a.total_usage);
    },
    staleTime: 10 * 60 * 1000, // 10分钟缓存
    gcTime: 60 * 60 * 1000, // 1小时保持在缓存中
    refetchOnWindowFocus: false,
    retry: 2
  });
} 