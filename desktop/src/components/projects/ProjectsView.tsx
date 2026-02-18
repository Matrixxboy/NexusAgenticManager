import { useState, useEffect } from "react";
import { useNexusStore } from "../../store/nexusStore";
import { getProjects, createProject, getTasks, updateTaskStatus, syncGithub } from "../../lib/api";

const STATUS_COLS = [
  { key: "todo",        label: "To Do",       color: "var(--text-dim)" },
  { key: "in_progress", label: "In Progress",  color: "var(--accent)" },
  { key: "blocked",     label: "Blocked",      color: "var(--rose)" },
  { key: "done",        label: "Done",         color: "var(--emerald)" },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "var(--rose)", high: "var(--amber)",
  medium: "var(--accent)", low: "var(--text-dim)",
};

const PROJECT_ICONS = ["🔮", "🪐", "🤖", "🎤", "🧠", "🌐", "🔐", "⚡", "🛸", "🎯"];

export default function ProjectsView() {
  const { projects, tasks, activeProjectId, setProjects, setTasks, setActiveProject, pushNotification } = useNexusStore();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", github_repo: "" });
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" });
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (activeProjectId) loadTasks(activeProjectId); }, [activeProjectId]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0 && !activeProjectId) setActiveProject(data[0].id);
    } catch { pushNotification({ type: "error", title: "Projects Error", body: "Could not load projects" }); }
    finally { setLoading(false); }
  };

  const loadTasks = async (pid: number) => {
    try { setTasks(await getTasks(pid)); }
    catch { pushNotification({ type: "error", title: "Tasks Error", body: "Could not load tasks" }); }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;
    try {
      const p = await createProject(newProject);
      setProjects([...projects, p]);
      setActiveProject(p.id);
      setNewProject({ name: "", description: "", github_repo: "" });
      setShowNewProject(false);
      pushNotification({ type: "success", title: "Project Created", body: newProject.name, agent: "ATLAS" });
    } catch { pushNotification({ type: "error", title: "Error", body: "Could not create project" }); }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !activeProjectId) return;
    try {
      const { createTask } = await import("../../lib/api");
      const t = await createTask({ project_id: activeProjectId, ...newTask });
      setTasks([...tasks, t]);
      setNewTask({ title: "", description: "", priority: "medium" });
      setShowNewTask(false);
      pushNotification({ type: "success", title: "Task Added", body: newTask.title, agent: "ATLAS" });
    } catch { pushNotification({ type: "error", title: "Error", body: "Could not create task" }); }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      setTasks(tasks.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch { }
  };

  const handleSyncGithub = async () => {
    setSyncing(true);
    try {
      const result = await syncGithub();
      pushNotification({ type: "info", title: "GitHub Synced", body: result.response?.slice(0, 80) || "Sync complete", agent: "ATLAS" });
    } catch { pushNotification({ type: "error", title: "Sync Failed", body: "GitHub not configured" }); }
    finally { setSyncing(false); }
  };

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const tasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, background: "var(--surface)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "17px", letterSpacing: "1px", flex: 1 }}>
          ATLAS — Project Manager
        </div>
        <button onClick={() => setShowNewProject(true)} style={{ padding: "7px 14px", borderRadius: "5px", fontSize: "12px", fontFamily: "var(--font-mono)", letterSpacing: "1px", background: "var(--accent-lo)", border: "1px solid var(--border2)", color: "var(--accent)" }}>
          + PROJECT
        </button>
        <button onClick={handleSyncGithub} disabled={syncing} style={{ padding: "7px 14px", borderRadius: "5px", fontSize: "12px", fontFamily: "var(--font-mono)", letterSpacing: "1px", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-dim)", transition: "all 0.15s" }}>
          {syncing ? "⟳ SYNCING..." : "⬡ GITHUB"}
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Projects sidebar */}
        <div style={{ width: "220px", borderRight: "1px solid var(--border)", overflowY: "auto", background: "var(--surface)", flexShrink: 0 }}>
          <div style={{ padding: "12px 14px" }}>
            <div className="mono-label" style={{ marginBottom: "10px" }}>ACTIVE PROJECTS</div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[1,2,3].map((i) => <div key={i} className="shimmer" style={{ height: "48px", borderRadius: "6px" }} />)}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {projects.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProject(p.id)}
                    style={{
                      padding: "10px 12px", borderRadius: "6px", textAlign: "left", width: "100%",
                      background: activeProjectId === p.id ? "var(--accent-lo)" : "transparent",
                      border: `1px solid ${activeProjectId === p.id ? "var(--border2)" : "transparent"}`,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px" }}>{PROJECT_ICONS[i % PROJECT_ICONS.length]}</span>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: activeProjectId === p.id ? "var(--accent)" : "var(--text)", lineHeight: 1.3 }}>{p.name}</div>
                        <div className="mono-label" style={{ fontSize: "8px", marginTop: "2px" }}>{p.status}</div>
                      </div>
                    </div>
                  </button>
                ))}
                {projects.length === 0 && (
                  <div style={{ color: "var(--text-dim)", fontSize: "12px", padding: "12px 0", textAlign: "center" }}>
                    No projects yet.<br />Create your first one.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Kanban board */}
        <div style={{ flex: 1, overflowX: "auto", padding: "20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
          {!activeProject ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>⬡</div>
                <div className="mono-label">SELECT OR CREATE A PROJECT</div>
              </div>
            </div>
          ) : (
            <>
              {STATUS_COLS.map((col) => (
                <div key={col.key} style={{ width: "260px", flexShrink: 0 }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async () => { if (dragging != null) { await handleStatusChange(dragging, col.key); setDragging(null); } }}
                >
                  {/* Column header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", padding: "8px 12px", borderRadius: "5px", background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", flex: 1 }}>{col.label}</span>
                    <span className="mono-label">{tasksByStatus(col.key).length}</span>
                  </div>

                  {/* Tasks */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", minHeight: "120px" }}>
                    {tasksByStatus(col.key).map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDragging(task.id)}
                        style={{
                          padding: "12px 14px", borderRadius: "6px",
                          background: "var(--surface2)", border: "1px solid var(--border)",
                          cursor: "grab", transition: "all 0.15s",
                          opacity: dragging === task.id ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
                      >
                        <div style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.4, marginBottom: "8px" }}>
                          {task.title}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{
                            fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "1px",
                            padding: "2px 7px", borderRadius: "2px", textTransform: "uppercase",
                            color: PRIORITY_COLORS[task.priority] || "var(--text-dim)",
                            background: `${PRIORITY_COLORS[task.priority] || "var(--text-dim)"}15`,
                            border: `1px solid ${PRIORITY_COLORS[task.priority] || "var(--text-dim)"}30`,
                          }}>{task.priority}</span>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {STATUS_COLS.filter((c) => c.key !== col.key).map((c) => (
                              <button key={c.key} onClick={() => handleStatusChange(task.id, c.key)}
                                title={`Move to ${c.label}`}
                                style={{ width: "18px", height: "18px", borderRadius: "3px", background: `${c.color}15`, border: `1px solid ${c.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: c.color }} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add task in To Do column */}
                    {col.key === "todo" && (
                      <button
                        onClick={() => setShowNewTask(true)}
                        style={{ padding: "10px", borderRadius: "6px", border: "1px dashed var(--border)", color: "var(--text-dim)", fontSize: "12px", background: "transparent", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
                      >+ Add Task</button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="anim-fade-in" style={{ width: "440px", background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: "8px", padding: "28px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}>New Project</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <div className="mono-label" style={{ marginBottom: "6px" }}>PROJECT NAME</div>
                <input value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} placeholder="e.g. Palm Reading AI" style={{ width: "100%", padding: "10px 12px", fontSize: "13px" }} />
              </div>
              <div>
                <div className="mono-label" style={{ marginBottom: "6px" }}>DESCRIPTION</div>
                <textarea value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} rows={2} placeholder="What is this project?" style={{ width: "100%", padding: "10px 12px", fontSize: "13px", resize: "none" }} />
              </div>
              <div>
                <div className="mono-label" style={{ marginBottom: "6px" }}>GITHUB REPO (optional)</div>
                <input value={newProject.github_repo} onChange={(e) => setNewProject({ ...newProject, github_repo: e.target.value })} placeholder="username/repo-name" style={{ width: "100%", padding: "10px 12px", fontSize: "13px", fontFamily: "var(--font-mono)" }} />
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button onClick={() => setShowNewProject(false)} style={{ padding: "9px 18px", borderRadius: "5px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)", fontSize: "13px" }}>Cancel</button>
                <button onClick={handleCreateProject} style={{ padding: "9px 18px", borderRadius: "5px", background: "var(--accent)", border: "none", color: "white", fontSize: "13px", fontFamily: "var(--font-mono)", letterSpacing: "1px" }}>CREATE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="anim-fade-in" style={{ width: "400px", background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: "8px", padding: "28px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}>Add Task</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title..." style={{ width: "100%", padding: "10px 12px", fontSize: "13px" }} />
              <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={2} placeholder="Description..." style={{ width: "100%", padding: "10px 12px", fontSize: "13px", resize: "none" }} />
              <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} style={{ width: "100%", padding: "10px 12px", fontSize: "13px" }}>
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button onClick={() => setShowNewTask(false)} style={{ padding: "9px 18px", borderRadius: "5px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)", fontSize: "13px" }}>Cancel</button>
                <button onClick={handleCreateTask} style={{ padding: "9px 18px", borderRadius: "5px", background: "var(--accent)", border: "none", color: "white", fontSize: "13px" }}>ADD TASK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
