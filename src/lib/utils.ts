import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 将日期格式化为 MySQL 日期格式 (YYYY-MM-DD)
 */
export function formatDateForMySQL(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * 为数字添加千位分隔符
 * @param num 要格式化的数字
 * @returns 格式化后的字符串
 */
export function numberWithCommas(num: number | undefined | null): string {
  if (num === undefined || num === null) {
    return '0';
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 格式化日期时间
 * @param date 日期对象或日期字符串
 * @param format 格式化模板，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串
 */
export function formatDateTime(date: Date | string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 截断过长的字符串并添加省略号
 * @param str 原始字符串
 * @param maxLength 最大长度
 * @returns 截断后的字符串
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * 深度复制对象
 * @param obj 要复制的对象
 * @returns 复制后的新对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 安全地获取嵌套对象属性
 * @param obj 要访问的对象
 * @param path 属性路径 (如 'user.address.city')
 * @param defaultValue 默认值，当属性不存在时返回
 * @returns 属性值或默认值
 */
export function getNestedValue<T>(obj: any, path: string, defaultValue: T): T {
  if (!obj || !path) return defaultValue;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === undefined || current === null || !Object.prototype.hasOwnProperty.call(current, key)) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return (current === undefined || current === null) ? defaultValue : current as T;
}

/**
 * 创建延迟执行的函数
 * @param callback 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function(...args: Parameters<T>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
}
