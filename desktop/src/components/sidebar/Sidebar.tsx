import { useState, useEffect, useRef } from "react"
import { useNexusStore, View, Agent } from "../../store/nexusStore"

const NAV = [
  { icon: "◈", label: "Chat", view: "chat" as View, color: "var(--accent)" },
  { icon: "⬡", label: "Projects", view: "projects" as View, color: "#a78bfa" },
  {
    icon: "◎",
    label: "Research",
    view: "research" as View,
    color: "var(--cyan)",
  },
  { icon: "⟁", label: "Career", view: "career" as View, color: "var(--amber)" },
  { icon: "{}", label: "Code", view: "code" as View, color: "var(--emerald)" },
  { icon: "✈", label: "Telegram", view: "telegram" as View, color: "#e879f9" },
]

const AGENTS: { name: Agent; color: string }[] = [
  { name: "ATLAS", color: "#a78bfa" },
  { name: "ORACLE", color: "var(--cyan)" },
  { name: "COMPASS", color: "var(--amber)" },
  { name: "FORGE", color: "var(--emerald)" },
]

export default function Sidebar() {
  const {
    currentView,
    setView,
    unreadCount,
    toggleNotifPanel,
    ollamaOnline,
    telegramConnected,
    toggleCommandBar,
    sessions,
    setSessions,
    loadSession,
    sessionId: currentSessionId,
  } = useNexusStore()

  const [isExpanded, setIsExpanded] = useState(false)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load sessions on mount
  useEffect(() => {
    import("../../lib/api").then(({ getSessions }) => {
      getSessions()
        .then(setSessions)
        .catch(() => {})
    })
  }, [])

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    hoverTimeout.current = setTimeout(() => {
      setIsExpanded(true)
    }, 300) // 300ms delay to prevent accidental expansion
  }

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    hoverTimeout.current = setTimeout(() => {
      setIsExpanded(false)
    }, 300)
  }

  const handleCreateSession = async () => {
    try {
      const { createSession } = await import("../../lib/api")
      const newSession = await createSession()
      setSessions([newSession, ...sessions])
      loadSession(newSession.session_id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm("Delete this session?")) return
    try {
      const { deleteSession } = await import("../../lib/api")
      await deleteSession(id)
      setSessions(sessions.filter((s: any) => s.session_id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const getSessionTitle = (s: any) => {
    if (s.messages && s.messages.length > 0) {
      const firstMsg = s.messages.find((m: any) => m.role === "user")
      if (firstMsg) {
        return (
          firstMsg.content.slice(0, 30) +
          (firstMsg.content.length > 30 ? "..." : "")
        )
      }
    }
    return `Session ${s.session_id.slice(0, 4)}`
  }

  const getSessionDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 3600 * 24),
    )

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: isExpanded ? "260px" : "68px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: isExpanded ? "stretch" : "center",
        padding: "16px 0",
        gap: "6px",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        flexShrink: 0,
        zIndex: 100,
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "visible", // Allow tooltips if needed
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          marginBottom: "14px",
          textAlign: "center",
          paddingLeft: isExpanded ? "20px" : "0",
          display: "flex",
          flexDirection: "column",
          alignItems: isExpanded ? "flex-start" : "center",
          height: "40px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "18px",
            letterSpacing: "3px",
            background: "linear-gradient(135deg, var(--accent), var(--cyan))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            whiteSpace: "nowrap",
          }}
        >
          {isExpanded ? "NEXUS AGENT" : "NX"}
        </div>
        <div
          className="mono-label"
          style={{
            fontSize: "7px",
            letterSpacing: "1px",
            marginTop: "2px",
            color: "var(--text-dim)",
          }}
        >
          v2.0
        </div>
      </div>

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: isExpanded ? "0 12px" : "0",
        }}
      >
        {NAV.map((item) => {
          const active = currentView === item.view
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              title={isExpanded ? "" : item.label}
              style={{
                height: "44px",
                width: "100%", // Fill container
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: isExpanded ? "flex-start" : "center",
                padding: isExpanded ? "0 16px" : "0",
                fontSize: "15px",
                background: active ? `${item.color}18` : "transparent",
                border: `1px solid ${active ? item.color + "55" : "transparent"}`,
                color: active ? item.color : "var(--text-dim)",
                transition: "all 0.15s ease",
                position: "relative",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "16px",
                  minWidth: "20px",
                  textAlign: "center",
                }}
              >
                {item.icon}
              </span>
              {isExpanded && (
                <span
                  style={{
                    marginLeft: "12px",
                    fontFamily: "var(--font-display)",
                    fontSize: "14px",
                    fontWeight: 500,
                    opacity: isExpanded ? 1 : 0,
                    transition: "opacity 0.2s 0.1s",
                  }}
                >
                  {item.label}
                </span>
              )}
              {active && !isExpanded && (
                <div
                  style={{
                    position: "absolute",
                    left: "-1px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "3px",
                    height: "18px",
                    background: item.color,
                    borderRadius: "0 2px 2px 0",
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div
        style={{
          width: isExpanded ? "calc(100% - 24px)" : "24px",
          height: "1px",
          background: "var(--border)",
          margin: "8px auto",
          transition: "all 0.3s",
        }}
      />

      {/* Sessions Header / Create Button */}
      <div
        style={{ padding: isExpanded ? "0 12px" : "0", marginBottom: "4px" }}
      >
        {isExpanded ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
              paddingLeft: "8px",
            }}
          >
            <span className="mono-label">RECENT CHATS</span>
            <button
              onClick={handleCreateSession}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "4px",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--text-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "14px",
              }}
              title="New Session"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={handleCreateSession}
            title="New Session"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "transparent",
              border: "1px dashed var(--text-dim)",
              color: "var(--text-dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
              margin: "0 auto",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)"
              e.currentTarget.style.color = "var(--accent)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--text-dim)"
              e.currentTarget.style.color = "var(--text-dim)"
            }}
          >
            +
          </button>
        )}
      </div>

      {/* Sessions List */}
      <div
        style={{
          width: "100%",
          padding: isExpanded ? "0 12px" : "0 12px",
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          alignItems: isExpanded ? "stretch" : "center",
        }}
      >
        {sessions.slice(0, isExpanded ? 20 : 5).map((s: any) => {
          const isActive = s.session_id === currentSessionId
          return (
            <div
              key={s.session_id}
              onClick={() => loadSession(s.session_id, s.messages)}
              title={
                isExpanded
                  ? ""
                  : "Last active: " + new Date(s.last_active).toLocaleString()
              }
              style={{
                width: isExpanded ? "100%" : "36px",
                height: isExpanded ? "auto" : "36px",
                minHeight: "36px",
                borderRadius: isExpanded ? "6px" : "50%",
                background: isActive ? "var(--surface2)" : "transparent",
                border: `1px solid ${isActive ? "var(--border2)" : "transparent"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: isExpanded ? "flex-start" : "center",
                cursor: "pointer",
                color: isActive ? "var(--text)" : "var(--text-dim)",
                position: "relative",
                padding: isExpanded ? "8px 10px" : "0",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--surface2)"
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent"
                }
              }}
            >
              {/* Icon */}
              <div style={{ flexShrink: 0, fontSize: "14px" }}>💬</div>

              {/* Expanded Details */}
              {isExpanded && (
                <div
                  style={{ marginLeft: "10px", overflow: "hidden", flex: 1 }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {getSessionTitle(s)}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--text-dim)",
                      marginTop: "2px",
                    }}
                  >
                    {getSessionDate(s.last_active)} · {s.messages?.length || 0}{" "}
                    msgs
                  </div>
                </div>
              )}

              {/* Delete Button (Visible on hover inside toggle or always in expanded) */}
              {isExpanded && (
                <button
                  onClick={(e) => handleDeleteSession(e, s.session_id)}
                  className="delete-btn"
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "4px",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    cursor: "pointer",
                    marginLeft: "4px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--rose)"
                    e.currentTarget.style.background = "rgba(255,0,0,0.1)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-dim)"
                    e.currentTarget.style.background = "transparent"
                  }}
                >
                  ×
                </button>
              )}

              {!isExpanded && isActive && (
                <div
                  style={{
                    position: "absolute",
                    right: "-3px",
                    top: "-2px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      <div
        style={{
          width: isExpanded ? "calc(100% - 24px)" : "24px",
          height: "1px",
          background: "var(--border)",
          margin: "4px auto",
        }}
      />

      {/* Agent heartbeats / Status */}
      <div
        style={{
          display: "flex",
          flexDirection: isExpanded ? "row" : "column",
          gap: "8px",
          marginBottom: "10px",
          alignItems: "center",
          justifyContent: isExpanded ? "center" : "flex-start",
          padding: isExpanded ? "0 12px" : "0",
        }}
      >
        {isExpanded ? (
          // Expanded Status
          <div style={{ display: "flex", gap: "16px" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              title="Ollama"
            >
              <div
                className={`status-dot ${ollamaOnline ? "status-online" : "status-offline"}`}
              />
              <span className="mono-label" style={{ fontSize: "9px" }}>
                LLM
              </span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              title="Telegram"
            >
              <div
                className={`status-dot ${telegramConnected ? "status-online" : "status-offline"}`}
              />
              <span className="mono-label" style={{ fontSize: "9px" }}>
                TG
              </span>
            </div>
          </div>
        ) : (
          // Collapsed Heartbeats
          AGENTS.map((a, i) => (
            <div
              key={a.name}
              title={`${a.name} — Online`}
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: a.color,
                opacity: 0.9,
                animation: `pulseDot 2.5s ease-in-out infinite`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))
        )}
      </div>

      {/* Bottom Actions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          alignItems: "center",
          width: "100%",
          padding: isExpanded ? "0 12px" : "0",
        }}
      >
        {/* Command Bar */}
        <button
          onClick={toggleCommandBar}
          title="Command Bar ⌘K"
          style={{
            width: isExpanded ? "100%" : "44px",
            height: "28px",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            letterSpacing: "1px",
            color: "var(--text-dim)",
            background: "transparent",
            border: "1px solid var(--border)",
            transition: "all 0.15s",
            gap: "8px",
          }}
        >
          ⌘K
          {isExpanded && <span>COMMANDS</span>}
        </button>

        <button
          onClick={toggleNotifPanel}
          title="Notifications"
          style={{
            width: isExpanded ? "100%" : "44px",
            height: "44px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: isExpanded ? "flex-start" : "center",
            padding: isExpanded ? "0 16px" : "0",
            fontSize: "17px",
            background: "transparent",
            border: "1px solid transparent",
            color: "var(--text-dim)",
            transition: "all 0.15s",
            position: "relative",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text)"
            e.currentTarget.style.background = "var(--surface2)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-dim)"
            e.currentTarget.style.background = "transparent"
          }}
        >
          <span>🔔</span>
          {isExpanded && (
            <span
              style={{
                marginLeft: "12px",
                fontSize: "14px",
                fontFamily: "var(--font-display)",
              }}
            >
              Notifications
            </span>
          )}
          {unreadCount > 0 && (
            <div
              style={{
                position: "absolute",
                top: isExpanded ? "12px" : "7px",
                right: isExpanded ? "12px" : "7px",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "var(--rose)",
                color: "white",
                fontSize: "8px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </button>

        <button
          onClick={() => setView("settings" as View)}
          title="Settings"
          style={{
            width: isExpanded ? "100%" : "44px",
            height: "44px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: isExpanded ? "flex-start" : "center",
            padding: isExpanded ? "0 16px" : "0",
            fontSize: "17px",
            background:
              currentView === "settings" ? "var(--accent)18" : "transparent",
            border:
              currentView === "settings"
                ? "1px solid var(--accent)55"
                : "1px solid transparent",
            color:
              currentView === "settings" ? "var(--accent)" : "var(--text-dim)",
            transition: "all 0.15s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            if (currentView !== "settings")
              e.currentTarget.style.color = "var(--text)"
          }}
          onMouseLeave={(e) => {
            if (currentView !== "settings")
              e.currentTarget.style.color = "var(--text-dim)"
          }}
        >
          ⚙
          {isExpanded && (
            <span
              style={{
                marginLeft: "12px",
                fontSize: "14px",
                fontFamily: "var(--font-display)",
              }}
            >
              Settings
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}

