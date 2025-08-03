// src/components/SpacetimeProvider.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { DbConnection } from "../module_bindings"; // Adjust path
import { Identity } from "@clockworklabs/spacetimedb-sdk";

// Context Type and Creation (no change)
interface SpacetimeContextType {
  connection: DbConnection | null;
  identity: Identity | null;
  isConnected: boolean;
  isInitialized: boolean; // Indicates if initial subscriptions are applied
}
const SpacetimeContext = createContext<SpacetimeContextType | undefined>(
  undefined
);

// Props (no change initially)
interface SpacetimeProviderProps {
  children: ReactNode;
  dbName?: string;
  dbUri?: string;
  authTokenKey?: string;
  initialSubscriptions?: string[];
}

// Defaults (updated to use environment variables)
const DEFAULT_DB_NAME = "eventdekk";
const DEFAULT_DB_URI =
  import.meta.env.VITE_SPACETIME_URL || "ws://localhost:3000";
const DEFAULT_AUTH_TOKEN_KEY = "eventdekk_auth_token";
const DEFAULT_SUBSCRIPTIONS = [
  "SELECT * FROM user",
  "SELECT * FROM group",
  "SELECT * FROM discovery_event",
  "SELECT * FROM event",
  "SELECT * FROM sub_event",
  "SELECT * FROM event_participant",
  "SELECT * FROM group_membership",
  "SELECT * FROM flight_signup",
  "SELECT * FROM live_chat_message",
];

// Define the interface for the forwarded ref handle
export interface SpacetimeProviderHandle {
  connectWithToken: (token: string) => void;
  connectAnonymously: () => void; // New method for anonymous connection
  disconnect: () => void;
}

// --- Modified SpacetimeProvider Component ---
export const SpacetimeProvider = forwardRef<
  SpacetimeProviderHandle,
  SpacetimeProviderProps
