import { EventEmitter } from 'node:events';
import { logger } from '../logging/logger';
import type { DomainEvent, EventBus, EventHandler } from './event-bus.interface';

/**
 * Day-one EventBus implementation. Correct for a single app instance; does NOT
 * guarantee delivery across instances or survive a crash between publish and
 * handler execution — that gap is exactly what motivates the future durable
 * (outbox + queue-backed) implementation described in ARCHITECTURE.md §21.1.
 *
 * A handler throwing never propagates to the publisher — the attempt/write
 * that triggered the event has already succeeded by the time it's published.
 */
export class InProcessEventBus implements EventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  async publish<TPayload>(type: string, payload: TPayload): Promise<void> {
    const event: DomainEvent<TPayload> = { type, payload, occurredAt: new Date() };
    const handlers = this.emitter.listeners(type) as Array<EventHandler<TPayload>>;

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (err) {
          logger.error({ err, eventType: type }, 'Domain event handler failed');
        }
      }),
    );
  }

  subscribe<TPayload>(type: string, handler: EventHandler<TPayload>): void {
    this.emitter.on(type, handler as (...args: unknown[]) => void);
  }
}
