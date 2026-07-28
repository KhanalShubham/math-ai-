import { useEffect, useState } from 'react';
import * as notificationsApi from '../api/notifications';
import type { Notification } from '../api/notifications';
import { useAuth } from '../context/AuthContext';

function describe(notification: Notification): string {
  if (notification.type === 'mastery_milestone') {
    const score = notification.payload.masteryScore;
    return `Mastery milestone reached on a topic (score ${typeof score === 'number' ? score.toFixed(2) : score})`;
  }
  return notification.type;
}

export function NotificationsBell() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!token) return;
    try {
      const { notifications } = await notificationsApi.listMyNotifications(token);
      setNotifications(notifications);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    }
  }

  useEffect(() => {
    refresh();
    // Poll rather than fetch once on mount — this bell stays mounted across
    // the whole app (in Layout), so a notification created by something the
    // user just did (e.g. a practice answer crossing a mastery milestone)
    // would otherwise never appear without a full page reload.
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleToggle() {
    setOpen((o) => !o);
    refresh();
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handleMarkRead(id: string) {
    if (!token) return;
    await notificationsApi.markRead(token, id);
    await refresh();
  }

  async function handleMarkAllRead() {
    if (!token) return;
    await notificationsApi.markAllRead(token);
    await refresh();
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={handleToggle}>
        🔔{unreadCount > 0 && <span className="unread-dot">{unreadCount}</span>}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '2rem',
            width: 320,
            background: 'white',
            color: '#1a1a1a',
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '0.75rem',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <strong>Notifications</strong>
            <button onClick={handleMarkAllRead}>Mark all read</button>
          </div>
          {error && <p className="error">{error}</p>}
          {notifications.length === 0 && <p className="muted">No notifications yet.</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {notifications.map((n) => (
              <li
                key={n.id}
                style={{
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #eee',
                  opacity: n.readAt ? 0.6 : 1,
                }}
              >
                <div style={{ fontSize: '0.85rem' }}>{describe(n)}</div>
                <div className="muted">{new Date(n.createdAt).toLocaleString()}</div>
                {!n.readAt && (
                  <button onClick={() => handleMarkRead(n.id)} style={{ marginTop: '0.25rem' }}>
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
