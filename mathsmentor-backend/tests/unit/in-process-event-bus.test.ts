import { InProcessEventBus } from '../../src/infrastructure/events/in-process.event-bus';

describe('InProcessEventBus', () => {
  it('delivers a published event to a subscribed handler', async () => {
    const bus = new InProcessEventBus();
    const received: unknown[] = [];

    bus.subscribe('TestEvent', (event) => {
      received.push(event.payload);
      return Promise.resolve();
    });

    await bus.publish('TestEvent', { foo: 'bar' });

    expect(received).toEqual([{ foo: 'bar' }]);
  });

  it('does not let a throwing handler reject publish()', async () => {
    const bus = new InProcessEventBus();
    bus.subscribe('TestEvent', () => Promise.reject(new Error('handler failure')));

    await expect(bus.publish('TestEvent', {})).resolves.toBeUndefined();
  });
});
