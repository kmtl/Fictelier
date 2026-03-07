import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken, signOut, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authProcessing, setAuthProcessing] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const savedUserId = window.localStorage.getItem('fictelier_user_id');
        if (savedUserId) {
          const customToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
          if (customToken) {
            await signInWithCustomToken(auth, customToken);
          } else {
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        window.localStorage.setItem('fictelier_user_id', u.uid);
      }
      setUser(u);
      setLoading(false);
    });

    initAuth();
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (!auth) return;
    setAuthProcessing(true);
    await signOut(auth);
    window.localStorage.removeItem('fictelier_user_id');
    setAuthProcessing(false);
  };

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider) return;
    setAuthProcessing(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google login error:", err);
    }
    setAuthProcessing(false);
  };

  return {
    user,
    loading,
    authProcessing,
    handleLogout,
    handleGoogleLogin,
  };
};
