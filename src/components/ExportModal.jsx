import React from 'react';

export const ExportModal = ({
  isDarkMode,
  showExportModal,
  setShowExportModal,
  exportOptions,
  setExportOptions,
  onExport,
}) => {
  if (!showExportModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowExportModal(false)}>
      <div 
        className={`p-6 rounded-xl shadow-xl max-w-md w-full mx-4 ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`} 
        onClick={e => e.stopPropagation()}
      >
        <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
          プロジェクトをエクスポート
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={exportOptions.includeSubOutlines} 
              onChange={e => setExportOptions(prev => ({ ...prev, includeSubOutlines: e.target.checked }))} 
            />
            <span className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
              サブアプトラインを含める (#ではじまる行)
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={exportOptions.includeNotes} 
              onChange={e => setExportOptions(prev => ({ ...prev, includeNotes: e.target.checked }))} 
            />
            <span className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
              設定ノートを含める (notes.md)
            </span>
          </label>
          {exportOptions.includeNotes && (
            <label className="flex items-center gap-2 ml-4">
              <input 
                type="checkbox" 
                checked={exportOptions.includeColors} 
                onChange={e => setExportOptions(prev => ({ ...prev, includeColors: e.target.checked }))} 
              />
              <span className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                色情報を含める
              </span>
            </label>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button 
            onClick={onExport}
            className="flex-1 bg-indigo-500 text-white py-2 px-4 rounded-lg font-bold hover:bg-indigo-600 transition-colors"
          >
            エクスポート
          </button>
          <button 
            onClick={() => setShowExportModal(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors ${isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'}`}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};
