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
  LogIn, RefreshCw, Palette, Download
} from 'lucide-react';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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

const appId = typeof __app_id !== 'undefined' ? __app_id : 'fictelier-v1';
const AUTO_SAVE_DEBOUNCE_MS = 2000;

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

const FONT_SIZES = { small: 'text-lg', medium: 'text-xl', large: 'text-2xl' };

// --------------------------------------------------------
// [サブコンポーネント: 自動リサイズするテキストエリア]
// --------------------------------------------------------
const AutoResizeNoteTextarea = ({ value, onChange, placeholder, isDarkMode }) => {
  const textareaRef = useRef(null);

  const resize = useCallback(() => {
    const node = textareaRef.current;
    if (node) {
      node.style.height = 'auto';
      node.style.height = node.scrollHeight + 'px';
    }
  }, []);

  // 値の変更によるリサイズ
  useEffect(() => {
    const timer = setTimeout(resize, 0);
    return () => clearTimeout(timer);
  }, [value, resize]);

  // 要素の幅の変化（サイドバーの伸縮など）を検知してリサイズ
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;

    const observer = new ResizeObserver(() => {
      resize();
    });
    
    observer.observe(node);
    return () => observer.disconnect();
  }, [resize]);

  return (
    <textarea
      ref={textareaRef}
      className={`w-full bg-transparent border-none text-[13px] focus:ring-0 p-0 resize-none min-h-[24px] leading-[1.6] placeholder-zinc-400 overflow-hidden transition-[height] duration-100 ${
        isDarkMode ? 'text-zinc-300' : 'text-zinc-600'
      }`}
      value={value}
      rows={1}
      onChange={(e) => {
        onChange(e);
        resize();
      }}
      onClick={(e) => e.stopPropagation()}
      placeholder={placeholder}
      spellCheck="false"
    />
  );
};

