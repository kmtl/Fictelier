import React, { useRef, useEffect, forwardRef, useMemo } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { FONT_SIZES } from '../utils/constants';
import { HIGHLIGHT_COLORS } from '../utils/constants';

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

  // テキストを解析してハイライト用の要素配列を生成する
  const renderHighlightedContent = useMemo(() => {
    if (!activeItem?.content) return null;
    const text = activeItem.content;
    
    // 1. ハイライト対象の単語を長さ順（長い順）にソート
    const sortedNotes = [...allFlatNotes]
      .filter(n => n.name)
      .sort((a, b) => b.name.length - a.name.length);

    const keywordPattern = sortedNotes.length > 0
      ? new RegExp(`(${sortedNotes.map(n => n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
      : null;

    const lines = text.split('\n');

    return lines.map((line, lineIndex, linesArr) => {
      const isHeading = line.startsWith('# ');
      const bgColor = isDarkMode ? 'rgba(99,102,241,0.2)' : 'rgba(199,210,254,1)';

      const renderLineContent = () => {
        if (!keywordPattern) {
          return line;
        }

        const parts = [];
        let lastIndex = 0;
        let match;
        keywordPattern.lastIndex = 0; // 正規表現の状態をリセット

        while ((match = keywordPattern.exec(line)) !== null) {
          // マッチしなかった部分を追加
          if (match.index > lastIndex) {
            parts.push(<span key={`${lineIndex}-text-${lastIndex}`}>{line.substring(lastIndex, match.index)}</span>);
          }
          // マッチした部分を追加
          const matchedNote = sortedNotes.find(n => n.name === match[0]);
          if (matchedNote) {
            const colorCfg = HIGHLIGHT_COLORS.find(c => c.id === matchedNote.parentColorId) || HIGHLIGHT_COLORS[0];
            parts.push(<span key={`${lineIndex}-highlight-${lastIndex}`} className={`${colorCfg.bg} ${colorCfg.border} border-b-2 text-transparent`}>{match[0]}</span>);
          }
          lastIndex = keywordPattern.lastIndex;
        }

        // 最後のマッチ以降のテキストを追加
        if (lastIndex < line.length) {
          parts.push(<span key={`${lineIndex}-text-${lastIndex}`}>{line.substring(lastIndex)}</span>);
        }
        return parts;
      };

      const lineContent = renderLineContent();

      return (
        <React.Fragment key={lineIndex}>
          {isHeading ? (
            <span style={{ background: bgColor, color: 'transparent', display: 'inline-block', width: '100%' }}>
              {lineContent}
            </span>
          ) : (
            lineContent
          )}
          {lineIndex < linesArr.length - 1 && <br />}
        </React.Fragment>
      );
    });
  }, [activeItem?.content, allFlatNotes, isDarkMode]);


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
                  >
                    {renderHighlightedContent}
                  </div>
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
