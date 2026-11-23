"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  Flag,
  MessageSquare,
  Radio,
  ShieldCheck,
  Globe,
  Users,
} from "lucide-react";
import {
  siteFeatures,
  type RoomControls,
  type SiteStatus,
} from "@/lib/player-chat/rules";
import styles from "./moderation.module.css";

type Player = {
  id: string;
  name: string;
  seen?: number;
  mute: number;
  ban: number;
};
type Overview = {
  asOf: number;
  online: number;
  room: RoomControls;
  site: SiteStatus;
  players: Player[];
  messages: {
    id: number;
    user: string;
    name: string;
    text: string;
    created: number;
    announcement: number;
    hidden: number;
  }[];
  reports: {
    id: number;
    user: string;
    message: number;
    text: string;
    reason: string;
    created: number;
    resolved: number;
    priority: number;
  }[];
  audit: { action: string; target: string; created: number }[];
  notes: { id: number; user: string; text: string; created: number }[];
  restricted: Player[];
};
type Value = string | number;
const tabs = [
  ["Messages", MessageSquare],
  ["Reports", Flag],
  ["Players", Users],
  ["Room", Radio],
  ["Site", Globe],
  ["Activity", Activity],
] as const;
type Tab = (typeof tabs)[number][0];
const time = new Intl.DateTimeFormat("en-US", {
  dateStyle: "short",
  timeStyle: "short",
});
const durations = [
  [5, "5 minutes"],
  [15, "15 minutes"],
  [60, "1 hour"],
  [360, "6 hours"],
  [1440, "1 day"],
  [10080, "1 week"],
  ["permanent", "Permanent"],
] as const;

function Card({
  title,
  meta,
  children,
  actions,
}: {
  title: string;
  meta?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.row}>
        <h3>{title}</h3>
        {meta && <div className={styles.meta}>{meta}</div>}
      </div>
      {children}
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  );
}

