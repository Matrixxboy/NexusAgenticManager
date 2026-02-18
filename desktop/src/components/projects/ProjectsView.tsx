import { useState, useEffect } from "react"
import { useNexusStore, Project } from "../../store/nexusStore"
import {
  getProjects,
  createProject,
  deleteProject,
  getTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  deleteTask,
  syncGithub,
} from "../../lib/api"

const STATUS_COLS = [
  { key: "todo", label: "To Do", color: "var(--text-dim)" },
  { key: "in_progress", label: "In Progress", color: "var(--accent)" },
  { key: "blocked", label: "Blocked", color: "var(--rose)" },
  { key: "done", label: "Done", color: "var(--emerald)" },
]

const PRIORITY_COLORS: Record<string, string> = {
  critical: "var(--rose)",
  high: "var(--amber)",
  medium: "var(--accent)",
  low: "var(--text-dim)",
}

const PROJECT_ICONS = [
  "🔮",
  "🪐",
  "🤖",
  "🎤",
  "🧠",
  "🌐",
  "🔐",
  "⚡",
  "🛸",
  "🎯",
]

export default function ProjectsView() {
  const {
    projects,
    tasks,
    activeProjectId,
    setProjects,
    setTasks,
    setActiveProject,
    pushNotification,
  } = useNexusStore()
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Edit Task State
  const [editingTask, setEditingTask] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium",
  })

  // New Project State
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    github_repo: "",
  })

  // Delete Project State
  const [showDeleteProject, setShowDeleteProject] = useState(false)
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("")

  // Task State
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
  })
  const [dragging, setDragging] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])
  useEffect(() => {
    if (activeProjectId) loadTasks(activeProjectId)
  }, [activeProjectId])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const data = await getProjects()
      console.log("Loaded projects data:", data)
      setProjects(data)
      if (data.length > 0 && !activeProjectId) {
        console.log("Setting active project to:", data[0]._id)
        setActiveProject(data[0]._id)
      }
    } catch {
      pushNotification({
        type: "error",
        title: "Projects Error",
        body: "Could not load projects",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async (pid: string) => {
    try {
      setTasks(await getTasks(pid))
    } catch {
      pushNotification({
        type: "error",
        title: "Tasks Error",
        body: "Could not load tasks",
      })
    }
  }

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return
    try {
      const p = await createProject(newProject)
      setProjects([...projects, p])
      setActiveProject(p._id)
      setNewProject({ name: "", description: "", github_repo: "" })
      setShowNewProject(false)
      pushNotification({
        type: "success",
        title: "Project Created",
        body: newProject.name,
        agent: "ATLAS",
      })
    } catch {
      pushNotification({
        type: "error",
        title: "Error",
        body: "Could not create project",
      })
    }
  }

  const handleDeleteProject = async () => {
    if (!activeProjectId) return
    const projectToDelete = projects.find((p) => p._id === activeProjectId)
    if (!projectToDelete) {
      return
    }

    if (deleteConfirmationName !== projectToDelete.name) {
      pushNotification({
        type: "error",
        title: "Validation Error",
        body: "Project name mismatch",
      })
      return
    }

    // DEBUG: Check if backend has new code
    try {
      const check = await fetch("/api/projects/debug/test_project")
      if (check.status === 404) {
        pushNotification({
          type: "error",
          title: "BACKEND RESTART REQUIRED",
          body: "The server is running old code. Please restart 'uvicorn' in your terminal.",
        })
        return
      }
    } catch (e) {
      // ignore network errors, proceed to try delete
    }

    try {
      await deleteProject(activeProjectId)
      setProjects(projects.filter((p) => p._id !== activeProjectId))
      setShowDeleteProject(false)
      setDeleteConfirmationName("")

      // Switch to another project if available
      const remaining = projects.filter((p) => p._id !== activeProjectId)
      if (remaining.length > 0) setActiveProject(remaining[0]._id)
      else setActiveProject(null)

      pushNotification({
        type: "success",
        title: "Project Deleted",
        body: projectToDelete.name,
      })
    } catch (e) {
      pushNotification({
        type: "error",
        title: "Error",
        body: "Could not delete project",
      })
    }
  }

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !activeProjectId) return
    try {
      const t = await createTask({ project_id: activeProjectId, ...newTask })
      setTasks([...tasks, t])
      setNewTask({ title: "", description: "", priority: "medium" })
      setShowNewTask(false)
      pushNotification({
        type: "success",
        title: "Task Added",
        body: newTask.title,
        agent: "ATLAS",
      })
    } catch (e) {
      pushNotification({
        type: "error",
        title: "Error",
        body: "Could not create task",
      })
    }
  }

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!taskId) {
      console.error("Attempted to delete task with undefined ID")
      pushNotification({
        type: "error",
        title: "Error",
        body: "Task ID is missing. Please refresh.",
      })
      return
    }
    if (!window.confirm("Are you sure you want to delete this task?")) return

    try {
      await deleteTask(taskId)
      setTasks(tasks.filter((t) => t.id !== taskId && t._id !== taskId)) // Filter by both just in case
      pushNotification({
        type: "info",
        title: "Task Deleted",
        body: "Task removed successfully",
      })
    } catch (e: any) {
      console.error("Delete task failed:", e)
      pushNotification({
        type: "error",
        title: "Error",
        body: e.message || "Could not delete task",
      })
    }
  }

  const handleOpenEditTask = (task: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTask(task)
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
    })
  }

  const handleUpdateTask = async () => {
    if (!editingTask || !editForm.title.trim()) return

    const robustId = editingTask.id || editingTask._id
    if (!robustId) return

    try {
      const updated = await updateTask(robustId, {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
      })

      setTasks(
        tasks.map((t) =>
          t.id === robustId || t._id === robustId ? updated : t,
        ),
      )
      setEditingTask(null)
      pushNotification({
        type: "success",
        title: "Task Updated",
        body: "Task details saved",
      })
    } catch (e: any) {
      pushNotification({
        type: "error",
        title: "Update Failed",
        body: e.message || "Could not update task",
      })
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus)
      setTasks(
        tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      )
    } catch (e) {}
  }

  const handleSyncGithub = async () => {
    setSyncing(true)
    try {
      const result = await syncGithub()
      pushNotification({
        type: "info",
        title: "GitHub Synced",
        body: result.response?.slice(0, 80) || "Sync complete",
        agent: "ATLAS",
      })
    } catch {
      pushNotification({
        type: "error",
        title: "Sync Failed",
        body: "GitHub not configured",
      })
    } finally {
      setSyncing(false)
    }
  }

  // --- UI Helpers ---

  // Calculate project progress based on active tasks (purely frontend calculation for demo)
  const getProjectProgress = (pid: string) => {
    // In a real app we might store this on the project or calc from all tasks if we had them all loaded.
    // For now, if we have tasks loaded for THIS project, we can show accurate progress.
    // Otherwise return a placeholder or 0.
    if (activeProjectId === pid && tasks.length > 0) {
      const done = tasks.filter((t) => t.status === "done").length
      return Math.round((done / tasks.length) * 100)
    }
    return 0
  }

  const activeProject = projects.find((p) => p._id === activeProjectId)
  const tasksByStatus = (status: string) =>
    tasks.filter((t) => t.status === status)

  const ProjectCard = ({ p, i }: { p: Project; i: number }) => {
    const isActive = activeProjectId === p._id
    // Approximate progress if not active (random for visual demo if not loaded)
    const progress = isActive
      ? getProjectProgress(p._id)
      : Math.floor(Math.random() * 60) + 10

    return (
      <button
        key={p._id}
        onClick={() => setActiveProject(p._id)}
        className="nx-card"
        style={{
          width: "100%",
          padding: "16px",
          textAlign: "left",
          background: isActive ? "var(--surface2)" : "rgba(255,255,255,0.02)",
          borderColor: isActive ? "var(--accent)" : "transparent",
          marginBottom: "10px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <div
            style={{
              fontSize: "24px",
              background: "var(--surface)",
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--border)",
            }}
          >
            {PROJECT_ICONS[i % PROJECT_ICONS.length]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: isActive ? "var(--text)" : "var(--text-dim)",
              }}
            >
              {p.name}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-dim)",
                marginTop: "2px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                className={`status-dot ${p.status === "active" ? "status-online" : "status-offline"}`}
              />
              {p.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            className="progress-bar"
            style={{ flex: 1, background: "var(--bg)" }}
          >
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
                background: isActive
                  ? "linear-gradient(90deg, var(--accent), var(--cyan))"
                  : "var(--border2)",
              }}
            />
          </div>
          <div className="mono-label" style={{ fontSize: "9px" }}>
            {progress}%
          </div>
        </div>

        {isActive && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              borderTop: "8px solid var(--accent)",
              borderLeft: "8px solid transparent",
            }}
          />
        )}
      </button>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      {/* Top Bar */}
      <div
        className="glass"
        style={{
          padding: "0 24px",
          height: "60px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "var(--accent-lo)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
            }}
          >
            ⬡
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "18px",
              letterSpacing: "1px",
            }}
          >
            PROJECTS
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleSyncGithub}
            disabled={syncing}
            style={{
              height: "32px",
              padding: "0 16px",
              borderRadius: "6px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text-dim)",
              transition: "all 0.2s",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "14px" }}>🐙</span>
            {syncing ? "SYNCING..." : "GITHUB"}
          </button>

          <button
            onClick={() => setShowNewProject(true)}
            style={{
              height: "32px",
              padding: "0 16px",
              borderRadius: "6px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              background: "var(--accent)",
              border: "none",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 0 10px var(--accent-lo)",
            }}
          >
            + NEW PROJECT
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Projects Sidebar */}
        <div
          className="glass"
          style={{
            width: "280px",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
            <div
              className="mono-label"
              style={{ marginBottom: "16px", paddingLeft: "4px" }}
            >
              YOUR PROJECTS ({projects.length})
            </div>

            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--text-dim)",
                }}
              >
                <div
                  className="status-busy"
                  style={{
                    width: "10px",
                    height: "10px",
                    margin: "0 auto 10px",
                  }}
                />
                <span className="mono-label">LOADING...</span>
              </div>
            ) : projects.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  border: "1px dashed var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-dim)",
                  fontSize: "13px",
                }}
              >
                No projects found.
                <br />
                Create one to get started.
              </div>
            ) : (
              projects.map((p, i) => <ProjectCard key={p._id} p={p} i={i} />)
            )}

            {/* Quick Stats or something at bottom logic could go here */}
          </div>
        </div>

        {/* Main Content (Kanban) */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background:
              "radial-gradient(circle at top left, var(--surface2), transparent 40%)",
          }}
        >
          {!activeProject ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                color: "var(--text-dim)",
              }}
            >
              <div
                style={{ fontSize: "64px", marginBottom: "20px", opacity: 0.2 }}
              >
                ⬡
              </div>
              <div className="mono-label" style={{ fontSize: "14px" }}>
                SELECT A PROJECT TO VIEW BOARD
              </div>
            </div>
          ) : (
            <>
              {/* Hero Header */}
              <div style={{ padding: "30px 40px 10px", flexShrink: 0 }}>
                <div
                  className="anim-fade-up"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      className="mono-label"
                      style={{ color: "var(--accent)", marginBottom: "8px" }}
                    >
                      ACTIVE PROJECT
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "32px",
                        marginBottom: "8px",
                      }}
                    >
                      {activeProject.name}
                    </div>
                    <div
                      style={{
                        color: "var(--text-mid)",
                        maxWidth: "600px",
                        fontSize: "15px",
                        lineHeight: 1.6,
                      }}
                    >
                      {activeProject.description || "No description provided."}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <div className="mono-label">TASKS</div>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "32px",
                            fontWeight: 700,
                          }}
                        >
                          {tasks.length}
                        </div>
                      </div>

                      <button
                        onClick={() => setShowDeleteProject(true)}
                        style={{
                          marginTop: "8px",
                          fontSize: "11px",
                          color: "var(--rose)",
                          background: "transparent",
                          border: "1px solid var(--rose-lo)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="Delete Project"
                      >
                        🗑 DELETE PROJECT
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "24px",
                    height: "1px",
                    background: "var(--border)",
                  }}
                />
              </div>

              {/* Kanban Board */}
              <div
                style={{
                  flex: 1,
                  overflowX: "auto",
                  padding: "20px 40px 40px",
                  display: "flex",
                  gap: "24px",
                  alignItems: "flex-start",
                }}
              >
                {STATUS_COLS.map((col, i) => (
                  <div
                    key={col.key}
                    className="anim-fade-up"
                    style={{
                      width: "300px",
                      flexShrink: 0,
                      animationDelay: `${i * 0.1}s`,
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async () => {
                      if (dragging != null) {
                        await handleStatusChange(dragging, col.key)
                        setDragging(null)
                      }
                    }}
                  >
                    {/* Column Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px",
                        borderBottom: `2px solid ${col.color}40`,
                        marginBottom: "16px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          fontSize: "13px",
                          color: "var(--text-mid)",
                        }}
                      >
                        {col.label.toUpperCase()}
                      </span>
                      <span
                        style={{
                          background: "var(--surface2)",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "11px",
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {tasksByStatus(col.key).length}
                      </span>
                    </div>

                    {/* Tasks Container */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        minHeight: "200px",
                      }}
                    >
                      {tasksByStatus(col.key).map((task) => {
                        const robustId = task.id || task._id || ""
                        return (
                          <div
                            key={robustId}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", robustId)
                              setDragging(robustId)
                            }}
                            className="nx-card"
                            style={{
                              padding: "16px",
                              cursor: "grab",
                              opacity: dragging === robustId ? 0.5 : 1,
                              borderLeft: `3px solid ${PRIORITY_COLORS[task.priority]}`,
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: "8px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  lineHeight: 1.4,
                                  flex: 1,
                                }}
                              >
                                {task.title}
                              </div>
                              <button
                                onClick={(e) => handleOpenEditTask(task, e)}
                                style={{
                                  opacity: 0.4,
                                  padding: "4px",
                                  cursor: "pointer",
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--text-dim)",
                                  transition: "opacity 0.2s",
                                  marginRight: "4px",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.opacity = "1")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.opacity = "0.4")
                                }
                                title="Edit Task"
                              >
                                ✎
                              </button>
                              <button
                                onClick={(e) => handleDeleteTask(robustId, e)}
                                style={{
                                  opacity: 0.4,
                                  padding: "4px",
                                  cursor: "pointer",
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--text-dim)",
                                  transition: "opacity 0.2s",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.opacity = "1")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.opacity = "0.4")
                                }
                                title="Delete Task"
                              >
                                ✕
                              </button>
                            </div>
                            {task.description && (
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "var(--text-dim)",
                                  marginBottom: "12px",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {task.description}
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingTop: "8px",
                                borderTop: "1px solid var(--border)",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontFamily: "var(--font-mono)",
                                  color: PRIORITY_COLORS[task.priority],
                                  textTransform: "uppercase",
                                }}
                              >
                                {task.priority}
                              </span>

                              {/* Move Actions (Mini Dots) */}
                              <div style={{ display: "flex", gap: "4px" }}>
                                {STATUS_COLS.filter(
                                  (c) => c.key !== col.key,
                                ).map((c) => (
                                  <button
                                    key={c.key}
                                    onClick={() =>
                                      handleStatusChange(task.id, c.key)
                                    }
                                    title={`Move to ${c.label}`}
                                    style={{
                                      width: "8px",
                                      height: "8px",
                                      borderRadius: "50%",
                                      background: c.color,
                                      opacity: 0.3,
                                      cursor: "pointer",
                                      border: "none",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.opacity = "1")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.opacity = "0.3")
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Add Task Button (Only for To Do) */}
                      {col.key === "todo" && (
                        <button
                          onClick={() => setShowNewTask(true)}
                          style={{
                            padding: "12px",
                            border: "1px dashed var(--border)",
                            borderRadius: "6px",
                            background: "rgba(255,255,255,0.02)",
                            color: "var(--text-dim)",
                            fontSize: "12px",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--accent)"
                            e.currentTarget.style.color = "var(--accent)"
                            e.currentTarget.style.background =
                              "var(--accent-lo)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)"
                            e.currentTarget.style.color = "var(--text-dim)"
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.02)"
                          }}
                        >
                          + ADD TASK
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Project Modal (Reused Logic, Updated Style) */}
      {showNewProject && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="nx-card anim-fade-up"
            style={{
              width: "480px",
              padding: "32px",
              border: "1px solid var(--border2)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <h2 className="section-title" style={{ marginBottom: "24px" }}>
              New Project
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div>
                <label
                  className="mono-label"
                  style={{ display: "block", marginBottom: "8px" }}
                >
                  PROJECT NAME
                </label>
                <input
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  placeholder="e.g. Orbital Station Alpha"
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label
                  className="mono-label"
                  style={{ display: "block", marginBottom: "8px" }}
                >
                  DESCRIPTION
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Brief mission briefing..."
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    resize: "none",
                  }}
                />
              </div>
              <div>
                <label
                  className="mono-label"
                  style={{ display: "block", marginBottom: "8px" }}
                >
                  GITHUB REPO (OPTIONAL)
                </label>
                <input
                  value={newProject.github_repo}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      github_repo: e.target.value,
                    })
                  }
                  placeholder="username/repo"
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <button
                  onClick={() => setShowNewProject(false)}
                  style={{
                    padding: "10px 20px",
                    background: "transparent",
                    color: "var(--text-dim)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleCreateProject}
                  style={{
                    padding: "10px 24px",
                    background: "var(--accent)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  CREATE PROJECT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {showDeleteProject && activeProject && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            zIndex: 9050,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="nx-card anim-fade-up"
            style={{
              width: "480px",
              padding: "32px",
              border: "1px solid var(--rose)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              background: "#1a0b0b",
            }}
          >
            <h2
              className="section-title"
              style={{ marginBottom: "12px", color: "var(--rose)" }}
            >
              ⚠ Delete Project
            </h2>
            <div
              style={{
                marginBottom: "20px",
                color: "var(--text-mid)",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              This action cannot be undone. All tasks associated with{" "}
              <strong>{activeProject.name}</strong> will be permanently deleted.
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div>
                <label
                  className="mono-label"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "var(--rose)",
                  }}
                >
                  TYPE "{activeProject.name}" TO CONFIRM
                </label>
                <input
                  value={deleteConfirmationName}
                  onChange={(e) => setDeleteConfirmationName(e.target.value)}
                  placeholder={activeProject.name}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--rose)",
                    color: "var(--rose)",
                    fontWeight: 600,
                  }}
                  autoFocus
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <button
                  onClick={() => {
                    setShowDeleteProject(false)
                    setDeleteConfirmationName("")
                  }}
                  style={{
                    padding: "10px 20px",
                    background: "transparent",
                    color: "var(--text-dim)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={deleteConfirmationName !== activeProject.name}
                  style={{
                    padding: "10px 24px",
                    background:
                      deleteConfirmationName === activeProject.name
                        ? "var(--rose)"
                        : "rgba(255,255,255,0.05)",
                    color:
                      deleteConfirmationName === activeProject.name
                        ? "white"
                        : "rgba(255,255,255,0.2)",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor:
                      deleteConfirmationName === activeProject.name
                        ? "pointer"
                        : "not-allowed",
                    transition: "all 0.2s",
                  }}
                >
                  DELETE PROJECT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="nx-card anim-fade-up"
            style={{
              width: "440px",
              padding: "32px",
              border: "1px solid var(--border2)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <h2 className="section-title" style={{ marginBottom: "24px" }}>
              Add Task
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <input
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                placeholder="Task Title"
                className="section-title"
                style={{
                  width: "100%",
                  padding: "12px 0",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  borderRadius: 0,
                  fontSize: "20px",
                }}
                autoFocus
                onInput={(e) =>
                  setNewTask({
                    ...newTask,
                    title: (e.target as HTMLInputElement).value,
                  })
                }
              />
              <textarea
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                rows={3}
                placeholder="Description..."
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  resize: "none",
                }}
              />
              <div>
                <label
                  className="mono-label"
                  style={{ display: "block", marginBottom: "8px" }}
                >
                  PRIORITY
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {Object.keys(PRIORITY_COLORS).map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewTask({ ...newTask, priority: p })}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "4px",
                        border: `1px solid ${newTask.priority === p ? PRIORITY_COLORS[p] : "var(--border)"}`,
                        background:
                          newTask.priority === p
                            ? `${PRIORITY_COLORS[p]}20`
                            : "transparent",
                        color:
                          newTask.priority === p
                            ? PRIORITY_COLORS[p]
                            : "var(--text-dim)",
                        fontSize: "12px",
                        textTransform: "capitalize",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <button
                  onClick={() => setShowNewTask(false)}
                  style={{
                    padding: "10px 20px",
                    background: "transparent",
                    color: "var(--text-dim)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleCreateTask}
                  style={{
                    padding: "10px 24px",
                    background: "var(--accent)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ADD TASK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="nx-card anim-fade-up"
            style={{
              width: "480px",
              padding: "32px",
              border: "1px solid var(--border2)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <h2 className="section-title" style={{ marginBottom: "24px" }}>
              Edit Task
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div>
                <label
                  className="mono-label"
                  style={{ display: "block", marginBottom: "8px" }}
                >
                  TITLE
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label
                  className="mono-label"
                  style={{ display: "block", marginBottom: "8px" }}
                >
                  DESCRIPTION
                </label>
                <textarea
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    height: "100px",
                    resize: "vertical",
                  }}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label
                  className="mono-label"
                  style={{ display: "block", marginBottom: "8px" }}
                >
                  PRIORITY
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {Object.keys(PRIORITY_COLORS).map((p) => (
                    <button
                      key={p}
                      onClick={() => setEditForm({ ...editForm, priority: p })}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "4px",
                        border: `1px solid ${editForm.priority === p ? PRIORITY_COLORS[p] : "var(--border)"}`,
                        background:
                          editForm.priority === p
                            ? `${PRIORITY_COLORS[p]}20`
                            : "transparent",
                        color:
                          editForm.priority === p
                            ? PRIORITY_COLORS[p]
                            : "var(--text-dim)",
                        fontSize: "12px",
                        textTransform: "capitalize",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <button
                  onClick={() => setEditingTask(null)}
                  style={{
                    padding: "10px 20px",
                    background: "transparent",
                    color: "var(--text-dim)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleUpdateTask}
                  style={{
                    padding: "10px 24px",
                    background: "var(--accent)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  SAVE CHANGES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

