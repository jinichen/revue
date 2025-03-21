import React from 'react';
import { Loader2 } from 'lucide-react';

// 定义组织数据类型
interface OrgData {
  org_id?: string;
  organizationName?: string;
  total: number;
  validTotal: number;
  invalidTotal?: number;
  validPercentage: number;
}

// 根据DashboardContent组件的实际使用定义组件属性类型
interface OrgTableProps {
  data: OrgData[] | { data: OrgData[] } | null;
  loading: boolean;
}

// 数字格式化函数 - 添加千位分隔符
function numberWithCommas(x: number): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 类型守卫函数，检查对象是否有data属性
function hasDataProp(obj: any): obj is { data: OrgData[] } {
  return obj && typeof obj === 'object' && 'data' in obj;
}

export const OrgTable: React.FC<OrgTableProps> = ({ data, loading }) => {
  // 使用类型守卫确保数据是数组
  const tableData: OrgData[] = React.useMemo(() => {
    if (Array.isArray(data)) {
      return data;
    } else if (hasDataProp(data)) {
      return data.data;
    } else {
      return [];
    }
  }, [data]);
  
  // 如果正在加载或没有数据，显示加载状态
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  // 如果没有数据，显示空状态
  if (!tableData || tableData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500 dark:text-gray-400">
        暂无组织调用数据
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300">
          <tr>
            <th className="px-4 py-3">客户名称</th>
            <th className="px-4 py-3 text-right">总调用</th>
            <th className="px-4 py-3 text-right">有效调用</th>
            <th className="px-4 py-3 text-right">有效率</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((org: OrgData, index: number) => (
            <tr 
              key={org.org_id || index} 
              className="border-b dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <td className="px-4 py-3">{org.organizationName || '未知客户'}</td>
              <td className="px-4 py-3 text-right">{numberWithCommas(org.total)}</td>
              <td className="px-4 py-3 text-right">{numberWithCommas(org.validTotal)}</td>
              <td className="px-4 py-3 text-right">{org.validPercentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
