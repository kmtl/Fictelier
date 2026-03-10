import React from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2, FileText, ChevronLeft } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FictelierLogo } from '../icons/FictelierLogo';
import { generateId } from '../utils/constants';

export const Sidebar = ({
  isDarkMode,
  leftSidebarOpen,
  leftWidth,
  items,
  activeId,
  setActiveId,
  setView,
  onAddChapter,
  onDeleteItem,
  onAddScene,
  updateItemLocal,
  projects,
  setItems,
  activeProjectId,
  setProjects,
  db,
  user,
  appId,
  onHeadingClick,
}) => {

  const onDragEnd = (result) => {
    const { source, destination } = result;

    // ドロップ先がない、または同じ場所なら何もしない
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    const sourceChapterId = source.droppableId.replace('chapter-', '');
    const destChapterId = destination.droppableId.replace('chapter-', '');
    const sourceChapter = items.find(ch => ch.id === sourceChapterId);
    const destChapter = items.find(ch => ch.id === destChapterId);

    if (!sourceChapter || !destChapter) return;

    // 同じチャプター内での並べ替え
    if (sourceChapterId === destChapterId) {
      const newChildren = Array.from(sourceChapter.children);
      const [reorderedItem] = newChildren.splice(source.index, 1);
      newChildren.splice(destination.index, 0, reorderedItem);
      updateItemLocal(sourceChapterId, { children: newChildren });
    } else {
      // 別のチャプターへの移動
      const sourceChildren = Array.from(sourceChapter.children);
      const destChildren = Array.from(destChapter.children || []);
      const [movedItem] = sourceChildren.splice(source.index, 1);
      destChildren.splice(destination.index, 0, movedItem);

      // ローカルstateを更新
      setItems(prevItems => prevItems.map(ch => {
        if (ch.id === sourceChapterId) return { ...ch, children: sourceChildren };
        if (ch.id === destChapterId) return { ...ch, children: destChildren };
        return ch;
      }));

      // Firestoreを更新
      const sourceDocRef = doc(db, 'artifacts', appId, 'users', user.uid, `fictelier_items_${activeProjectId}`, sourceChapterId);
      setDoc(sourceDocRef, { children: sourceChildren }, { merge: true });

      const destDocRef = doc(db, 'artifacts', appId, 'users', user.uid, `fictelier_items_${activeProjectId}`, destChapterId);
      setDoc(destDocRef, { children: destChildren }, { merge: true });
      
      const projectDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'fictelier_projects', activeProjectId);
      setDoc(projectDocRef, { updatedAt: Date.now() }, { merge: true });
    }
  };
  return (
    <aside style={{ width: leftSidebarOpen ? `${leftWidth}px` : '0px' }} className={`flex-shrink-0 border-r flex flex-col z-30 overflow-hidden relative ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <div className={`h-16 flex items-center relative border-b flex-shrink-0 ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50/30 border-zinc-200'}`}>
        <div className="absolute left-4 z-10">
          <button 
            onClick={() => setView('project_list')} 
            className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 group text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'bg-zinc-200/50 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200'}`}
          >
            <ChevronLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" /> BACK
          </button>
        </div>
        <div className="w-full flex justify-center pointer-events-none">
          <span className="text-xs font-black italic tracking-tighter flex items-center gap-1.5 truncate pr-1">
            <FictelierLogo size={14} className="text-indigo-500" /> OUTLINE
          </span>
        </div>
        <div className="absolute right-4 z-10">
          <button 
            onClick={onAddChapter}
            className={`p-1.5 text-indigo-500 rounded-lg transition-all ${isDarkMode ? 'hover:bg-indigo-900/40' : 'hover:bg-indigo-100'}`}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scroll">
        <div className="px-2 py-2 mb-4">
          <input 
            className={`w-full bg-transparent border-none text-[11px] font-black italic focus:ring-0 p-0 transition-opacity ${isDarkMode ? 'text-zinc-500 opacity-60 hover:opacity-100' : 'text-zinc-400 opacity-60 hover:opacity-100'}`} 
            value={projects.find(p => p.id === activeProjectId)?.title || ''} 
            onChange={(e) => {
              if(!db) return;
              const title = e.target.value;
              setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, title } : p));
              setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'fictelier_projects', activeProjectId), { title, updatedAt: Date.now() }, { merge: true });
            }}
          />
        </div>
        
        <DragDropContext onDragEnd={onDragEnd}>
          {items.map((ch) => (
            <div key={ch.id} className="mb-3">
              <div 
              className={`flex items-center p-2.5 rounded-xl cursor-pointer group transition-all ${activeId === ch.id ? (isDarkMode ? 'bg-indigo-900/30 text-indigo-400 font-bold' : 'bg-indigo-50 text-indigo-600 font-bold') : (isDarkMode ? 'hover:bg-zinc-900 text-zinc-400' : 'hover:bg-zinc-50 text-zinc-700')}`} 
              onClick={() => { 
                setActiveId(ch.id); 
                updateItemLocal(ch.id, { isOpen: !ch.isOpen }); 
              }}
            >
              <div className="mr-2 opacity-50">{ch.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>
              <span className="flex-1 truncate text-xs">{ch.title}</span>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onAddScene(ch);
                  }} 
                  className={`p-1 text-indigo-500 rounded transition-all ${isDarkMode ? 'hover:bg-indigo-950' : 'hover:bg-indigo-100'}`}
                >
                  <Plus size={14} />
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onDeleteItem({ id: ch.id, title: ch.title, type: 'chapter' }); 
                  }} 
                  className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
              
              {ch.isOpen && (
                <Droppable droppableId={`chapter-${ch.id}`}>
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                      className={`ml-4 mt-1 border-l-2 pl-3 space-y-1 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}
                    >
                      {(ch.children || []).map((sc, index) => {
                        const headings = [];
                        if (sc.content) {
                          const lines = sc.content.split('\n');
                          lines.forEach(line => {
                            if (line.startsWith('# ')) {
                              headings.push(line.substring(2).trim());
                            }
                          });
                        }

                        return (
                          <Draggable key={sc.id} draggableId={sc.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="mb-1"
                              >
                                <div 
                                  onClick={() => {
                                    setActiveId(sc.id);
                                    if (headings.length > 0) {
                                      updateItemLocal(sc.id, { isHeadingsOpen: !sc.isHeadingsOpen });
                                    }
                                  }}
                                  className={`flex items-center p-2 rounded-lg cursor-pointer group text-xs transition-all ${activeId === sc.id ? (isDarkMode ? 'bg-indigo-900/40 text-indigo-400 font-bold border-l-2 border-indigo-500' : 'bg-indigo-50 text-indigo-600 font-bold border-l-2 border-indigo-500') : (isDarkMode ? 'hover:bg-zinc-900 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-500')}`}
                                >
                                  {headings.length > 0 ? (
                                    <div
                                      className="mr-2 opacity-50 hover:opacity-100 transition-opacity"
                                    >
                                      {sc.isHeadingsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    </div>
                                  ) : (
                                    <FileText size={12} className="mr-2 opacity-40" />
                                  )}
                                  <span className="flex-1 truncate">{sc.title}</span>
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      onDeleteItem({ id: sc.id, title: sc.title, type: 'scene', parentId: ch.id }); 
                                    }} 
                                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                
                                {headings.length > 0 && sc.isHeadingsOpen && (
                                  <div className={`ml-4 mt-0.5 border-l pl-2 space-y-0.5 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                                    {headings.map((h, i) => (
                                      <div 
                                        key={i} 
                                        onClick={(e) => {
                                          e.stopPropagation(); onHeadingClick(sc.id, h);
                                        }}
                                        className={`text-[12px] truncate flex items-center gap-1.5 py-0.5 cursor-pointer transition-colors ${isDarkMode ? 'text-zinc-500 hover:text-indigo-400' : 'text-zinc-400 hover:text-indigo-500'}`}
                                      >
                                        <span className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-zinc-700' : 'bg-zinc-300'}`}></span>
                                        {h}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          ))}
        </DragDropContext>
      </div>
    </aside>
  );
};
