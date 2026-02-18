import { useState, useEffect, useRef } from "react";
import { useNexusStore } from "../../store/nexusStore";
import { sendChat } from "../../lib/api";

interface Command {
  id: string;
  label: string;
  category: string;
  icon: string;
  action: () => void;
  keywords: string[];
}

export default function CommandBar() {
  const { commandBarOpen, toggleCommandBar, setView, addMessage, setLoading, updateLastMessage, pushNotification, sessionId, setSessionId } = useNexusStore();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const COMMANDS: Command[] = [
    { id: "chat",         label: "Open Chat",               category: "Navigate", icon: "◈", keywords: ["chat","talk","message"], action: () => { setView("chat"); toggleCommandBar(); } },
    { id: "projects",     label: "Open Projects",           category: "Navigate", icon: "⬡", keywords: ["project","kanban","task"], action: () => { setView("projects"); toggleCommandBar(); } },
    { id: "research",     label: "Open Research",           category: "Navigate", icon: "◎", keywords: ["research","knowledge","oracle"], action: () => { setView("research"); toggleCommandBar(); } },
    { id: "career",       label: "Open Career",             category: "Navigate", icon: "⟁", keywords: ["career","compass","job"], action: () => { setView("career"); toggleCommandBar(); } },
    { id: "code",         label: "Open Code",               category: "Navigate", icon: "{}", keywords: ["code","forge","debug"], action: () => { setView("code"); toggleCommandBar(); } },
    { id: "telegram",     label: "Open Telegram",           category: "Navigate", icon: "✈", keywords: ["telegram","bot","mobile"], action: () => { setView("telegram"); toggleCommandBar(); } },
    { id: "settings",     label: "Open Settings",           category: "Navigate", icon: "⚙", keywords: ["settings","config"], action: () => { setView("settings" as any); toggleCommandBar(); } },
    { id: "brief",        label: "Morning Briefing (ATLAS)", category: "Agent",   icon: "☀️", keywords: ["brief","morning","atlas"], action: () => quickAsk("Give me my morning briefing") },
    { id: "focus",        label: "What to focus on now",    category: "Agent",    icon: "🎯", keywords: ["focus","priority","now"], action: () => quickAsk("What single thing should I focus on right now?") },
    { id: "skill-gap",    label: "Skill Gap Analysis",      category: "Agent",    icon: "📊", keywords: ["skill","gap","career"], action: () => quickAsk("Analyze my skill gap for Senior ML Engineer") },
    { id: "github-sync",  label: "Sync GitHub Issues",      category: "Agent",    icon: "⬡", keywords: ["github","sync","issues"], action: () => quickAsk("sync github and show open issues") },
    { id: "review",       label: "Code Review Mode",        category: "Agent",    icon: "💻", keywords: ["review","code","forge"], action: () => quickAsk("I need a code review") },
    { id: "research-q",   label: "Search Knowledge Base",   category: "Agent",    icon: "🔬", keywords: ["search","knowledge","oracle"], action: () => quickAsk("Search my knowledge base for:") },
    { id: "clear-chat",   label: "Clear Chat History",      category: "System",   icon: "🗑", keywords: ["clear","reset","history"], action: () => { useNexusStore.getState().clearChat(); toggleCommandBar(); pushNotification({ type: "info", title: "Chat Cleared", body: "Conversation history reset" }); } },
  ];

  const quickAsk = async (msg: string) => {
    toggleCommandBar();
    setView("chat");
    setTimeout(async () => {
      addMessage({ role: "user", content: msg, agent: "NEXUS" });
      addMessage({ role: "assistant", content: "", agent: "NEXUS", isStreaming: true });
      setLoading(true);
      try {
        const data = await sendChat(msg, sessionId ?? undefined);
        if (!sessionId) setSessionId(data.session_id);
        updateLastMessage(data.response);
      } catch {
        updateLastMessage("⚠️ Backend offline");
      } finally {
        setLoading(false);
      }
    }, 200);
  };

  const filtered = query.trim()
    ? COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.keywords.some((k) => k.includes(query.toLowerCase()))
      )
    : COMMANDS;

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); toggleCommandBar(); }
      if (e.key === "Escape" && commandBarOpen) toggleCommandBar();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandBarOpen]);

  useEffect(() => {
    if (commandBarOpen) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [commandBarOpen]);

  if (!commandBarOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={toggleCommandBar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9995, backdropFilter: "blur(4px)" }} />

      {/* Command palette */}
      <div className="anim-fade-in" style={{
        position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: "560px", maxWidth: "calc(100vw - 48px)", zIndex: 9996,
        background: "var(--surface)", border: "1px solid var(--border2)",
        borderRadius: "10px", boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--accent)", fontSize: "18px", fontFamily: "var(--font-mono)" }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length > 0) filtered[0].action();
            }}
            placeholder="Type a command or search..."
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "15px", color: "var(--text)", fontFamily: "var(--font-body)" }}
          />
          <div className="mono-label" style={{ flexShrink: 0 }}>ESC</div>
        </div>

        {/* Results */}
        <div style={{ maxHeight: "380px", overflowY: "auto", padding: "8px" }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px", color: "var(--text-dim)" }}>
              <div className="mono-label">NO COMMANDS FOUND</div>
            </div>
          )}
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category} style={{ marginBottom: "8px" }}>
              <div className="mono-label" style={{ padding: "6px 10px", marginBottom: "4px" }}>{category}</div>
              {cmds.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px", width: "100%",
                    padding: "10px 12px", borderRadius: "6px",
                    background: "transparent", border: "1px solid transparent",
                    color: "var(--text-mid)", fontSize: "13px",
                    transition: "all 0.1s", textAlign: "left",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-lo)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
                >
                  <span style={{ fontSize: "16px", flexShrink: 0, width: "24px", textAlign: "center" }}>{cmd.icon}</span>
                  <span style={{ flex: 1 }}>{cmd.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: "16px" }}>
          <span className="mono-label">↵ SELECT</span>
          <span className="mono-label">ESC CLOSE</span>
          <span className="mono-label">⌘K TOGGLE</span>
        </div>
      </div>
    </>
  );
}
