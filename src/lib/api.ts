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
 * Generic fetch function with error handling
 */
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
    });

    // Check response status and content type before parsing JSON
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        throw new Error('响应格式无效');
      }
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      // Try to parse it anyway, in case the content-type header is incorrect
      try {
        data = JSON.parse(text);
      } catch (error) {
        // If it's not JSON, create a simple object with the text
        data = {
          text,
          success: response.ok
        };
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || data?.message || '请求出错');
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
      success: true,
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      data: {} as T,
      status: 500,
      message: error instanceof Error ? error.message : '请求出错',
      success: false,
    };
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