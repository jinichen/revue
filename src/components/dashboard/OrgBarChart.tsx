/**
 * Organization bar chart component for displaying call statistics by organization
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

export interface OrgBarChartProps {
  /**
   * Title of the chart
   */
  title: string;
  /**
   * Data for the chart
   */
  data: Array<{
    org_id: string;
    org_name: string;
    total_calls: number;
    valid_calls: number;
    invalid_calls: number;
    avg_response_time_ms: number;
    change: number;
    changePercentage: number;
  }>;
  /**
   * Loading state
   */
  isLoading?: boolean;
}

/**
 * Chart component showing valid and invalid calls by organization
 */
export const OrgBarChart = ({ title, data = [], isLoading = false }: OrgBarChartProps) => {
  // Ensure data is always an array and sort by total calls
  const safeData = Array.isArray(data) 
    ? [...data].sort((a, b) => b.total_calls - a.total_calls).slice(0, 10) // Get top 10 orgs
    : [];
  
  // Transform data for better display in chart
  const chartData = safeData.map(org => ({
    name: org.org_name, // Use org_name for the x-axis
    valid: org.valid_calls,
    invalid: org.invalid_calls,
    total: org.total_calls,
    avg_time: Math.round(org.avg_response_time_ms)
  }));
  
  return (
    <Card className="h-[500px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-[420px]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={420}>
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 30, 
                bottom: 100, // 增加底部边距，以便容纳客户名称
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} // 倾斜标签以避免重叠
                textAnchor="end"
                height={80}
                interval={0} // 确保显示所有标签
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [value.toLocaleString(), '']}
                labelFormatter={(label) => `组织: ${label}`}
              />
              <Legend 
                formatter={(value) => {
                  switch(value) {
                    case 'valid': return '有效调用';
                    case 'invalid': return '无效调用';
                    default: return value;
                  }
                }} 
              />
              <Bar 
                dataKey="valid" 
                name="valid" 
                fill="#4ade80" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="invalid" 
                name="invalid" 
                fill="#f87171" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[420px]">
            <p className="text-muted-foreground">暂无数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 