import { useState, useEffect, useCallback } from 'react';

export const useUIState = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('fictelier_theme');
      if (saved !== null) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('fictelier_leftWidth');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) return Math.min(val, window.innerWidth * 0.4);
      }
    }
    return 256;
  });
  const [rightWidth, setRightWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('fictelier_rightWidth');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) return Math.min(val, window.innerWidth * 0.4);
      }
    }
    return 400;
  });
  const [isResizing, setIsResizing] = useState(false);

  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('fictelier_fontSize');
      return saved || 'medium';
    }
    return 'medium';
  });

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeSubOutlines: false,
    includeNotes: true,
    includeColors: false,
  });
  const [errorMessage, setErrorMessage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  // スクロール制御用の一時ステート
  const [pendingScrollToHeading, setPendingScrollToHeading] = useState(null);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fictelier_leftWidth', leftWidth);
    }
  }, [leftWidth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fictelier_rightWidth', rightWidth);
    }
  }, [rightWidth]);

  // リサイズ処理ロジック
  const startResizingLeft = useCallback((e) => {
    e.preventDefault(); setIsResizing(true);
    const startX = e.clientX, startWidth = leftWidth;
    const move = (me) => {
      const w = startWidth + (me.clientX - startX);
      if (w > 160 && w < 480) setLeftWidth(w);
    };
    const up = () => { setIsResizing(false); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  }, [leftWidth]);

  const startResizingRight = useCallback((e) => {
    e.preventDefault(); setIsResizing(true);
    const startX = e.clientX, startWidth = rightWidth;
    const move = (me) => {
      const w = startWidth - (me.clientX - startX);
      if (w > 200 && w < 600) setRightWidth(w);
    };
    const up = () => { setIsResizing(false); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  }, [rightWidth]);

  return {
    isDarkMode, setIsDarkMode,
    leftSidebarOpen, setLeftSidebarOpen,
    rightPanelOpen, setRightPanelOpen,
    leftWidth, setLeftWidth,
    rightWidth, setRightWidth,
    isResizing, setIsResizing,
    startResizingLeft, startResizingRight,
    fontSize, setFontSize,
    showExportModal, setShowExportModal,
    exportOptions, setExportOptions,
    errorMessage, setErrorMessage,
    deleteTarget, setDeleteTarget,
    pendingScrollToHeading, setPendingScrollToHeading,
  };
};
