/**
 * Organization bar chart component for displaying call statistics by organization
 */

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip, 
  Legend 
);

// 用于显示的颜色列表
const colors = [
  'rgba(54, 162, 235, 0.7)', // 蓝色
  'rgba(255, 99, 132, 0.7)', // 红色
  'rgba(75, 192, 192, 0.7)', // 绿色
  'rgba(255, 159, 64, 0.7)', // 橙色
  'rgba(153, 102, 255, 0.7)', // 紫色
  'rgba(255, 205, 86, 0.7)', // 黄色
  'rgba(201, 203, 207, 0.7)', // 灰色
];

// 定义组织数据类型，与OrgTable保持一致
interface OrgData {
  org_id?: string;
  organizationName?: string;
  total: number;
  validTotal: number;
  invalidTotal?: number;
  validPercentage: number;
}

// 组件属性
interface OrgBarChartProps {
  data: OrgData[] | { data: OrgData[] } | null;
  loading: boolean;
  title: string;
}

// 类型守卫函数，检查对象是否有data属性
function hasDataProp(obj: any): obj is { data: OrgData[] } {
  return obj && typeof obj === 'object' && 'data' in obj;
}

export const OrgBarChart: React.FC<OrgBarChartProps> = ({ data, loading, title }) => {
  // 确保数据是数组
  const processedData = React.useMemo(() => {
    // 使用类型守卫获取数据数组
    let dataArray: OrgData[] = [];
    if (Array.isArray(data)) {
      dataArray = data;
    } else if (hasDataProp(data)) {
      dataArray = data.data;
    }
    
    if (!dataArray || dataArray.length === 0) return [];
    
    // 处理图表数据，按总调用量排序取前5
    return dataArray
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 5);
  }, [data]);
  
  // 转换为Chart.js数据格式
  const chartData = React.useMemo(() => {
    if (processedData.length === 0) return { labels: [], datasets: [] };
    
    return {
      labels: processedData.map(item => {
        const name = item.organizationName || '未知客户';
        return name.length > 10 ? name.slice(0, 10) + '...' : name;
      }),
      datasets: [
        {
          label: '有效调用',
          data: processedData.map(item => item.validTotal || 0),
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
          borderRadius: 6,
          categoryPercentage: 0.6,
          barPercentage: 0.8,
        },
        {
          label: '无效调用',
          data: processedData.map(item => (item.total || 0) - (item.validTotal || 0)),
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          borderRadius: 6,
          categoryPercentage: 0.6,
          barPercentage: 0.8,
        }
      ],
    };
  }, [processedData]);
  
  // 图表配置
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12
          },
          color: '#6B7280'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 4,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.raw;
            const formattedValue = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return `${label}: ${formattedValue}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#9CA3AF',
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(203, 213, 225, 0.2)',
          drawBorder: false,
        },
        ticks: {
          color: '#9CA3AF',
          padding: 8,
          callback: function(value: any) {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            }
            if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'k';
            }
            return value;
          },
          font: {
            size: 11
          }
        },
        beginAtZero: true
      }
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="h-72 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <span className="mt-3 text-sm text-gray-500 dark:text-gray-400">加载图表数据...</span>
        </div>
      </div>
    );
  }

  // 空数据状态
  if (chartData.labels.length === 0) {
    return (
      <div className="h-72 flex flex-col justify-center items-center text-gray-400 dark:text-gray-600">
        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        <span className="text-sm">暂无图表数据</span>
      </div>
    );
  }
  
  return (
    <div className="h-72">
      <Bar data={chartData} options={options} />
          </div>
  );
}; 