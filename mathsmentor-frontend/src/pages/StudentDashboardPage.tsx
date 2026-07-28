import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import * as studentApi from '../api/student';
import * as curriculumApi from '../api/curriculum';
import * as diagnosticApi from '../api/diagnostic';
import * as practiceApi from '../api/practice';
import type { StudentProfile, MasteryRecord, ExamBoard, StudentTier } from '../api/student';
import type { Topic, PublicQuestion } from '../api/curriculum';
import type { DiagnosticAttempt } from '../api/diagnostic';
import type { PracticeSession } from '../api/practice';

function CreateProfileForm({ token, onCreated }: { token: string; onCreated: (p: StudentProfile) => void }) {
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('2010-01-01');
  const [examBoard, setExamBoard] = useState<ExamBoard>('AQA');
  const [tier, setTier] = useState<StudentTier>('foundation');
  const [targetGrade, setTargetGrade] = useState(7);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { student } = await studentApi.createMyProfile(token, {
        displayName,
        dateOfBirth,
        examBoard,
        tier,
        targetGrade,
      });
      onCreated(student);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    }
  }

  return (
    <section>
      <h2>Create your student profile</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
        <label>
          Date of birth
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
          />
        </label>
        <label>
          Exam board
          <select value={examBoard} onChange={(e) => setExamBoard(e.target.value as ExamBoard)}>
            <option>AQA</option>
            <option>Edexcel</option>
            <option>OCR</option>
            <option>WJEC</option>
          </select>
        </label>
        <label>
          Tier
          <select value={tier} onChange={(e) => setTier(e.target.value as StudentTier)}>
            <option value="foundation">Foundation</option>
            <option value="higher">Higher</option>
          </select>
        </label>
        <label>
          Target grade
          <input
            type="number"
            min={1}
            max={9}
            value={targetGrade}
            onChange={(e) => setTargetGrade(Number(e.target.value))}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit">
          Create profile
        </button>
      </form>
    </section>
  );
}

