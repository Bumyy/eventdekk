import React from "react";
import { Navigate } from "react-router-dom";
import { useHasSuperAdmins, useIsSuperAdmin } from "@/hooks/spacetimeHooks";

interface SuperAdminRouteProps {
  children: React.ReactElement;
}

const SuperAdminRoute: React.FC<SuperAdminRouteProps> = ({ children }) => {
  const hasSuperAdmins = useHasSuperAdmins();
  const isSuperAdmin = useIsSuperAdmin();

  if (!hasSuperAdmins) {
    return children;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default SuperAdminRoute;
