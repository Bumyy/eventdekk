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

interface OAuthProfileData {
  displayName: string | null;
  profilePicture: string | null;
  isNewUser: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  sdbToken: string | null;
  pendingOAuthProfile: OAuthProfileData | null;
  clearPendingOAuthProfile: () => void;
  logout: (silent?: boolean) => void; // <-- Updated signature
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SDB_AUTH_TOKEN_KEY = "eventdekk_auth_token";
const OAUTH_PROFILE_KEY = "eventdekk_oauth_profile";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [sdbToken, setSdbToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOAuthProfile, setPendingOAuthProfile] =
    useState<OAuthProfileData | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem(SDB_AUTH_TOKEN_KEY);
    if (storedToken) {
      setSdbToken(storedToken);
      setIsAuthenticated(true);
    }

    // Check for pending OAuth profile data
    const storedProfile = localStorage.getItem(OAUTH_PROFILE_KEY);
    if (storedProfile) {
      try {
        setPendingOAuthProfile(JSON.parse(storedProfile));
      } catch {
        localStorage.removeItem(OAUTH_PROFILE_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  const handleAuthSuccess = useCallback(
    (token: string, profileData?: OAuthProfileData | null) => {
      localStorage.setItem(SDB_AUTH_TOKEN_KEY, token);
      setSdbToken(token);
      setIsAuthenticated(true);

      if (profileData) {
        localStorage.setItem(OAUTH_PROFILE_KEY, JSON.stringify(profileData));
        setPendingOAuthProfile(profileData);
      }

      toast.success("Login successful!");

      if (profileData?.isNewUser) {
        navigate("/profile", { replace: true });
        return;
      }

      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    },
    [navigate, location]
  );

  const handleAuthFailure = useCallback((msg: string) => {
    toast.error(msg);
    localStorage.removeItem(SDB_AUTH_TOKEN_KEY);
    localStorage.removeItem("eventdekk_identity");
    localStorage.removeItem(OAUTH_PROFILE_KEY);
    sessionStorage.removeItem("eventdekk_anonymous_token");
    setSdbToken(null);
    setIsAuthenticated(false);
    setPendingOAuthProfile(null);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    if (window.location.pathname === "/auth/callback") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const error = params.get("error");
      const displayName = params.get("displayName");
      const profilePicture = params.get("profilePicture");
      const isNewUser = params.get("isNewUser") === "true";

      if (token) {
        const profileData: OAuthProfileData = {
          displayName: displayName || null,
          profilePicture: profilePicture || null,
          isNewUser,
        };
        handleAuthSuccess(token, profileData);
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
      localStorage.removeItem(OAUTH_PROFILE_KEY);
      sessionStorage.removeItem("eventdekk_anonymous_token");
      setSdbToken(null);
      setIsAuthenticated(false);
      setPendingOAuthProfile(null);

      if (!silent) {
        toast.info("Logged out");
      }
      navigate("/login");
    }
  };

  const clearPendingOAuthProfile = useCallback(() => {
    localStorage.removeItem(OAUTH_PROFILE_KEY);
    setPendingOAuthProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        sdbToken,
        pendingOAuthProfile,
        clearPendingOAuthProfile,
        logout,
      }}
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
