"use client";
import { useState, type FormEvent } from "react";

type Overview = {
  asOf: number;
  messages: {
    id: number;
    user: string;
    name: string;
    text: string;
    created: number;
    announcement: number;
  }[];
  reports: {
    id: number;
    user: string;
    message: number;
    text: string;
    reason: string;
    created: number;
    resolved: number;
  }[];
  audit: { action: string; target: string; created: number }[];
  restricted: { id: string; name: string; mute: number; ban: number }[];
};
const time = new Intl.DateTimeFormat("en-US", {
  dateStyle: "short",
  timeStyle: "short",
});
export default function ModerationPage() {
  const [key, setKey] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [duration, setDuration] = useState("60");
  const [announcement, setAnnouncement] = useState("");

  async function request(
    action?: string,
    target?: number | string,
    value?: string | number,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/player-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Player-Moderator-Key": key.trim(),
        },
        body: JSON.stringify({ op: "admin", action, target, value }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 403) setOverview(null);
        throw new Error(result.error);
      }
      setOverview(result);
      if (action === "announce") setAnnouncement("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const restrict = (user: string, kind: "mute" | "ban") =>
    void request(
      kind,
      user,
      duration === "permanent" ? duration : Number(duration),
    );

  return (
    <div className="page settings">
      <h1>Global Chat moderation</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!overview ? (
        <form
          className="panel"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void request();
          }}
        >
          <label>
            Moderator key{" "}
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy || !key.trim()}>
            Sign in
          </button>
        </form>
      ) : (
        <>
          <div className="feature-actions">
            <button disabled={busy} onClick={() => void request()}>
              Refresh moderation
            </button>{" "}
            <button
              disabled={busy}
              onClick={() => {
                setKey("");
                setOverview(null);
              }}
            >
              Sign out
            </button>
          </div>
          <section className="panel">
            <h2>Restrictions and announcements</h2>
            <label>
              Restriction length{" "}
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="15">15 minutes</option>
                <option value="60">1 hour</option>
                <option value="1440">1 day</option>
                <option value="permanent">Permanent</option>
              </select>
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void request("announce", undefined, announcement);
              }}
            >
              <label>
                Announcement{" "}
                <input
                  value={announcement}
                  maxLength={500}
                  onChange={(e) => setAnnouncement(e.target.value)}
                />
              </label>
              <button disabled={busy || !announcement.trim()}>
                Post announcement
              </button>
            </form>
            {overview.restricted.map((user) => (
              <div className="setting-row" key={user.id}>
                <strong>{user.name}</strong>
                <div>
                  {user.mute > overview.asOf && (
                    <button
                      disabled={busy}
                      onClick={() => void request("unmute", user.id)}
                    >
                      Unmute
                    </button>
                  )}
                  {user.ban > overview.asOf && (
                    <button
                      disabled={busy}
                      onClick={() => void request("unban", user.id)}
                    >
                      Unban
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
          <section className="panel">
            <h2>Reports</h2>
            {!overview.reports.length && <p>No reports.</p>}
            {overview.reports.map((report) => (
              <article key={report.id} className="panel">
                <strong>{report.reason}</strong>{" "}
                <time>{time.format(report.created)}</time>
                <p>{report.text}</p>
                {report.resolved ? (
                  <p>Resolved</p>
                ) : (
                  <div className="feature-actions">
                    <button
                      disabled={busy}
                      onClick={() => void request("resolve", report.id)}
                    >
                      Resolve report
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => restrict(report.user, "mute")}
                    >
                      Mute player
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => restrict(report.user, "ban")}
                    >
                      Ban player
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
          <section className="panel">
            <h2>Recent messages</h2>
            {overview.messages.map((message) => (
              <article key={message.id} className="panel">
                <strong>{message.name}</strong>{" "}
                <time>{time.format(message.created)}</time>
                <p style={{ overflowWrap: "anywhere" }}>{message.text}</p>
                <div className="feature-actions">
                  <button
                    disabled={busy}
                    onClick={() => void request("delete", message.id)}
                  >
                    Delete message
                  </button>
                  {!message.announcement && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => restrict(message.user, "mute")}
                      >
                        Mute player
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => restrict(message.user, "ban")}
                      >
                        Ban player
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </section>
          <section className="panel">
            <h2>Moderation history</h2>
            <ul>
              {overview.audit.map((entry, index) => (
                <li key={index}>
                  {time.format(entry.created)} · {entry.action} · {entry.target}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
