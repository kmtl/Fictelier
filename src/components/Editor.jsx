import React, { useRef, useEffect, forwardRef } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { getHighlights } from '../utils/highlights';
import { FONT_SIZES } from '../utils/constants';

export const Editor = forwardRef((
  {
  isDarkMode,
  dataLoaded,
  activeProjectId,
  activeItem,
  activeId,
  fontSize,
  allFlatNotes,
  updateItemLocal,
  onTextareaClick,
},
textareaRef
) => {
  const backdropRef = useRef(null);

  const handleScroll = (e) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.target.scrollTop;
    }
  };

  return (
    <main className={`flex-1 flex flex-col min-w-0 z-10 shadow-2xl overflow-hidden relative font-serif transition-colors ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-stone-900'}`}>
      <div className="flex-1 overflow-hidden relative custom-scroll overflow-y-auto">
        {!dataLoaded && activeProjectId ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-400">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest">Loading Manuscript...</p>
          </div>
        ) : activeItem ? (
          <div className={`max-w-4xl mx-auto min-h-[calc(100vh-8rem)] rounded-sm flex flex-col pt-4 pb-4 px-8 md:pt-8 md:pb-8 md:px-20 overflow-hidden my-8 border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 shadow-none' : 'bg-white border-zinc-200 shadow-xl shadow-zinc-200/50'}`}>
            <input 
              type="text" 
              value={activeItem.title} 
              onChange={(e) => updateItemLocal(activeId, { title: e.target.value })} 
              className="w-full text-3xl font-black bg-transparent border-none outline-none focus:ring-0 mb-6 tracking-tighter italic placeholder:opacity-20" 
              placeholder="Title..." 
            />
            
            <div className="relative flex-1">
              {activeItem.children && activeItem.children.length > 0 ? (
                <div className={`p-6 space-y-8 ${FONT_SIZES[fontSize]} leading-relaxed`}>
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-widest mb-4 opacity-70">全体</h2>
                    <div className="space-y-2">
                      <div className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        所属話数: <span className="font-bold">{activeItem.children.length}話</span>
                      </div>
                      {(() => {
                        const totalChars = activeItem.children.reduce((sum, child) => sum + (child.content?.length || 0), 0);
                        const avgChars = Math.round(totalChars / activeItem.children.length);
                        return (
                          <>
                            <div className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                              総文字数: <span className="font-bold">{totalChars.toLocaleString()}文字</span>
                            </div>
                            <div className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                              平均文字数: <span className="font-bold">{avgChars.toLocaleString()}文字/話</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-widest mb-4 opacity-70">各話タイトル</h2>
                    <div className="space-y-2">
                      {activeItem.children.map((scene, idx) => (
                        <div key={scene.id} className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          {String(idx + 1).padStart(3, '0')}__{scene.title || `Scene${idx + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    ref={backdropRef} 
                    className={`absolute inset-0 p-0 ${FONT_SIZES[fontSize]} leading-[2.2] font-serif pointer-events-none whitespace-pre-wrap break-words text-transparent overflow-hidden`} 
                    dangerouslySetInnerHTML={{ __html: getHighlights(activeItem.content, allFlatNotes, isDarkMode) }} 
                  />
                  <textarea 
                    ref={textareaRef} 
                    value={activeItem.content} 
                    onScroll={handleScroll} 
                    onClick={onTextareaClick} 
                    onChange={(e) => updateItemLocal(activeId, { content: e.target.value })} 
                    className={`absolute inset-0 w-full h-full bg-transparent border-none outline-none focus:ring-0 ${FONT_SIZES[fontSize]} leading-[2.2] font-serif resize-none p-0 placeholder:text-zinc-400 placeholder:opacity-20 ${isDarkMode ? 'text-zinc-100 caret-white' : 'text-stone-900 caret-black'} selection:text-current`} 
                    spellCheck="false" 
                    placeholder="Once upon a time..." 
                  />
                </>
              )}
            </div>
          </div>
        ) : (
          <div className={`h-full flex flex-col items-center justify-center opacity-10 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-300'}`}>
            <Sparkles size={120} className="mb-8" />
            <p className="text-sm font-black tracking-widest uppercase text-center px-4">Select a piece to begin</p>
          </div>
        )}
      </div>
    </main>
  );
});