const FictelierLogo = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="currentColor" fillOpacity="0.1"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
  
  // ダークモードの初期値を localStorage または OS の設定から取得
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('fictelier_theme');
      if (saved !== null) return saved === 'dark';
      // 保存された設定がない場合は、OSのダークモード設定を参照
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  
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
  
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(256);
  const [rightWidth, setRightWidth] = useState(400); 
  const [isResizing, setIsResizing] = useState(false);

  const [saveStatus, setSaveStatus] = useState('saved'); 
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [authProcessing, setAuthProcessing] = useState(false);
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

  const saveTimeoutRef = useRef(null);
  const deletingIdsRef = useRef(new Set()); 
  const itemsRef = useRef([]);
  const notesRef = useRef([]);
  const backdropRef = useRef(null);
  const textareaRef = useRef(null);

  // ダークモードが切り替わるたびに localStorage に保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fictelier_theme', isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

  // フォントサイズが切り替わるたびに localStorage に保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fictelier_fontSize', fontSize);
    }
  }, [fontSize]);

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
      setActiveNoteId(matchedNote.id);
      setRightPanelOpen(true);
      const parent = notes.find(cat => cat.id === matchedNote.parentId);
      if (parent && !parent.isOpen) updateNoteLocal(parent.id, { isOpen: true });
    }
  }, [activeItem?.content, allFlatNotes, notes]);

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

  // 選択されたノートの要素まで自動スクロールする処理
  useEffect(() => {
    if (activeNoteId && rightPanelOpen) {
      // カテゴリが閉じていた場合に開くのを待つため、わずかに遅延させる
      const timer = setTimeout(() => {
        const element = document.getElementById(`note-${activeNoteId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeNoteId, rightPanelOpen]);

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
      <aside style={{ width: leftSidebarOpen ? `${leftWidth}px` : '0px' }} className={`flex-shrink-0 border-r flex flex-col z-30 overflow-hidden relative ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'} ${isResizing ? '' : 'transition-[width] duration-300'}`}>
        <div className={`h-16 flex items-center relative border-b flex-shrink-0 ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50/30 border-zinc-200'}`}>
          <div className="absolute left-4 z-10">
            <button onClick={() => setView('project_list')} className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 group text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'bg-zinc-200/50 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200'}`}>
              <ChevronLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" /> BACK
            </button>
          </div>
          <div className="w-full flex justify-center pointer-events-none">
            <span className="text-xs font-black italic tracking-tighter flex items-center gap-1.5 truncate pr-1"><FictelierLogo size={14} className="text-indigo-500" /> OUTLINE</span>
          </div>
          <div className="absolute right-4 z-10">
            <button onClick={async () => { if(!db) return; const newId = generateId('ch'); const newCh = { id: newId, title: '新しい章', content: '', type: 'chapter', isOpen: true, order: Date.now(), children: [] }; setItems(prev => [...prev, newCh]); setActiveId(newId); await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, `fictelier_items_${activeProjectId}`, newId), newCh); }} className={`p-1.5 text-indigo-500 rounded-lg transition-all ${isDarkMode ? 'hover:bg-indigo-900/40' : 'hover:bg-indigo-100'}`}><Plus size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scroll">
          <div className="px-2 py-2 mb-4">
             <input className={`w-full bg-transparent border-none text-[11px] font-black italic focus:ring-0 p-0 transition-opacity ${isDarkMode ? 'text-zinc-500 opacity-60 hover:opacity-100' : 'text-zinc-400 opacity-60 hover:opacity-100'}`} value={projects.find(p => p.id === activeProjectId)?.title || ''} onChange={(e) => { if(!db) return; const title = e.target.value; setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, title } : p)); setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'fictelier_projects', activeProjectId), { title, updatedAt: Date.now() }, { merge: true }); }} />
          </div>
          {items.map((ch) => (
            <div key={ch.id} className="mb-3">
              <div className={`flex items-center p-2.5 rounded-xl cursor-pointer group transition-all ${activeId === ch.id ? (isDarkMode ? 'bg-indigo-900/30 text-indigo-400 font-bold' : 'bg-indigo-50 text-indigo-600 font-bold') : (isDarkMode ? 'hover:bg-zinc-900 text-zinc-400' : 'hover:bg-zinc-50 text-zinc-700')}`} onClick={() => { setActiveId(ch.id); updateItemLocal(ch.id, { isOpen: !ch.isOpen }); }}>
                <div className="mr-2 opacity-50">{ch.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>
                <span className="flex-1 truncate text-xs">{ch.title}</span>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); const newSceneId = generateId('sc'); updateItemLocal(ch.id, { children: [...(ch.children || []), { id: newSceneId, title: '新しいシーン', content: '', type: 'scene', order: Date.now() }], isOpen: true }); setActiveId(newSceneId); }} className={`p-1 text-indigo-500 rounded transition-all ${isDarkMode ? 'hover:bg-indigo-950' : 'hover:bg-indigo-100'}`}><Plus size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: ch.id, title: ch.title, type: 'chapter' }); }} className="p-1 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              {ch.isOpen && ch.children && (
                <div className={`ml-4 mt-1 border-l-2 pl-3 space-y-1 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                  {ch.children.map((sc) => {
                    // 本文から「# 見出し」を動的に抽出
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
                      <div key={sc.id} className="mb-1">
                        <div onClick={() => setActiveId(sc.id)} className={`flex items-center p-2 rounded-lg cursor-pointer group text-xs transition-all ${activeId === sc.id ? (isDarkMode ? 'bg-indigo-900/40 text-indigo-400 font-bold border-l-2 border-indigo-500' : 'bg-indigo-50 text-indigo-600 font-bold border-l-2 border-indigo-500') : (isDarkMode ? 'hover:bg-zinc-900 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-500')}`}>
                          <FileText size={12} className="mr-2 opacity-40" />
                          <span className="flex-1 truncate">{sc.title}</span>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: sc.id, title: sc.title, type: 'scene', parentId: ch.id }); }} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                        </div>
                        
                        {/* 抽出した見出し（サブアウトライン）の表示 */}
                        {headings.length > 0 && (
                          <div className={`ml-4 mt-0.5 border-l pl-2 space-y-0.5 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                            {headings.map((h, i) => (
                              <div 
                                key={i} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeId !== sc.id) {
                                    setActiveId(sc.id);
                                    setTimeout(() => scrollToHeading(h), 100);
                                  } else {
                                    scrollToHeading(h);
                                  }
                                }}
                                className={`text-[10px] truncate flex items-center gap-1.5 py-0.5 cursor-pointer transition-colors ${isDarkMode ? 'text-zinc-500 hover:text-indigo-400' : 'text-zinc-400 hover:text-indigo-500'}`}
                              >
                                <span className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-zinc-700' : 'bg-zinc-300'}`}></span>
                                {h}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {leftSidebarOpen && <div onMouseDown={startResizingLeft} className={`w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors z-40 flex-shrink-0 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'} ${isResizing ? 'bg-indigo-500' : ''}`} />}

      {/* メインエディタ */}
      <main className={`flex-1 flex flex-col min-w-0 z-10 shadow-2xl overflow-hidden relative font-serif transition-colors ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-stone-900'}`}>
        <header className={`h-16 border-b flex items-center justify-between px-6 backdrop-blur-xl flex-shrink-0 z-20 ${isDarkMode ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-zinc-200'}`}>
          <div className="flex items-center gap-5">
            <button onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} className={`p-2 rounded-xl transition-all ${leftSidebarOpen ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>{leftSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}</button>
            <div className="flex items-center min-w-0">
              <span className="text-sm font-black italic tracking-tighter flex items-center gap-1.5 truncate pr-2"><FictelierLogo size={16} className="text-indigo-500" /> Fictelier</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-400'}`}>
               <Type size={12} className="text-indigo-500" /><span className={`${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>{activeItem?.content?.length || 0}</span><span className="opacity-40">chars</span>
            </div>
            <div className="min-w-[80px] flex justify-end">
              {saveStatus === 'saved' && <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-emerald-950/10 text-emerald-500 border-emerald-900/20' : 'bg-emerald-50/50 text-emerald-500 border-emerald-100/50'}`}><CheckCircle2 size={12} /> Saved</div>}
              {saveStatus === 'saving' && <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-indigo-950/10 text-indigo-500 border-indigo-900/20' : 'bg-indigo-50/50 text-indigo-500 border-indigo-100/50'}`}><Loader2 size={12} className="animate-spin" /> Saving</div>}
            </div>
            <div className={`flex items-center gap-2 pl-4 border-l ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <button onClick={() => setShowExportModal(true)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}><Download size={20} /></button>
              {['small', 'medium', 'large'].map(size => (
                <button key={size} onClick={() => setFontSize(size)} className={`p-1 px-2 rounded text-xs font-bold uppercase tracking-widest transition-all ${fontSize === size ? 'bg-indigo-500 text-white' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}>{size.charAt(0).toUpperCase()}</button>
              ))}
              <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>{isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}</button>
              <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className={`p-2 rounded-xl transition-all ${rightPanelOpen ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>{rightPanelOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}</button>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-hidden relative custom-scroll overflow-y-auto">
          {!dataLoaded && activeProjectId ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-400"><Loader2 className="animate-spin" size={32} /><p className="text-xs font-bold uppercase tracking-widest">Loading Manuscript...</p></div>
          ) : activeItem ? (
            <div className={`max-w-4xl mx-auto min-h-[calc(100vh-8rem)] rounded-sm flex flex-col p-8 md:p-20 overflow-hidden my-8 border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 shadow-none' : 'bg-white border-zinc-200 shadow-xl shadow-zinc-200/50'}`}>
              <input type="text" value={activeItem.title} onChange={(e) => updateItemLocal(activeId, { title: e.target.value })} className="w-full text-3xl font-black bg-transparent border-none outline-none focus:ring-0 mb-6 tracking-tighter italic placeholder:opacity-20" placeholder="Title..." />
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
                    <div ref={backdropRef} className={`absolute inset-0 p-0 ${FONT_SIZES[fontSize]} leading-[2.2] font-serif pointer-events-none whitespace-pre-wrap break-words text-transparent overflow-hidden`} dangerouslySetInnerHTML={{ __html: getHighlights(activeItem.content) }} />
                    <textarea ref={textareaRef} value={activeItem.content} onScroll={handleScroll} onClick={handleTextareaClick} onChange={(e) => updateItemLocal(activeId, { content: e.target.value })} className={`absolute inset-0 w-full h-full bg-transparent border-none outline-none focus:ring-0 ${FONT_SIZES[fontSize]} leading-[2.2] font-serif resize-none p-0 placeholder:text-zinc-400 placeholder:opacity-20 ${isDarkMode ? 'text-zinc-100 caret-white' : 'text-stone-900 caret-black'} selection:text-current`} spellCheck="false" placeholder="Once upon a time..." />
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className={`h-full flex flex-col items-center justify-center opacity-10 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-300'}`}><Sparkles size={120} className="mb-8" /><p className="text-sm font-black tracking-widest uppercase text-center px-4">Select a piece to begin</p></div>
          )}
        </div>
      </main>

      {rightPanelOpen && <div onMouseDown={startResizingRight} className={`w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors z-40 flex-shrink-0 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'} ${isResizing ? 'bg-indigo-500' : ''}`} />}

      {/* 右サイドバー: 設定ノート 改良版 */}
      <aside style={{ width: rightPanelOpen ? `${rightWidth}px` : '0px' }} className={`flex-shrink-0 border-l flex flex-col z-30 overflow-hidden relative transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} ${isResizing ? '' : 'transition-[width] duration-300'}`}>
        <div className={`h-16 flex items-center px-6 justify-between border-b flex-shrink-0 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><Tags size={12} /> World Notes</span>
          <button onClick={() => { 
            if(!db) return; 
            const newId = generateId('cat');
            const newCat = { id: newId, title: '新しいカテゴリ', colorId: 'amber', isOpen: true, order: Date.now(), children: [] };
            setNotes([...notes, newCat]); 
            triggerSave(newId, 'note'); // IDを渡して即時保存を促す
          }} className="text-indigo-500 hover:scale-110 transition-transform"><FolderPlus size={18} /></button>
        </div>
        
        <div id="notes-sidebar" className="flex-1 overflow-y-auto p-4 space-y-8 custom-scroll pb-[60vh]">
          {notes.map((cat) => (
            <div key={cat.id} className={`rounded-[2rem] border transition-all overflow-hidden ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-100/50 border-zinc-200'}`}>
              
              <div className="group p-4 bg-white/40 dark:bg-zinc-900/40 flex items-center gap-3 border-b dark:border-zinc-800">
                <button onClick={() => updateNoteLocal(cat.id, { isOpen: !cat.isOpen })} className="text-zinc-400">
                  {cat.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                <div className="relative inline-block flex-shrink-0">
                  <button onClick={() => setOpenColorPickerId(openColorPickerId === cat.id ? null : cat.id)} className={`w-5 h-5 rounded-full ${HIGHLIGHT_COLORS.find(c => c.id === cat.colorId)?.dot || 'bg-amber-500'} ring-2 ring-offset-2 ring-transparent hover:ring-zinc-400 dark:ring-offset-zinc-900 transition-all flex items-center justify-center`} title="色を変更">
                    <Palette size={10} className="text-white opacity-40" />
                  </button>
                  {openColorPickerId === cat.id && (
                    <div className={`absolute top-full left-0 mt-2 p-2 border rounded-2xl shadow-2xl z-[60] flex gap-2 animate-in fade-in slide-in-from-top-1 ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                      {HIGHLIGHT_COLORS.map(color => (
                        <button key={color.id} onClick={() => { updateNoteLocal(cat.id, { colorId: color.id }); setOpenColorPickerId(null); }} className={`w-6 h-6 rounded-full transition-all ${color.dot} ${cat.colorId === color.id ? 'ring-2 ring-indigo-400 scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'}`} />
                      ))}
                    </div>
                  )}
                </div>

                <input className={`flex-1 bg-transparent border-none text-[13px] font-black uppercase tracking-[0.1em] p-0 focus:ring-0 truncate ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`} value={cat.title || ''} onChange={e => updateNoteLocal(cat.id, { title: e.target.value })} placeholder="Category Name..." />
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); updateNoteLocal(cat.id, { children: [...(cat.children || []), { id: generateId('nt'), name: '新項目', description: '', order: Date.now() }], isOpen: true }); }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg"><Plus size={16} /></button>
                  <button onClick={e => { e.stopPropagation(); setDeleteTarget({ id: cat.id, title: cat.title, type: 'category' }); }} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>

              {cat.isOpen && (
                <div className="p-4 space-y-4">
                  {cat.children && cat.children.length > 0 ? cat.children.map((n) => (
                    <div 
                      key={n.id} 
                      id={`note-${n.id}`} 
                      onClick={() => setActiveNoteId(n.id)} 
                      className={`p-5 rounded-[1.5rem] border shadow-sm transition-all cursor-pointer relative ${activeNoteId === n.id ? (isDarkMode ? 'bg-zinc-800 border-indigo-500 shadow-xl ring-1 ring-indigo-500 scale-[1.02]' : 'bg-white border-indigo-400 shadow-xl ring-1 ring-indigo-400 scale-[1.02]') : (isDarkMode ? 'bg-zinc-900 border-transparent hover:border-zinc-700' : 'bg-white border-transparent hover:border-zinc-200 hover:shadow-md')}`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-3 h-3 rounded-full shadow-sm ${HIGHLIGHT_COLORS.find(c => c.id === cat.colorId)?.dot || 'bg-amber-500'}`} />
                        <input className={`flex-1 bg-transparent border-none text-sm font-black focus:ring-0 p-0 ${isDarkMode ? 'text-zinc-100' : 'text-stone-900'}`} value={n.name || ''} onChange={e => updateNoteLocal(cat.id, { children: cat.children.map(c => c.id === n.id ? { ...c, name: e.target.value } : c) })} onClick={e => e.stopPropagation()} placeholder="Entry Name..." />
                        <button onClick={e => { e.stopPropagation(); setDeleteTarget({ id: n.id, title: n.name, type: 'note', parentId: cat.id }); }} className="text-zinc-400 hover:text-red-500 transition-colors"><X size={16} /></button>
                      </div>
                      
                      {/* 改良版 自動高さ調整 textarea コンポーネントを使用 */}
                      <AutoResizeNoteTextarea 
                        value={n.description || ''} 
                        isDarkMode={isDarkMode}
                        placeholder="Write details here..." 
                        onChange={e => {
                          updateNoteLocal(cat.id, { children: cat.children.map(c => c.id === n.id ? { ...c, description: e.target.value } : c) });
                        }}
                      />
                    </div>
                  )) : (
                    <div className="py-8 text-center opacity-20"><Plus size={24} className="mx-auto mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">No entries yet</p></div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {isResizing && <div className="fixed inset-0 z-[9999] cursor-col-resize" />}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowExportModal(false)}>
          <div className={`p-6 rounded-xl shadow-xl max-w-md w-full mx-4 ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>プロジェクトをエクスポート</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={exportOptions.includeSubOutlines} onChange={e => setExportOptions(prev => ({ ...prev, includeSubOutlines: e.target.checked }))} />
                <span className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>サブアプトラインを含める (#ではじまる行)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={exportOptions.includeNotes} onChange={e => setExportOptions(prev => ({ ...prev, includeNotes: e.target.checked }))} />
                <span className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>設定ノートを含める (notes.md)</span>
              </label>
              {exportOptions.includeNotes && (
                <label className="flex items-center gap-2 ml-4">
                  <input type="checkbox" checked={exportOptions.includeColors} onChange={e => setExportOptions(prev => ({ ...prev, includeColors: e.target.checked }))} />
                  <span className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>色情報を含める</span>
                </label>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={exportProject} className="flex-1 bg-indigo-500 text-white py-2 px-4 rounded-lg font-bold hover:bg-indigo-600 transition-colors">エクスポート</button>
              <button onClick={() => setShowExportModal(false)} className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors ${isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'}`}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

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