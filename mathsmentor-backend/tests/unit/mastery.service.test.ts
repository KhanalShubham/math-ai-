import { randomBytes } from 'node:crypto';
import { InProcessEventBus } from '../../src/infrastructure/events/in-process.event-bus';
import { createMasteryService } from '../../src/modules/student/mastery.service';
import { MASTERY_EVENTS } from '../../src/modules/student/mastery.events';
import { PRACTICE_EVENTS } from '../../src/modules/practice/practice.events';
import { DIAGNOSTIC_EVENTS } from '../../src/modules/diagnostic/diagnostic.events';
import type { MasteryRepository } from '../../src/modules/student/mastery.repository.interface';
import type { MasteryRecord } from '../../src/modules/student/mastery.types';

function fakeId(): string {
  return randomBytes(12).toString('hex');
}

class FakeMasteryRepository implements MasteryRepository {
  private readonly records = new Map<string, MasteryRecord>();

  private key(studentId: string, topicId: string): string {
    return `${studentId}:${topicId}`;
  }

  async findByStudent(studentId: string): Promise<MasteryRecord[]> {
    return [...this.records.values()].filter((r) => r.studentId === studentId);
  }

  async findByStudentAndTopic(studentId: string, topicId: string): Promise<MasteryRecord | null> {
    return this.records.get(this.key(studentId, topicId)) ?? null;
  }

  async upsertFromAttempt(
    studentId: string,
    topicId: string,
    isCorrect: boolean,
    occurredAt: Date,
  ): Promise<MasteryRecord> {
    const key = this.key(studentId, topicId);
    const current = isCorrect ? 1 : 0;
    const existing = this.records.get(key);

    if (!existing) {
      const record: MasteryRecord = {
        id: fakeId(),
        studentId,
        topicId,
        masteryScore: current,
        attemptsCount: 1,
        correctCount: current,
        lastPracticedAt: occurredAt,
        trend: 'stable',
      };
      this.records.set(key, record);
      return record;
    }

    const newScore = existing.masteryScore * 0.7 + current * 0.3;
    existing.trend =
      newScore > existing.masteryScore + 0.02
        ? 'improving'
        : newScore < existing.masteryScore - 0.02
          ? 'declining'
          : 'stable';
    existing.masteryScore = newScore;
    existing.attemptsCount += 1;
    existing.correctCount += current;
    existing.lastPracticedAt = occurredAt;
    return existing;
  }
}

function buildService() {
  const masteryRepository = new FakeMasteryRepository();
  const eventBus = new InProcessEventBus();
  const service = createMasteryService({ masteryRepository, eventBus });
  return { service, masteryRepository, eventBus };
}

