import { Timestamp } from "spacetimedb";
import type { DbConnection } from "@/module_bindings";
import { EventStatus } from "@/module_bindings/types";

type BigIntLike = bigint | string | number;

const toBigInt = (value: BigIntLike) => BigInt(value);

type SeedEventsOptions = {
  groupId: BigIntLike;
  count?: number;
  subEventsPerEvent?: number;
  gapMinutes?: number;
  isInternal?: boolean;
};

const defaultSeedOptions: Required<
  Pick<SeedEventsOptions, "count" | "subEventsPerEvent" | "gapMinutes" | "isInternal">
> = {
  count: 50,
  subEventsPerEvent: 2,
  gapMinutes: 60,
  isInternal: true,
};

export const seedEvents = async (
  connection: DbConnection,
  options: SeedEventsOptions
) => {
  const { groupId, count, subEventsPerEvent, gapMinutes, isInternal } = {
    ...defaultSeedOptions,
    ...options,
  };

  const creatorGroupId = toBigInt(groupId);
  const now = Date.now();
  const gapMs = gapMinutes * 60 * 1000;

  const start = performance.now();

  for (let i = 0; i < count; i += 1) {
    const eventStart = new Date(now + i * gapMs);
    const eventEnd = new Date(eventStart.getTime() + 90 * 60 * 1000);

    const subEventsData = Array.from({ length: subEventsPerEvent }, (_, idx) => {
      const subStart = new Date(eventStart.getTime() + idx * 30 * 60 * 1000);
      const subEnd = new Date(subStart.getTime() + 30 * 60 * 1000);

      return {
        name: `LoadTest Wave ${i + 1}-${idx + 1}`,
        description: "Load test sub-event",
        subEventType: { tag: "GroupFlight" },
        scheduledStartTime: Timestamp.fromDate(subStart),
        scheduledEndTime: Timestamp.fromDate(subEnd),
        groupFlightDepartureIcao: "LHBP",
        groupFlightArrivalIcao: "LOWW",
        groupFlightRoute: "DCT",
        notes: "load test",
        eventLead: undefined,
      };
    });

    await connection.reducers.createEvent({
      creatorGroupId,
      name: `LoadTest Event ${i + 1}`,
      description: "Load test event",
      startTime: Timestamp.fromDate(eventStart),
      endTime: Timestamp.fromDate(eventEnd),
      ifcEventLink: null,
      bannerUrl: null,
      subEventsData,
      status: { tag: "Draft" } as EventStatus,
      isInternal,
    });
  }

  const end = performance.now();
  const durationMs = end - start;
  const perEventMs = count > 0 ? durationMs / count : 0;
  const rate = durationMs > 0 ? (count / durationMs) * 1000 : 0;
  console.log(
    `[loadTest] seedEvents: ${count} events, ${durationMs.toFixed(1)} ms ` +
      `(${perEventMs.toFixed(1)} ms/event, ${rate.toFixed(2)} events/s)`
  );
};

type BurstChatOptions = {
  groupId: BigIntLike;
  eventId: BigIntLike;
  messages?: number;
  batchSize?: number;
};

const defaultBurstChatOptions: Required<
  Pick<BurstChatOptions, "messages" | "batchSize">
> = {
  messages: 500,
  batchSize: 50,
};

export const burstChat = async (
  connection: DbConnection,
  options: BurstChatOptions
) => {
  const { groupId, eventId, messages, batchSize } = {
    ...defaultBurstChatOptions,
    ...options,
  };

  const targetGroupId = toBigInt(groupId);
  const targetEventId = toBigInt(eventId);

  const start = performance.now();

  for (let offset = 0; offset < messages; offset += batchSize) {
    const batchCount = Math.min(batchSize, messages - offset);
    const batch = Array.from({ length: batchCount }, (_, idx) => {
      return connection.reducers.addLiveChatMessage({
        groupId: targetGroupId,
        eventId: targetEventId,
        message: `load test msg ${offset + idx + 1}`,
      });
    });

    await Promise.all(batch);
  }

  const end = performance.now();
  const durationMs = end - start;
  const perMsgMs = messages > 0 ? durationMs / messages : 0;
  const rate = durationMs > 0 ? (messages / durationMs) * 1000 : 0;
  console.log(
    `[loadTest] burstChat: ${messages} messages, ${durationMs.toFixed(1)} ms ` +
      `(${perMsgMs.toFixed(2)} ms/msg, ${rate.toFixed(2)} msg/s)`
  );
};
