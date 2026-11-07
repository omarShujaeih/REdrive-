import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState('');
  const listeners = useRef(new Set());

  const refreshUnread = useCallback(() => {
    api('/notifications').then((d) => setUnread(d.unread)).catch(() => {});
  }, []);

  // Pages subscribe to live notifications to refresh what they show; returns the unsubscribe function.
  const onNotification = useCallback((cb) => {
    listeners.current.add(cb);
    return () => listeners.current.delete(cb);
  }, []);

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api('/auth/me').then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    refreshUnread();
    const socket = io({ auth: { token: getToken() } });
    socket.on('notification', (n) => {
      setUnread((u) => u + 1);
      setToast(n.title);
      if (n.type === 'account') api('/auth/me').then((d) => setUser(d.user)).catch(() => {});
      listeners.current.forEach((cb) => { try { cb(n); } catch { /* a page's refresh failing must not stop the others */ } });
    });
    return () => socket.disconnect();
  }, [user?._id, refreshUnread]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const login = (token, u) => { setToken(token); setUser(u); };
  const logout = () => { setToken(null); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, setUser, ready, login, logout, unread, setUnread, refreshUnread, toast, setToast, onNotification }}>
      {children}
      {toast && <div className="toast" role="status">{toast}</div>}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Runs fn when a live notification arrives (optionally only for some types: rental, account, car, payment).
// Pages pass the quiet `refresh` from useLoad so what they show updates without a loading flash.
export function useLiveRefresh(fn, types) {
  const { onNotification } = useAuth();
  const fnRef = useRef(fn);
  const typesRef = useRef(types);
  useEffect(() => { fnRef.current = fn; typesRef.current = types; });
  useEffect(() => onNotification((n) => {
    if (!typesRef.current || typesRef.current.includes(n.type)) fnRef.current(n);
  }), [onNotification]);
}
