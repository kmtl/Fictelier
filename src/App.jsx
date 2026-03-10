import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// Firebase SDK のインポート
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, deleteDoc, 
  onSnapshot, updateDoc 
} from 'firebase/firestore';
import { 
  getAuth, onAuthStateChanged, signInAnonymously, 
  signInWithCustomToken, signOut, GoogleAuthProvider, signInWithPopup 
} from 'firebase/auth';

import { 
  Plus, ChevronRight, ChevronDown, FileText, Trash2, Moon, Sun, Tags, X,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, FolderPlus,
  CheckCircle2, Loader2, LogOut, AlertCircle, Book, ChevronLeft, Clock, Type, Sparkles,
  LogIn, RefreshCw
} from 'lucide-react';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// ===== Component Imports =====
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { NotesPanel } from './components/NotesPanel';
import { ExportModal } from './components/ExportModal';
import { FictelierLogo } from './icons/FictelierLogo';

// ===== Hook Imports =====
import { useAuth } from './hooks/useAuth';
import { useUIState } from './hooks/useUIState';

// ===== Utility Imports =====
import { getHighlights } from './utils/highlights';
import { HIGHLIGHT_COLORS, generateId, AUTO_SAVE_DEBOUNCE_MS, getAppId } from './utils/constants';

// ========================================================
// [Firebase 堅牢な初期化ロジック - v1.0準拠]
// ========================================================
const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      const config = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
      if (config && config.apiKey) return config;
    }
    if (typeof window !== 'undefined' && window.firebaseConfig) {
      return window.firebaseConfig;
    }
    try {
      const env = import.meta.env;
      if (env && env.VITE_FIREBASE_API_KEY) {
        return {
          apiKey: env.VITE_FIREBASE_API_KEY,
          authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: env.VITE_FIREBASE_APP_ID
        };
      }
    } catch (e) {}
  } catch (e) {
    console.error("Fictelier: Config resolution failed", e);
  }
  return null;
};

const firebaseConfig = getFirebaseConfig();
const app = (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") 
  ? (getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)) 
  : null;

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const googleProvider = app ? new GoogleAuthProvider() : null;

