import React, { useEffect, useMemo, useState } from "react";
import { DbConnection, type ErrorContext } from "@/module_bindings";
import { useAuth } from "@/contexts/AuthContext";
import { burstChat, seedEvents } from "@/dev/loadTest";

type LoadTestRunnerProps = {
  enabled?: boolean;
};

const DEFAULT_DB_NAME = "eventdekk";
const DEFAULT_WS_URL = "ws://localhost:3000";

const LoadTestRunner: React.FC<LoadTestRunnerProps> = ({ enabled }) => {
  const { sdbToken } = useAuth();
  const [ready, setReady] = useState(false);
  const [connection, setConnection] = useState<DbConnection | null>(null);

  const effectiveToken =
    sdbToken || sessionStorage.getItem("eventdekk_anonymous_token");

  const wsUrl =
    import.meta.env.VITE_SPACETIME_URL ||
    (window as unknown as { SPACETIME_URL?: string }).SPACETIME_URL ||
    DEFAULT_WS_URL;

  const dbName =
    import.meta.env.VITE_SPACETIME_DB_NAME ||
    (window as unknown as { SPACETIME_DB_NAME?: string }).SPACETIME_DB_NAME ||
    DEFAULT_DB_NAME;

  const shouldConnect = Boolean(enabled && effectiveToken);

  const connectionBuilder = useMemo(() => {
    if (!shouldConnect) return null;

    return DbConnection.builder()
      .withUri(new URL(wsUrl))
      .withDatabaseName(dbName)
      .withToken(effectiveToken || undefined)
      .onConnect((conn) => {
        setConnection(conn);
        setReady(true);
      })
      .onDisconnect(() => {
        setReady(false);
        setConnection(null);
      })
      .onConnectError((_ctx: ErrorContext, err: Error) => {
        console.error("Load test connection failed:", err);
        setReady(false);
        setConnection(null);
      });
  }, [dbName, effectiveToken, shouldConnect, wsUrl]);

  useEffect(() => {
    if (!connectionBuilder) return;
    const conn = connectionBuilder.build();
    return () => {
      const maybeConn = conn as unknown as { close?: () => void };
      if (typeof maybeConn.close === "function") {
        maybeConn.close();
      }
    };
  }, [connectionBuilder]);

  useEffect(() => {
    if (!ready || !connection) return;

    const run = async () => {
      const start = performance.now();
      const groupId =
        sessionStorage.getItem("LOADTEST_GROUP_ID") ||
        (window as unknown as { LOADTEST_GROUP_ID?: string }).LOADTEST_GROUP_ID ||
        "1";

      const eventId =
        sessionStorage.getItem("LOADTEST_EVENT_ID") ||
        (window as unknown as { LOADTEST_EVENT_ID?: string }).LOADTEST_EVENT_ID;

      const seedCount = Number(
        sessionStorage.getItem("LOADTEST_SEED_COUNT") ||
          (window as unknown as { LOADTEST_SEED_COUNT?: string })
            .LOADTEST_SEED_COUNT ||
          "50"
      );
      const subEvents = Number(
        sessionStorage.getItem("LOADTEST_SUBEVENTS") ||
          (window as unknown as { LOADTEST_SUBEVENTS?: string })
            .LOADTEST_SUBEVENTS ||
          "2"
      );

      console.log(
        `[loadTest] config: groupId=${groupId}, eventId=${eventId || "-"}, ` +
          `seedCount=${seedCount}, subEvents=${subEvents}`
      );

      await seedEvents(connection, {
        groupId,
        count: seedCount,
        subEventsPerEvent: subEvents,
        gapMinutes: 60,
        isInternal: true,
      });

      if (eventId) {
        await burstChat(connection, {
          groupId,
          eventId,
          messages: 300,
          batchSize: 50,
        });
      } else {
        console.log("[loadTest] burstChat skipped (no LOADTEST_EVENT_ID set)");
      }

      const end = performance.now();
      console.log(
        `[loadTest] total: ${(end - start).toFixed(1)} ms for seed + burst`
      );
    };

    run().catch((error) => {
      console.error("Load test run failed:", error);
    });
  }, [connection, ready]);

  return null;
};

export default LoadTestRunner;
