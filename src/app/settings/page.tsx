/**
 * Settings page component
 */

'use client';

import { useState } from 'react';
import useAppStore from '@/hooks/useAppStore';
import { Moon, Sun, User, Bell, Save, RefreshCw, Palette, Check, Monitor } from 'lucide-react';

// 预定义的主题颜色
const colorThemes = [
  { name: '紫色', primary: '#7c3aed', accent: '#8b5cf6' },
  { name: '蓝色', primary: '#3b82f6', accent: '#60a5fa' },
  { name: '绿色', primary: '#10b981', accent: '#34d399' },
  { name: '红色', primary: '#ef4444', accent: '#f87171' },
  { name: '橙色', primary: '#f97316', accent: '#fb923c' },
];

export default function SettingsPage() {
  const { themeMode, setThemeMode } = useAppStore();
  const [selectedTheme, setSelectedTheme] = useState("purple");
  
  // 应用主题函数
  function applyTheme(name: string) {
    console.log(`应用主题: ${name}`);
    setSelectedTheme(name);
    // 这里可以添加主题应用逻辑
  }

  // 设置主题模式
  function setThemeModeHandler(mode: 'light' | 'dark' | 'system') {
    setThemeMode(mode);
  }

  return (
    <div className="space-y-5 px-5 py-4">
      <div className="border-b pb-3 mb-4">
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground text-sm mt-1">管理应用程序设置和首选项</p>
      </div>
      
      {/* 外观设置卡片 */}
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="border-b bg-muted/30 px-5 py-3 flex items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            外观
          </h2>
        </div>
        <div className="p-5">
          {/* 浅色/深色模式切换 */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">主题模式</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                className={`p-4 rounded-lg border flex flex-col items-center gap-2 hover:bg-accent/50 transition-colors ${
                  themeMode === 'light' ? 'bg-accent border-primary' : 'bg-background'
                }`}
                onClick={() => setThemeModeHandler('light')}
              >
                <Sun className="h-6 w-6" />
                <span>浅色模式</span>
                {themeMode === 'light' && <Check className="h-4 w-4 text-primary" />}
              </button>
              
              <button
                className={`p-4 rounded-lg border flex flex-col items-center gap-2 hover:bg-accent/50 transition-colors ${
                  themeMode === 'dark' ? 'bg-accent border-primary' : 'bg-background'
                }`}
                onClick={() => setThemeModeHandler('dark')}
              >
                <Moon className="h-6 w-6" />
                <span>深色模式</span>
                {themeMode === 'dark' && <Check className="h-4 w-4 text-primary" />}
              </button>
              
              <button
                className={`p-4 rounded-lg border flex flex-col items-center gap-2 hover:bg-accent/50 transition-colors ${
                  themeMode === 'system' ? 'bg-accent border-primary' : 'bg-background'
                }`}
                onClick={() => setThemeModeHandler('system')}
              >
                <Monitor className="h-6 w-6" />
                <span>跟随系统</span>
                {themeMode === 'system' && <Check className="h-4 w-4 text-primary" />}
              </button>
            </div>
          </div>

          {/* 色彩主题选择 */}
          <div>
            <h3 className="font-medium mb-3">主题颜色</h3>
            <div className="grid grid-cols-5 gap-2">
              {colorThemes.map((theme) => (
                <button
                  key={theme.name}
                  className={`group relative flex flex-col items-center p-3 rounded-lg border hover:bg-accent/50 transition-colors ${
                    selectedTheme === theme.name ? 'border-primary ring-1 ring-primary' : ''
                  }`}
                  onClick={() => applyTheme(theme.name)}
                >
                  <div className="flex gap-1 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: theme.primary }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: theme.accent }}
                    />
                  </div>
                  <span className="text-xs">{theme.name}</span>
                  {selectedTheme === theme.name && (
                    <div className="absolute top-1 right-1">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* 账户设置卡片 */}
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="border-b bg-muted/30 px-5 py-3 flex items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            账户
          </h2>
        </div>
        <div className="p-5">
          <div>
            <h3 className="font-medium">个人信息</h3>
            <p className="text-sm text-muted-foreground mb-4">
              更新您的个人信息和联系方式
            </p>
            
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="name">
                    姓名
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full p-2 border rounded-md bg-transparent focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="您的姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="email">
                    电子邮箱
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full p-2 border rounded-md bg-transparent focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="您的电子邮箱"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                保存更改
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {/* 通知设置卡片 */}
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="border-b bg-muted/30 px-5 py-3 flex items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            通知
          </h2>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  id="email-notifications"
                  className="h-4 w-4 rounded border-gray-300 focus:ring-primary"
                />
              </div>
              <div>
                <label className="font-medium block" htmlFor="email-notifications">
                  电子邮件通知
                </label>
                <p className="text-sm text-muted-foreground">
                  接收有关账单生成和系统更新的电子邮件通知
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  id="browser-notifications"
                  className="h-4 w-4 rounded border-gray-300 focus:ring-primary"
                />
              </div>
              <div>
                <label className="font-medium block" htmlFor="browser-notifications">
                  浏览器通知
                </label>
                <p className="text-sm text-muted-foreground">
                  在浏览器中接收实时通知
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                type="button"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                更新通知设置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 