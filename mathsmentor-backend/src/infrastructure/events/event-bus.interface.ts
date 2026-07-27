export interface DomainEvent<TPayload = unknown> {
  type: string;
  occurredAt: Date;
  payload: TPayload;
}

export type EventHandler<TPayload = unknown> = (event: DomainEvent<TPayload>) => Promise<void>;

/**
 * Interface only — the day-one implementation is in-process (in-process.event-bus.ts).
 * A durable, outbox/queue-backed implementation can replace it later without
 * touching a single publisher or subscriber call site (ARCHITECTURE.md §21.1).
 */
export interface EventBus {
  publish<TPayload>(type: string, payload: TPayload): Promise<void>;
  subscribe<TPayload>(type: string, handler: EventHandler<TPayload>): void;
}
