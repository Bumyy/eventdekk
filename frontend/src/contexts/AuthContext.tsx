import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  sdbToken: string | null;
  logout: (silent?: boolean) => void; // <-- Updated signature
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SDB_AUTH_TOKEN_KEY = "eventdekk_auth_token";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [sdbToken, setSdbToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem(SDB_AUTH_TOKEN_KEY);
    if (storedToken) {
      setSdbToken(storedToken);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = useCallback(
    (token: string) => {
      localStorage.setItem(SDB_AUTH_TOKEN_KEY, token);
      setSdbToken(token);
      setIsAuthenticated(true);
      toast.success("Login successful!");

      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    },
    [navigate, location]
  );

  const handleAuthFailure = useCallback((msg: string) => {
    toast.error(msg);
    logout();
  }, []);

  useEffect(() => {
    if (window.location.pathname === "/auth/callback") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const error = params.get("error");

      if (token) {
        handleAuthSuccess(token);
      } else if (error) {
        handleAuthFailure(error);
      }
    }
  }, [handleAuthSuccess, handleAuthFailure]);

  // <-- Updated logout function with 'silent' parameter
  const logout = async (silent = false) => {
    try {
      await fetch(`${API_URL}/auth/logout`, { method: "POST" });
    } catch (e) {
      console.error("Logout backend error", e);
    } finally {
      localStorage.removeItem(SDB_AUTH_TOKEN_KEY);
      localStorage.removeItem("eventdekk_identity");
      setSdbToken(null);
      setIsAuthenticated(false);

      if (!silent) {
        toast.info("Logged out");
      }
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, sdbToken, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
