import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const AuthCallbackPage: React.FC = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
        <p className="text-lg text-muted-foreground">
          Authentication failed. Redirecting...
        </p>
      </div>
    );
  }

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
