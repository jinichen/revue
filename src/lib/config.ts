/**
 * 系统配置参数
 */

// 有效认证结果码
export const VALID_RESULT_CODES = process.env.VALID_RESULT_CODES 
  ? process.env.VALID_RESULT_CODES.split(',')
  : ['0', '200004', '210001', '210002', '210004', '210005', '210006', '210009'];

// 环境配置
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// 缓存配置
export const CACHE_TTL = process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 0; // 通用缓存时间(秒)

// 添加不同API的专用缓存时间
export const STATS_CACHE_TTL = process.env.STATS_CACHE_TTL ? parseInt(process.env.STATS_CACHE_TTL) : 0; // 统计数据缓存时间(秒)
export const ORG_STATS_CACHE_TTL = process.env.ORG_STATS_CACHE_TTL ? parseInt(process.env.ORG_STATS_CACHE_TTL) : 0; // 组织统计数据缓存时间(秒) 