function MasterySection({ mastery, topicsById }: { mastery: MasteryRecord[]; topicsById: Map<string, string> }) {
  return (
    <section>
      <h2>Mastery</h2>
      {mastery.length === 0 ? (
        <p className="muted">No mastery data yet — complete a diagnostic or some practice.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Topic</th>
              <th>Score</th>
              <th>Trend</th>
              <th>Attempts</th>
            </tr>
          </thead>
          <tbody>
            {mastery.map((m) => (
              <tr key={m.id}>
                <td>{topicsById.get(m.topicId) ?? m.topicId}</td>
                <td>{m.masteryScore.toFixed(2)}</td>
                <td>{m.trend}</td>
                <td>{m.attemptsCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const STRENGTH_THRESHOLD = 0.7;
const WEAKNESS_THRESHOLD = 0.4;

function StrengthsWeaknessesSection({
  mastery,
  topicsById,
}: {
  mastery: MasteryRecord[];
  topicsById: Map<string, string>;
}) {
  const strengths = mastery.filter((m) => m.masteryScore >= STRENGTH_THRESHOLD);
  const weaknesses = mastery.filter((m) => m.masteryScore < WEAKNESS_THRESHOLD);

  return (
    <section>
      <h2>Strengths &amp; weaknesses</h2>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontSize: '0.95rem' }}>Strengths (score ≥ {STRENGTH_THRESHOLD})</h3>
          {strengths.length === 0 ? (
            <p className="muted">None yet.</p>
          ) : (
            <ul>
              {strengths.map((m) => (
                <li key={m.id}>
                  {topicsById.get(m.topicId) ?? m.topicId} ({m.masteryScore.toFixed(2)})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontSize: '0.95rem' }}>Weaknesses (score &lt; {WEAKNESS_THRESHOLD})</h3>
          {weaknesses.length === 0 ? (
            <p className="muted">None yet.</p>
          ) : (
            <ul>
              {weaknesses.map((m) => (
                <li key={m.id}>
                  {topicsById.get(m.topicId) ?? m.topicId} ({m.masteryScore.toFixed(2)})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

const MASTERED_THRESHOLD = 0.8;
const MAX_RECOMMENDATIONS = 3;

function RecommendedTopicsSection({ mastery, topics }: { mastery: MasteryRecord[]; topics: Topic[] }) {
  const scoreByTopic = new Map(mastery.map((m) => [m.topicId, m.masteryScore]));
  const candidates = topics
    .filter((t) => (scoreByTopic.get(t.id) ?? 0) < MASTERED_THRESHOLD)
    .sort((a, b) => (scoreByTopic.get(a.id) ?? -1) - (scoreByTopic.get(b.id) ?? -1))
    .slice(0, MAX_RECOMMENDATIONS);

  return (
    <section>
      <h2>Recommended next</h2>
      <p className="muted">
        Not AI-powered yet — a simple placeholder sorted by lowest mastery score (unattempted
        topics first). Phase 2's AI recommendation feature will replace this.
      </p>
      {candidates.length === 0 ? (
        <p className="muted">Nothing to recommend — great work!</p>
      ) : (
        <ul>
          {candidates.map((t) => {
            const score = scoreByTopic.get(t.id);
            return (
              <li key={t.id}>
                {t.name} {score === undefined ? '(not attempted yet)' : `(mastery ${score.toFixed(2)})`}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function LearningHistorySection({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [attempts, setAttempts] = useState<DiagnosticAttempt[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);

  useEffect(() => {
    diagnosticApi.listAttempts(token).then(({ attempts }) => setAttempts(attempts));
    practiceApi.listSessions(token).then(({ sessions }) => setSessions(sessions));
    // refreshKey deliberately re-runs this fetch after practice/diagnostic
    // activity elsewhere on the page — see refreshAfterActivity below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, refreshKey]);

  return (
    <section>
      <h2>Learning history</h2>
      <h3 style={{ fontSize: '0.95rem' }}>Diagnostic attempts</h3>
      {attempts.length === 0 ? (
        <p className="muted">No diagnostic attempts yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Started</th>
              <th>Status</th>
              <th>Items</th>
              <th>Estimated grade</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.startedAt).toLocaleString()}</td>
                <td>{a.status}</td>
                <td>{a.items.length}</td>
                <td>{a.finalGradeEstimate ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ fontSize: '0.95rem', marginTop: '1rem' }}>Practice sessions</h3>
      {sessions.length === 0 ? (
        <p className="muted">No practice sessions yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Started</th>
              <th>Status</th>
              <th>Items</th>
              <th>Correct</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.startedAt).toLocaleString()}</td>
                <td>{s.completedAt ? 'completed' : 'in progress'}</td>
                <td>{s.items.length}</td>
                <td>{s.items.filter((i) => i.isCorrect).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function DiagnosticSection({ token, onActivity }: { token: string; onActivity: () => void }) {
  const [attempt, setAttempt] = useState<DiagnosticAttempt | null>(null);
  const [nextQuestion, setNextQuestion] = useState<PublicQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    diagnosticApi
      .getCurrentAttempt(token)
      .then(({ attempt }) => setAttempt(attempt))
      .catch(() => undefined);
  }, [token]);

  async function handleStart() {
    setError(null);
    try {
      const { attempt, nextQuestion } = await diagnosticApi.startAttempt(token);
      setAttempt(attempt);
      setNextQuestion(nextQuestion);
      setMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start diagnostic');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!attempt || !nextQuestion) return;
    setError(null);
    try {
      const result = await diagnosticApi.submitItem(token, attempt.id, {
        questionId: nextQuestion.id,
        studentAnswer: answer,
        timeTakenMs: 1000,
        hintRequested: false,
      });
      setAttempt(result.attempt);
      setNextQuestion(result.nextQuestion);
      setAnswer('');
      setMessage(result.isCorrect ? 'Correct!' : 'Incorrect.');
      onActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    }
  }

  async function handleComplete() {
    if (!attempt) return;
    setError(null);
    try {
      const { attempt: completed } = await diagnosticApi.completeAttempt(token, attempt.id);
      setAttempt(completed);
      setNextQuestion(null);
      setMessage(`Diagnostic complete — estimated grade ${completed.finalGradeEstimate}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete diagnostic');
    }
  }

  return (
    <section>
      <h2>Diagnostic</h2>
      {!attempt || attempt.status !== 'in_progress' ? (
        <button className="primary" onClick={handleStart}>
          Start diagnostic
        </button>
      ) : nextQuestion ? (
        <form onSubmit={handleSubmit}>
          <p>{nextQuestion.promptText}</p>
          <label>
            Your answer
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} required />
          </label>
          <button className="primary" type="submit">
            Submit
          </button>
        </form>
      ) : (
        <button className="primary" onClick={handleComplete}>
          Complete diagnostic
        </button>
      )}
      {message && <p>{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function PracticeSection({
  token,
  topics,
  onActivity,
}: {
  token: string;
  topics: Topic[];
  onActivity: () => void;
}) {
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    practiceApi.getCurrentSession(token).then(async ({ session }) => {
      if (!session) return;
      setSession(session);
      setMessage('Resumed your in-progress practice session.');
      const firstTopicId = session.topicIds[0];
      if (firstTopicId) {
        const { questions } = await curriculumApi.listQuestionsForTopic(token, firstTopicId);
        setQuestions(questions);
        setSelectedQuestionId(questions[0]?.id ?? '');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    if (!selectedTopicId) return;
    setError(null);
    try {
      const { session } = await practiceApi.startSession(token, [selectedTopicId]);
      const { questions } = await curriculumApi.listQuestionsForTopic(token, selectedTopicId);
      setSession(session);
      setQuestions(questions);
      setSelectedQuestionId(questions[0]?.id ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start practice session');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session || !selectedQuestionId) return;
    setError(null);
    try {
      const result = await practiceApi.submitItem(token, session.id, {
        questionId: selectedQuestionId,
        studentAnswer: answer,
        timeTakenMs: 1000,
        hintsUsedCount: 0,
      });
      setSession(result.session);
      setAnswer('');
      setMessage(result.isCorrect ? 'Correct! (this may unlock a mastery milestone — check 🔔)' : 'Incorrect.');
      onActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    }
  }

  async function handleCompleteSession() {
    if (!session) return;
    await practiceApi.completeSession(token, session.id);
    setSession(null);
    setQuestions([]);
    setMessage('Practice session completed.');
  }

  return (
    <section>
      <h2>Practice</h2>
      {!session ? (
        <form onSubmit={handleStart}>
          <label>
            Topic
            <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)} required>
              <option value="">Select a topic…</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button className="primary" type="submit">
            Start practice session
          </button>
        </form>
      ) : (
        <>
          <p className="muted">
            Session started — {session.items.length} item(s) answered so far.
          </p>
          <form onSubmit={handleSubmit}>
            <label>
              Question
              <select value={selectedQuestionId} onChange={(e) => setSelectedQuestionId(e.target.value)}>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.promptText.slice(0, 60)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your answer
              <input value={answer} onChange={(e) => setAnswer(e.target.value)} required />
            </label>
            <button className="primary" type="submit">
              Submit answer
            </button>
          </form>
          <button onClick={handleCompleteSession} style={{ marginTop: '0.5rem' }}>
            Complete session
          </button>
        </>
      )}
      {message && <p>{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

export function StudentDashboardPage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [mastery, setMastery] = useState<MasteryRecord[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityVersion, setActivityVersion] = useState(0);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { student } = await studentApi.getMyProfile(token);
        setProfile(student);
        const [{ mastery }, { topics }] = await Promise.all([
          studentApi.getMyMastery(token),
          curriculumApi.listPublishedTopics(token),
        ]);
        setMastery(mastery);
        setTopics(topics);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setProfile(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load student data');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function refreshAfterActivity() {
    if (!token) return;
    const [{ student }, { mastery }] = await Promise.all([
      studentApi.getMyProfile(token),
      studentApi.getMyMastery(token),
    ]);
    setProfile(student);
    setMastery(mastery);
    setActivityVersion((v) => v + 1);
  }

  if (!token) return null;
  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;

  if (!profile) {
    return (
      <CreateProfileForm
        token={token}
        onCreated={(p) => {
          setProfile(p);
          curriculumApi.listPublishedTopics(token).then(({ topics }) => setTopics(topics));
        }}
      />
    );
  }

  const topicsById = new Map(topics.map((t) => [t.id, t.name]));

  return (
    <>
      <section>
        <h1>{profile.displayName}</h1>
        <p className="muted">
          {profile.examBoard} · {profile.tier} · target grade {profile.targetGrade ?? '—'} · estimated grade{' '}
          {profile.currentEstimatedGrade ?? 'not yet estimated'}
        </p>
        <p className="muted">
          🔥 {profile.currentStreakDays}-day streak (best: {profile.longestStreakDays})
        </p>
        <p className="muted">
          Student ID (give this to a teacher to enroll you, or a parent to link you):{' '}
          <code>{profile.id}</code>
        </p>
      </section>
      <MasterySection mastery={mastery} topicsById={topicsById} />
      <StrengthsWeaknessesSection mastery={mastery} topicsById={topicsById} />
      <RecommendedTopicsSection mastery={mastery} topics={topics} />
      <DiagnosticSection token={token} onActivity={refreshAfterActivity} />
      <PracticeSection token={token} topics={topics} onActivity={refreshAfterActivity} />
      <LearningHistorySection token={token} refreshKey={activityVersion} />
    </>
  );
}