const appId = getAppId();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState('project_list'); 
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [openColorPickerId, setOpenColorPickerId] = useState(null);
  
  const [saveStatus, setSaveStatus] = useState('saved'); 
  const [authProcessing, setAuthProcessing] = useState(false);

  const {
    isDarkMode, setIsDarkMode,
    leftSidebarOpen, setLeftSidebarOpen,
    rightPanelOpen, setRightPanelOpen,
    leftWidth,
    rightWidth,
    isResizing,
    startResizingLeft, startResizingRight,
    fontSize, setFontSize,
    showExportModal, setShowExportModal,
    exportOptions, setExportOptions,
    errorMessage, setErrorMessage,
    deleteTarget, setDeleteTarget,
    pendingScrollToHeading, setPendingScrollToHeading
  } = useUIState();

  const saveTimeoutRef = useRef(null);
  const deletingIdsRef = useRef(new Set()); 
  const itemsRef = useRef([]);
  const notesRef = useRef([]);
  const backdropRef = useRef(null);
  const textareaRef = useRef(null);

  const exportProject = useCallback(async () => {
    if (!activeProjectId || items.length === 0) {
      setErrorMessage('エクスポートするプロジェクトがありません。');
      return;
    }

    const zip = new JSZip();
    const projectName = projects.find(p => p.id === activeProjectId)?.title || 'Project';

    // 各章を処理
    let sceneNumber = 1;
    items.forEach((chapter, chapterIndex) => {
      // 各シーン（話）を処理
      if (chapter.children && chapter.children.length > 0) {
        chapter.children.forEach((scene, sceneIndex) => {
          let content = scene.content;
          if (!exportOptions.includeSubOutlines) {
            content = content.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
          }
          // 1行目に章タイトル、その後に話本文
          const txtContent = `【${chapter.title}】\n\n${scene.title}\n\n${content}`;
          const paddedNumber = String(sceneNumber).padStart(3, '0');
          zip.file(`${paddedNumber}_${scene.title || `Scene${sceneIndex + 1}`}.txt`, txtContent);
          sceneNumber++;
        });
      }
    });

    // 設定ノートをMDとして追加
    if (exportOptions.includeNotes && notes.length > 0) {
      let mdContent = '';
      notes.forEach(category => {
        mdContent += `## ${category.title}\n`;
        if (category.children && category.children.length > 0) {
          category.children.forEach(child => {
            mdContent += `- ${child.name || ''}`;
            if (child.description) {
              mdContent += `\n  ${child.description}`;
            }
            if (exportOptions.includeColors) {
              mdContent += ` [${category.colorId}]`;
            }
            mdContent += '\n';
          });
        }
        mdContent += '\n';
      });
      zip.file('notes.md', mdContent);
    }

    // ZIP生成とダウンロード
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${projectName}.zip`);
    setShowExportModal(false);
    setErrorMessage(null);
  }, [activeProjectId, items, notes, projects, exportOptions]);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (e) {
        console.error("Fictelier: Auth init failed", e.message);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider || authProcessing) return;
    setAuthProcessing(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setErrorMessage(`Google ログインに失敗しました: ${err.message}`);
    } finally {
      setAuthProcessing(false);
    }
  };

  const handleAnonymousLogin = async () => {
    if (!auth || authProcessing) return;
    setAuthProcessing(true);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      setErrorMessage(`ゲストログインに失敗しました: ${err.message}`);
    } finally {
      setAuthProcessing(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setView('project_list');
      setActiveProjectId(null);
      setItems([]);
      setNotes([]);
      setProjects([]);
      setProjectsLoaded(false);
    } catch (err) {
      setErrorMessage("ログアウトに失敗しました。");
    }
  };

  useEffect(() => {
    if (!user || !db) return;
    const col = collection(db, 'artifacts', appId, 'users', user.uid, 'fictelier_projects');
    const unsub = onSnapshot(col, (snap) => {
      if (snap.metadata.hasPendingWrites) return; 
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjects(data.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
      setProjectsLoaded(true);
    }, (err) => {
      setProjectsLoaded(true);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !db || !activeProjectId || view !== 'editor') {
      setDataLoaded(false);
      setItems([]);
      setNotes([]);
      return;
    }
    const itemsCol = collection(db, 'artifacts', appId, 'users', user.uid, `fictelier_items_${activeProjectId}`);
    const notesCol = collection(db, 'artifacts', appId, 'users', user.uid, `fictelier_notes_${activeProjectId}`);

    const unsubItems = onSnapshot(itemsCol, (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(it => !deletingIdsRef.current.has(it.id));
      setItems(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
      setDataLoaded(true);
    });

    const unsubNotes = onSnapshot(notesCol, (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(it => !deletingIdsRef.current.has(it.id));
      setNotes(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
    });

    return () => { unsubItems(); unsubNotes(); };
  }, [user, activeProjectId, view]);

  const saveRootDoc = useCallback(async (rootId, type = 'item') => {
    if (!user || !db || !activeProjectId || !rootId || deletingIdsRef.current.has(rootId)) return;
    setSaveStatus('saving');
    try {
      const colName = type === 'item' ? `fictelier_items_${activeProjectId}` : `fictelier_notes_${activeProjectId}`;
      const list = type === 'item' ? itemsRef.current : notesRef.current;
      const data = list.find(it => it.id === rootId);
      if (data) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, colName, rootId), data, { merge: true });
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'fictelier_projects', activeProjectId), { updatedAt: Date.now() }, { merge: true });
      }
      setSaveStatus('saved');
    } catch (err) { setSaveStatus('dirty'); }
  }, [user, activeProjectId]);

  const triggerSave = useCallback((rootId, type = 'item') => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (!rootId) return;
    setSaveStatus('dirty');
    saveTimeoutRef.current = setTimeout(() => saveRootDoc(rootId, type), AUTO_SAVE_DEBOUNCE_MS);
  }, [saveRootDoc]);

  const getRootId = useCallback((targetId, type = 'item') => {
      const list = type === 'item' ? itemsRef.current : notesRef.current;
      for (const root of list) {
        if (root.id === targetId) return root.id;
        const check = (children) => {
          for (const child of children) {
            if (child.id === targetId) return true;
            if (child.children && check(child.children)) return true;
          }
          return false;
        };
        if (root.children && check(root.children)) return root.id;
      }
      return targetId;
    },
    []
  );

  const findInTree = (data, id) => {
    if (!id) return null;
    for (const it of data) {
      if (it.id === id) return it;
      if (it.children) { const f = findInTree(it.children, id); if (f) return f; }
    }
    return null;
  };

  const activeItem = useMemo(() => findInTree(items, activeId), [items, activeId]);

  const allFlatNotes = useMemo(() => {
    const flat = [];
    notes.forEach(cat => {
      if (cat.children) cat.children.forEach(n => flat.push({ ...n, parentColorId: cat.colorId || 'amber', parentId: cat.id }));
    });
    return flat;
  }, [notes]);

  const updateItemLocal = (id, updates) => {
    if (!id) return;
    const rootId = getRootId(id, 'item');
    setItems(prev => {
      const traverse = (data) => data.map(item => {
        if (item.id === id) return { ...item, ...updates };
        if (item.children) return { ...item, children: traverse(item.children) };
        return item;
      });
      return traverse(prev);
    });
    triggerSave(rootId, 'item');
  };

  const updateNoteLocal = useCallback(
    (id, updates) => {
      if (!id) return;
      const rootId = getRootId(id, 'note');
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
      triggerSave(rootId, 'note');
    }, [getRootId, triggerSave]
  );

  const createNewProject = async () => {
    if (!user || !db) return;
    try {
      const id = generateId('proj');
      const newProj = { id, title: '無題の物語', createdAt: Date.now(), updatedAt: Date.now() };
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'fictelier_projects', id), newProj);
      setActiveProjectId(id);
      setView('editor');
    } catch (err) {
      setErrorMessage("作品の作成に失敗しました。");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !user || !db) return;
    const { id, type, parentId } = deleteTarget;
    deletingIdsRef.current.add(id);
    try {
      if (type === 'project') {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'fictelier_projects', id));
        if (activeProjectId === id) setView('project_list');
      } else if (type === 'chapter') {
        setItems(prev => prev.filter(it => it.id !== id));
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, `fictelier_items_${activeProjectId}`, id));
      } else if (type === 'scene' && parentId) {
        const parent = items.find(it => it.id === parentId);
        if (parent) {
          const updatedChildren = parent.children.filter(c => c.id !== id);
          setItems(prev => prev.map(it => it.id === parentId ? { ...it, children: updatedChildren } : it));
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, `fictelier_items_${activeProjectId}`, parentId), { children: updatedChildren }, { merge: true });
        }
      } else if (type === 'category') {
        setNotes(prev => prev.filter(it => it.id !== id));
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, `fictelier_notes_${activeProjectId}`, id));
      } else if (type === 'note' && parentId) {
        const cat = notes.find(c => c.id === parentId);
        if (cat) {
          const updatedChildren = cat.children.filter(c => c.id !== id);
          setNotes(prev => prev.map(c => c.id === parentId ? { ...c, children: updatedChildren } : c));
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, `fictelier_notes_${activeProjectId}`, parentId), { children: updatedChildren }, { merge: true });
        }
      }
      if (activeId === id) setActiveId(null);
      setSaveStatus('saved');
    } finally { 
      setTimeout(() => deletingIdsRef.current.delete(id), 2000); 
      setDeleteTarget(null); 
    }
  };

  const getHighlights = (t) => {
    if (!t) return "";
    let h = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // ハッシュ先頭行に背景だけ付ける(色はインラインスタイルで指定)
    const bgColor = isDarkMode ? 'rgba(99,102,241,0.2)' : 'rgba(199,210,254,1)';
    h = h.split('\n').map(line => {
      if (line.startsWith('# ')) {
        return `<span style="background:${bgColor};color:transparent;display:inline-block;width:100%">${line}</span>`;
      }
      return line;
    }).join('\n');

    [...allFlatNotes].sort((a,b) => b.name.length - a.name.length).forEach(n => {
      if (!n.name) return;
      const colorCfg = HIGHLIGHT_COLORS.find(c => c.id === n.parentColorId) || HIGHLIGHT_COLORS[0];
      const cls = `${colorCfg.bg} ${colorCfg.border} border-b-2 text-transparent`;
      h = h.replace(new RegExp(`(${n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'), `<span class="${cls}">$1</span>`);
    });
    return h.replace(/\n/g, '<br/>') + ' ';
  };

  const handleScroll = (e) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleTextareaClick = useCallback((e) => {
      const pos = e.target.selectionStart;
      const text = activeItem?.content || "";
      const matchedNote = allFlatNotes.find(n => {
        if (!n.name) return false;
        let index = text.indexOf(n.name);
        while (index !== -1) {
          if (pos >= index && pos <= index + n.name.length) return true;
          index = text.indexOf(n.name, index + 1);
        }
        return false;
      });
  
      if (matchedNote) {
        const parent = notes.find(cat => cat.id === matchedNote.parentId);
  
        const doScroll = () => {
          const element = document.getElementById(`note-${matchedNote.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        };
  
        setRightPanelOpen(true);
        setActiveNoteId(matchedNote.id);
  
        if (parent && !parent.isOpen) {
          updateNoteLocal(parent.id, { isOpen: true });
          setTimeout(doScroll, 150);
        } else {
          setTimeout(doScroll, 0);
        }
      }
    }, [activeItem?.content, allFlatNotes, notes, updateNoteLocal]);

  // 左パネルでサブアウトラインの見出しをクリックしたときに、その見出しの位置まで自動スクロールする処理
  const scrollToHeading = useCallback((headingText) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const targetStr = `# ${headingText}`;
    const index = ta.value.indexOf(targetStr);
    if (index !== -1) {
      ta.focus();
      ta.setSelectionRange(index, index);
      // 自動スクロールを促すために一度ブラーして再フォーカス
      ta.blur();
      ta.focus();
    }
  }, []);

  const handleHeadingClick = useCallback((sceneId, heading) => {
    if (activeId !== sceneId) {
      setActiveId(sceneId);
      setPendingScrollToHeading({ sceneId, heading });
    } else {
      scrollToHeading(heading);
    }
  }, [activeId, scrollToHeading]);

  useEffect(() => {
    if (pendingScrollToHeading && activeId === pendingScrollToHeading.sceneId) {
      scrollToHeading(pendingScrollToHeading.heading);
      setPendingScrollToHeading(null);
    }
  }, [activeId, pendingScrollToHeading, scrollToHeading]);

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-600 gap-6">
      <Loader2 className="animate-spin" size={40} />
      <p className="text-[10px] font-black tracking-widest uppercase opacity-50">Entering Fictelier v1.3...</p>
    </div>
  );

  if (!app) return (
    <div className={`h-screen w-full flex flex-col items-center justify-center p-8 transition-colors duration-500 ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-stone-50 text-stone-900'}`}>
      <div className="max-w-md w-full space-y-8 text-center">
        <AlertCircle size={64} className="mx-auto text-red-500 opacity-50" />
        <h1 className="text-3xl font-black italic tracking-tighter text-indigo-500">Fictelier Setup</h1>
        <div className="p-6 bg-red-50 dark:bg-red-950/20 rounded-[2rem] border border-red-100 dark:border-red-900/30">
          <p className="text-xs font-bold text-red-600 dark:text-red-400">Firebase 設定が見つかりません。環境変数を確認してください。</p>
        </div>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-all shadow-xl"><RefreshCw size={14} /> Retry Connection</button>
      </div>
    </div>
  );

  if (!user) return (
    <div className={`h-screen w-full flex flex-col items-center justify-center transition-colors duration-500 ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-stone-50 text-stone-900'}`}>
      {errorMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
          <AlertCircle size={20} /> <span className="text-xs font-bold">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 hover:opacity-70"><X size={16} /></button>
        </div>
      )}
      <div className="flex flex-col items-center gap-8 max-w-sm w-full px-8 text-center">
        <div className="space-y-4">
          <FictelierLogo size={80} className="text-indigo-500 mx-auto" />
          <h1 className="text-5xl font-black italic tracking-tighter">Fictelier</h1>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">設定と原稿が共鳴する、小説家専用の執筆アトリエ。</p>
        </div>
        <div className="w-full flex flex-col gap-3">
          <button onClick={handleGoogleLogin} disabled={authProcessing} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-500 text-white rounded-[1.5rem] text-sm font-black shadow-xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50">Googleでログイン</button>
          <button onClick={handleAnonymousLogin} disabled={authProcessing} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] text-sm font-black shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50">ゲストとして開始</button>
        </div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-2xl transition-all">{isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-zinc-400" />}</button>
      </div>
    </div>
  );

  if (view === 'project_list') {
    return (
      <div className={`min-h-screen w-full p-8 md:p-16 transition-colors duration-500 ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-stone-50 text-stone-900'}`}>
        <div className="max-w-6xl mx-auto space-y-12">
          <header className={`flex justify-between items-end border-b pb-8 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className="space-y-2">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-2"><FictelierLogo size={14} /> My Archive</span>
              <h1 className="text-6xl font-black italic tracking-tighter flex items-center gap-4"><FictelierLogo size={52} className="text-indigo-500" /> Fictelier</h1>
            </div>
            <div className="flex items-center gap-4">
               {user?.isAnonymous && <button onClick={handleGoogleLogin} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-indigo-600 transition-all active:scale-95"><LogIn size={16} /> Google連携して保存</button>}
               <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'}`}>{isDarkMode ? <Sun size={24} className="text-amber-400" /> : <Moon size={24} />}</button>
               <button onClick={handleSignOut} className="p-3 text-zinc-400 hover:text-red-500 transition-colors"><LogOut size={24} /></button>
            </div>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <button onClick={createNewProject} className={`group h-[240px] border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all active:scale-95 ${isDarkMode ? 'border-zinc-800 hover:border-indigo-500 hover:bg-indigo-900/10' : 'border-zinc-200 hover:border-indigo-500 hover:bg-indigo-50/30'}`}><div className={`p-4 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition-all ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}><Plus size={32} /></div><span className={`text-xs font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 group-hover:text-indigo-500`}>Create New Story</span></button>
            {projects.map(proj => (
              <div key={proj.id} className={`group relative h-[240px] rounded-[2.5rem] p-8 shadow-sm border border-transparent transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${isDarkMode ? 'bg-zinc-900 hover:border-indigo-500/30 hover:shadow-indigo-950/20' : 'bg-white hover:border-indigo-500/30 hover:shadow-2xl'}`} onClick={() => { setActiveProjectId(proj.id); setView('editor'); }}>
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: proj.id, title: proj.title, type: 'project' }); }} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'text-zinc-500 hover:text-red-400 hover:bg-red-950/30' : 'text-zinc-400 hover:text-red-500 hover:bg-red-50'}`}><Trash2 size={18} /></button></div>
                <div className="space-y-4"><div className={`inline-flex p-3 rounded-2xl group-hover:text-indigo-500 transition-colors ${isDarkMode ? 'bg-zinc-950 text-zinc-600' : 'bg-zinc-50 text-zinc-400'}`}><Book size={24} /></div><h3 className="text-xl font-black leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">{proj.title}</h3></div>
                <div className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Clock size={10} /> Updated {new Date(proj.updatedAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
          {!projectsLoaded && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-zinc-300" size={32} /></div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full transition-colors duration-500 ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-stone-50 text-stone-900'}`}>
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`rounded-3xl p-8 max-w-sm w-full shadow-2xl border scale-in-center ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full ${isDarkMode ? 'bg-red-950/30 text-red-400' : 'bg-red-50 text-red-500'}`}><AlertCircle size={32} /></div>
              <div className="space-y-2"><h3 className="text-lg font-black tracking-tight">項目を削除しますか？</h3><p className={`text-xs leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>「{deleteTarget.title}」を削除します。</p></div>
              <div className="flex w-full gap-3 pt-4">
                <button onClick={() => setDeleteTarget(null)} className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}>キャンセル</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white text-xs font-bold shadow-lg transition-transform active:scale-95">削除する</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 左サイドバー */}
      <Sidebar
        isDarkMode={isDarkMode}
        leftSidebarOpen={leftSidebarOpen}
        leftWidth={leftWidth}
        items={items}
        activeId={activeId}
        setActiveId={setActiveId}
        setView={setView}
        onAddChapter={async () => {
          if(!db) return;
          const newId = generateId('ch');
          const newCh = { id: newId, title: '新しい章', content: '', type: 'chapter', isOpen: true, order: Date.now(), children: [] };
          setItems(prev => [...prev, newCh]);
          setActiveId(newId);
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, `fictelier_items_${activeProjectId}`, newId), newCh);
        }}
        onDeleteItem={(target) => setDeleteTarget(target)}
        onAddScene={(ch) => {
          const newSceneId = generateId('sc');
          updateItemLocal(ch.id, { children: [...(ch.children || []), { id: newSceneId, title: '新しいシーン', content: '', type: 'scene', order: Date.now() }], isOpen: true });
          setActiveId(newSceneId);
        }}
        updateItemLocal={updateItemLocal}
        setItems={setItems}
        projects={projects}
        activeProjectId={activeProjectId}
        setProjects={setProjects}
        db={db}
        user={user}
        appId={appId}
        onHeadingClick={handleHeadingClick}
      />

      {leftSidebarOpen && <div onMouseDown={startResizingLeft} className={`w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors z-40 flex-shrink-0 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'} ${isResizing ? 'bg-indigo-500' : ''}`} />}

      {/* メインエディタ */}
      <main className={`flex-1 flex flex-col min-w-0 z-10 shadow-2xl overflow-hidden relative font-serif transition-colors ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-stone-900'}`}>
        <Header
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          leftSidebarOpen={leftSidebarOpen}
          setLeftSidebarOpen={setLeftSidebarOpen}
          rightPanelOpen={rightPanelOpen}
          setRightPanelOpen={setRightPanelOpen}
          fontSize={fontSize}
          setFontSize={setFontSize}
          saveStatus={saveStatus}
          activeItem={activeItem}
          onExport={() => setShowExportModal(true)}
        />
        <Editor
          ref={textareaRef}
          isDarkMode={isDarkMode}
          dataLoaded={dataLoaded}
          activeProjectId={activeProjectId}
          activeItem={activeItem}
          activeId={activeId}
          fontSize={fontSize}
          allFlatNotes={allFlatNotes}
          updateItemLocal={updateItemLocal}
          onTextareaClick={handleTextareaClick}
        />
      </main>

      {rightPanelOpen && <div onMouseDown={startResizingRight} className={`w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors z-40 flex-shrink-0 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'} ${isResizing ? 'bg-indigo-500' : ''}`} />}

      {/* 右サイドバー: 設定ノート */}
      <NotesPanel
        isDarkMode={isDarkMode}
        rightPanelOpen={rightPanelOpen}
        rightWidth={rightWidth}
        notes={notes}
        activeNoteId={activeNoteId}
        setActiveNoteId={setActiveNoteId}
        openColorPickerId={openColorPickerId}
        setOpenColorPickerId={setOpenColorPickerId}
        updateNoteLocal={updateNoteLocal}
        onAddCategory={() => {
          if(!db) return;
          const newId = generateId('cat');
          const newCat = { id: newId, title: '新しいカテゴリ', colorId: 'amber', isOpen: true, order: Date.now(), children: [] };
          setNotes([...notes, newCat]);
          triggerSave(newId, 'note');
        }}
        onDeleteNote={(target) => setDeleteTarget(target)}
      />

      {isResizing && <div className="fixed inset-0 z-[9999] cursor-col-resize" />}

      {/* Export Modal */}
      <ExportModal
        isDarkMode={isDarkMode}
        showExportModal={showExportModal}
        setShowExportModal={setShowExportModal}
        exportOptions={exportOptions}
        setExportOptions={setExportOptions}
        onExport={exportProject}
      />

      <style>{`
        .font-serif { font-family: 'Noto Serif JP', serif; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #8882; border-radius: 10px; }
        .scale-in-center { animation: scale-in-center 0.2s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
        @keyframes scale-in-center { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}