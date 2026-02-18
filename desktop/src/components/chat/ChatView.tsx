import { useRef, useEffect, useState } from "react";
import { useNexusStore, Agent } from "../../store/nexusStore";
import { sendChat } from "../../lib/api";

// ── Agent metadata ──────────────────────────────────────────────
const AGENT_META: Record<Agent | string, { color: string; bg: string; icon: string; border: string }> = {
  NEXUS:   { color: "#6366f1", bg: "rgba(99,102,241,0.08)",   icon: "🧠", border: "rgba(99,102,241,0.3)" },
  ATLAS:   { color: "#a78bfa", bg: "rgba(167,139,250,0.08)",  icon: "🗂️", border: "rgba(167,139,250,0.3)" },
  ORACLE:  { color: "#22d3ee", bg: "rgba(34,211,238,0.06)",   icon: "🔬", border: "rgba(34,211,238,0.3)" },
  COMPASS: { color: "#f59e0b", bg: "rgba(245,158,11,0.06)",   icon: "🚀", border: "rgba(245,158,11,0.3)" },
  FORGE:   { color: "#10b981", bg: "rgba(16,185,129,0.06)",   icon: "💻", border: "rgba(16,185,129,0.3)" },
};

// Simple markdown-like renderer
function renderContent(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={i} style={{ position: "relative", marginTop: "10px", marginBottom: "10px" }}>
          {lang && (
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "2px",
              color: "var(--accent)", padding: "6px 14px", background: "rgba(99,102,241,0.1)",
              borderBottom: "1px solid var(--border)", textTransform: "uppercase",
              display: "flex", justifyContent: "space-between", borderRadius: "4px 4px 0 0",
            }}>
              <span>{lang}</span>
            </div>
          )}
          <pre style={{
            margin: 0, borderRadius: lang ? "0 0 4px 4px" : "4px",
            borderTop: lang ? "none" : "1px solid var(--border)",
            background: "rgba(0,0,0,0.4)", overflow: "auto",
          }}>
            <code style={{ color: "#c9d1d9" }}>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <div key={i} style={{ fontFamily: "var(--font-display)", fontSize: "17px", fontWeight: 700, marginTop: "14px", marginBottom: "8px" }}>
          {line.slice(3)}
        </div>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <div key={i} style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, marginTop: "10px", marginBottom: "6px", color: "var(--text-mid)" }}>
          {line.slice(4)}
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: "12px", marginTop: "2px", flexShrink: 0 }}>→</span>
          <span style={{ color: "var(--text-mid)", fontSize: "13px", lineHeight: 1.6 }}>
            {line.slice(2).replace(/\*\*(.*?)\*\*/g, "").trim()}
          </span>
        </div>
      );
    } else if (line.trim() === "---") {
      elements.push(<div key={i} className="nx-divider" style={{ margin: "12px 0" }} />);
    } else if (line.trim()) {
      const formatted = line
        .replace(/\*\*(.*?)\*\*/g, (_, t) => `<strong style="color:var(--text);font-weight:600">${t}</strong>`)
        .replace(/`(.*?)`/g, (_, t) => `<code style="font-family:var(--font-mono);background:rgba(0,0,0,0.4);border:1px solid var(--border);padding:2px 6px;border-radius:3px;font-size:11px">${t}</code>`);
      elements.push(
        <p key={i} style={{ fontSize: "13px", color: "var(--text-mid)", lineHeight: 1.7, marginTop: "4px" }}
          dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    } else {
      elements.push(<div key={i} style={{ height: "6px" }} />);
    }
    i++;
  }
  return elements;
}

// ── Message Bubble ──────────────────────────────────────────────
function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";
  const meta = AGENT_META[message.agent] || AGENT_META.NEXUS;

  return (
    <div style={{
      display: "flex", gap: "12px",
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-start",
      animation: "fadeUp 0.3s ease forwards",
    }}>
      {/* Avatar */}
      <div style={{
        width: "34px", height: "34px", borderRadius: "6px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "16px",
        background: isUser ? "rgba(255,255,255,0.07)" : meta.bg,
        border: `1px solid ${isUser ? "rgba(255,255,255,0.1)" : meta.border}`,
      }}>
        {isUser ? "U" : meta.icon}
      </div>

      {/* Content */}
      <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column", gap: "5px", alignItems: isUser ? "flex-end" : "flex-start" }}>
        {!isUser && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "2px", color: meta.color, textTransform: "uppercase" }}>
              {message.agent}
            </span>
          </div>
        )}
        <div style={{
          padding: "12px 16px",
          borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
          background: isUser ? "rgba(99,102,241,0.18)" : "var(--surface2)",
          border: `1px solid ${isUser ? "rgba(99,102,241,0.35)" : "var(--border)"}`,
          position: "relative",
        }}>
          {message.isStreaming ? (
            <div style={{ display: "flex", gap: "5px", padding: "4px 0" }}>
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          ) : isUser ? (
            <p style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.6 }}>{message.content}</p>
          ) : (
            <div>{renderContent(message.content)}</div>
          )}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-dim)" }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ── Quick Action chips ──────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "Morning Briefing", prompt: "Give me my morning briefing", agent: "ATLAS" },
  { label: "Skill Gap Check", prompt: "Analyze my skill gap for Senior ML Engineer", agent: "COMPASS" },
  { label: "Code Review", prompt: "I need a code review", agent: "FORGE" },
  { label: "Research Query", prompt: "Search my knowledge base for", agent: "ORACLE" },
  { label: "Sync GitHub", prompt: "sync github and show my open issues", agent: "ATLAS" },
  { label: "Focus Mode", prompt: "What single thing should I work on right now?", agent: "NEXUS" },
];

