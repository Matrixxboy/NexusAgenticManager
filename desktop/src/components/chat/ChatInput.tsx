import { useState, useRef, KeyboardEvent } from "react";
import { useNexusStore } from "../../store/nexusStore";
import { sendChat } from "../../lib/api";

export default function ChatInput() {
  const [value, setValue] = useState("");
  const { addMessage, setLoading, isLoading, sessionId, setSessionId } = useNexusStore();
  const textRef = useRef<HTMLTextAreaElement>(null);

  const submit = async () => {
    const msg = value.trim();
    if (!msg || isLoading) return;
    setValue("");

    addMessage({ role: "user", content: msg, agent: "NEXUS" });
    setLoading(true);

    try {
      const data = await sendChat(msg, sessionId ?? undefined);
      if (!sessionId) setSessionId(data.session_id);
      addMessage({ role: "assistant", content: data.response, agent: data.agent });
    } catch (err) {
      addMessage({
        role: "assistant",
        content: "⚠️ Backend offline. Make sure `uvicorn api.main:app --reload` is running.",
        agent: "NEXUS",
      });
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="px-6 py-4 border-t border-white/5 shrink-0">
      <div className="flex gap-3 items-end bg-surface border border-white/8 rounded-md p-3
                      focus-within:border-accent/40 transition-colors">
        <textarea
          ref={textRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder="Talk to NEXUS... (Enter to send, Shift+Enter for newline)"
          rows={1}
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm text-text placeholder:text-text-dim
                     resize-none outline-none leading-relaxed max-h-32 overflow-y-auto
                     disabled:opacity-50"
          style={{ minHeight: "24px" }}
        />
        <button
          onClick={submit}
          disabled={!value.trim() || isLoading}
          className="w-8 h-8 rounded-md bg-accent/80 hover:bg-accent flex items-center justify-center
                     text-white text-sm font-bold transition-all shrink-0
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isLoading ? "⋯" : "↑"}
        </button>
      </div>
      <div className="font-mono text-[9px] text-text-dim mt-1.5 text-center tracking-widest">
        LOCAL-FIRST · HYBRID ROUTING · YOUR DATA STAYS LOCAL
      </div>
    </div>
  );
}
