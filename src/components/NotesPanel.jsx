import React, { useRef, useCallback, useEffect } from 'react';
import { Tags, FolderPlus, ChevronDown, ChevronRight, Plus, Trash2, X, Palette } from 'lucide-react';
import { HIGHLIGHT_COLORS, generateId } from '../utils/constants';

const AutoResizeNoteTextarea = ({ value, onChange, placeholder, isDarkMode, panelWidth }) => {
  const textareaRef = useRef(null);

  const resize = useCallback(() => {
    const node = textareaRef.current;
    if (node) {
      node.style.height = 'auto';
      node.style.height = node.scrollHeight + 'px';
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(resize, 0);
    return () => clearTimeout(timer);
  }, [value, panelWidth, resize]);

  useEffect(() => {
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full bg-transparent border-none outline-none focus:ring-0 resize-none text-sm leading-relaxed ${isDarkMode ? 'text-zinc-300 placeholder:text-zinc-500' : 'text-zinc-700 placeholder:text-zinc-400'}`}
      spellCheck="false"
    />
  );
};

export const NotesPanel = ({
  isDarkMode,
  rightPanelOpen,
  rightWidth,
  notes,
  activeNoteId,
  setActiveNoteId,
  openColorPickerId,
  setOpenColorPickerId,
  updateNoteLocal,
  onAddCategory,
  onDeleteNote,
}) => {
  return (
    <aside style={{ width: rightPanelOpen ? `${rightWidth}px` : '0px' }} className={`flex-shrink-0 border-l flex flex-col z-30 overflow-hidden relative transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
      <div className={`h-16 flex items-center px-6 justify-between border-b flex-shrink-0 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
          <Tags size={12} /> World Notes
        </span>
        <button 
          onClick={onAddCategory}
          className="text-indigo-500 hover:scale-110 transition-transform"
        >
          <FolderPlus size={18} />
        </button>
      </div>
      
      <div id="notes-sidebar" className="flex-1 overflow-y-auto p-4 space-y-8 custom-scroll pb-[60vh]">
        {notes.map((cat) => (
          <div key={cat.id} className={`rounded-2xl border transition-all overflow-hidden ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            
            <div className={`group p-4 flex items-center gap-3 border-b ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800' : 'border-zinc-200'}`}>
              <button 
                onClick={() => updateNoteLocal(cat.id, { isOpen: !cat.isOpen })} 
                className="text-zinc-400"
              >
                {cat.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              <div className="relative inline-block flex-shrink-0">
                <button 
                  onClick={() => setOpenColorPickerId(openColorPickerId === cat.id ? null : cat.id)} 
                  className={`w-5 h-5 rounded-full ${HIGHLIGHT_COLORS.find(c => c.id === cat.colorId)?.dot || 'bg-amber-500'} ring-2 ring-offset-2 ring-transparent hover:ring-zinc-400 dark:ring-offset-zinc-900 transition-all flex items-center justify-center`} 
                  title="色を変更"
                >
                  <Palette size={10} className="text-white opacity-40" />
                </button>
                {openColorPickerId === cat.id && (
                  <div className={`absolute top-full left-0 mt-2 p-2 border rounded-2xl shadow-2xl z-[60] flex gap-2 animate-in fade-in slide-in-from-top-1 ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                    {HIGHLIGHT_COLORS.map(color => (
                      <button 
                        key={color.id} 
                        onClick={() => { 
                          updateNoteLocal(cat.id, { colorId: color.id }); 
                          setOpenColorPickerId(null); 
                        }} 
                        className={`w-6 h-6 rounded-full transition-all ${color.dot} ${cat.colorId === color.id ? 'ring-2 ring-indigo-400 scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'}`} 
                      />
                    ))}
                  </div>
                )}
              </div>

              <input 
                className={`flex-1 bg-transparent border-none text-[13px] font-black uppercase tracking-[0.1em] p-0 focus:ring-0 truncate ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`} 
                value={cat.title || ''} 
                onChange={e => updateNoteLocal(cat.id, { title: e.target.value })} 
                placeholder="Category Name..." 
              />
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={e => { 
                    e.stopPropagation(); 
                    updateNoteLocal(cat.id, { children: [...(cat.children || []), { id: generateId('nt'), name: '新項目', description: '', order: Date.now() }], isOpen: true }); 
                  }} 
                  className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg"
                >
                  <Plus size={16} />
                </button>
                <button 
                  onClick={e => { 
                    e.stopPropagation(); 
                    onDeleteNote({ id: cat.id, title: cat.title, type: 'category' }); 
                  }} 
                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {cat.isOpen && (
              <div className="p-4 space-y-4">
                {cat.children && cat.children.length > 0 ? cat.children.map((n) => (
                  <div 
                    key={n.id} 
                    id={`note-${n.id}`} 
                    onClick={() => setActiveNoteId(n.id)} 
                    className={`p-4 rounded-xl border shadow-sm transition-all cursor-pointer relative ${activeNoteId === n.id ? (isDarkMode ? 'bg-zinc-800 border-indigo-500 shadow-xl ring-1 ring-indigo-500 scale-[1.02]' : 'bg-white border-indigo-400 shadow-xl ring-1 ring-indigo-400 scale-[1.02]') : (isDarkMode ? 'bg-zinc-900 border-transparent hover:border-zinc-700' : 'bg-white border-transparent hover:border-zinc-200 hover:shadow-md')}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 rounded-full shadow-sm ${HIGHLIGHT_COLORS.find(c => c.id === cat.colorId)?.dot || 'bg-amber-500'}`} />
                      <input 
                        className={`flex-1 bg-transparent border-none text-sm font-black focus:ring-0 p-0 ${isDarkMode ? 'text-zinc-100' : 'text-stone-900'}`} 
                        value={n.name || ''} 
                        onChange={e => updateNoteLocal(cat.id, { children: cat.children.map(c => c.id === n.id ? { ...c, name: e.target.value } : c) })} 
                        onClick={e => e.stopPropagation()} 
                        placeholder="Entry Name..." 
                      />
                      <button 
                        onClick={e => { 
                          e.stopPropagation(); 
                          onDeleteNote({ id: n.id, title: n.name, type: 'note', parentId: cat.id }); 
                        }} 
                        className="text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    
                    <AutoResizeNoteTextarea 
                      value={n.description || ''} 
                      isDarkMode={isDarkMode}
                      panelWidth={rightWidth}
                      placeholder="Write details here..." 
                      onChange={e => {
                        updateNoteLocal(cat.id, { children: cat.children.map(c => c.id === n.id ? { ...c, description: e.target.value } : c) });
                      }}
                    />
                  </div>
                )) : (
                  <div className="py-8 text-center opacity-20">
                    <Plus size={24} className="mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No entries yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};
