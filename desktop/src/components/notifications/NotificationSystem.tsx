import { useState, useEffect } from "react";
import { useNexusStore, Notification } from "../../store/nexusStore";

const AGENT_ICONS: Record<string, string> = {
  ATLAS: "🗂️", ORACLE: "🔬", COMPASS: "🚀", FORGE: "💻", NEXUS: "🧠",
};
const TYPE_COLORS: Record<string, string> = {
  info: "var(--accent)", success: "var(--emerald)",
  warning: "var(--amber)", error: "var(--rose)", agent: "var(--cyan)",
};
const TYPE_ICONS: Record<string, string> = {
  info: "ℹ", success: "✓", warning: "⚠", error: "✕", agent: "◈",
};

// ── Single Toast ────────────────────────────────────────────────
function Toast({ notif, onDismiss }: { notif: Notification; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setExiting(true); setTimeout(onDismiss, 250); }, 5000);
    return () => clearTimeout(t);
  }, []);

  const color = TYPE_COLORS[notif.type];
  const icon = notif.agent ? AGENT_ICONS[notif.agent] : TYPE_ICONS[notif.type];

  return (
    <div
      className={exiting ? "toast-exit" : "toast-enter"}
      style={{
        display: "flex", gap: "12px", alignItems: "flex-start",
        padding: "14px 16px",
        background: "var(--surface2)",
        border: `1px solid ${color}40`,
        borderLeft: `3px solid ${color}`,
        borderRadius: "6px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        maxWidth: "340px",
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Progress bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, height: "2px",
        background: `linear-gradient(90deg, ${color}, transparent)`,
        width: "100%",
        animation: "toastProgress 5s linear forwards",
      }} />
      <style>{`@keyframes toastProgress{from{width:100%}to{width:0%}}`}</style>

      <span style={{ fontSize: "18px", lineHeight: 1, flexShrink: 0, marginTop: "1px" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", marginBottom: "3px" }}>
          {notif.title}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-mid)", lineHeight: 1.5 }}>{notif.body}</div>
        {notif.action && (
          <button
            onClick={notif.action.onClick}
            style={{
              marginTop: "8px", fontSize: "11px", fontFamily: "var(--font-mono)",
              color, background: `${color}15`, border: `1px solid ${color}40`,
              padding: "3px 10px", borderRadius: "3px", letterSpacing: "1px",
            }}
          >
            {notif.action.label.toUpperCase()}
          </button>
        )}
      </div>
      <button
        onClick={() => { setExiting(true); setTimeout(onDismiss, 250); }}
        style={{ color: "var(--text-dim)", fontSize: "16px", lineHeight: 1, flexShrink: 0 }}
      >×</button>
    </div>
  );
}

// ── Toast Container ─────────────────────────────────────────────
export function ToastContainer() {
  const { notifications, dismissNotification } = useNexusStore();
  const recent = notifications.filter((n) => !n.read).slice(0, 4);

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 9998,
      display: "flex", flexDirection: "column-reverse", gap: "10px",
      pointerEvents: "none",
    }}>
      {recent.map((n) => (
        <div key={n.id} style={{ pointerEvents: "all" }}>
          <Toast notif={n} onDismiss={() => dismissNotification(n.id)} />
        </div>
      ))}
    </div>
  );
}

// ── Notification Panel ──────────────────────────────────────────
function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function NotificationPanel() {
  const { notifications, markAllRead, dismissNotification, showNotifPanel, toggleNotifPanel } = useNexusStore();

  if (!showNotifPanel) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={toggleNotifPanel}
        style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(0,0,0,0.3)" }}
      />
      {/* Panel */}
      <div
        className="anim-slide-right"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "360px", zIndex: 9991,
          background: "var(--surface)",
          borderLeft: "1px solid var(--border2)",
          display: "flex", flexDirection: "column",
          boxShadow: "-16px 0 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "18px" }}>
              Notifications
            </div>
            <div className="mono-label" style={{ marginTop: "3px" }}>
              {notifications.filter((n) => !n.read).length} unread
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={markAllRead}
              style={{
                fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--accent)",
                background: "var(--accent-lo)", border: "1px solid var(--border2)",
                padding: "4px 10px", borderRadius: "3px", letterSpacing: "1px",
              }}
            >MARK ALL READ</button>
            <button onClick={toggleNotifPanel} style={{ color: "var(--text-dim)", fontSize: "20px" }}>×</button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-dim)" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔔</div>
              <div className="mono-label">No notifications yet</div>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "12px",
                  marginBottom: "8px",
                  borderRadius: "5px",
                  background: n.read ? "transparent" : "var(--surface2)",
                  border: `1px solid ${n.read ? "var(--border)" : TYPE_COLORS[n.type] + "30"}`,
                  borderLeft: `3px solid ${n.read ? "var(--border)" : TYPE_COLORS[n.type]}`,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flex: 1 }}>
                    <span style={{ fontSize: "16px" }}>
                      {n.agent ? AGENT_ICONS[n.agent] : TYPE_ICONS[n.type]}
                    </span>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13px" }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-mid)", marginTop: "3px", lineHeight: 1.5 }}>
                        {n.body}
                      </div>
                      <div className="mono-label" style={{ marginTop: "6px" }}>{timeAgo(n.timestamp)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissNotification(n.id)}
                    style={{ color: "var(--text-dim)", fontSize: "14px", flexShrink: 0, marginLeft: "8px" }}
                  >×</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