// ── Chat Input ──────────────────────────────────────────────────
function ChatInput() {
  const [value, setValue] = useState("");
  const { addMessage, setLoading, isLoading, sessionId, setSessionId, pushNotification } = useNexusStore();
  const textRef = useRef<HTMLTextAreaElement>(null);

  const submit = async (overrideMsg?: string) => {
    const msg = (overrideMsg || value).trim();
    if (!msg || isLoading) return;
    setValue("");

    addMessage({ role: "user", content: msg, agent: "NEXUS" });
    // Streaming placeholder
    addMessage({ role: "assistant", content: "", agent: "NEXUS", isStreaming: true });
    setLoading(true);

    try {
      const data = await sendChat(msg, sessionId ?? undefined);
      if (!sessionId) setSessionId(data.session_id);
      // Replace streaming placeholder
      const { updateLastMessage } = useNexusStore.getState();
      updateLastMessage(data.response);
      // Update agent on last message
      const msgs = useNexusStore.getState().messages;
      // Notification for important agent responses
      if (data.agent !== "NEXUS") {
        pushNotification({
          type: "agent",
          title: `${data.agent} responded`,
          body: data.response.slice(0, 80) + (data.response.length > 80 ? "…" : ""),
          agent: data.agent as Agent,
        });
      }
    } catch {
      const { updateLastMessage } = useNexusStore.getState();
      updateLastMessage("⚠️ Backend offline. Run: `uvicorn api.main:app --reload` in /backend");
    } finally {
      setLoading(false);
    }
  };

  const autoResize = () => {
    const el = textRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }
  };

  return (
    <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
      {/* Quick actions */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.label}
            onClick={() => submit(a.prompt)}
            style={{
              fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "1px",
              padding: "4px 10px", borderRadius: "3px", textTransform: "uppercase",
              color: "var(--text-dim)", background: "var(--surface2)",
              border: "1px solid var(--border)", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >{a.label}</button>
        ))}
      </div>

      {/* Input box */}
      <div style={{
        display: "flex", gap: "10px", alignItems: "flex-end",
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: "8px", padding: "12px 14px",
        transition: "border-color 0.15s",
      }}
        onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"}
        onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
      >
        <textarea
          ref={textRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); autoResize(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Talk to NEXUS… (Enter to send, Shift+Enter for newline)"
          rows={1}
          disabled={isLoading}
          style={{
            flex: 1, background: "transparent", border: "none", color: "var(--text)",
            fontSize: "13px", lineHeight: 1.6, resize: "none", outline: "none",
            fontFamily: "var(--font-body)", minHeight: "22px",
            opacity: isLoading ? 0.5 : 1,
          }}
        />
        <button
          onClick={() => submit()}
          disabled={!value.trim() || isLoading}
          style={{
            width: "32px", height: "32px", borderRadius: "6px", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: value.trim() && !isLoading ? "var(--accent)" : "var(--surface3)",
            border: "none", color: "white", fontSize: "16px", fontWeight: 700,
            transition: "all 0.15s",
          }}
        >{isLoading ? "⋯" : "↑"}</button>
      </div>

      <div className="mono-label" style={{ textAlign: "center", marginTop: "8px" }}>
        LOCAL FIRST · HYBRID ROUTING · PRIVATE BY DEFAULT
      </div>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────
function EmptyState() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "42px", fontWeight: 700, letterSpacing: "3px", lineHeight: 1 }}
          className="text-gradient">NEXUS</div>
        <div className="mono-label" style={{ marginTop: "8px" }}>NEURAL EXECUTION & UNDERSTANDING SYSTEM</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 600, color: "var(--text-mid)" }}>
          {greeting}, Utsav.
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "6px" }}>
          What are we building today?
        </div>
      </div>
      <div style={{ display: "flex", gap: "16px" }}>
        {[
          { icon: "🗂️", label: "ATLAS", sub: "Projects" },
          { icon: "🔬", label: "ORACLE", sub: "Research" },
          { icon: "🚀", label: "COMPASS", sub: "Career" },
          { icon: "💻", label: "FORGE", sub: "Code" },
        ].map((a) => (
          <div key={a.label} style={{
            textAlign: "center", padding: "14px 18px",
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: "8px", minWidth: "80px",
          }}>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>{a.icon}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 700, color: "var(--text-mid)" }}>{a.label}</div>
            <div className="mono-label" style={{ marginTop: "2px" }}>{a.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Chat View ──────────────────────────────────────────────
export default function ChatView() {
  const { messages } = useNexusStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "12px", flexShrink: 0,
        background: "var(--surface)",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "17px", letterSpacing: "1px" }}>
            Chat with NEXUS
          </div>
          <div className="mono-label" style={{ marginTop: "2px" }}>
            5 AGENTS ONLINE · RAG ENABLED · LOCAL LLM
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {["ATLAS","ORACLE","COMPASS","FORGE"].map((a) => (
            <span key={a} style={{
              fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "1px",
              padding: "3px 7px", borderRadius: "2px", textTransform: "uppercase",
            }} className={`chip bg-agent-${a.toLowerCase()} agent-${a.toLowerCase()}`}>{a}</span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.length === 0 ? <EmptyState /> : messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <ChatInput />
    </div>
  );
}
