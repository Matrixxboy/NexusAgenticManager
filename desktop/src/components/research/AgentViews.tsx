import { useState } from "react";
import { useNexusStore } from "../../store/nexusStore";
import { searchKnowledge, ingestContent, buildLearningPath, skillGapAnalysis, trackGoals, analyzeJob } from "../../lib/api";

// ── Research View (ORACLE) ──────────────────────────────────────
export function ResearchView() {
  const { pushNotification } = useNexusStore();
  const [tab, setTab] = useState<"search"|"ingest"|"learning">("search");
  const [query, setQuery] = useState(""); const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ingest, setIngest] = useState({ title: "", source: "", content: "", tags: "" });
  const [topic, setTopic] = useState("");

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try { const r = await searchKnowledge(query); setResult(r); }
    catch { pushNotification({ type: "error", title: "Search Failed", body: "Backend offline?" }); }
    finally { setLoading(false); }
  };

  const doIngest = async () => {
    if (!ingest.content.trim() || !ingest.title.trim()) return;
    setLoading(true);
    try {
      const r = await ingestContent({ ...ingest, tags: ingest.tags.split(",").map((t) => t.trim()).filter(Boolean) });
      pushNotification({ type: "success", title: "Knowledge Saved", body: r.output || "Content ingested", agent: "ORACLE" });
      setIngest({ title: "", source: "", content: "", tags: "" });
    } catch { pushNotification({ type: "error", title: "Ingest Failed", body: "Backend offline?" }); }
    finally { setLoading(false); }
  };

  const doLearningPath = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try { const r = await buildLearningPath(topic); setResult(r); }
    catch { pushNotification({ type: "error", title: "Failed", body: "Backend offline?" }); }
    finally { setLoading(false); }
  };

  const TABS = [{ key: "search", label: "Search KB" }, { key: "ingest", label: "Add Knowledge" }, { key: "learning", label: "Learning Path" }];

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", background: "var(--surface)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "17px", flex: 1 }}>ORACLE — Research Agent</div>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{ padding: "6px 14px", borderRadius: "4px", fontSize: "12px", fontFamily: "var(--font-mono)", letterSpacing: "1px", background: tab === t.key ? "var(--cyan-lo)" : "transparent", border: `1px solid ${tab === t.key ? "var(--cyan)" : "var(--border)"}`, color: tab === t.key ? "var(--cyan)" : "var(--text-dim)" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "24px", maxWidth: "720px", margin: "0 auto", width: "100%" }}>
        {tab === "search" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="Search your knowledge base..." style={{ flex: 1, padding: "12px 14px", fontSize: "14px" }} />
              <button onClick={doSearch} disabled={loading} style={{ padding: "12px 24px", borderRadius: "6px", background: "var(--cyan)", border: "none", color: "var(--bg)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: 700 }}>
                {loading ? "..." : "SEARCH"}
              </button>
            </div>
            {result && <ResultCard result={result} />}
          </div>
        )}
        {tab === "ingest" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="mono-label">ADD CONTENT TO KNOWLEDGE BASE</div>
            <input value={ingest.title} onChange={(e) => setIngest({ ...ingest, title: e.target.value })} placeholder="Title / Name" style={{ padding: "10px 12px" }} />
            <input value={ingest.source} onChange={(e) => setIngest({ ...ingest, source: e.target.value })} placeholder="Source URL or reference" style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "12px" }} />
            <textarea value={ingest.content} onChange={(e) => setIngest({ ...ingest, content: e.target.value })} placeholder="Paste content, notes, or article text..." rows={8} style={{ padding: "12px", resize: "none" }} />
            <input value={ingest.tags} onChange={(e) => setIngest({ ...ingest, tags: e.target.value })} placeholder="Tags (comma separated): ml, papers, architecture" style={{ padding: "10px 12px" }} />
            <button onClick={doIngest} disabled={loading} style={{ padding: "12px", borderRadius: "6px", background: "var(--cyan)", border: "none", color: "var(--bg)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: 700 }}>
              {loading ? "SAVING..." : "SAVE TO KNOWLEDGE BASE"}
            </button>
          </div>
        )}
        {tab === "learning" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="mono-label">GENERATE LEARNING PATH</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLearningPath()} placeholder="e.g. Transformer architecture, RAG systems, Computer Vision" style={{ flex: 1, padding: "12px 14px" }} />
              <button onClick={doLearningPath} disabled={loading} style={{ padding: "12px 24px", borderRadius: "6px", background: "var(--cyan)", border: "none", color: "var(--bg)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: 700 }}>
                {loading ? "..." : "BUILD PATH"}
              </button>
            </div>
            {result && <ResultCard result={result} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Career View (COMPASS) ───────────────────────────────────────
export function CareerView() {
  const { pushNotification } = useNexusStore();
  const [tab, setTab] = useState<"goals"|"skillgap"|"job">("goals");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [targetRole, setTargetRole] = useState("Senior AI/ML Engineer");
  const [timeline, setTimeline] = useState("6 months");
  const [job, setJob] = useState({ title: "", company: "", description: "" });

  const doGoals = async () => {
    setLoading(true);
    try { setResult(await trackGoals()); }
    catch { pushNotification({ type: "error", title: "Error", body: "Backend offline?" }); }
    finally { setLoading(false); }
  };

  const doSkillGap = async () => {
    setLoading(true);
    try { setResult(await skillGapAnalysis(targetRole, timeline)); }
    catch { pushNotification({ type: "error", title: "Error", body: "Backend offline?" }); }
    finally { setLoading(false); }
  };

  const doJobAnalysis = async () => {
    if (!job.title || !job.description) return;
    setLoading(true);
    try { setResult(await analyzeJob(job)); }
    catch { pushNotification({ type: "error", title: "Error", body: "Backend offline?" }); }
    finally { setLoading(false); }
  };

  const TABS = [{ key: "goals", label: "Goal Tracking" }, { key: "skillgap", label: "Skill Gap" }, { key: "job", label: "Job Analysis" }];

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", background: "var(--surface)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "17px", flex: 1 }}>COMPASS — Career Agent</div>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{ padding: "6px 14px", borderRadius: "4px", fontSize: "12px", fontFamily: "var(--font-mono)", letterSpacing: "1px", background: tab === t.key ? "var(--amber-lo)" : "transparent", border: `1px solid ${tab === t.key ? "var(--amber)" : "var(--border)"}`, color: tab === t.key ? "var(--amber)" : "var(--text-dim)" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "24px", maxWidth: "720px", margin: "0 auto", width: "100%" }}>
        {tab === "goals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="mono-label">CAREER GOAL TRACKING — COMPASS ANALYSIS</div>
            <button onClick={doGoals} disabled={loading} style={{ padding: "12px 24px", borderRadius: "6px", background: "var(--amber)", border: "none", color: "var(--bg)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: 700, width: "fit-content" }}>
              {loading ? "ANALYZING..." : "RUN GOAL ANALYSIS"}
            </button>
            {result && <ResultCard result={result} />}
          </div>
        )}
        {tab === "skillgap" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="mono-label">SKILL GAP ANALYSIS</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 2 }}>
                <div className="mono-label" style={{ marginBottom: "6px" }}>TARGET ROLE</div>
                <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
                  <option>Senior AI/ML Engineer</option>
                  <option>Computer Vision Engineer</option>
                  <option>AI Research Engineer</option>
                  <option>ML Systems Engineer</option>
                  <option>Applied Scientist</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div className="mono-label" style={{ marginBottom: "6px" }}>TIMELINE</div>
                <select value={timeline} onChange={(e) => setTimeline(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
                  <option>3 months</option><option>6 months</option><option>1 year</option><option>2 years</option>
                </select>
              </div>
            </div>
            <button onClick={doSkillGap} disabled={loading} style={{ padding: "12px 24px", borderRadius: "6px", background: "var(--amber)", border: "none", color: "var(--bg)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: 700, width: "fit-content" }}>
              {loading ? "ANALYZING..." : "ANALYZE SKILL GAP"}
            </button>
            {result && <ResultCard result={result} />}
          </div>
        )}
        {tab === "job" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="mono-label">JOB POSTING ANALYSIS</div>
            <input value={job.title} onChange={(e) => setJob({ ...job, title: e.target.value })} placeholder="Job Title" style={{ padding: "10px 12px" }} />
            <input value={job.company} onChange={(e) => setJob({ ...job, company: e.target.value })} placeholder="Company Name" style={{ padding: "10px 12px" }} />
            <textarea value={job.description} onChange={(e) => setJob({ ...job, description: e.target.value })} placeholder="Paste full job description here..." rows={8} style={{ padding: "12px", resize: "none" }} />
            <button onClick={doJobAnalysis} disabled={loading} style={{ padding: "12px 24px", borderRadius: "6px", background: "var(--amber)", border: "none", color: "var(--bg)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: 700, width: "fit-content" }}>
              {loading ? "ANALYZING..." : "ANALYZE JOB FIT"}
            </button>
            {result && <ResultCard result={result} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Code View (FORGE) ───────────────────────────────────────────
export function CodeView() {
  const { pushNotification } = useNexusStore();
  const [tab, setTab] = useState<"review"|"debug"|"boilerplate">("review");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [code, setCode] = useState(""); const [lang, setLang] = useState("python");
  const [error, setError] = useState("");
  const [bpDesc, setBpDesc] = useState(""); const [bpStack, setBpStack] = useState("Python + FastAPI");

  const LANGS = ["python","typescript","javascript","rust","php","sql","bash"];
  const TABS = [{ key: "review", label: "Code Review" }, { key: "debug", label: "Debug" }, { key: "boilerplate", label: "Generate" }];

  const doReview = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try { const { reviewCode } = await import("../../lib/api"); setResult(await reviewCode(code, lang)); }
    catch { pushNotification({ type: "error", title: "Error", body: "Backend offline?" }); }
    finally { setLoading(false); }
  };

  const doDebug = async () => {
    if (!error.trim() || !code.trim()) return;
    setLoading(true);
    try { const { debugCode } = await import("../../lib/api"); setResult(await debugCode(error, code, lang)); }
    catch { pushNotification({ type: "error", title: "Error", body: "Backend offline?" }); }
    finally { setLoading(false); }
  };

  const doBoilerplate = async () => {
    if (!bpDesc.trim()) return;
    setLoading(true);
    try { const { generateBoilerplate } = await import("../../lib/api"); setResult(await generateBoilerplate(bpDesc, bpStack)); }
    catch { pushNotification({ type: "error", title: "Error", body: "Backend offline?" }); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", background: "var(--surface)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "17px", flex: 1 }}>FORGE — Code Agent</div>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{ padding: "6px 14px", borderRadius: "4px", fontSize: "12px", fontFamily: "var(--font-mono)", letterSpacing: "1px", background: tab === t.key ? "var(--emerald-lo)" : "transparent", border: `1px solid ${tab === t.key ? "var(--emerald)" : "var(--border)"}`, color: tab === t.key ? "var(--emerald)" : "var(--text-dim)" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "24px", display: "flex", gap: "24px" }}>
        {/* Input panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="mono-label">LANGUAGE</div>
            <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ padding: "6px 10px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
              {LANGS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          {tab === "debug" && (
            <textarea value={error} onChange={(e) => setError(e.target.value)} placeholder="Paste error / traceback here..." rows={4} style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "12px", resize: "vertical", borderColor: "var(--rose)" }} />
          )}
          {tab !== "boilerplate" ? (
            <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste your code here..." rows={14} style={{ flex: 1, padding: "12px", fontFamily: "var(--font-mono)", fontSize: "12px", resize: "vertical" }} />
          ) : (
            <>
              <input value={bpDesc} onChange={(e) => setBpDesc(e.target.value)} placeholder="What to generate? e.g. FastAPI CRUD endpoint for User model" style={{ padding: "10px 12px" }} />
              <select value={bpStack} onChange={(e) => setBpStack(e.target.value)} style={{ padding: "10px 12px", fontSize: "13px" }}>
                <option>Python + FastAPI</option>
                <option>React + TypeScript</option>
                <option>React + Tailwind</option>
                <option>Python + LangChain</option>
                <option>Node.js + Express</option>
              </select>
            </>
          )}
          <button
            onClick={tab === "review" ? doReview : tab === "debug" ? doDebug : doBoilerplate}
            disabled={loading}
            style={{ padding: "12px 24px", borderRadius: "6px", background: "var(--emerald)", border: "none", color: "var(--bg)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: 700 }}
          >
            {loading ? "ANALYZING..." : tab === "review" ? "REVIEW CODE" : tab === "debug" ? "DEBUG ERROR" : "GENERATE"}
          </button>
        </div>

        {/* Result panel */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {result ? <ResultCard result={result} /> : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: "32px", marginBottom: "10px" }}>💻</div><div className="mono-label">RESULT APPEARS HERE</div></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared Result Card ──────────────────────────────────────────
function ResultCard({ result }: { result: any }) {
  const output = result?.output || result?.response || JSON.stringify(result, null, 2);
  const agent = result?.agent;
  const AGENT_COLORS: Record<string, string> = { ORACLE: "var(--cyan)", COMPASS: "var(--amber)", FORGE: "var(--emerald)", ATLAS: "#a78bfa", NEXUS: "var(--accent)" };

  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
      {agent && (
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: AGENT_COLORS[agent] || "var(--accent)" }} />
          <span className="mono-label" style={{ color: AGENT_COLORS[agent] || "var(--accent)" }}>{agent} RESPONSE</span>
        </div>
      )}
      <div style={{ padding: "16px", fontSize: "13px", color: "var(--text-mid)", lineHeight: 1.8, whiteSpace: "pre-wrap", overflowX: "auto", maxHeight: "500px", overflowY: "auto" }}>
        {output}
      </div>
    </div>
  );
}
