/**
 * Trend chart component for displaying call trends over time or by organization
 */

import React, { useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts';
// 导入格式化函数
import { numberWithCommas } from '@/lib/utils';

// 定义组织统计数据类型
interface OrgData {
  org_id: string;
  org_name: string;
  total_calls: number;
  valid_calls: number;
  invalid_calls: number;
  avg_response_time_ms: number;
}

// 定义日期统计数据类型
interface DateData {
  date: string;
  validCalls: number;
  invalidCalls: number;
}

// 统一的图表属性接口
interface TrendChartProps {
  title: string;
  data: any[];
  mode: 'organization' | 'date';
  isLoading?: boolean;
  chartType?: 'bar' | 'line';
  showValidCalls?: boolean;
}

/**
 * 趋势图表组件
 * 用于展示按日期或组织的调用趋势
 */
export const TrendChart: React.FC<TrendChartProps> = React.memo(({
  title, 
  data,
  mode,
  isLoading = false,
  chartType = 'line',
  showValidCalls = false
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    if (mode === 'organization') {
      return data.map(item => ({
        name: item.organizationName || '未知客户',
        total: item.total || 0,
        valid: item.validTotal || 0
      }));
    } else {
      return data.map(item => ({
        name: item.date,
        total: item.total || 0,
        valid: item.validTotal || 0
      }));
    }
  }, [data, mode]);

  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // 返回空数据的替代视图
  if (chartData.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center p-4">
            <div className="text-gray-500 mb-2">当前时间段无数据</div>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              onClick={() => window.location.reload()}
            >
              刷新页面
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
              formatter={(value: number) => [numberWithCommas(value), '']}
              labelFormatter={(label) => mode === 'organization' ? `客户: ${label}` : `日期: ${label}`}
            />
            <Legend />
            <Bar dataKey="total" name="总调用" fill="#8884d8" />
            {showValidCalls && (
              <Bar dataKey="valid" name="有效调用" fill="#82ca9d" />
            )}
            </BarChart>
          </ResponsiveContainer>
      </div>
          </div>
  );
});

// 添加displayName
TrendChart.displayName = 'TrendChart'; 