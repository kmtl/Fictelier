// 色設定（ハイライト用）
export const HIGHLIGHT_COLORS = [
  { id: 'amber', bg: 'bg-amber-400/20', border: 'border-amber-500/50', dot: 'bg-amber-500' },
  { id: 'emerald', bg: 'bg-emerald-400/20', border: 'border-emerald-500/50', dot: 'bg-emerald-500' },
  { id: 'rose', bg: 'bg-rose-400/20', border: 'border-rose-500/50', dot: 'bg-rose-500' },
  { id: 'blue', bg: 'bg-blue-400/20', border: 'border-blue-500/50', dot: 'bg-blue-500' },
  { id: 'purple', bg: 'bg-purple-400/20', border: 'border-purple-500/50', dot: 'bg-purple-500' },
  { id: 'cyan', bg: 'bg-cyan-400/20', border: 'border-cyan-500/50', dot: 'bg-cyan-500' },
  { id: 'orange', bg: 'bg-orange-400/20', border: 'border-orange-500/50', dot: 'bg-orange-500' },
  { id: 'pink', bg: 'bg-pink-400/20', border: 'border-pink-500/50', dot: 'bg-pink-500' },
  { id: 'lime', bg: 'bg-lime-400/20', border: 'border-lime-500/50', dot: 'bg-lime-500' },
  { id: 'indigo', bg: 'bg-indigo-400/20', border: 'border-indigo-500/50', dot: 'bg-indigo-500' },
];

// フォントサイズ設定
export const FONT_SIZES = { 
  small: 'text-lg', 
  medium: 'text-xl', 
  large: 'text-2xl' 
};

// オートセーブ設定
export const AUTO_SAVE_DEBOUNCE_MS = 2000;

// アプリID
export const getAppId = () => typeof __app_id !== 'undefined' ? __app_id : 'fictelier-v1';

// ID生成ユーティリティ
export const generateId = (prefix = 'id') => 
  `${prefix}-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`;
