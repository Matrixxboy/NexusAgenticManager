import { useNexusStore, View, Agent } from "../../store/nexusStore";

const NAV = [
  { icon: "◈",  label: "Chat",     view: "chat"     as View, color: "var(--accent)" },
  { icon: "⬡",  label: "Projects", view: "projects" as View, color: "#a78bfa" },
  { icon: "◎",  label: "Research", view: "research" as View, color: "var(--cyan)" },
  { icon: "⟁",  label: "Career",   view: "career"   as View, color: "var(--amber)" },
  { icon: "{}",  label: "Code",    view: "code"     as View, color: "var(--emerald)" },
  { icon: "✈",  label: "Telegram", view: "telegram" as View, color: "#e879f9" },
];

const AGENTS: { name: Agent; color: string }[] = [
  { name: "ATLAS",   color: "#a78bfa" },
  { name: "ORACLE",  color: "var(--cyan)" },
  { name: "COMPASS", color: "var(--amber)" },
  { name: "FORGE",   color: "var(--emerald)" },
];

export default function Sidebar() {
  const { currentView, setView, unreadCount, toggleNotifPanel, ollamaOnline, telegramConnected, toggleCommandBar } = useNexusStore();

  const navBtnStyle = (active: boolean, color: string): React.CSSProperties => ({
    width: "44px", height: "44px", borderRadius: "8px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "15px",
    background: active ? `${color}18` : "transparent",
    border: `1px solid ${active ? color + "55" : "transparent"}`,
    color: active ? color : "var(--text-dim)",
    transition: "all 0.15s ease",
    position: "relative" as const,
  });

  return (
    <aside style={{
      width: "68px", height: "100%",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "16px 0", gap: "3px",
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      flexShrink: 0, zIndex: 10,
    }}>

      {/* Logo mark */}
      <div style={{ marginBottom: "14px", textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "18px",
          letterSpacing: "3px",
          background: "linear-gradient(135deg, var(--accent), var(--cyan))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>NX</div>
        <div className="mono-label" style={{ fontSize: "7px", letterSpacing: "1px", marginTop: "2px", color: "var(--text-dim)" }}>
          v2.0
        </div>
      </div>

      {/* Navigation */}
      {NAV.map((item) => {
        const active = currentView === item.view;
        return (
          <button key={item.view} onClick={() => setView(item.view)} title={item.label} style={navBtnStyle(active, item.color)}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px" }}>{item.icon}</span>
            {active && (
              <div style={{
                position: "absolute", left: "-9px", top: "50%", transform: "translateY(-50%)",
                width: "3px", height: "18px", background: item.color, borderRadius: "0 2px 2px 0",
              }} />
            )}
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      {/* Agent heartbeats */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
        {AGENTS.map((a, i) => (
          <div key={a.name} title={`${a.name} — Online`} style={{
            width: "5px", height: "5px", borderRadius: "50%",
            background: a.color, opacity: 0.9,
            animation: `pulseDot 2.5s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
      </div>

      <div style={{ width: "24px", height: "1px", background: "var(--border)", margin: "4px 0" }} />

      {/* Command bar trigger */}
      <button onClick={toggleCommandBar} title="Command Bar ⌘K" style={{
        width: "44px", height: "28px", borderRadius: "5px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "10px", fontFamily: "var(--font-mono)", letterSpacing: "1px",
        color: "var(--text-dim)", background: "transparent",
        border: "1px solid var(--border)", transition: "all 0.15s",
      }}>⌘K</button>

      {/* Notification bell */}
      <button onClick={toggleNotifPanel} title="Notifications" style={{
        width: "44px", height: "44px", borderRadius: "8px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "17px", background: "transparent",
        border: "1px solid transparent", color: "var(--text-dim)",
        transition: "all 0.15s", position: "relative",
      }}>
        🔔
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", top: "7px", right: "7px",
            width: "14px", height: "14px", borderRadius: "50%",
            background: "var(--rose)", color: "white",
            fontSize: "8px", fontFamily: "var(--font-mono)", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{unreadCount > 9 ? "9+" : unreadCount}</div>
        )}
      </button>

      {/* Settings */}
      <button onClick={() => setView("settings" as View)} title="Settings" style={{
        ...navBtnStyle(currentView === "settings", "var(--accent)"),
        fontSize: "17px", color: currentView === "settings" ? "var(--accent)" : "var(--text-dim)",
      }}>⚙</button>

      {/* Status strip */}
      <div style={{ display: "flex", gap: "5px", marginTop: "6px", paddingBottom: "4px" }}>
        <div title={`Ollama: ${ollamaOnline ? "Online" : "Offline"}`}
          className={`status-dot ${ollamaOnline ? "status-online" : "status-offline"}`} />
        <div title={`Telegram: ${telegramConnected ? "Connected" : "Off"}`}
          className={`status-dot ${telegramConnected ? "status-online" : "status-offline"}`} />
      </div>
    </aside>
  );
}