>(
  (
    {
      children,
      dbName = DEFAULT_DB_NAME,
      dbUri = DEFAULT_DB_URI,
      authTokenKey = DEFAULT_AUTH_TOKEN_KEY,
      initialSubscriptions = DEFAULT_SUBSCRIPTIONS,
    },
    ref // The ref forwarded from the parent
  ) => {
    const [connection, setConnection] = useState<DbConnection | null>(null);
    const [identity, setIdentity] = useState<Identity | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    const isMountedRef = useRef(true);
    const connectionRef = useRef<DbConnection | null>(null);
    const currentTokenRef = useRef<string | null>(null); // Store the token used for connection

    // --- Event Handlers (Mostly Unchanged, but note context) ---
    const subscribeToQueries = useCallback(
      (conn: DbConnection) => {
        let initializedSubscriptionCount = 0;
        let totalSubscriptions = initialSubscriptions.length;
        if (totalSubscriptions === 0) {
          return;
        }
        console.log(
          `SpacetimeDB: Subscribing to ${totalSubscriptions} queries...`
        );
        for (const query of initialSubscriptions) {
          conn
            .subscriptionBuilder()
            .onApplied(() => {
              if (isMountedRef.current && !isInitialized) {
                initializedSubscriptionCount++;
                console.log(
                  `SpacetimeDB: Sub applied (${initializedSubscriptionCount}/${totalSubscriptions}): ${query}`
                );
                if (initializedSubscriptionCount >= totalSubscriptions) {
                  console.log(
                    "SpacetimeDB: All initial subscriptions applied."
                  );
                  setIsInitialized(true);
                }
              }
            })
            .subscribe(query);
        }
      },
      [initialSubscriptions, isInitialized]
    );

    const handleConnect = useCallback(
      (
        conn: DbConnection,
        newIdentity: Identity,
        receivedToken: string | null
      ) => {
        console.log(
          "SpacetimeDB: Connected. Identity:",
          newIdentity.toHexString()
        );
        localStorage.setItem("eventdekk_identity", newIdentity.toHexString());
        console.log(receivedToken);

        if (isMountedRef.current) {
          setConnection(conn);
          connectionRef.current = conn;
          setIdentity(newIdentity);
          setIsConnected(true);
          setIsInitialized(false); // Reset init status for new connection
          subscribeToQueries(conn);
        }
      },
      [subscribeToQueries]
    );

    const handleDisconnect = useCallback(() => {
      console.warn("SpacetimeDB: Disconnected.");
      if (isMountedRef.current) {
        setIsConnected(false);
        setIsInitialized(false);
        setIdentity(null);
        setConnection(null);
        connectionRef.current = null;
        currentTokenRef.current = null; // Clear the token on disconnect
      }
    }, []);

    const handleConnectError = useCallback(
      (_conn: DbConnection, err: Error) => {
        console.error("SpacetimeDB: Connection Error:", err);
        if (isMountedRef.current) {
          setIsConnected(false);
          setIsInitialized(false);
          setIdentity(null);
          setConnection(null);
          connectionRef.current = null;
          currentTokenRef.current = null;
          if (
            err.message.toLowerCase().includes("invalid token") ||
            err.message.toLowerCase().includes("unauthorized")
          ) {
            console.warn(
              "SpacetimeDB: Connection failed potentially due to invalid token. AuthContext should handle this."
            );
          }
        }
      },
      []
    );

    // --- Connection Logic ---
    const connectWithToken = useCallback(
      (token: string) => {
        if (!isMountedRef.current) return;
        if (
          connectionRef.current &&
          isConnected &&
          currentTokenRef.current === token
        ) {
          console.log("SpacetimeDB: Already connected with this token.");
          return;
        }

        if (connectionRef.current) {
          console.log(
            "SpacetimeDB: Disconnecting previous connection before reconnecting..."
          );
          connectionRef.current.disconnect();
          handleDisconnect(); // Manually trigger state updates
        }

        console.log(
          `SpacetimeDB: Attempting connection with provided token...`
        );
        console.log("SpacetimeDB: Token:", token);
        currentTokenRef.current = token; // Store the token we are using

        try {
          const newConn = DbConnection.builder()
            .withModuleName(dbName)
            .withUri(dbUri)
            .withToken(token) // Use the provided token
            .onConnect(handleConnect)
            .onDisconnect(handleDisconnect)
            .onConnectError(handleConnectError)
            .build();

          console.log(newConn);

          connectionRef.current = newConn; // Update ref immediately
        } catch (error) {
          console.error("SpacetimeDB: Error building connection:", error);
          handleConnectError(null!, error as Error); // Trigger error handling
        }
      },
      [
        dbName,
        dbUri,
        handleConnect,
        handleDisconnect,
        handleConnectError,
        isConnected,
      ]
    );

    // New method for anonymous connection
    const connectAnonymously = useCallback(() => {
      if (!isMountedRef.current) return;
      if (
        connectionRef.current &&
        isConnected &&
        currentTokenRef.current === null
      ) {
        console.log("SpacetimeDB: Already connected anonymously.");
        return;
      }

      if (connectionRef.current) {
        console.log(
          "SpacetimeDB: Disconnecting previous connection before reconnecting anonymously..."
        );
        connectionRef.current.disconnect();
        handleDisconnect(); // Manually trigger state updates
      }

      console.log("SpacetimeDB: Attempting anonymous connection...");
      currentTokenRef.current = null; // Indicate we're using anonymous connection

      try {
        const newConn = DbConnection.builder()
          .withModuleName(dbName)
          .withUri(dbUri)
          .onConnect((conn, identity, token) =>
            handleConnect(conn, identity, token)
          )
          .onDisconnect(handleDisconnect)
          .onConnectError(handleConnectError)
          .build();

        connectionRef.current = newConn; // Update ref immediately
      } catch (error) {
        console.error(
          "SpacetimeDB: Error building anonymous connection:",
          error
        );
        handleConnectError(null!, error as Error); // Trigger error handling
      }
    }, [
      dbName,
      dbUri,
      handleConnect,
      handleDisconnect,
      handleConnectError,
      isConnected,
    ]);

    const disconnect = useCallback(() => {
      if (connectionRef.current) {
        console.log("SpacetimeDB: Explicitly disconnecting...");
        connectionRef.current.disconnect();
        handleDisconnect(); // Ensure state cleanup
      }
    }, [handleDisconnect]);

    // --- Expose connect/disconnect via ref ---
    useImperativeHandle(ref, () => ({
      connectWithToken,
      connectAnonymously, // Add the new method to the ref
      disconnect,
    }));

    // --- Mount/Unmount Effect ---
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
        console.log("SpacetimeDB Provider: Cleaning up connection...");
        disconnect(); // Use the disconnect function for cleanup
      };
    }, [disconnect]);

    const contextValue: SpacetimeContextType = {
      connection,
      identity,
      isConnected,
      isInitialized,
    };

    return (
      <SpacetimeContext.Provider value={contextValue}>
        {children}
      </SpacetimeContext.Provider>
    );
  }
);

// Custom hook (no change)
export const useSpacetime = (): SpacetimeContextType => {
  const context = useContext(SpacetimeContext);
  if (context === undefined) {
    throw new Error("useSpacetime must be used within a SpacetimeProvider");
  }
  return context;
};
