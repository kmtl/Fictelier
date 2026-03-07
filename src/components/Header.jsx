import React from 'react';
import { Download, Type, Moon, Sun, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, CheckCircle2, Loader2 } from 'lucide-react';
import { FictelierLogo } from '../icons/FictelierLogo';

export const Header = ({
  isDarkMode,
  setIsDarkMode,
  leftSidebarOpen,
  setLeftSidebarOpen,
  rightPanelOpen,
  setRightPanelOpen,
  fontSize,
  setFontSize,
  saveStatus,
  activeItem,
  onExport,
}) => {
  return (
    <header className={`h-16 border-b flex items-center justify-between px-6 backdrop-blur-xl flex-shrink-0 z-20 ${isDarkMode ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-zinc-200'}`}>
      <div className="flex items-center gap-5">
        <button 
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} 
          className={`p-2 rounded-xl transition-all ${leftSidebarOpen ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
        >
          {leftSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
        <div className="flex items-center min-w-0">
          <span className="text-sm font-black italic tracking-tighter flex items-center gap-1.5 truncate pr-2">
            <FictelierLogo size={16} className="text-indigo-500" /> Fictelier
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-400'}`}>
          <Type size={12} className="text-indigo-500" />
          <span className={`${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {activeItem?.content?.length || 0}
          </span>
          <span className="opacity-40">chars</span>
        </div>
        
        <div className="min-w-[80px] flex justify-end">
          {saveStatus === 'saved' && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-emerald-950/10 text-emerald-500 border-emerald-900/20' : 'bg-emerald-50/50 text-emerald-500 border-emerald-100/50'}`}>
              <CheckCircle2 size={12} /> Saved
            </div>
          )}
          {saveStatus === 'saving' && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-indigo-950/10 text-indigo-500 border-indigo-900/20' : 'bg-indigo-50/50 text-indigo-500 border-indigo-100/50'}`}>
              <Loader2 size={12} className="animate-spin" /> Saving
            </div>
          )}
        </div>
        
        <div className={`flex items-center gap-2 pl-4 border-l ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button 
            onClick={onExport}
            className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
          >
            <Download size={20} />
          </button>
          
          {['small', 'medium', 'large'].map(size => (
            <button 
              key={size} 
              onClick={() => setFontSize(size)} 
              className={`p-1 px-2 rounded text-xs font-bold uppercase tracking-widest transition-all ${fontSize === size ? 'bg-indigo-500 text-white' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              {size.charAt(0).toUpperCase()}
            </button>
          ))}
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
          >
            {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
          </button>
          
          <button 
            onClick={() => setRightPanelOpen(!rightPanelOpen)} 
            className={`p-2 rounded-xl transition-all ${rightPanelOpen ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            {rightPanelOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};
