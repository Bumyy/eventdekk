import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const AuthCallbackPage: React.FC = () => {
  // We don't need to call handleOAuthCallback directly if AuthProvider handles it via useEffect
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If authentication is successful (handled by AuthProvider's effect), redirect away
    if (!isLoading && isAuthenticated) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
    // If loading finishes but authentication failed (also handled by AuthProvider), redirect to login
    else if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, location.state]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">
        Processing authentication...
      </p>
    </div>
  );
};

export default AuthCallbackPage;
