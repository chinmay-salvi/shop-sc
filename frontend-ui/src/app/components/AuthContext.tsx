import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getToken, clearToken } from "../../lib/auth";
import { isEnrolled } from "../../lib/zkp";

interface AuthState {
  hasSession: boolean;
  enrolled: boolean;
  stableId: string | null;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthState>({
  hasSession: false,
  enrolled: false,
  stableId: null,
  logout: () => {},
  refresh: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasSession, setHasSession] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [stableId, setStableId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setHasSession(!!getToken());
    setEnrolled(isEnrolled());
    // Extract a short display id from localStorage if available
    const token = getToken();
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          setStableId(payload.sub ? payload.sub.slice(0, 12) + "…" : null);
        }
      } catch {
        setStableId(null);
      }
    } else {
      setStableId(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    clearToken();
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ hasSession, enrolled, stableId, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
