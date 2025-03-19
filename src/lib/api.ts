/**
 * Base API utilities for making HTTP requests
 */

/**
 * Base API URL
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Default fetch options
 */
const defaultOptions: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Generic API response type
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  success: boolean;
}

/**
 * 延迟函数
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 带重试的 fetch 函数
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = 3,
  backoff: number = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`请求失败，${retries}秒后重试...`, { url, error });
      await delay(backoff);
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

/**
 * Generic fetch function with error handling
 */
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // 检查网络连接
    if (!navigator.onLine) {
      throw new Error('网络连接已断开，请检查网络后重试');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    console.log('开始请求:', { url, method: options.method || 'GET' });
    
    const response = await fetchWithRetry(url, {
      ...defaultOptions,
      ...options,
    });

    // Check response status and content type before parsing JSON
    let data;
    const contentType = response.headers.get('content-type');
    
    // 尝试解析响应内容
    try {
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('JSON解析错误:', e);
          data = { text, success: response.ok };
        }
      } else {
        data = { success: response.ok };
      }
    } catch (error) {
      console.error('读取响应内容失败:', error);
      throw new Error('服务器响应异常，请重试');
    }

    if (!response.ok) {
      console.error('API响应错误:', {
        url,
        status: response.status,
        statusText: response.statusText,
        data
      });
      
      // 处理特定的错误情况
      if (response.status === 504) {
        throw new Error('服务器响应超时，请稍后重试');
      } else if (response.status === 502) {
        throw new Error('服务器暂时不可用，请稍后重试');
      } else if (response.status === 404) {
        throw new Error('请求的资源不存在');
      } else if (response.status === 401) {
        throw new Error('未授权访问，请重新登录');
      } else if (response.status === 403) {
        throw new Error('没有访问权限');
      }
      
      throw new Error(data?.error || data?.message || '请求失败，请稍后重试');
    }

    // For our new API endpoints that directly return the data without wrapping
    if (data && !data.hasOwnProperty('success') && !data.hasOwnProperty('message')) {
      return {
        data,
        status: response.status,
        message: '请求成功',
        success: true,
      };
    }

    // For our old API format that wraps the data
    return {
      data: data.data || data || ({} as T),
      status: response.status,
      message: data.message || '请求成功',
      success: data.success !== false,
    };
  } catch (error) {
    console.error('API请求错误:', {
      endpoint,
      error: error instanceof Error ? error.message : '未知错误'
    });
    
    // 处理网络错误
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('无法连接到服务器，请检查网络连接');
      } else if (error.message.includes('ECONNRESET')) {
        throw new Error('网络连接被重置，请检查网络连接并重试');
      } else if (error.message.includes('ETIMEDOUT')) {
        throw new Error('网络连接超时，请检查网络连接并重试');
      }
    }
    
    throw error;
  }
}

/**
 * GET request helper
 */
export async function get<T>(endpoint: string, params: Record<string, any> = {}): Promise<ApiResponse<T>> {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  return fetchApi<T>(url, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT request helper
 */
export async function put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request helper
 */
export async function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, { method: 'DELETE' });
} 