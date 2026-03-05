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

// ========================================================
// [Firebase 堅牢な初期化ロジック]
// ========================================================
const getFirebaseConfig = () => {
  try {
    // 1. Canvas プレビュー環境のグローバル変数をチェック
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      const config = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
      if (config && config.apiKey) return config;
    }
    
    // 2. window.firebaseConfig (HTMLでの直接注入) をチェック
    if (typeof window !== 'undefined' && window.firebaseConfig) {
      return window.firebaseConfig;
    }

    // 3. Vite 環境変数 (ローカル開発環境) をチェック
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
    } catch (e) {
      // import.meta が未定義の環境（非ESM）ではスキップ
    }
  } catch (e) {
    console.error("Fictelier: Config resolution failed", e);
  }
  return null;
};

const firebaseConfig = getFirebaseConfig();

// 初期化。configがない場合は後続の処理でエラー画面を表示。
const app = (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") 
  ? (getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)) 
  : null;

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const googleProvider = app ? new GoogleAuthProvider() : null;

// アプリケーションIDの決定
const appId = typeof __app_id !== 'undefined' ? __app_id : 'fictelier-v1';
const AUTO_SAVE_DEBOUNCE_MS = 2000;

// ========================================================
// [定数・ヘルパー]
// ========================================================
const HIGHLIGHT_COLORS = [
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

const generateId = (prefix = 'id') => `${prefix}-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`;

const FictelierLogo = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="currentColor" fillOpacity="0.1"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    <g transform="translate(1, 1) rotate(-5, 12, 12)">
      <path d="M21 3l-8.5 8.5" />
      <path d="M12.5 11.5l-3.5 3.5-1.5 5 5-1.5 3.5-3.5" />
      <circle cx="11.5" cy="12.5" r="0.8" fill="currentColor" />
    </g>
  </svg>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [view, setView] = useState('project_list'); 
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(256);
  const [rightWidth, setRightWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  const [saveStatus, setSaveStatus] = useState('saved'); 
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [authProcessing, setAuthProcessing] = useState(false);

  const saveTimeoutRef = useRef(null);
  const deletingIdsRef = useRef(new Set()); 
  const itemsRef = useRef([]);
  const notesRef = useRef([]);
  const backdropRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  // 1. 認証フロー (React + Firebase Pattern)
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
      console.error("Fictelier: Google Login Error:", err);
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
      console.error("Fictelier: Anonymous Login Error:", err);
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

  // 2. プロジェクト一覧
  useEffect(() => {
    if (!user || !db) return;
    const col = collection(db, 'artifacts', appId, 'users', user.uid, 'fictelier_projects');
    const unsub = onSnapshot(col, (snap) => {
      if (snap.metadata.hasPendingWrites) return; 
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjects(data.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
      setProjectsLoaded(true);
    }, (err) => {
      console.error("Fictelier: Projects sync error:", err);
      setProjectsLoaded(true);
    });
    return () => unsub();
  }, [user]);

  // 3. データ（原稿・ノート）の同期
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

  // 4. 保存
  const saveRootDoc = useCallback(async (rootId, type = 'item') => {
    if (!user || !db || !activeProjectId || !rootId || deletingIdsRef.current.has(rootId)) return;
    setSaveStatus('saving');
    try {
      const colName = type === 'item' ? `fictelier_items_${activeProjectId}` : `fictelier_notes_${activeProjectId}`;
      const list = type === 'item' ? itemsRef.current : notesRef.current;
      const data = list.find(it => it.id === rootId);
      if (data) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, colName, rootId), data, { merge: true });
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'fictelier_projects', activeProjectId), { updatedAt: Date.now() });
      }
      setSaveStatus('saved');
    } catch (err) { setSaveStatus('dirty'); }
  }, [user, activeProjectId]);

  const triggerSave = useCallback((rootId, type = 'item') => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('dirty');
    saveTimeoutRef.current = setTimeout(() => saveRootDoc(rootId, type), AUTO_SAVE_DEBOUNCE_MS);
  }, [saveRootDoc]);

  // UI ヘルパー
  const getRootId = (targetId, type = 'item') => {
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
  };

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

  const updateNoteLocal = (id, updates) => {
    if (!id) return;
    const rootId = getRootId(id, 'note');
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    triggerSave(rootId, 'note');
  };

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
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, `fictelier_items_${activeProjectId}`, parentId), { children: updatedChildren });
        }
      } else if (type === 'category') {
        setNotes(prev => prev.filter(it => it.id !== id));
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, `fictelier_notes_${activeProjectId}`, id));
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
    [...allFlatNotes].sort((a,b) => b.name.length - a.name.length).forEach(n => {
      if (!n.name) return;
      const colorCfg = HIGHLIGHT_COLORS.find(c => c.id === n.parentColorId) || HIGHLIGHT_COLORS[0];
      const cls = `${colorCfg.bg} ${colorCfg.border} border-b-2 text-transparent`;
      h = h.replace(new RegExp(`(${n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'), `<span class="${cls}">$1</span>`);
    });
    return h.replace(/\n/g, '<br/>') + ' ';
  };

  const handleTextareaClick = (e) => {
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
      setActiveNoteId(matchedNote.id);
      setRightPanelOpen(true);
      const parent = notes.find(cat => cat.id === matchedNote.parentId);
      if (parent && !parent.isOpen) updateNoteLocal(parent.id, { isOpen: true });
    }
  };

  // リサイズロジック
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

  // ローディング
  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-600 gap-6">
      <Loader2 className="animate-spin" size={40} />
      <p className="text-[10px] font-black tracking-widest uppercase opacity-50">Entering Fictelier...</p>
    </div>
  );

  // 初期化エラー画面（Configが見つからない場合）
  if (!app) return (
    <div className={`h-screen w-full flex flex-col items-center justify-center p-8 transition-colors duration-500 ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-stone-50 text-stone-900'}`}>
      <div className="max-w-md w-full space-y-8 text-center animate-in fade-in duration-700">
        <AlertCircle size={64} className="mx-auto text-red-500 opacity-50" />
        <div className="space-y-4">
          <h1 className="text-3xl font-black italic tracking-tighter text-indigo-500">Fictelier Setup</h1>
          <div className="p-6 bg-red-50 dark:bg-red-950/20 rounded-[2rem] border border-red-100 dark:border-red-900/30">
            <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed text-left">
              <span className="block mb-2 text-sm uppercase">初期化に失敗しました</span>
              Firebase の設定が見つかりません。以下のいずれかを確認してください：
              <ul className="list-disc list-inside mt-2 font-normal opacity-80">
                <li>環境変数 (.env.local) が正しく設定されているか</li>
                <li>APIキーの綴りに間違いがないか</li>
                <li>プレビュー環境の設定が有効か</li>
              </ul>
            </p>
          </div>
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest leading-relaxed">
            ローカル環境の場合は .env ファイルの作成を忘れないでください。
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-all shadow-xl"
        >
          <RefreshCw size={14} /> Retry Connection
        </button>
      </div>
    </div>
  );

  // ログイン画面
  if (!user) return (
    <div className={`h-screen w-full flex flex-col items-center justify-center transition-colors duration-500 ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-stone-50 text-stone-900'}`}>
      {errorMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
          <AlertCircle size={20} /> <span className="text-xs font-bold leading-tight">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 hover:opacity-70 flex-shrink-0"><X size={16} /></button>
        </div>
      )}
      <div className="flex flex-col items-center gap-8 max-w-sm w-full px-8 text-center animate-in fade-in zoom-in duration-700">
        <div className="space-y-4">
          <FictelierLogo size={80} className="text-indigo-500 mx-auto" />
          <h1 className="text-5xl font-black italic tracking-tighter">Fictelier</h1>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">
            設定と原稿が共鳴する、小説家専用の執筆アトリエ。
            あなたの物語を、ここから始めましょう。
          </p>
        </div>
        
        <div className="w-full flex flex-col gap-3">
          <button 
            onClick={handleGoogleLogin} 
            disabled={authProcessing}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-500 text-white rounded-[1.5rem] text-sm font-black shadow-xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
          >
            {authProcessing ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            Googleでログイン
          </button>
          <button 
            onClick={handleAnonymousLogin} 
            disabled={authProcessing}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] text-sm font-black shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
          >
            {authProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-amber-500" />}
            ゲストとして開始
          </button>
        </div>

        <div className="pt-8">
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-2xl transition-all">
             {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-zinc-400" />}
           </button>
        </div>
      </div>
    </div>
  );

  // プロジェクト一覧
  if (view === 'project_list') {
    return (
      <div className={`min-h-screen w-full p-8 md:p-16 transition-colors duration-500 ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-stone-50 text-stone-900'}`}>
        <div className="max-w-6xl mx-auto space-y-12">
          <header className="flex justify-between items-end border-b pb-8 dark:border-zinc-800">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-2"><FictelierLogo size={14} /> My Archive</span>
              <h1 className="text-6xl font-black italic tracking-tighter flex items-center gap-4"><FictelierLogo size={52} className="text-indigo-500" /> Fictelier</h1>
            </div>
            <div className="flex items-center gap-4">
               {user?.isAnonymous && (
                 <button onClick={handleGoogleLogin} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-indigo-600 transition-all active:scale-95"><LogIn size={16} /> Google連携して保存</button>
               )}
               <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-2xl transition-all">{isDarkMode ? <Sun size={24} className="text-amber-400" /> : <Moon size={24} />}</button>
               <button onClick={handleSignOut} className="p-3 text-zinc-400 hover:text-red-500 transition-colors" title="ログアウト"><LogOut size={24} /></button>
            </div>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <button onClick={createNewProject} className="group h-[240px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all active:scale-95"><div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition-all"><Plus size={32} /></div><span className="text-xs font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 group-hover:text-indigo-500">Create New Story</span></button>
            {projects.map(proj => (
              <div key={proj.id} className="group relative h-[240px] bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-sm border border-transparent hover:border-indigo-500/30 hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between overflow-hidden" onClick={() => { setActiveProjectId(proj.id); setView('editor'); }}>
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: proj.id, title: proj.title, type: 'project' }); }} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"><Trash2 size={18} /></button></div>
                <div className="space-y-4"><div className="inline-flex p-3 bg-zinc-50 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600 rounded-2xl group-hover:text-indigo-500 transition-colors"><Book size={24} /></div><h3 className="text-xl font-black leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">{proj.title}</h3></div>
                <div className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Clock size={10} /> Updated {new Date(proj.updatedAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
          {!projectsLoaded && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-zinc-300" size={32} /></div>}
        </div>
      </div>
    );
  }

  // エディタ画面
  return (
    <div className={`flex h-screen w-full transition-colors duration-500 ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-stone-50 text-stone-900'}`}>
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-sm w-full shadow-2xl border dark:border-zinc-800 scale-in-center">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full"><AlertCircle size={32} /></div>
              <div className="space-y-2"><h3 className="text-lg font-black tracking-tight">項目を削除しますか？</h3><p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">「{deleteTarget.title}」を削除します。</p></div>
              <div className="flex w-full gap-3 pt-4">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold transition-colors">キャンセル</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white text-xs font-bold shadow-lg transition-transform active:scale-95">削除する</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* アウトライン (左) */}
      <aside 
        style={{ width: leftSidebarOpen ? `${leftWidth}px` : '0px' }}
        className={`flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900 z-30 overflow-hidden relative ${isResizing ? '' : 'transition-[width] duration-300'}`}
      >
        <div className="h-16 flex items-center px-4 justify-between border-b dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/30 flex-shrink-0">
          <div className="flex flex-col min-w-0">
            <button onClick={() => setView('project_list')} className="text-zinc-400 hover:text-indigo-500 transition-all flex items-center gap-1 group text-[8px] font-black uppercase tracking-widest truncate">
              <ChevronLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" /> Back
            </button>
            <span className="text-xs font-black italic tracking-tighter flex items-center gap-1.5 truncate"><FictelierLogo size={14} className="text-indigo-500" /> OUTLINE</span>
          </div>
          <button onClick={async () => { if(!db) return; const newId = generateId('ch'); const newCh = { id: newId, title: '新しい章', content: '', type: 'chapter', isOpen: true, order: Date.now(), children: [] }; setItems(prev => [...prev, newCh]); setActiveId(newId); await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, `fictelier_items_${activeProjectId}`, newId), newCh); }} className="p-1.5 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-all" title="章を追加"><Plus size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scroll">
          <div className="px-2 py-2 mb-4">
             <input className="w-full bg-transparent border-none text-[11px] font-black italic focus:ring-0 p-0 text-zinc-400 opacity-60 hover:opacity-100 transition-opacity" value={projects.find(p => p.id === activeProjectId)?.title || ''} onChange={(e) => { if(!db) return; const title = e.target.value; setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, title } : p)); setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'fictelier_projects', activeProjectId), { title, updatedAt: Date.now() }, { merge: true }); }} />
          </div>
          {items.map((ch) => (
            <div key={ch.id} className="mb-3">
              <div className={`flex items-center p-2.5 rounded-xl cursor-pointer group transition-all ${activeId === ch.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`} onClick={() => { setActiveId(ch.id); updateItemLocal(ch.id, { isOpen: !ch.isOpen }); }}>
                <div className="mr-2 opacity-50">{ch.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>
                <span className="flex-1 truncate text-xs">{ch.title}</span>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); const newSceneId = generateId('sc'); updateItemLocal(ch.id, { children: [...(ch.children || []), { id: newSceneId, title: '新しいシーン', content: '', type: 'scene', order: Date.now() }], isOpen: true }); setActiveId(newSceneId); }} className="p-1 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-950 rounded"><Plus size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: ch.id, title: ch.title, type: 'chapter' }); }} className="p-1 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              {ch.isOpen && ch.children && (
                <div className="ml-4 mt-1 border-l-2 border-zinc-100 dark:border-zinc-800 pl-3 space-y-1">
                  {ch.children.map((sc) => (
                    <div key={sc.id} onClick={() => setActiveId(sc.id)} className={`flex items-center p-2 rounded-lg cursor-pointer group text-xs transition-all ${activeId === sc.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold border-l-2 border-indigo-500' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'}`}>
                      <FileText size={12} className="mr-2 opacity-40" />
                      <span className="flex-1 truncate">{sc.title}</span>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: sc.id, title: sc.title, type: 'scene', parentId: ch.id }); }} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* 左リサイザー */}
      {leftSidebarOpen && (
        <div onMouseDown={startResizingLeft} className={`w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors z-40 bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 ${isResizing ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : ''}`} />
      )}

      {/* メイン: エディタ */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 z-10 shadow-2xl overflow-hidden relative font-serif">
        <header className="h-16 border-b dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl flex-shrink-0 z-20">
          <div className="flex items-center gap-5">
            <button onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} className={`p-2 rounded-xl transition-all ${leftSidebarOpen ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`} title={leftSidebarOpen ? "閉じる" : "開く"}>{leftSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}</button>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest italic flex items-center gap-1"><FictelierLogo size={10} /> Manuscript Studio</span>
              <h2 className="text-sm font-black italic truncate">{activeItem?.title || "Fictelier"}</h2>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-[10px] font-black text-zinc-400 uppercase tracking-widest">
               <Type size={12} className="text-indigo-500" /><span className="text-zinc-800 dark:text-zinc-200">{activeItem?.content?.length || 0}</span><span className="opacity-40">chars</span>
            </div>
            <div className="min-w-[80px] flex justify-end">
              {saveStatus === 'saved' && <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-500 rounded-full border border-emerald-100/50 dark:border-emerald-900/20 text-[9px] font-black uppercase tracking-widest"><CheckCircle2 size={12} /> Saved</div>}
              {saveStatus === 'saving' && <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50/50 dark:bg-indigo-950/10 text-indigo-500 rounded-full border border-indigo-100/50 dark:border-indigo-900/20 text-[9px] font-black uppercase tracking-widest"><Loader2 size={12} className="animate-spin" /> Saving</div>}
            </div>
            <div className="flex items-center gap-2 pl-4 border-l dark:border-zinc-800">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all">{isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}</button>
              <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className={`p-2 rounded-xl transition-all ${rightPanelOpen ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`} title={rightPanelOpen ? "閉じる" : "開く"}>{rightPanelOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}</button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative custom-scroll overflow-y-auto">
          {!dataLoaded && activeProjectId ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-300">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-xs font-bold uppercase tracking-widest">Loading Manuscript...</p>
            </div>
          ) : activeItem ? (
            <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-950 min-h-[calc(100vh-12rem)] shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-200 dark:border-zinc-800 rounded-sm flex flex-col p-8 md:p-20 overflow-hidden my-8">
              <input type="text" value={activeItem.title} onChange={(e) => updateItemLocal(activeId, { title: e.target.value })} className="w-full text-5xl font-black bg-transparent border-none outline-none focus:ring-0 mb-12 tracking-tighter italic placeholder:opacity-20" placeholder="Title..." />
              <div className="relative flex-1">
                <div ref={backdropRef} className="absolute inset-0 p-0 text-xl leading-[2.2] font-serif pointer-events-none whitespace-pre-wrap break-words text-transparent" dangerouslySetInnerHTML={{ __html: getHighlights(activeItem.content) }} />
                <textarea ref={textareaRef} value={activeItem.content} onScroll={(e) => { if(backdropRef.current) backdropRef.current.scrollTop = e.target.scrollTop; }} onClick={handleTextareaClick} onChange={(e) => updateItemLocal(activeId, { content: e.target.value })} className="absolute inset-0 w-full h-full bg-transparent border-none outline-none focus:ring-0 text-xl leading-[2.2] font-serif resize-none p-0 dark:caret-white placeholder:opacity-20" spellCheck="false" placeholder="Once upon a time..." />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-200 dark:text-zinc-900"><Sparkles size={120} className="opacity-10 mb-8" /><p className="text-sm font-black tracking-widest uppercase opacity-40 text-center px-4">Select a piece to begin</p></div>
          )}
        </div>
      </main>

      {/* 右リサイザー */}
      {rightPanelOpen && (
        <div onMouseDown={startResizingRight} className={`w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors z-40 bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 ${isResizing ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : ''}`} />
      )}

      {/* 設定ノート (右) */}
      <aside 
        style={{ width: rightPanelOpen ? `${rightWidth}px` : '0px' }}
        className={`flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/50 z-30 overflow-hidden relative ${isResizing ? '' : 'transition-[width] duration-300'}`}
      >
        <div className="h-16 flex items-center px-6 justify-between border-b dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Tags size={12} /> World Notes</span>
          <button onClick={() => { if(!db) return; setNotes([...notes, { id: generateId('cat'), title: '新しいカテゴリ', colorId: 'amber', isOpen: true, order: Date.now(), children: [] }]); triggerSave(); }} className="text-indigo-500 hover:scale-110 transition-transform"><FolderPlus size={18} /></button>
        </div>
        <div id="notes-sidebar" className="flex-1 overflow-y-auto p-5 space-y-6 custom-scroll">
          {notes.map((cat) => (
            <div key={cat.id} className="space-y-3">
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => updateNoteLocal(cat.id, { isOpen: !cat.isOpen })} className="text-zinc-400">{cat.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
                  <input className="flex-1 bg-transparent border-none text-[11px] font-black uppercase tracking-widest p-0 focus:ring-0 truncate opacity-60" value={cat.title || ''} onChange={e => updateNoteLocal(cat.id, { title: e.target.value })} placeholder="Category Name..." />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); updateNoteLocal(cat.id, { children: [...(cat.children || []), { id: generateId('nt'), name: '新項目', description: '', order: Date.now() }], isOpen: true }); }} className="p-1 text-indigo-500 hover:scale-110"><Plus size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); setDeleteTarget({ id: cat.id, title: cat.title, type: 'category' }); }} className="p-1 text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                  {HIGHLIGHT_COLORS.map(color => (
                    <button 
                      key={color.id} 
                      onClick={() => updateNoteLocal(cat.id, { colorId: color.id })}
                      className={`w-4 h-4 rounded-full transition-all ${color.dot} ${cat.colorId === color.id ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-900 scale-110' : 'opacity-40 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>

              {cat.isOpen && cat.children && (
                <div className="space-y-3 pl-2">
                  {cat.children.map((n) => (
                    <div key={n.id} id={`note-${n.id}`} onClick={() => setActiveNoteId(n.id)} className={`p-5 rounded-[1.5rem] border transition-all cursor-pointer relative overflow-hidden ${activeNoteId === n.id ? 'bg-white dark:bg-zinc-900/60 border-indigo-400 shadow-2xl ring-1 ring-indigo-400 scale-[1.03]' : 'bg-white/40 dark:bg-zinc-900/40 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${HIGHLIGHT_COLORS.find(c => c.id === cat.colorId)?.dot || 'bg-amber-500'}`} />
                        <input className="flex-1 bg-transparent border-none text-xs font-black focus:ring-0 p-0" value={n.name || ''} onChange={e => updateNoteLocal(cat.id, { children: cat.children.map(c => c.id === n.id ? { ...c, name: e.target.value } : c) })} onClick={e => e.stopPropagation()} placeholder="Entry Name..." />
                        <button onClick={e => { e.stopPropagation(); updateNoteLocal(cat.id, { children: cat.children.filter(c => c.id !== n.id) }); }} className="text-zinc-300 hover:text-red-500 transition-colors"><X size={14} /></button>
                      </div>
                      <textarea className="w-full bg-transparent border-none text-[11px] text-zinc-500 dark:text-zinc-400 focus:ring-0 p-0 resize-none h-16 leading-relaxed overflow-hidden placeholder-zinc-300" value={n.description || ''} onChange={e => updateNoteLocal(cat.id, { children: cat.children.map(c => c.id === n.id ? { ...c, description: e.target.value } : c) })} onClick={e => e.stopPropagation()} placeholder="Quick notes..." />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {isResizing && <div className="fixed inset-0 z-[9999] cursor-col-resize" />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700;900&display=swap');
        .font-serif { font-family: 'Noto Serif JP', serif; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #8882; border-radius: 10px; }
        .scale-in-center { animation: scale-in-center 0.2s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
        @keyframes scale-in-center { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}