describe('mastery.service', () => {
  it('bootstraps a mastery record from the first PracticeItemSubmitted event', async () => {
    const { service, eventBus } = buildService();
    const studentId = fakeId();
    const topicId = fakeId();

    await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
      studentId,
      topicId,
      questionId: fakeId(),
      isCorrect: true,
    });

    const records = await service.getByStudent(studentId);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ topicId, masteryScore: 1, attemptsCount: 1, correctCount: 1 });
  });

  it('updates an existing mastery record with recency-weighted scoring on subsequent events', async () => {
    const { service, eventBus } = buildService();
    const studentId = fakeId();
    const topicId = fakeId();

    await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
      studentId,
      topicId,
      questionId: fakeId(),
      isCorrect: true,
    });
    await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
      studentId,
      topicId,
      questionId: fakeId(),
      isCorrect: false,
    });

    const records = await service.getByStudent(studentId);
    expect(records).toHaveLength(1);
    const record = records[0]!;
    expect(record.attemptsCount).toBe(2);
    expect(record.correctCount).toBe(1);
    expect(record.masteryScore).toBeCloseTo(0.7, 5); // 1*0.7 + 0*0.3
    expect(record.trend).toBe('declining');
  });

  it('keeps separate mastery records per topic for the same student', async () => {
    const { service, eventBus } = buildService();
    const studentId = fakeId();
    const topicA = fakeId();
    const topicB = fakeId();

    await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
      studentId,
      topicId: topicA,
      questionId: fakeId(),
      isCorrect: true,
    });
    await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
      studentId,
      topicId: topicB,
      questionId: fakeId(),
      isCorrect: false,
    });

    const records = await service.getByStudent(studentId);
    expect(records).toHaveLength(2);
    expect(records.find((r) => r.topicId === topicA)?.masteryScore).toBe(1);
    expect(records.find((r) => r.topicId === topicB)?.masteryScore).toBe(0);
  });

  it('bootstraps mastery records for every topic in a DiagnosticCompleted breakdown', async () => {
    const { service, eventBus } = buildService();
    const studentId = fakeId();
    const strongTopic = fakeId();
    const weakTopic = fakeId();

    await eventBus.publish(DIAGNOSTIC_EVENTS.DiagnosticCompleted, {
      studentId,
      finalGradeEstimate: 6,
      topicBreakdown: [
        { topicId: strongTopic, score: 0.9 },
        { topicId: weakTopic, score: 0.2 },
      ],
    });

    const records = await service.getByStudent(studentId);
    expect(records).toHaveLength(2);
    // Bootstrap approximates the fractional score as pass/fail against a threshold
    // (documented simplification) — 0.9 counts as correct, 0.2 as incorrect.
    expect(records.find((r) => r.topicId === strongTopic)?.masteryScore).toBe(1);
    expect(records.find((r) => r.topicId === weakTopic)?.masteryScore).toBe(0);
  });

  it('returns an empty list for a student with no recorded attempts', async () => {
    const { service } = buildService();
    await expect(service.getByStudent(fakeId())).resolves.toEqual([]);
  });

  it('publishes MasteryMilestoneReached the first time a topic crosses the mastery threshold', async () => {
    const { eventBus } = buildService();
    const studentId = fakeId();
    const topicId = fakeId();
    const milestones: Array<{ studentId: string; topicId: string; masteryScore: number }> = [];
    eventBus.subscribe(MASTERY_EVENTS.MasteryMilestoneReached, async (event) => {
      milestones.push(event.payload as { studentId: string; topicId: string; masteryScore: number });
    });

    // The very first correct answer bootstraps masteryScore straight to 1
    // (no existing record to weight against), crossing the threshold
    // immediately; the next three correct answers keep it at 1, well past
    // the threshold, and must not re-fire the milestone.
    for (let i = 0; i < 4; i += 1) {
      await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
        studentId,
        topicId,
        questionId: fakeId(),
        isCorrect: true,
      });
    }

    expect(milestones).toHaveLength(1);
    expect(milestones[0]).toMatchObject({ studentId, topicId });
    expect(milestones[0]!.masteryScore).toBeGreaterThanOrEqual(0.8);
  });

  it('does not publish MasteryMilestoneReached again once already mastered', async () => {
    const { eventBus } = buildService();
    const studentId = fakeId();
    const topicId = fakeId();
    let milestoneCount = 0;
    eventBus.subscribe(MASTERY_EVENTS.MasteryMilestoneReached, async () => {
      milestoneCount += 1;
    });

    for (let i = 0; i < 6; i += 1) {
      await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
        studentId,
        topicId,
        questionId: fakeId(),
        isCorrect: true,
      });
    }

    expect(milestoneCount).toBe(1);
  });

  it('never publishes MasteryMilestoneReached while the topic stays below threshold', async () => {
    const { eventBus } = buildService();
    const studentId = fakeId();
    const topicId = fakeId();
    let milestoneCount = 0;
    eventBus.subscribe(MASTERY_EVENTS.MasteryMilestoneReached, async () => {
      milestoneCount += 1;
    });

    await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
      studentId,
      topicId,
      questionId: fakeId(),
      isCorrect: false,
    });

    expect(milestoneCount).toBe(0);
  });
});
