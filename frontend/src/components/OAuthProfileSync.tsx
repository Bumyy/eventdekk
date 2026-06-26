import { useEffect } from "react";
import { useSpacetimeDB } from "spacetimedb/react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUser } from "@/hooks/spacetimeHooks";

export const OAuthProfileSync: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { pendingOAuthProfile, clearPendingOAuthProfile } = useAuth();
  const { getConnection } = useSpacetimeDB();
  const currentUser = useCurrentUser();

  useEffect(() => {
    if (!pendingOAuthProfile || !currentUser) return;

    const connection = getConnection();
    if (!connection) return;

    const incomingDisplayName = pendingOAuthProfile.displayName?.trim() || null;
    const incomingProfilePicture = pendingOAuthProfile.profilePicture || null;
    const isNewUser = pendingOAuthProfile.isNewUser;

    const existingDisplayName = currentUser.displayName;
    const existingProfilePicture = currentUser.ifcProfileUrl;

    const shouldUpdateDisplayName =
      isNewUser &&
      !!incomingDisplayName &&
      incomingDisplayName !== existingDisplayName;
    const shouldUpdateProfilePicture =
      isNewUser &&
      !!incomingProfilePicture &&
      incomingProfilePicture !== existingProfilePicture;

    if (!shouldUpdateDisplayName && !shouldUpdateProfilePicture) {
      clearPendingOAuthProfile();
      return;
    }

    const nextDisplayName = shouldUpdateDisplayName
      ? incomingDisplayName
      : existingDisplayName || connection.identity.toHexString().slice(0, 12);

    if (!nextDisplayName) {
      clearPendingOAuthProfile();
      return;
    }

    connection.reducers.setUserProfile({
      displayName: nextDisplayName,
      ifcProfileUrl: shouldUpdateProfilePicture
        ? incomingProfilePicture
        : existingProfilePicture || null,
      ifcCallsignPrefix: currentUser.ifcCallsignPrefix || null,
      timezone: currentUser.timezone || null,
    });

    clearPendingOAuthProfile();
  }, [
    pendingOAuthProfile,
    currentUser,
    getConnection,
    clearPendingOAuthProfile,
  ]);

  return <>{children}</>;
};
