import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // 对导出文件的处理
  if (url.pathname.startsWith('/exports/')) {
    try {
      const filePath = path.join(process.cwd(), 'public', url.pathname);
      
      // 检查文件是否存在
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          // 根据文件扩展名设置Content-Type
          const ext = path.extname(filePath).toLowerCase();
          let contentType = 'application/octet-stream';
          
          if (ext === '.md') {
            contentType = 'text/markdown';
          } else if (ext === '.xlsx') {
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          }
          
          // 创建响应
          const response = new NextResponse(fs.readFileSync(filePath));
          response.headers.set('Content-Type', contentType);
          response.headers.set('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
          
          return response;
        }
      }
    } catch (error) {
      console.error('中间件处理导出文件错误:', error);
    }
  }
  
  return NextResponse.next();
}

// 只匹配/exports路径下的请求
export const config = {
  matcher: '/exports/:path*',
}; 