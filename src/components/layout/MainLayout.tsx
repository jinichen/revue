/**
 * Main layout component for the application
 */

import { ReactNode, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import useAppStore from '@/hooks/useAppStore';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { sidebarOpen, darkMode, themeMode } = useAppStore();
  
  // 监听系统主题变化
  useEffect(() => {
    // 只在浏览器环境中运行
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // 根据系统主题设置darkMode
    const updateTheme = (event: MediaQueryListEvent | MediaQueryList) => {
      if (themeMode === 'system') {
        document.documentElement.classList.toggle('dark', event.matches);
        // 更新darkMode状态以同步UI
        useAppStore.getState().toggleDarkMode();
      }
    };
    
    // 初始化时检查一次
    if (themeMode === 'system') {
      updateTheme(mediaQuery);
    }
    
    // 监听系统主题变化
    const listener = (event: MediaQueryListEvent) => updateTheme(event);
    mediaQuery.addEventListener('change', listener);
    
    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, [themeMode]);
  
  // 监听darkMode状态变化，并应用适当的类
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  return (
    <div className={`min-h-screen bg-background text-foreground ${darkMode ? 'dark' : ''}`}>
      <Sidebar />
      <TopNav />
      
      <main 
        className={`pt-16 min-h-screen transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
} 