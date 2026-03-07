import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateId } from '../utils/constants';

const AUTO_SAVE_DEBOUNCE_MS = 2000;

export const useFirestoreData = (userId, projectId) => {
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const saveTimeoutRef = useRef(null);
  const deletingIdsRef = useRef(new Set());
  const itemsRef = useRef([]);
  const notesRef = useRef([]);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  // プロジェクト一覧購読
  useEffect(() => {
    if (!db || !userId) {
      setProjectsLoaded(true);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'projects'), (snap) => {
      const loaded = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setProjects(loaded.sort((a, b) => (b.order || 0) - (a.order || 0)));
      setProjectsLoaded(true);
    });

    return () => unsubscribe();
  }, [userId]);

  // アイテム（話・章）購読
  useEffect(() => {
    if (!db || !userId || !projectId) {
      setDataLoaded(false);
      return;
    }

    const unsubItems = onSnapshot(
      collection(db, 'users', userId, 'projects', projectId, 'items'),
      (snap) => {
        setItems(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      }
    );

    const unsubNotes = onSnapshot(
      collection(db, 'users', userId, 'projects', projectId, 'notes'),
      (snap) => {
        setNotes(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      }
    );

    setDataLoaded(true);
    return () => { unsubItems(); unsubNotes(); };
  }, [userId, projectId]);

  const triggerSave = useCallback((id, type) => {
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (!db || !userId || !projectId || deletingIdsRef.current.has(id)) return;

      const ref = type === 'item' ? itemsRef.current : notesRef.current;
      const found = findItemDeep(ref, id);
      if (found) {
        const collName = type === 'item' ? 'items' : 'notes';
        setDoc(doc(db, 'users', userId, 'projects', projectId, collName, id), found, { merge: true }).catch(e => 
          setErrorMessage(`保存エラー: ${e.message}`)
        );
      }
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, [userId, projectId]);

  const updateItemLocal = useCallback((id, updates) => {
    if (!id) return;
    setItems(prev => {
      const traverse = (data) => data.map(item => {
        if (item.id === id) return { ...item, ...updates };
        if (item.children) return { ...item, children: traverse(item.children) };
        return item;
      });
      return traverse(prev);
    });
    triggerSave(id, 'item');
  }, [triggerSave]);

  const updateNoteLocal = useCallback((id, updates) => {
    if (!id) return;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    triggerSave(id, 'note');
  }, [triggerSave]);

  const deleteItem = useCallback(async (id, type, parentId) => {
    if (!db || !userId || !projectId) return;
    deletingIdsRef.current.add(id);

    if (type === 'chapter') {
      setItems(prev => prev.filter(item => item.id !== id));
    } else if (type === 'scene') {
      setItems(prev => {
        const traverse = (data) =>
          data.map(item =>
            item.id === parentId
              ? { ...item, children: item.children?.filter(c => c.id !== id) }
              : { ...item, children: traverse(item.children || []) }
          );
        return traverse(prev);
      });
    } else if (type === 'category') {
      setNotes(prev => prev.filter(n => n.id !== id));
    } else if (type === 'note') {
      setNotes(prev => {
        const traverse = (data) =>
          data.map(cat =>
            cat.id === parentId
              ? { ...cat, children: cat.children?.filter(n => n.id !== id) }
              : cat
          );
        return traverse(prev);
      });
    }

    await deleteDoc(doc(db, 'users', userId, 'projects', projectId, type === 'category' || type === 'note' ? 'notes' : 'items', id));
    deletingIdsRef.current.delete(id);
  }, [userId, projectId]);

  return {
    projects,
    items,
    notes,
    projectsLoaded,
    dataLoaded,
    errorMessage,
    updateItemLocal,
    updateNoteLocal,
    deleteItem,
    triggerSave,
  };
};

const findItemDeep = (items, id) => {
  for (let item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItemDeep(item.children, id);
      if (found) return found;
    }
  }
  return null;
};
