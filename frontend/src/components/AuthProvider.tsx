// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner"; // Using sonner for notifications

// Define the shape of the auth context
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  sdbToken: string | null;
  logout: () => Promise<void>;
  triggerSpacetimeConnect: (token: string) => void; // Function to tell SpacetimeProvider to connect
  triggerSpacetimeDisconnect: () => void; // Function to tell SpacetimeProvider to disconnect
  triggerAnonymousConnect: () => void; // New function for anonymous connection
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const SDB_AUTH_TOKEN_KEY = "eventdekk_auth_token"; // Match key in SpacetimeProvider

interface AuthProviderProps {
  children: ReactNode;
  // Callback refs to connect/disconnect SpacetimeProvider
  connectSpacetimeRef: React.MutableRefObject<((token: string) => void) | null>;
  disconnectSpacetimeRef: React.MutableRefObject<(() => void) | null>;
  connectAnonymouslyRef: React.MutableRefObject<(() => void) | null>; // New ref for anonymous connection
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  connectSpacetimeRef,
  disconnectSpacetimeRef,
  connectAnonymouslyRef, // New ref property
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading until we check token
  const [sdbToken, setSdbToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // --- Callback Functions to Control SpacetimeProvider ---
  const triggerSpacetimeConnect = useCallback(
    (token: string) => {
      if (connectSpacetimeRef.current) {
        console.log("AuthContext: Triggering Spacetime connect...");
        connectSpacetimeRef.current(token);
      } else {
        console.error(
          "AuthContext: connectSpacetimeRef callback is not yet set."
        );
      }
    },
    [connectSpacetimeRef]
  );

  // New function to trigger anonymous connection
  const triggerAnonymousConnect = useCallback(() => {
    if (connectAnonymouslyRef.current) {
      console.log("AuthContext: Triggering anonymous Spacetime connect...");
      connectAnonymouslyRef.current();
    } else {
      console.error(
        "AuthContext: connectAnonymouslyRef callback is not yet set."
      );
    }
  }, [connectAnonymouslyRef]);

  const triggerSpacetimeDisconnect = useCallback(() => {
    if (disconnectSpacetimeRef.current) {
      console.log("AuthContext: Triggering Spacetime disconnect...");
      disconnectSpacetimeRef.current();
    } else {
      console.error(
        "AuthContext: disconnectSpacetimeRef callback is not yet set."
      );
    }
  }, [disconnectSpacetimeRef]);

  // --- Check for existing token on mount ---
  useEffect(() => {
    const checkToken = async () => {
      const storedToken = localStorage.getItem(SDB_AUTH_TOKEN_KEY);
      if (storedToken) {
        console.log("AuthContext: Found token in storage. Authenticating...");
        setSdbToken(storedToken);
        setIsAuthenticated(true);
        console.log("storedToken", storedToken);
        // Attempt to connect Spacetime with the stored token
        // Need a slight delay to ensure SpacetimeProvider callback ref is set
        setTimeout(() => triggerSpacetimeConnect(storedToken), 100);
      } else {
        console.log("AuthContext: No token found, connecting anonymously...");
        setIsAuthenticated(false);
        setSdbToken(null);
        // Connect anonymously after a short delay to ensure refs are set up
        setTimeout(() => triggerAnonymousConnect(), 100);
      }
      setIsLoading(false);
    };
    checkToken();
  }, []); // Run only once on mount

  // --- Authentication Functions ---

  const handleAuthSuccess = (token: string) => {
    console.log("AuthContext: Authentication successful.");
    localStorage.setItem(SDB_AUTH_TOKEN_KEY, token);
    setSdbToken(token);
    setIsAuthenticated(true);
    setIsLoading(false);
    // First disconnect any existing connection (which might be anonymous)
    triggerSpacetimeDisconnect();
    // Then connect with the authenticated token
    triggerSpacetimeConnect(token);
    // Redirect user away from login/callback pages if successful
    const from = location.state?.from?.pathname || "/"; // Redirect back or to home
    navigate(from, { replace: true });
    toast.success("Login successful!");
  };

  const handleAuthFailure = (errorMsg: string = "Authentication failed") => {
    console.error("AuthContext: Authentication failed:", errorMsg);
    localStorage.removeItem(SDB_AUTH_TOKEN_KEY);
    setSdbToken(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    // Disconnect from any authenticated connection
    triggerSpacetimeDisconnect();
    // Connect anonymously instead
    triggerAnonymousConnect();
    toast.error(errorMsg);
  };

  const logout = async () => {
    console.log("AuthContext: Logging out...");
    setIsLoading(true);
    try {
      // Call backend to invalidate session cookie (important!)
      await fetch(`${API_URL}/auth/logout`, { method: "POST" });
    } catch (error) {
      console.error("AuthContext: Error calling backend logout:", error);
      // Proceed with client-side logout anyway
    } finally {
      localStorage.removeItem(SDB_AUTH_TOKEN_KEY);
      localStorage.removeItem("eventdekk_identity"); // Also clear identity if stored separately
      setSdbToken(null);
      setIsAuthenticated(false);
      // Disconnect from authenticated connection
      triggerSpacetimeDisconnect();
      // Connect anonymously instead
      triggerAnonymousConnect();
      setIsLoading(false);
      toast.info("Logged out.");
      navigate("/login"); // Redirect to login page after logout
    }
  };

  // --- OAuth Callback Handling ---
  // This function should be called from the dedicated callback page/component
  const handleOAuthCallback = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");
    const message = params.get("message");

    console.log("OAuth Callback Params:", { token, error, message });

    if (error) {
      console.error("OAuth Callback Error:", error, message);
      handleAuthFailure(message || `OAuth login failed: ${error}`);
      navigate("/login", { replace: true }); // Redirect to login on error
    } else if (token) {
      console.log("OAuth Callback Success: Token received.");
      handleAuthSuccess(token);
      // navigate() is handled within handleAuthSuccess
    } else {
      console.warn("OAuth Callback: No token or error found in params.");
      handleAuthFailure("OAuth process incomplete.");
      navigate("/login", { replace: true }); // Redirect if state is unexpected
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies handleAuthSuccess, handleAuthFailure, navigate

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    sdbToken,
    logout,
    triggerSpacetimeConnect,
    triggerSpacetimeDisconnect,
    triggerAnonymousConnect, // Add to context
    // Expose handleOAuthCallback if needed by a separate component, but it's often called internally
  };

  // Expose handleOAuthCallback globally if a specific callback route needs it.
  // This is a bit hacky; a better way might be to pass it down or use route state.
  useEffect(() => {
    if (window.location.pathname === "/auth/callback") {
      setIsLoading(true);
      handleOAuthCallback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.location.pathname]); // Rerun if path changes, specifically for callback

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
