import { useState, useEffect, useRef } from "react";
import { useNexusStore } from "../../store/nexusStore";
import { sendTelegramMessage, getTelegramUpdates } from "../../lib/api";

interface TelegramMessage {
  id: number;
  from: string;
  text: string;
  timestamp: Date;
  isBot: boolean;
}

const BOT_COMMANDS = [
  { cmd: "/brief",   icon: "☀️", desc: "Morning briefing" },
  { cmd: "/tasks",   icon: "📋", desc: "Today's tasks" },
  { cmd: "/summary", icon: "🌆", desc: "Evening summary" },
  { cmd: "/focus",   icon: "🎯", desc: "What to work on" },
  { cmd: "/project", icon: "🗂️", desc: "Active projects" },
  { cmd: "/status",  icon: "⚡", desc: "System status" },
];

export default function TelegramView() {
  const { settings, updateSettings, telegramConnected, setTelegramConnected, pushNotification } = useNexusStore();
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [composing, setComposing] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [botInfo, setBotInfo] = useState<{ username: string; name: string } | null>(null);
  const [pollActive, setPollActive] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Connect bot ───────────────────────────────────────────────
  const connectBot = async () => {
    if (!settings.telegramToken) return;
    setIsConnecting(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${settings.telegramToken}/getMe`);
      const data = await res.json();
      if (data.ok) {
        setBotInfo({ username: data.result.username, name: data.result.first_name });
        setTelegramConnected(true);
        pushNotification({ type: "success", title: "Telegram Connected", body: `Bot @${data.result.username} is online` });
        startPolling();
      } else {
        pushNotification({ type: "error", title: "Telegram Error", body: "Invalid bot token" });
      }
    } catch {
      pushNotification({ type: "error", title: "Telegram Error", body: "Could not connect to Telegram API" });
    } finally {
      setIsConnecting(false);
    }
  };

  // ── Poll for updates ──────────────────────────────────────────
  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPollActive(true);
    let offset = 0;
    pollRef.current = setInterval(async () => {
      try {
        const url = `https://api.telegram.org/bot${settings.telegramToken}/getUpdates?offset=${offset}&limit=10&timeout=5`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.ok && data.result.length > 0) {
          const newMsgs: TelegramMessage[] = data.result.map((u: any) => {
            offset = Math.max(offset, u.update_id + 1);
            return {
              id: u.update_id,
              from: u.message?.from?.first_name || "User",
              text: u.message?.text || "",
              timestamp: new Date((u.message?.date || 0) * 1000),
              isBot: false,
            };
          }).filter((m: TelegramMessage) => m.text);
          if (newMsgs.length > 0) {
            setMessages((prev) => [...prev, ...newMsgs]);
            newMsgs.forEach((m) => {
              pushNotification({ type: "info", title: `Telegram: ${m.from}`, body: m.text.slice(0, 80) });
            });
          }
        }
      } catch { /* silent */ }
    }, 3000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Send message ──────────────────────────────────────────────
  const sendMsg = async (text?: string) => {
    const msg = text || composing.trim();
    if (!msg || !settings.telegramToken || !settings.telegramChatId) return;
    setComposing("");
    const botMsg: TelegramMessage = {
      id: Date.now(), from: "NEXUS Bot", text: msg,
      timestamp: new Date(), isBot: true,
    };
    setMessages((prev) => [...prev, botMsg]);
    try {
      await sendTelegramMessage(settings.telegramToken, settings.telegramChatId, msg);
    } catch {
      pushNotification({ type: "error", title: "Send Failed", body: "Could not send Telegram message" });
    }
  };

  const notConnected = !telegramConnected;

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "12px", flexShrink: 0,
        background: "var(--surface)",
      }}>
        <div style={{ fontSize: "22px" }}>✈</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "17px", letterSpacing: "1px" }}>
            Telegram Integration
          </div>
          <div className="mono-label" style={{ marginTop: "2px" }}>
            {telegramConnected ? `BOT ACTIVE · ${botInfo?.username || "CONNECTED"}` : "NOT CONNECTED"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className={`status-dot ${telegramConnected ? "status-online" : "status-offline"}`} />
          <span className="mono-label">{telegramConnected ? "ONLINE" : "OFFLINE"}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left panel - config & commands */}
        <div style={{
          width: "280px", flexShrink: 0, borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column", overflowY: "auto",
          background: "var(--surface)",
        }}>
          {/* Bot Config */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <div className="mono-label" style={{ marginBottom: "12px" }}>BOT CONFIGURATION</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <div className="mono-label" style={{ marginBottom: "5px" }}>BOT TOKEN</div>
                <input
                  type="password"
                  value={settings.telegramToken}
                  onChange={(e) => updateSettings({ telegramToken: e.target.value })}
                  placeholder="1234567890:ABCdef..."
                  style={{ width: "100%", padding: "8px 10px", fontSize: "12px", fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div>
                <div className="mono-label" style={{ marginBottom: "5px" }}>YOUR CHAT ID</div>
                <input
                  type="text"
                  value={settings.telegramChatId}
                  onChange={(e) => updateSettings({ telegramChatId: e.target.value })}
                  placeholder="123456789"
                  style={{ width: "100%", padding: "8px 10px", fontSize: "12px", fontFamily: "var(--font-mono)" }}
                />
              </div>
              <button
                onClick={connectBot}
                disabled={isConnecting || !settings.telegramToken}
                style={{
                  padding: "9px", borderRadius: "5px", fontSize: "12px",
                  fontFamily: "var(--font-mono)", letterSpacing: "1px", textTransform: "uppercase",
                  background: telegramConnected ? "var(--emerald-lo)" : "var(--accent)",
                  border: `1px solid ${telegramConnected ? "var(--emerald)" : "transparent"}`,
                  color: telegramConnected ? "var(--emerald)" : "white",
                  fontWeight: 600, transition: "all 0.15s",
                }}
              >
                {isConnecting ? "Connecting..." : telegramConnected ? "✓ Connected" : "Connect Bot"}
              </button>
            </div>

            {telegramConnected && botInfo && (
              <div style={{
                marginTop: "12px", padding: "10px 12px", borderRadius: "6px",
                background: "var(--emerald-lo)", border: "1px solid rgba(16,185,129,0.25)",
              }}>
                <div style={{ fontSize: "12px", color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                  @{botInfo.username}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-mid)", marginTop: "2px" }}>
                  {pollActive ? "Polling for updates..." : ""}
                </div>
              </div>
            )}
          </div>

          {/* Quick Commands */}
          <div style={{ padding: "16px" }}>
            <div className="mono-label" style={{ marginBottom: "12px" }}>QUICK SEND</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {BOT_COMMANDS.map((cmd) => (
                <button
                  key={cmd.cmd}
                  onClick={() => sendMsg(cmd.cmd)}
                  disabled={!telegramConnected || !settings.telegramChatId}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "9px 12px", borderRadius: "5px",
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    color: "var(--text-mid)", fontSize: "12px",
                    transition: "all 0.15s", textAlign: "left",
                    opacity: (!telegramConnected || !settings.telegramChatId) ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => { if (telegramConnected) { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; } }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
                >
                  <span>{cmd.icon}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--accent)" }}>{cmd.cmd}</div>
                    <div style={{ fontSize: "11px" }}>{cmd.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Push notification shortcuts */}
          <div style={{ padding: "0 16px 16px" }}>
            <div className="mono-label" style={{ marginBottom: "10px" }}>PUSH NOTIFICATION</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { label: "Morning Brief", text: "☀️ *NEXUS Morning Briefing*\n\nGood morning! Your system is online and ready." },
                { label: "Task Reminder", text: "⏰ *Task Reminder*\n\nDon't forget to complete your priority tasks today!" },
                { label: "Build Success", text: "✅ *Build Complete*\n\nYour latest build finished successfully." },
              ].map((n) => (
                <button
                  key={n.label}
                  onClick={() => sendMsg(n.text)}
                  disabled={!telegramConnected || !settings.telegramChatId}
                  style={{
                    padding: "7px 12px", borderRadius: "4px", fontSize: "11px",
                    fontFamily: "var(--font-mono)", letterSpacing: "1px",
                    color: "var(--accent)", background: "var(--accent-lo)",
                    border: "1px solid var(--border2)", transition: "all 0.15s",
                    textAlign: "left",
                    opacity: (!telegramConnected || !settings.telegramChatId) ? 0.4 : 1,
                  }}
                >↗ {n.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - chat window */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
          {/* Not connected state */}
          {notConnected ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
              <div style={{ fontSize: "48px" }}>✈</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700, color: "var(--text-mid)" }}>
                Connect Your Bot
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-dim)", textAlign: "center", maxWidth: "320px", lineHeight: 1.7 }}>
                Enter your Telegram bot token from <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>@BotFather</span> and your Chat ID to get NEXUS on your phone.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", maxWidth: "320px", width: "100%" }}>
                <div className="mono-label">HOW TO GET CHAT ID</div>
                {["1. Open Telegram → message @userinfobot", "2. Copy the id: number it sends back", "3. Paste above as Your Chat ID"].map((s) => (
                  <div key={s} style={{ fontSize: "12px", color: "var(--text-mid)" }}>• {s}</div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Message log */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "40px 0" }}>
                    <div className="mono-label">NO MESSAGES YET — USE QUICK SEND OR TYPE BELOW</div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} style={{ display: "flex", flexDirection: m.isBot ? "row-reverse" : "row", gap: "10px", alignItems: "flex-start" }}>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "13px",
                      background: m.isBot ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.07)",
                      border: `1px solid ${m.isBot ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.1)"}`,
                    }}>
                      {m.isBot ? "🤖" : "👤"}
                    </div>
                    <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: "4px", alignItems: m.isBot ? "flex-end" : "flex-start" }}>
                      <div className="mono-label">{m.from}</div>
                      <div style={{
                        padding: "10px 14px", borderRadius: m.isBot ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                        background: m.isBot ? "rgba(99,102,241,0.15)" : "var(--surface2)",
                        border: `1px solid ${m.isBot ? "rgba(99,102,241,0.3)" : "var(--border)"}`,
                        fontSize: "13px", color: "var(--text)", lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}>{m.text}</div>
                      <span className="mono-label">{new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px" }}>
                <input
                  value={composing}
                  onChange={(e) => setComposing(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }}
                  placeholder="Send a message to your phone..."
                  style={{ flex: 1, padding: "10px 14px", fontSize: "13px", borderRadius: "6px" }}
                />
                <button
                  onClick={() => sendMsg()}
                  disabled={!composing.trim()}
                  style={{
                    padding: "10px 18px", borderRadius: "6px",
                    background: composing.trim() ? "rgba(233,121,249,0.8)" : "var(--surface2)",
                    border: `1px solid ${composing.trim() ? "rgba(233,121,249,0.5)" : "var(--border)"}`,
                    color: "white", fontSize: "13px", fontFamily: "var(--font-mono)",
                    letterSpacing: "1px", transition: "all 0.15s",
                  }}
                >SEND</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
