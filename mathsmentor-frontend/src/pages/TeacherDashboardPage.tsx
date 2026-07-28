import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import * as teacherApi from '../api/teacher';
import type { TeacherProfile, ClassGroup } from '../api/teacher';

function CreateProfileForm({ token, onCreated }: { token: string; onCreated: (t: TeacherProfile) => void }) {
  const [schoolId, setSchoolId] = useState('');
  const [subjects, setSubjects] = useState('Maths');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { teacher } = await teacherApi.createMyProfile(token, {
        schoolId,
        subjects: subjects.split(',').map((s) => s.trim()).filter(Boolean),
      });
      onCreated(teacher);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    }
  }

  return (
    <section>
      <h2>Create your teacher profile</h2>
      <p className="muted">
        Schools are admin-provisioned (AD-009) — see the frontend README for how to bootstrap one
        locally with <code>npm run mint-admin-token</code> and a single curl call, then paste the
        resulting School ID below.
      </p>
      <form onSubmit={handleSubmit}>
        <label>
          School ID
          <input value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required />
        </label>
        <label>
          Subjects (comma-separated)
          <input value={subjects} onChange={(e) => setSubjects(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit">
          Create profile
        </button>
      </form>
    </section>
  );
}

function CreateClassForm({
  token,
  schoolId,
  onCreated,
}: {
  token: string;
  schoolId: string;
  onCreated: (c: ClassGroup) => void;
}) {
  const [name, setName] = useState('');
  const [examBoard, setExamBoard] = useState('AQA');
  const [tier, setTier] = useState<'foundation' | 'higher'>('foundation');
  const [academicYear, setAcademicYear] = useState('2025/26');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { class: created } = await teacherApi.createClass(token, {
        schoolId,
        name,
        examBoard,
        tier,
        academicYear,
      });
      onCreated(created);
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class');
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
      <label>
        Class name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Exam board
        <input value={examBoard} onChange={(e) => setExamBoard(e.target.value)} required />
      </label>
      <label>
        Tier
        <select value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}>
          <option value="foundation">Foundation</option>
          <option value="higher">Higher</option>
        </select>
      </label>
      <label>
        Academic year (YYYY/YY)
        <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} required />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary" type="submit">
        Create class
      </button>
    </form>
  );
}

function ClassCard({
  token,
  classGroup,
  onUpdated,
}: {
  token: string;
  classGroup: ClassGroup;
  onUpdated: (c: ClassGroup) => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleEnroll(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { class: updated } = await teacherApi.enrollStudent(token, classGroup.id, studentId);
      onUpdated(updated);
      setStudentId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll student');
    }
  }

  async function handleWithdraw(sid: string) {
    setError(null);
    try {
      const { class: updated } = await teacherApi.withdrawStudent(token, classGroup.id, sid);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw student');
    }
  }

  return (
    <section>
      <h2>
        {classGroup.name} <span className="muted">({classGroup.academicYear})</span>
      </h2>
      <p className="muted">
        {classGroup.examBoard} · {classGroup.tier}
      </p>

      <h3 style={{ fontSize: '0.95rem' }}>Active roster</h3>
      {classGroup.activeStudentIds.length === 0 ? (
        <p className="muted">No students enrolled yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {classGroup.activeStudentIds.map((sid) => (
              <tr key={sid}>
                <td>{sid}</td>
                <td>
                  <button onClick={() => handleWithdraw(sid)}>Withdraw</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleEnroll} style={{ marginTop: '0.75rem' }}>
        <label>
          Enroll student by ID
          <input value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
        </label>
        <button type="submit">Enroll</button>
      </form>
      {error && <p className="error">{error}</p>}

      <h3 style={{ fontSize: '0.95rem', marginTop: '1rem' }}>Membership history</h3>
      {classGroup.membershipHistory.length === 0 ? (
        <p className="muted">No history yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Joined</th>
              <th>Left</th>
            </tr>
          </thead>
          <tbody>
            {classGroup.membershipHistory.map((entry, i) => (
              <tr key={i}>
                <td>{entry.studentId}</td>
                <td>{new Date(entry.joinedAt).toLocaleDateString()}</td>
                <td>{entry.leftAt ? new Date(entry.leftAt).toLocaleDateString() : 'still enrolled'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function TeacherDashboardPage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { teacher } = await teacherApi.getMyProfile(token);
        setProfile(teacher);
        const { classes } = await teacherApi.listMyClasses(token);
        setClasses(classes);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setProfile(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load teacher data');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (!token) return null;
  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;

  if (!profile) {
    return <CreateProfileForm token={token} onCreated={setProfile} />;
  }

  function updateClass(updated: ClassGroup) {
    setClasses((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      return exists ? prev.map((c) => (c.id === updated.id ? updated : c)) : [...prev, updated];
    });
  }

  return (
    <>
      <section>
        <h1>Teacher dashboard</h1>
        <p className="muted">Subjects: {profile.subjects.join(', ')}</p>
        <CreateClassForm token={token} schoolId={profile.schoolId} onCreated={updateClass} />
      </section>
      {classes.length === 0 ? (
        <section>
          <p className="muted">No classes yet — create one above.</p>
        </section>
      ) : (
        classes.map((c) => (
          <ClassCard key={c.id} token={token} classGroup={c} onUpdated={updateClass} />
        ))
      )}
    </>
  );
}
