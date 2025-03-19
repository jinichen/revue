/**
 * Top navigation bar component
 */

import { User, Moon, Sun, Settings } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import useAppStore from '@/hooks/useAppStore';

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    sidebarOpen, 
    darkMode,
    setThemeMode
  } = useAppStore();
  
  // 根据当前路径确定菜单名称
  const getMenuTitle = () => {
    if (pathname.startsWith('/dashboard')) return '仪表盘';
    if (pathname.startsWith('/billing')) return '账单';
    if (pathname.startsWith('/reconciliation')) return '对账单';
    if (pathname.startsWith('/settings')) return '设置';
    return '菜单项'; // 默认名称
  };
  
  // 导航到设置页面
  const goToSettings = () => {
    router.push('/settings');
  };
  
  // 切换主题模式
  const handleToggleTheme = () => {
    // 在浅色和深色之间切换
    setThemeMode(darkMode ? 'light' : 'dark');
  };
  
  return (
    <div 
      className={`fixed top-0 z-30 w-full h-16 px-4 border-b bg-background flex items-center transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-16'
      }`}
      style={{ width: `calc(100% - ${sidebarOpen ? '16rem' : '4rem'})` }}
    >
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">{getMenuTitle()}</h2>
      </div>
      
      <div className="ml-auto flex items-center gap-4">
        {/* 设置按钮 */}
        <button 
          className={`p-2 rounded-full hover:bg-accent flex items-center gap-1 ${
            pathname.startsWith('/settings') ? 'bg-accent/50' : ''
          }`}
          onClick={goToSettings}
          aria-label="设置"
        >
          <Settings size={20} />
          <span className="sr-only">设置</span>
        </button>
        
        {/* Theme Toggle Button */}
        <button 
          className="p-2 rounded-full hover:bg-accent" 
          onClick={handleToggleTheme}
          aria-label={darkMode ? "切换到浅色模式" : "切换到深色模式"}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        {/* User Menu */}
        <button 
          className="p-2 rounded-full hover:bg-accent" 
          aria-label="用户菜单"
        >
          <User size={20} />
        </button>
      </div>
    </div>
  );
}