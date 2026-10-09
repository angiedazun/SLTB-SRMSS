import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;   // 30 minutes
const SESSION_WARNING_MS = 28 * 60 * 1000;   // warn at 28 min

const TOKEN_KEY = 'sltb_token';

const getStoredToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);

  const sessionTimerRef = useRef(null);
  const warningTimerRef = useRef(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setSessionWarning(false);
    clearTimeout(sessionTimerRef.current);
    clearTimeout(warningTimerRef.current);
  }, []);

  const resetSessionTimer = useCallback(() => {
    clearTimeout(sessionTimerRef.current);
    clearTimeout(warningTimerRef.current);
    setSessionWarning(false);
    warningTimerRef.current = setTimeout(() => setSessionWarning(true), SESSION_WARNING_MS);
    sessionTimerRef.current = setTimeout(() => logout(), SESSION_TIMEOUT_MS);
  }, [logout]);

  const extendSession = useCallback(() => {
    resetSessionTimer();
  }, [resetSessionTimer]);

  // Set up activity listeners when user is logged in
  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetSessionTimer));
    resetSessionTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetSessionTimer));
      clearTimeout(sessionTimerRef.current);
      clearTimeout(warningTimerRef.current);
    };
  }, [user, resetSessionTimer]);

  const loadUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) { setLoading(false); return; }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  // rememberMe=true → localStorage (persists after browser close)
  // rememberMe=false → sessionStorage (cleared when browser closes)
  const login = async (identifier, password, rememberMe = false) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    if (rememberMe) {
      localStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      localStorage.removeItem(TOKEN_KEY);
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    return data;
  };

  const updateUser = (updated) => setUser((prev) => ({ ...prev, ...updated }));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, sessionWarning, extendSession }}>
      {children}
    </AuthContext.Provider>
  );
};

