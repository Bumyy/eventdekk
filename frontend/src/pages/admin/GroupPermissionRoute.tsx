import React, { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSpacetimeDB } from "spacetimedb/react";
import {
  useGroupById,
  useGroupMemberships,
  useIsSuperAdmin,
} from "@/hooks/spacetimeHooks";

type PermissionLevel = "Ceo" | "Staff" | "Member";

interface GroupPermissionRouteProps {
  children: React.ReactElement;
  requiredPermission: PermissionLevel;
}

const GroupPermissionRoute: React.FC<GroupPermissionRouteProps> = ({
  children,
  requiredPermission,
}) => {
  const { groupId } = useParams();
  const groupIdBigInt = groupId ? BigInt(groupId) : null;
  const { identity } = useSpacetimeDB();
  const isSuperAdmin = useIsSuperAdmin();
  const currentGroup = useGroupById(groupIdBigInt);
  const memberships = useGroupMemberships();

  const hasPermission = useMemo(() => {
    if (!groupIdBigInt || !identity) return false;

    if (isSuperAdmin) {
      return true;
    }

    if (
      currentGroup &&
      currentGroup.ceoIdentity.toHexString() === identity.toHexString()
    ) {
      return true;
    }

    const membership = memberships.find(
      (m) =>
        m.groupId === groupIdBigInt &&
        m.userIdentity.toHexString() === identity.toHexString()
    );

    if (!membership) return false;

    const permissionLevel = membership.permissionLevel.tag;

    if (requiredPermission === "Member") {
      return true;
    }

    if (requiredPermission === "Staff") {
      return permissionLevel === "Staff" || permissionLevel === "Ceo";
    }

    if (requiredPermission === "Ceo") {
      return permissionLevel === "Ceo";
    }

    return false;
  }, [
    groupIdBigInt,
    identity,
    memberships,
    currentGroup,
    requiredPermission,
    isSuperAdmin,
  ]);

  if (!groupIdBigInt) {
    return <Navigate to="/admin" replace />;
  }

  if (!currentGroup) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasPermission) {
    return <Navigate to={`/admin/dashboard/${groupId}`} replace />;
  }

  return children;
};

export default GroupPermissionRoute;
