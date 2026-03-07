import { useState, useEffect } from 'react';

export const useUIState = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('fictelier_theme');
      if (saved !== null) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [view, setView] = useState('project_list');
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [openColorPickerId, setOpenColorPickerId] = useState(null);

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(256);
  const [rightWidth, setRightWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('fictelier_fontSize');
      return saved || 'medium';
    }
    return 'medium';
  });

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ローカルストレージに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fictelier_theme', isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fictelier_fontSize', fontSize);
    }
  }, [fontSize]);

  return {
    isDarkMode,
    setIsDarkMode,
    view,
    setView,
    activeProjectId,
    setActiveProjectId,
    activeId,
    setActiveId,
    activeNoteId,
    setActiveNoteId,
    openColorPickerId,
    setOpenColorPickerId,
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightPanelOpen,
    setRightPanelOpen,
    leftWidth,
    setLeftWidth,
    rightWidth,
    setRightWidth,
    isResizing,
    setIsResizing,
    fontSize,
    setFontSize,
    deleteTarget,
    setDeleteTarget,
  };
};
