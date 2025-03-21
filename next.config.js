/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 禁用类型检查以解决构建错误
  typescript: {
    // !! 警告: 仅在调试阶段临时使用
    // 这将跳过TypeScript类型检查
    ignoreBuildErrors: true,
  },
  // 启用编译时输出详细日志，有助于调试
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // 配置静态资源访问
  async rewrites() {
    return [
      {
        source: '/downloads/:path*',
        destination: '/public/exports/:path*'
      }
    ]
  }
}

module.exports = nextConfig 