import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { numberWithCommas } from '@/lib/utils';

// 定义结果码数据结构
interface ResultCodeData {
  result_code: string;
  result_msg: string;
  count: number;
  percentage: number;
}

// 组件属性接口
interface ResultCodeChartProps {
  data: ResultCodeData[];
  isLoading?: boolean;
}

/**
 * 结果码分布图表
 * 展示不同结果码的调用分布情况
 */
export default function ResultCodeChart({ data, isLoading = false }: ResultCodeChartProps) {
  // 格式化图表数据
  const chartData = useMemo(() => {
    // 确保数据是数组
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // 取前5个结果码
    const topResults = [...data]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // 计算其他结果码
    const otherResults = data.slice(5);
    
    if (otherResults.length > 0) {
      const otherCount = otherResults.reduce((sum, item) => sum + item.count, 0);
      const otherPercentage = otherResults.reduce((sum, item) => sum + item.percentage, 0);
      
      topResults.push({
        result_code: 'other',
        result_msg: '其他结果码',
        count: otherCount,
        percentage: otherPercentage
      });
    }
    
    return topResults;
  }, [data]);

  // 自定义提示框
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-md">
          <p className="font-medium text-gray-700">{data.result_msg}</p>
          <p className="text-gray-600 text-sm">调用次数: {numberWithCommas(data.count)}</p>
          <p className="text-gray-600 text-sm">占比: {data.percentage.toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };

  // 自定义图例
  const CustomLegend = ({ payload }: any) => {
    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-2">
        {payload.map((entry: any, index: number) => (
          <li key={`legend-${index}`} className="flex items-center">
            <div
              className="w-3 h-3 mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.payload.result_msg}</span>
          </li>
        ))}
      </ul>
    );
  };

  // 处理加载状态
  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // 处理无数据情况
  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-gray-500">没有结果码数据</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">结果码分布</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            dataKey="count"
            nameKey="result_msg"
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={['#4ade80', '#60a5fa', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'][index % 6]} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
} 