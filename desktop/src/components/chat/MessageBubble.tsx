import { Message } from "../../store/nexusStore";

const AGENT_COLORS: Record<string, string> = {
  NEXUS:   "text-accent",
  ATLAS:   "text-purple-400",
  ORACLE:  "text-cyan-400",
  COMPASS: "text-amber-400",
  FORGE:   "text-emerald-400",
};

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-sm font-bold
                        ${isUser ? "bg-white/10 text-text" : "bg-accent/20 border border-accent/30"}`}>
        {isUser ? "U" : "N"}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!isUser && (
          <span className={`font-mono text-[9px] tracking-widest ${AGENT_COLORS[message.agent] || "text-text-dim"}`}>
            {message.agent}
          </span>
        )}
        <div className={`px-4 py-3 rounded-md text-sm leading-relaxed whitespace-pre-wrap
                          ${isUser
                            ? "bg-accent/20 border border-accent/30 text-text"
                            : "bg-surface border border-white/5 text-text-mid"
                          }`}>
          {message.content}
        </div>
        <span className="font-mono text-[9px] text-text-dim">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
