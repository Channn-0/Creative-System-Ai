import React from 'react';
import { Package, User, Home, Clock } from 'lucide-react';
import { AppMode } from '../types';

interface NavigationProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onHistoryClick: () => void;
  hasHistory: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  currentMode, 
  onModeChange, 
  onHistoryClick,
  hasHistory 
}) => {
  
  const navItems = [
    { mode: AppMode.STUDIO, icon: Package, label: 'Studio' },
    { mode: AppMode.PORTRAIT, icon: User, label: 'Portrait' },
    { mode: AppMode.INTERIOR, icon: Home, label: 'Interior' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 lg:hidden z-50 flex justify-around items-center px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => onModeChange(item.mode)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <Icon size={isActive ? 24 : 20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        
        {/* Mobile History Button */}
        <button
          onClick={onHistoryClick}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 relative"
        >
          <div className="relative">
            <Clock size={20} />
            {hasHistory && <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-400 rounded-full" />}
          </div>
          <span className="text-[10px] font-medium">History</span>
        </button>
      </div>

      {/* Desktop Sidebar Navigation */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-24 flex-col bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 z-50 pt-20 pb-6 items-center gap-8">
        
        <div className="flex flex-col gap-6 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentMode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => onModeChange(item.mode)}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 group
                  ${isActive 
                    ? 'bg-brand-50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}
                `}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
                <span className={`text-[10px] font-bold tracking-wide transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto pb-4">
           <button
            onClick={onHistoryClick}
            className="flex flex-col items-center justify-center p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative"
            title="History"
          >
            <div className="relative">
                <Clock size={24} />
                {hasHistory && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-400 rounded-full border-2 border-white dark:border-slate-950" />}
            </div>
            <span className="text-[10px] font-medium mt-1">History</span>
          </button>
        </div>
      </div>
    </>
  );
};
