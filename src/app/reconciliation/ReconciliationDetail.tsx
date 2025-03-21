import React from 'react';

// 定义类型接口
interface AuthStat {
  code: string;
  total: number;
  success: number;
  fail: number;
  successRate: number;
}

interface DetailRecord {
  code: string;
  description: string;
  result: string;
  count: number;
}

interface ReconciliationData {
  totalCalls: number;
  authStats: AuthStat[];
  details: DetailRecord[];
}

interface ReconciliationDetailProps {
  data: ReconciliationData;
}

const ReconciliationDetail: React.FC<ReconciliationDetailProps> = ({ data }) => {
  return (
    <div className="p-6 bg-slate-800 dark:bg-slate-900 rounded-lg">
      {/* 总调用次数 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white dark:text-blue-200 mb-2">总体统计</h2>
        <div className="flex items-center">
          <span className="text-gray-300 dark:text-gray-200 font-medium mr-2">总调用次数:</span>
          <span className="text-xl font-bold text-white dark:text-blue-100">{data.totalCalls}</span>
        </div>
      </div>

      {/* 认证方式统计 */}
      <div className="mb-6">
        <h3 className="text-base font-medium text-blue-300 dark:text-blue-200 mb-3">认证方式统计</h3>
        <div className="bg-slate-700 dark:bg-slate-800 rounded-lg overflow-hidden">
          <div className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 h-2"></div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-600 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-blue-200 dark:text-blue-100">认证编码</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-blue-200 dark:text-blue-100">总数</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-blue-200 dark:text-blue-100">成功</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-blue-200 dark:text-blue-100">失败</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-blue-200 dark:text-blue-100">成功率</th>
              </tr>
            </thead>
            <tbody>
              {data.authStats.map(stat => (
                <tr key={stat.code} className="border-b border-slate-600 dark:border-slate-700">
                  <td className="px-4 py-3 text-sm text-gray-200 dark:text-gray-300">{stat.code}</td>
                  <td className="px-4 py-3 text-sm text-right text-white dark:text-white">{stat.total}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-300 dark:text-green-300">{stat.success}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-300 dark:text-red-300">{stat.fail}</td>
                  <td className="px-4 py-3 text-sm text-right text-yellow-300 dark:text-yellow-200">{stat.successRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 详细记录 */}
      <div>
        <h3 className="text-base font-medium text-blue-300 dark:text-blue-200 mb-3">详细记录</h3>
        <div className="bg-slate-700 dark:bg-slate-800 rounded-lg overflow-hidden">
          <div className="w-full bg-gradient-to-r from-purple-500 to-pink-600 h-2"></div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-600 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-blue-200 dark:text-blue-100">认证编码</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-blue-200 dark:text-blue-100">描述</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-blue-200 dark:text-blue-100">结果</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-blue-200 dark:text-blue-100">数量</th>
              </tr>
            </thead>
            <tbody>
              {data.details.map((detail, index) => (
                <tr key={index} className="border-b border-slate-600 dark:border-slate-700">
                  <td className="px-4 py-3 text-sm text-gray-200 dark:text-gray-300">{detail.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-200 dark:text-gray-300">{detail.description}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      detail.result === '是' 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {detail.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-white dark:text-white">{detail.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationDetail; 