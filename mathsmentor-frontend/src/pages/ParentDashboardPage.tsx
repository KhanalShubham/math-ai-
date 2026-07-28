import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import * as parentApi from '../api/parent';
import type { ParentProfile, Child } from '../api/parent';

function CreateProfileForm({ token, onCreated }: { token: string; onCreated: (p: ParentProfile) => void }) {
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    try {
      const { parent } = await parentApi.createMyProfile(token);
      onCreated(parent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    }
  }

  return (
    <section>
      <h2>Create your parent profile</h2>
      <button className="primary" onClick={handleCreate}>
        Create profile
      </button>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

export function ParentDashboardPage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [studentEmail, setStudentEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  async function loadChildren() {
    if (!token) return;
    const { children } = await parentApi.getMyChildren(token);
    setChildren(children);
  }

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { parent } = await parentApi.getMyProfile(token);
        setProfile(parent);
        await loadChildren();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setProfile(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load parent data');
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleLink(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLinkError(null);
    try {
      const { parent } = await parentApi.linkStudent(token, studentEmail);
      setProfile(parent);
      setStudentEmail('');
      await loadChildren();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to link student');
    }
  }

  async function handleUnlink(studentId: string) {
    if (!token) return;
    const { parent } = await parentApi.unlinkStudent(token, studentId);
    setProfile(parent);
    await loadChildren();
  }

  async function handleTogglePreference(key: 'email' | 'sms') {
    if (!token || !profile) return;
    const { parent } = await parentApi.updateMyNotificationPreferences(token, {
      [key]: !profile.notificationPreferences[key],
    });
    setProfile(parent);
  }

  if (!token) return null;
  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;

  if (!profile) {
    return <CreateProfileForm token={token} onCreated={setProfile} />;
  }

  return (
    <>
      <section>
        <h1>Parent dashboard</h1>
        <form onSubmit={handleLink}>
          <label>
            Link a child by their account email
            <input
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              required
            />
          </label>
          {linkError && <p className="error">{linkError}</p>}
          <button className="primary" type="submit">
            Link child
          </button>
        </form>
      </section>

      <section>
        <h2>Your children</h2>
        {children.length === 0 ? (
          <p className="muted">No linked children yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Exam board / tier</th>
                <th>Estimated grade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {children.map((c) => (
                <tr key={c.id}>
                  <td>{c.displayName}</td>
                  <td>
                    {c.examBoard} / {c.tier}
                  </td>
                  <td>{c.currentEstimatedGrade ?? 'not yet estimated'}</td>
                  <td>
                    <button onClick={() => handleUnlink(c.id)}>Unlink</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Notification preferences</h2>
        <label>
          <input
            type="checkbox"
            checked={profile.notificationPreferences.email}
            onChange={() => handleTogglePreference('email')}
            style={{ display: 'inline-block', width: 'auto', marginRight: '0.5rem' }}
          />
          Email
        </label>
        <label>
          <input
            type="checkbox"
            checked={profile.notificationPreferences.sms}
            onChange={() => handleTogglePreference('sms')}
            style={{ display: 'inline-block', width: 'auto', marginRight: '0.5rem' }}
          />
          SMS
        </label>
      </section>
    </>
  );
}