export default function ModerationPage() {
  const [key, setKey] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tab, setTab] = useState<Tab>("Messages");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState("");
  const [duration, setDuration] = useState("60");
  const [siteText, setSiteText] = useState("");
  const [tone, setTone] = useState("info");
  const [noticeMinutes, setNoticeMinutes] = useState(60);
  const [pauseMinutes, setPauseMinutes] = useState(15);
  const [announcement, setAnnouncement] = useState("");
  const [privateText, setPrivateText] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(
    action?: string,
    target?: Value,
    value?: Value | Record<string, Value>,
    feedback?: string,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setStatus("");
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
        throw new Error(result.error || "Moderation request failed.");
      }
      setOverview(result);
      setStatus(
        feedback ?? (action ? "Action saved." : "Moderation view updated."),
      );
      if (action === "announce") setAnnouncement("");
      if (action === "warn" || action === "note") setPrivateText("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function choose(next: Tab) {
    setTab(next);
    setFilter("all");
    setQuery("");
  }
  function player(id: string) {
    setSelected(id);
    choose("Players");
  }
  const button = (
    label: string,
    action: string,
    target?: Value,
    value?: Value,
    confirmText?: string,
  ) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (!confirmText || window.confirm(confirmText))
          void request(action, target, value, label + " applied.");
      }}
    >
      {label}
    </button>
  );
  const matches = (...fields: string[]) =>
    fields.join(" ").toLowerCase().includes(query.trim().toLowerCase());
  const roster = overview
    ? [
        ...new Map(
          [...overview.restricted, ...overview.players].map((p) => [p.id, p]),
        ).values(),
      ]
    : [];
  const chosen = roster.find((p) => p.id === selected);
  const restriction = duration === "permanent" ? duration : Number(duration);
  const openReports = overview?.reports.filter((r) => !r.resolved).length ?? 0;

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.hero}>
        <div className={styles.row}>
          <div className={styles.identity}>
            <span className={styles.shield}>
              <ShieldCheck aria-hidden="true" />
            </span>
            <div>
              <h1>Global Chat moderation</h1>
              <p>
                Manage the room, review reports, and take action on player
                activity.
              </p>
            </div>
          </div>
          {overview && (
            <div className={styles.actions}>
              <button disabled={busy} onClick={() => void request()}>
                Refresh
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setKey("");
                  setOverview(null);
                  setStatus("");
                  setSelected("");
                  choose("Messages");
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      {error && (
        <p className={styles.feedback} role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className={styles.feedback} role="status">
          {status}
        </p>
      )}
      {!overview ? (
        <form
          className={`${styles.card} ${styles.login}`}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void request();
          }}
        >
          <h2>Moderator sign-in</h2>
          <label>
            Moderator key
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy || !key.trim()}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <>
          <div className={styles.metrics}>
            <div>
              <span>Connected</span>
              <strong>{overview.online}</strong>
            </div>
            <div>
              <span>Open reports</span>
              <strong>{openReports}</strong>
            </div>
            <div>
              <span>Active restrictions</span>
              <strong>{overview.restricted.length}</strong>
            </div>
            <div>
              <span>Room status</span>
              <strong>
                {overview.room.locked
                  ? "Paused"
                  : overview.room.slow
                    ? "Slow mode"
                    : "Open"}
              </strong>
            </div>
          </div>
          <nav className={styles.tabs} aria-label="Moderation sections">
            {tabs.map(([name, Icon]) => (
              <button
                type="button"
                key={name}
                aria-pressed={tab === name}
                onClick={() => choose(name)}
              >
                <Icon aria-hidden="true" size={17} />
                {name}
                {name === "Reports" && openReports > 0 && (
                  <span>{openReports}</span>
                )}
              </button>
            ))}
          </nav>
          <section className={styles.section} aria-label={tab}>
            <div className={styles.row}>
              <h2>{tab}</h2>
              {tab !== "Room" && tab !== "Site" && (
                <div className={styles.actions}>
                  <input
                    aria-label={`Search ${tab.toLowerCase()}`}
                    placeholder={`Search ${tab.toLowerCase()}…`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {tab === "Messages" && (
                    <select
                      aria-label="Message status"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All messages</option>
                      <option value="visible">Visible</option>
                      <option value="hidden">Hidden</option>
                      <option value="announcements">Announcements</option>
                    </select>
                  )}
                  {tab === "Reports" && (
                    <select
                      aria-label="Report status"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All reports</option>
                      <option value="0">Open</option>
                      <option value="1">Resolved</option>
                      <option value="2">Dismissed</option>
                    </select>
                  )}
                  {tab === "Players" && (
                    <select
                      aria-label="Player status"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All recent players</option>
                      <option value="restricted">Restricted</option>
                    </select>
                  )}
                </div>
              )}
            </div>
            {tab === "Messages" && (
              <>
                {overview.messages
                  .filter(
                    (m) =>
                      matches(m.name, m.text) &&
                      (filter === "all" ||
                        (filter === "hidden" && m.hidden) ||
                        (filter === "visible" && !m.hidden) ||
                        (filter === "announcements" && m.announcement)),
                  )
                  .map((m) => (
                    <Card
                      key={m.id}
                      title={m.name}
                      meta={
                        <>
                          {m.hidden
                            ? "Hidden · "
                            : m.announcement
                              ? "Announcement · "
                              : ""}
                          {time.format(m.created)}
                        </>
                      }
                      actions={
                        <>
                          {m.hidden
                            ? button("Restore message", "restore", m.id)
                            : button("Hide message", "hide", m.id)}
                          {m.hidden &&
                            button(
                              "Permanently delete",
                              "delete",
                              m.id,
                              undefined,
                              "Permanently delete this message? It can no longer be restored.",
                            )}
                          {!m.hidden &&
                            (overview.room.pinned?.id === m.id
                              ? button("Unpin message", "unpin")
                              : button("Pin message", "pin", m.id))}
                          {!m.announcement && (
                            <button onClick={() => player(m.user)}>
                              Manage player
                            </button>
                          )}
                        </>
                      }
                    >
                      <p>{m.text}</p>
                    </Card>
                  ))}
                {!overview.messages.length && (
                  <p className={styles.meta}>No recent messages.</p>
                )}
              </>
            )}
            {tab === "Reports" && (
              <>
                {overview.reports
                  .filter(
                    (r) =>
                      matches(r.reason, r.text) &&
                      (filter === "all" || String(r.resolved) === filter),
                  )
                  .map((r) => (
                    <Card
                      key={r.id}
                      title={r.priority ? "Priority · " + r.reason : r.reason}
                      meta={
                        <>
                          {["Open", "Resolved", "Dismissed"][r.resolved]} ·{" "}
                          {time.format(r.created)}
                        </>
                      }
                      actions={
                        <>
                          {button(
                            r.priority ? "Remove priority" : "Mark priority",
                            "priority",
                            r.id,
                            r.priority ? 0 : 1,
                          )}

                          {r.resolved ? (
                            button("Reopen report", "reopen", r.id)
                          ) : (
                            <>
                              {button("Resolve report", "resolve", r.id)}
                              {button("Dismiss report", "dismiss", r.id)}
                            </>
                          )}
                          {overview.messages.some(
                            (m) => m.id === r.message && !m.hidden,
                          ) &&
                            button("Hide reported message", "hide", r.message)}
                          <button onClick={() => player(r.user)}>
                            Manage player
                          </button>
                        </>
                      }
                    >
                      <blockquote>{r.text}</blockquote>
                    </Card>
                  ))}
                {!overview.reports.length && (
                  <p className={styles.meta}>No reports yet.</p>
                )}
              </>
            )}
            {tab === "Players" && (
              <div className={styles.players}>
                <div className={styles.list}>
                  {roster
                    .filter(
                      (p) =>
                        matches(p.name) &&
                        (filter === "all" ||
                          p.mute > overview.asOf ||
                          p.ban > overview.asOf),
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        className={styles.player}
                        aria-pressed={chosen?.id === p.id}
                        onClick={() => setSelected(p.id)}
                      >
                        <span>{p.name}</span>
                        <small>
                          {p.ban > overview.asOf
                            ? "Banned"
                            : p.mute > overview.asOf
                              ? "Muted"
                              : "Active"}
                        </small>
                      </button>
                    ))}
                  {!roster.length && (
                    <p className={styles.meta}>No recent players.</p>
                  )}
                </div>
                {chosen ? (
                  <div className={styles.list}>
                    <Card
                      title={chosen.name}
                      meta={chosen.seen ? time.format(chosen.seen) : undefined}
                      actions={
                        <>
                          {chosen.mute > overview.asOf
                            ? button("Unmute", "unmute", chosen.id)
                            : button(
                                "Mute player",
                                "mute",
                                chosen.id,
                                restriction,
                              )}
                          {chosen.ban > overview.asOf
                            ? button("Unban", "unban", chosen.id)
                            : button(
                                "Ban player",
                                "ban",
                                chosen.id,
                                restriction,
                                "Ban this player from Global Chat?",
                              )}
                          {button(
                            "Reset display name",
                            "reset-name",
                            chosen.id,
                          )}
                          {button(
                            "Hide all retained messages",
                            "hide-player",
                            chosen.id,
                            undefined,
                            "Hide this player’s retained messages from the room?",
                          )}
                        </>
                      }
                    >
                      <label>
                        Restriction length
                        <select
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                        >
                          {durations.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </Card>
                    <Card
                      title="Warnings and notes"
                      actions={
                        <>
                          <button
                            disabled={busy || !privateText.trim()}
                            onClick={() =>
                              void request(
                                "warn",
                                chosen.id,
                                privateText,
                                "Warning sent.",
                              )
                            }
                          >
                            Send private warning
                          </button>
                          <button
                            disabled={busy || !privateText.trim()}
                            onClick={() =>
                              void request(
                                "note",
                                chosen.id,
                                privateText,
                                "Internal note saved.",
                              )
                            }
                          >
                            Save internal note
                          </button>
                          {button("Clear warning", "clear-warning", chosen.id)}
                        </>
                      }
                    >
                      <label>
                        Warning or note
                        <textarea
                          rows={3}
                          maxLength={250}
                          value={privateText}
                          onChange={(e) => setPrivateText(e.target.value)}
                        />
                      </label>
                      {overview.notes
                        .filter((n) => n.user === chosen.id)
                        .map((n) => (
                          <p key={n.id}>
                            {n.text} <small>{time.format(n.created)}</small>{" "}
                            {button(
                              "Delete note",
                              "note-delete",
                              n.id,
                              undefined,
                              "Delete this internal note?",
                            )}
                          </p>
                        ))}
                    </Card>
                  </div>
                ) : (
                  <div className={styles.card}>
                    <p>Choose a player to view actions.</p>
                  </div>
                )}
              </div>
            )}
            {tab === "Room" && (
              <div className={styles.players}>
                <Card
                  title="Posting controls"
                  actions={
                    <>
                      {overview.room.locked
                        ? button("Resume posting", "unlock")
                        : button(
                            "Pause posting",
                            "lock",
                            undefined,
                            undefined,
                            "Pause posting for all players?",
                          )}
                    </>
                  }
                >
                  <p>
                    {overview.room.locked
                      ? "Player posting is paused."
                      : "Players can post."}
                  </p>
                  <label>
                    Slow mode
                    <select
                      disabled={busy}
                      value={overview.room.slow}
                      onChange={(e) =>
                        void request(
                          "slow",
                          undefined,
                          Number(e.target.value),
                          "Slow mode updated.",
                        )
                      }
                    >
                      {[0, 5, 10, 30, 60].map((n) => (
                        <option key={n} value={n}>
                          {n ? `${n} seconds between messages` : "Off"}
                        </option>
                      ))}
                    </select>
                  </label>
                </Card>
                <Card
                  title="Pinned message"
                  actions={
                    overview.room.pinned
                      ? button("Unpin message", "unpin")
                      : undefined
                  }
                >
                  <p>
                    {overview.room.pinned?.text ??
                      "Pin a message from the Messages view to keep it visible in chat."}
                  </p>
                </Card>
                <Card title="System announcement">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void request(
                        "announce",
                        undefined,
                        announcement,
                        "Announcement posted.",
                      );
                    }}
                  >
                    <label>
                      Announcement
                      <textarea
                        value={announcement}
                        rows={3}
                        maxLength={500}
                        onChange={(e) => setAnnouncement(e.target.value)}
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={busy || !announcement.trim()}
                    >
                      Post announcement
                    </button>
                  </form>
                </Card>
              </div>
            )}
            {tab === "Site" && (
              <div className={styles.players}>
                <Card
                  title="Site-wide notice"
                  meta={
                    overview.site.notice
                      ? time.format(overview.site.notice.until)
                      : "Inactive"
                  }
                  actions={
                    overview.site.notice
                      ? button("Remove notice", "site-clear")
                      : undefined
                  }
                >
                  {overview.site.notice && (
                    <blockquote>{overview.site.notice.text}</blockquote>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void request(
                        "site-notice",
                        undefined,
                        { text: siteText, tone, minutes: noticeMinutes },
                        "Site notice published.",
                      );
                    }}
                  >
                    <label>
                      Notice text
                      <textarea
                        maxLength={240}
                        rows={3}
                        value={siteText}
                        onChange={(e) => setSiteText(e.target.value)}
                      />
                    </label>
                    <label>
                      Notice style
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                      >
                        <option value="info">Information</option>
                        <option value="warning">Warning</option>
                      </select>
                    </label>
                    <label>
                      Notice duration
                      <select
                        value={noticeMinutes}
                        onChange={(e) =>
                          setNoticeMinutes(Number(e.target.value))
                        }
                      >
                        <option value={15}>15 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={360}>6 hours</option>
                        <option value={1440}>1 day</option>
                      </select>
                    </label>
                    <button
                      className="primary"
                      disabled={busy || !siteText.trim()}
                    >
                      Publish notice
                    </button>
                  </form>
                </Card>
                <div className={styles.list}>
                  <Card title="Feature availability">
                    <p>
                      Pauses affect all players and expire automatically. The
                      moderator console stays available.
                    </p>
                    <label>
                      Pause length
                      <select
                        value={pauseMinutes}
                        onChange={(e) =>
                          setPauseMinutes(Number(e.target.value))
                        }
                      >
                        <option value={5}>5 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={360}>6 hours</option>
                      </select>
                    </label>
                  </Card>
                  {(
                    Object.entries(siteFeatures) as [
                      keyof typeof siteFeatures,
                      string,
                    ][]
                  ).map(([id, label]) => {
                    const until = overview.site.pauses[id];
                    return (
                      <Card
                        key={id}
                        title={label}
                        meta={
                          until
                            ? `Paused until ${time.format(until)}`
                            : "Available"
                        }
                        actions={
                          until
                            ? button("Resume " + label, "site-resume", id)
                            : button(
                                "Pause " + label,
                                "site-pause",
                                id,
                                pauseMinutes,
                                `Pause ${label} for all players?`,
                              )
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {tab === "Activity" && (
              <>
                {overview.audit
                  .filter((a) => matches(a.action, a.target))
                  .map((a, i) => (
                    <Card
                      key={`${a.created}-${i}`}
                      title={a.action.replaceAll("-", " ")}
                      meta={time.format(a.created)}
                    >
                      <p>
                        {roster.find((p) => p.id === a.target)?.name ??
                          a.target}
                      </p>
                    </Card>
                  ))}
                {!overview.audit.length && (
                  <p className={styles.meta}>No moderation activity yet.</p>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
