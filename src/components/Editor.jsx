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
  onHighlightClick,
},
textareaRef
) => {
  const backdropRef = useRef(null);

  const handleScroll = (e) => {
    if (backdropRef.current) {
      const target = e.target;
      // 描画タイミングに合わせて同期させることで、スクロール時の微細なズレを軽減
      requestAnimationFrame(() => {
        if (backdropRef.current) backdropRef.current.scrollTop = target.scrollTop;
      });
    }
  };

  // パフォーマンス改善: ハイライト用の正規表現と検索マップの生成をテキスト更新から分離
  // これにより、文字入力のたびに重い正規表現生成やソート処理が走るのを防ぐ
  const { keywordPattern, notesMap } = useMemo(() => {
    const keywords = [];
    
    // 全ノートから名前とエイリアスを抽出してキーワードリストを作成
    allFlatNotes.forEach(note => {
      // メインの項目名
      if (note.name && note.name.trim()) {
        keywords.push({ text: note.name.trim(), note });
      }
      // 別名・タグ（カンマまたは読点で区切る）
      if (note.aliases) {
        const aliases = note.aliases.split(/[,、]/);
        aliases.forEach(alias => {
          const trimmed = alias.trim();
          if (trimmed) {
            keywords.push({ text: trimmed, note });
          }
        });
      }
    });
    
    // 長い順にソート（正規表現のマッチングで長い単語を優先するため）
    keywords.sort((a, b) => b.text.length - a.text.length);

    // 高速検索用のMap作成と正規表現パターンの生成
    const map = new Map();
    const uniqueTexts = [];
    
    keywords.forEach(({ text, note }) => {
      // 重複がある場合は先に見つかった（長い）方を優先
      if (!map.has(text)) {
        map.set(text, note);
        uniqueTexts.push(text);
      }
    });
    
    const pattern = uniqueTexts.length > 0
      ? new RegExp(`(${uniqueTexts.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
      : null;

    return { keywordPattern: pattern, notesMap: map };
  }, [allFlatNotes]);

  // テキストを解析してハイライト用の要素配列を生成する
  const renderHighlightedContent = useMemo(() => {
    if (!activeItem?.content) return null;
    const text = activeItem.content;

    const lines = text.split('\n');

    const renderedLines = lines.map((line, lineIndex, linesArr) => {
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
          const matchedNote = notesMap.get(match[0]);
          if (matchedNote) {
            const colorCfg = HIGHLIGHT_COLORS.find(c => c.id === matchedNote.parentColorId) || HIGHLIGHT_COLORS[0];
            parts.push(<span 
              key={`${lineIndex}-highlight-${lastIndex}`} 
              className={`${colorCfg.bg} ${colorCfg.border} border-b-2 text-transparent`}
            >
              {match[0]}
            </span>);
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

    // 最下端スクロール時にtextareaの方が高く（深く）スクロールできてしまいズレるのを防ぐため、
    // backdrop側にも余分な高さを確保する
    return [...renderedLines, <br key="extra-padding-bottom" />];
  }, [activeItem?.content, keywordPattern, notesMap, isDarkMode, onHighlightClick]);

  // テキストエリアクリック時に、カーソル位置にあるキーワードを判定してイベントを発火する
  // これにより、z-indexやpointer-eventsの重なり問題を回避して確実にクリックを検知できる
  const handleTextareaClick = (e) => {
    if (!keywordPattern || !onHighlightClick) return;

    const textarea = e.target;
    const text = textarea.value;
    const cursorIndex = textarea.selectionStart;

    // カーソルがある行のテキストと、その行内でのカーソル位置を特定する
    const textUpToCursor = text.substring(0, cursorIndex);
    const lineStartIndex = textUpToCursor.lastIndexOf('\n') + 1;
    const nextNewlineIndex = text.indexOf('\n', cursorIndex);
    const lineEndIndex = nextNewlineIndex !== -1 ? nextNewlineIndex : text.length;
    
    const currentLineText = text.substring(lineStartIndex, lineEndIndex);
    const cursorIndexInLine = cursorIndex - lineStartIndex;

    keywordPattern.lastIndex = 0;
    let match;
    // 現在の行に対してのみ正規表現を実行
    while ((match = keywordPattern.exec(currentLineText)) !== null) {
      const startInLine = match.index;
      const endInLine = startInLine + match[0].length;

      if (cursorIndexInLine >= startInLine && cursorIndexInLine < endInLine) {
        const matchedNote = notesMap.get(match[0]);
        if (matchedNote) {
          onHighlightClick(matchedNote);
          return; // 一致するものが見つかったら終了
        }
      }
    }
  };

  // コンテンツが更新されたとき（特に行が増えて自動スクロールが発生したとき）に
  // 背景のハイライト表示（backdrop）のスクロール位置をtextareaと同期させる
  useEffect(() => {
    const textarea = (textareaRef && typeof textareaRef === 'object' && textareaRef.current) 
      ? textareaRef.current 
      : document.getElementById('main-editor-textarea');
    
    if (textarea && backdropRef.current) {
      backdropRef.current.scrollTop = textarea.scrollTop;
    }
  }, [activeItem?.content, textareaRef]);

  // ネイティブイベントレベルで親への伝播を強力に阻止する
  useEffect(() => {
    // ref経由で取得できない場合（親からrefが渡されていない場合など）に備えてIDでも取得を試みる
    const textarea = (textareaRef && typeof textareaRef === 'object' && textareaRef.current) 
      ? textareaRef.current 
      : document.getElementById('main-editor-textarea');

    if (!textarea) return;

    const stopPropagation = (e) => {
      e.stopPropagation();
    };

    // 親要素のドラッグイベント等との競合を避けるため、
    // テキストエリアでドラッグ操作の起点となるイベントのみ伝播を止める。
    // mousemoveなどを止めるとブラウザ標準のテキスト選択が機能しなくなるため、これらは止めない。
    const events = [
      'mousedown', 'pointerdown', 'touchstart', 'dragstart'
    ];
    events.forEach(event => textarea.addEventListener(event, stopPropagation));

    return () => {
      events.forEach(event => textarea.removeEventListener(event, stopPropagation));
    };
  }, [textareaRef, activeId]); // activeItemを依存配列から削除（入力ごとの再登録を防ぐ）

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
            
            <div className="relative flex-1 isolate">
              {(activeItem.type === 'chapter' || (activeItem.children && activeItem.children.length > 0)) ? (
                <div className={`p-6 space-y-8 ${FONT_SIZES[fontSize]} leading-relaxed`}>
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-widest mb-4 opacity-70">全体</h2>
                    <div className="space-y-2">
                      <div className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        所属話数: <span className="font-bold">{activeItem.children?.length || 0}話</span>
                      </div>
                      {(() => {
                        const children = activeItem.children || [];
                        const totalChars = children.reduce((sum, child) => sum + (child.content?.length || 0), 0);
                        const avgChars = children.length > 0 ? Math.round(totalChars / children.length) : 0;
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
                      {activeItem.children?.map((scene, idx) => (
                        <div key={scene.id} className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          {String(idx + 1).padStart(3, '0')}__{scene.title || `Scene${idx + 1}`}
                        </div>
                      ))}
                      {(!activeItem.children || activeItem.children.length === 0) && (
                        <div className={`text-sm italic opacity-50 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          シーンがありません
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    ref={backdropRef} 
                    className={`absolute inset-0 z-0 p-0 ${FONT_SIZES[fontSize]} leading-[2.2] font-serif pointer-events-none whitespace-pre-wrap break-words text-transparent overflow-hidden`} 
                  >
                    {renderHighlightedContent}
                  </div>
                  <textarea 
                    id="main-editor-textarea"
                    ref={textareaRef} 
                    value={activeItem.content} 
                    onScroll={handleScroll}
                    onClick={handleTextareaClick}
                    onChange={(e) => updateItemLocal(activeId, { content: e.target.value })} 
                    draggable="false"
                    style={{ userSelect: 'text', WebkitUserSelect: 'text', pointerEvents: 'auto' }}
                    className={`absolute inset-0 w-full h-full z-10 bg-transparent border-none outline-none focus:ring-0 ${FONT_SIZES[fontSize]} leading-[2.2] font-serif resize-none p-0 placeholder:text-zinc-400 placeholder:opacity-20 ${isDarkMode ? 'text-zinc-100 caret-white selection:bg-indigo-500/50 selection:text-white' : 'text-stone-900 caret-black selection:bg-indigo-200 selection:text-indigo-900'} select-text cursor-text pointer-events-auto`} 
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
