import { useState, useEffect } from "react"
import { useNexusStore } from "../../store/nexusStore"
import { checkHealth } from "../../lib/api"

type Tab = "integrations" | "llm" | "scheduler" | "notifications" | "about"

export default function SettingsView() {
  const {
    settings,
    updateSettings,
    ollamaOnline,
    setOllamaOnline,
    pushNotification,
  } = useNexusStore()
  const [tab, setTab] = useState<Tab>("integrations")
  const [testing, setTesting] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const testConnection = async (type: string) => {
    setTesting(type)
    try {
      if (type === "backend") {
        const h = await checkHealth()
        const ollamaOk = h.ollama === "connected"
        setOllamaOnline(ollamaOk)
        pushNotification({
          type: ollamaOk ? "success" : "warning",
          title: "Backend Test",
          body: `Backend: OK | Ollama: ${h.ollama}`,
        })
      } else if (type === "telegram") {
        if (!settings.telegramToken) {
          pushNotification({
            type: "error",
            title: "Telegram",
            body: "No token set",
          })
          return
        }
        const res = await fetch(
          `https://api.telegram.org/bot${settings.telegramToken}/getMe`,
        )
        const d = await res.json()
        pushNotification({
          type: d.ok ? "success" : "error",
          title: "Telegram Test",
          body: d.ok ? `Bot @${d.result.username} online` : "Invalid token",
        })
      }
    } catch (e) {
      pushNotification({
        type: "error",
        title: `${type} Test Failed`,
        body: "Connection error",
      })
    } finally {
      setTesting(null)
    }
  }

  const save = () => {
    setSaved(true)
    pushNotification({
      type: "success",
      title: "Settings Saved",
      body: "All changes have been saved",
    })
    setTimeout(() => setSaved(false), 2000)
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "integrations", label: "Integrations", icon: "⟁" },
    { key: "llm", label: "LLM & Models", icon: "🧠" },
    { key: "scheduler", label: "Scheduler", icon: "⏰" },
    { key: "notifications", label: "Notifications", icon: "🔔" },
    { key: "about", label: "About NEXUS", icon: "◈" },
  ]

  const Field = ({
    label,
    children,
    hint,
  }: {
    label: string
    children: React.ReactNode
    hint?: string
  }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div className="mono-label">{label}</div>
      {children}
      {hint && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-dim)",
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )

  const TestBtn = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => testConnection(id)}
      disabled={testing === id}
      style={{
        padding: "7px 14px",
        borderRadius: "4px",
        fontSize: "11px",
        fontFamily: "var(--font-mono)",
        letterSpacing: "1px",
        background: "var(--surface3)",
        border: "1px solid var(--border)",
        color: "var(--text-mid)",
        marginTop: "8px",
        width: "fit-content",
      }}
    >
      {testing === id ? "TESTING..." : `TEST ${label}`}
    </button>
  )

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "17px",
            letterSpacing: "1px",
            flex: 1,
          }}
        >
          Settings
        </div>
        <button
          onClick={save}
          style={{
            padding: "8px 20px",
            borderRadius: "5px",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            letterSpacing: "1px",
            background: saved ? "var(--emerald)" : "var(--accent)",
            border: "none",
            color: "white",
            transition: "all 0.2s",
          }}
        >
          {saved ? "✓ SAVED" : "SAVE ALL"}
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Tab nav */}
        <div
          style={{
            width: "180px",
            borderRight: "1px solid var(--border)",
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            background: "var(--surface)",
            flexShrink: 0,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "6px",
                textAlign: "left",
                background: tab === t.key ? "var(--accent-lo)" : "transparent",
                border: `1px solid ${tab === t.key ? "var(--border2)" : "transparent"}`,
                color: tab === t.key ? "var(--accent)" : "var(--text-mid)",
                fontSize: "13px",
                transition: "all 0.15s",
              }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          {/* Integrations */}
          {tab === "integrations" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "32px",
                maxWidth: "560px",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "20px",
                    fontWeight: 700,
                    marginBottom: "20px",
                  }}
                >
                  Integrations
                </div>

                {/* Backend */}
                <div
                  style={{
                    padding: "20px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "14px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>⚡</span>
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                        }}
                      >
                        NEXUS Backend
                      </div>
                      <div className="mono-label">FastAPI + Ollama</div>
                    </div>
                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <div
                        className={`status-dot ${ollamaOnline ? "status-online" : "status-offline"}`}
                      />
                      <span className="mono-label">
                        {ollamaOnline ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                  </div>
                  <TestBtn id="backend" label="BACKEND" />
                </div>

                {/* Telegram */}
                <div
                  style={{
                    padding: "20px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "14px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>✈</span>
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                        }}
                      >
                        Telegram
                      </div>
                      <div className="mono-label">Mobile bot access</div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <Field
                      label="BOT TOKEN"
                      hint="Get from @BotFather on Telegram"
                    >
                      <input
                        type="password"
                        value={settings.telegramToken}
                        onChange={(e) =>
                          updateSettings({ telegramToken: e.target.value })
                        }
                        placeholder="1234567890:ABCdef..."
                        style={{
                          padding: "9px 12px",
                          fontSize: "12px",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                    </Field>
                    <Field
                      label="YOUR CHAT ID"
                      hint="Message @userinfobot to get your ID"
                    >
                      <input
                        value={settings.telegramChatId}
                        onChange={(e) =>
                          updateSettings({ telegramChatId: e.target.value })
                        }
                        placeholder="123456789"
                        style={{
                          padding: "9px 12px",
                          fontSize: "12px",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                    </Field>
                  </div>
                  <TestBtn id="telegram" label="TELEGRAM" />
                </div>

                {/* GitHub */}
                <div
                  style={{
                    padding: "20px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "14px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>⬡</span>
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                        }}
                      >
                        GitHub
                      </div>
                      <div className="mono-label">Repo + issue sync</div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <Field
                      label="PERSONAL ACCESS TOKEN"
                      hint="Settings → Developer Settings → Personal Access Tokens → Tokens (classic)"
                    >
                      <input
                        type="password"
                        value={settings.githubToken}
                        onChange={(e) =>
                          updateSettings({ githubToken: e.target.value })
                        }
                        placeholder="ghp_..."
                        style={{
                          padding: "9px 12px",
                          fontSize: "12px",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                    </Field>
                  </div>
                </div>

                {/* Notion */}
                <div
                  style={{
                    padding: "20px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "14px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>📓</span>
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                        }}
                      >
                        Notion
                      </div>
                      <div className="mono-label">Notes + doc export</div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <Field
                      label="INTEGRATION API KEY"
                      hint="From notion.so/my-integrations"
                    >
                      <input
                        type="password"
                        value={settings.notionKey}
                        onChange={(e) =>
                          updateSettings({ notionKey: e.target.value })
                        }
                        placeholder="secret_..."
                        style={{
                          padding: "9px 12px",
                          fontSize: "12px",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LLM */}
          {tab === "llm" && (
            <div style={{ maxWidth: "560px" }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "20px",
                  fontWeight: 700,
                  marginBottom: "20px",
                }}
              >
                LLM & Models
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <Field
                  label="LOCAL MODEL (OLLAMA)"
                  hint="Run: ollama pull llama3.1:8b"
                >
                  <select
                    value={settings.ollamaModel}
                    onChange={(e) =>
                      updateSettings({ ollamaModel: e.target.value })
                    }
                    style={{ padding: "9px 12px", fontSize: "13px" }}
                  >
                    <option value="llama3.1:8b">
                      llama3.1:8b (recommended for 8GB VRAM)
                    </option>
                    <option value="qwen2.5:7b">qwen2.5:7b</option>
                    <option value="mistral:7b">mistral:7b</option>
                    <option value="codellama:7b">
                      codellama:7b (FORGE optimized)
                    </option>
                    <option value="llama3.1:70b">
                      llama3.1:70b (high-end)
                    </option>
                  </select>
                </Field>
                <div
                  style={{
                    padding: "16px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                  }}
                >
                  <div className="mono-label" style={{ marginBottom: "10px" }}>
                    SMART ROUTER LOGIC
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-mid)",
                      lineHeight: 1.8,
                    }}
                  >
                    →{" "}
                    <span style={{ color: "var(--emerald)" }}>Local first</span>{" "}
                    for all tasks under 2000 tokens
                    <br />→{" "}
                    <span style={{ color: "var(--amber)" }}>
                      Cloud (Claude)
                    </span>{" "}
                    for: research_heavy, career_analysis, code_review_deep
                    <br />→{" "}
                    <span style={{ color: "var(--rose)" }}>
                      Fallback to Cloud
                    </span>{" "}
                    if Ollama is offline
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scheduler */}
          {tab === "scheduler" && (
            <div style={{ maxWidth: "560px" }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "20px",
                  fontWeight: 700,
                  marginBottom: "20px",
                }}
              >
                Auto Scheduler
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <Field
                  label="MORNING BRIEFING TIME (IST)"
                  hint="ATLAS sends your daily briefing via Telegram"
                >
                  <input
                    type="time"
                    value={settings.morningTime}
                    onChange={(e) =>
                      updateSettings({ morningTime: e.target.value })
                    }
                    style={{
                      padding: "9px 12px",
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </Field>
                <Field
                  label="EVENING SUMMARY TIME (IST)"
                  hint="ATLAS sends end-of-day summary + exports to Notion"
                >
                  <input
                    type="time"
                    value={settings.eveningTime}
                    onChange={(e) =>
                      updateSettings({ eveningTime: e.target.value })
                    }
                    style={{
                      padding: "9px 12px",
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </Field>
                <div
                  style={{
                    padding: "14px 16px",
                    background: "var(--amber-lo)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    borderRadius: "6px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--amber)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ⚠ Scheduler runs in Edit MORNING_BRIEFING_TIME and
                    EVENING_SUMMARY_TIME in backend/.env to apply.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {tab === "notifications" && (
            <div style={{ maxWidth: "560px" }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "20px",
                  fontWeight: 700,
                  marginBottom: "20px",
                }}
              >
                Notifications
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {[
                  {
                    key: "notifDesktop" as const,
                    label: "Desktop Notifications",
                    desc: "Native OS notifications for agent events",
                  },
                  {
                    key: "notifSound" as const,
                    label: "Sound Alerts",
                    desc: "Play sound on important notifications",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-dim)",
                          marginTop: "3px",
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        updateSettings({ [item.key]: !settings[item.key] })
                      }
                      style={{
                        width: "44px",
                        height: "24px",
                        borderRadius: "12px",
                        position: "relative",
                        background: settings[item.key]
                          ? "var(--accent)"
                          : "var(--surface3)",
                        border: "none",
                        transition: "all 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          background: "white",
                          position: "absolute",
                          top: "3px",
                          left: settings[item.key] ? "23px" : "3px",
                          transition: "left 0.2s",
                        }}
                      />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    if ("Notification" in window)
                      Notification.requestPermission().then((p) => {
                        pushNotification({
                          type: p === "granted" ? "success" : "warning",
                          title: "Desktop Notifications",
                          body:
                            p === "granted"
                              ? "Permission granted"
                              : "Permission denied",
                        })
                      })
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "6px",
                    background: "var(--accent-lo)",
                    border: "1px solid var(--border2)",
                    color: "var(--accent)",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "1px",
                  }}
                >
                  REQUEST OS NOTIFICATION PERMISSION
                </button>
              </div>
            </div>
          )}

          {/* About */}
          {tab === "about" && (
            <div style={{ maxWidth: "520px" }}>
              <div style={{ textAlign: "center", padding: "32px 0 40px" }}>
                <div
                  className="text-gradient"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "52px",
                    fontWeight: 700,
                    letterSpacing: "4px",
                  }}
                >
                  NEXUS
                </div>
                <div className="mono-label" style={{ marginTop: "8px" }}>
                  NEURAL EXECUTION & UNDERSTANDING SYSTEM
                </div>
                <div className="mono-label" style={{ marginTop: "4px" }}>
                  VERSION 2.0.0 · BUILT FOR UTSAV DESAI
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {[
                  {
                    label: "Architecture",
                    value: "Tauri 2.0 + React + FastAPI + LangGraph",
                  },
                  { label: "Local LLM", value: "Ollama · Llama 3.1 8B" },
                  { label: "Cloud LLM", value: "Claude Sonnet 4.5 (fallback)" },
                  { label: "Memory", value: "ChromaDB + SQLite + Redis" },
                  {
                    label: "Agents",
                    value: "ATLAS · ORACLE · COMPASS · FORGE",
                  },
                  {
                    label: "Integrations",
                    value: "GitHub · Notion · Telegram · VS Code",
                  },
                  { label: "Location", value: "Surat, India 🇮🇳" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: "5px",
                    }}
                  >
                    <span className="mono-label">{item.label}</span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-mid)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  textAlign: "center",
                  marginTop: "32px",
                  color: "var(--text-dim)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                "You're not building a tool. You're building your second brain."
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

