// 🔹 Base Config

const BASE = import.meta.env.VITE_BACKEND_API || "http://localhost:8000/api"

// 🔹 Standard API Response Envelope

interface ApiResponse<T> {
  success: boolean
  message: string
  http_code: number
  payload: T
  pagination: any
  error: any
  meta: {
    timestamp: string
    request_id: string
  }
}

// 🔹 Generic Request Wrapper

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("access_token")

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(opts.headers || {}),
    },
    ...opts,
  })

  let data: ApiResponse<T>

  try {
    data = await res.json()
  } catch {
    throw new Error("Invalid JSON response from server")
  }

  if (!res.ok || !data.success) {
    throw new Error(
      data?.error?.message || data?.message || `API Error (${res.status})`,
    )
  }

  return data.payload
}

// 🔹 Health

export const checkHealth = () =>
  req<{
    status: string
    nexus: string
    ollama: string
  }>("/health")

// 🔹 Sessions

export const getSessions = () => req<any[]>("/sessions")

export const getSession = (sessionId: string) =>
  req<any>(`/sessions/${sessionId}`)

export const createSession = (sessionId?: string, agentName?: string) =>
  req<any>("/sessions", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, agent_name: agentName }),
  })

export const deleteSession = (sessionId: string) =>
  req<any>(`/sessions/${sessionId}`, { method: "DELETE" })

export const updateSession = (sessionId: string, data: any) =>
  req<any>(`/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })

// 🔹 Chat

export const sendChat = (
  message: string,
  sessionId?: string,
  task_type?: string,
) =>
  req<{
    response: string
    agent: string
    session_id: string
  }>("/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      session_id: sessionId,
      task_type,
    }),
  })

// 🔹 Projects

export const getProjects = () => req<any[]>("/projects")

export const createProject = (data: {
  name: string
  description?: string
  github_repo?: string
}) =>
  req<any>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const deleteProject = (projectId: string) =>
  req<any>(`/projects/${projectId}`, { method: "DELETE" })

// 🔹 Tasks

export const getTasks = (projectId: string) => req<any[]>(`/tasks/${projectId}`)

export const createTask = (data: {
  project_id: string
  title: string
  description?: string
  priority?: string
}) =>
  req<any>("/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const updateTaskStatus = (taskId: string, status: string) =>
  req<any>(`/tasks/${taskId}/status?status=${status}`, { method: "PATCH" })

export const updateTask = (
  taskId: string,
  data: { title?: string; description?: string; priority?: string },
) =>
  req<any>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })

export const deleteTask = (taskId: string) =>
  req<any>(`/tasks/${taskId}`, { method: "DELETE" })

// 🔹 Research (ORACLE)

export const searchKnowledge = (query: string) =>
  req<any>("/research/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  })

export const ingestContent = (data: {
  content: string
  title: string
  source?: string
  tags?: string[]
}) =>
  req<any>("/research/ingest", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const buildLearningPath = (topic: string) =>
  req<any>("/research/learning-path", {
    method: "POST",
    body: JSON.stringify({ topic }),
  })

export const getKnowledgeStats = () => req<any>("/research/stats")

// 🔹 Career (COMPASS)

export const skillGapAnalysis = (target_role: string, timeline?: string) =>
  req<any>("/career/skill-gap", {
    method: "POST",
    body: JSON.stringify({ target_role, timeline }),
  })

export const trackGoals = () => req<any>("/career/goals")

export const analyzeJob = (data: {
  job_title: string
  company: string
  job_description: string
}) =>
  req<any>("/career/job-analysis", {
    method: "POST",
    body: JSON.stringify(data),
  })

// 🔹 Code (FORGE)

export const reviewCode = (code: string, language?: string, context?: string) =>
  req<any>("/code/review", {
    method: "POST",
    body: JSON.stringify({ code, language, context }),
  })

export const debugCode = (error: string, code: string, language?: string) =>
  req<any>("/code/debug", {
    method: "POST",
    body: JSON.stringify({ error, code, language }),
  })

export const generateBoilerplate = (description: string, stack?: string) =>
  req<any>("/code/boilerplate", {
    method: "POST",
    body: JSON.stringify({ description, stack }),
  })

export const techDecision = (options: string[], use_case: string) =>
  req<any>("/code/tech-decision", {
    method: "POST",
    body: JSON.stringify({ options, use_case }),
  })

// 🔹 GitHub Sync

export const syncGithub = (repo?: string) =>
  req<any>("/chat", {
    method: "POST",
    body: JSON.stringify({
      message: repo ? `sync github repo ${repo}` : "sync github",
      task_type: "general",
    }),
  })

// 🔹 Telegram (External API - No Envelope)

export const sendTelegramMessage = async (
  token: string,
  chatId: string,
  text: string,
) => {
  const url = `https://api.telegram.org/bot${token}/sendMessage`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  })

  if (!res.ok) {
    throw new Error(`Telegram API Error (${res.status})`)
  }

  return res.json()
}

export const getTelegramUpdates = async (token: string) => {
  const url = `https://api.telegram.org/bot${token}/getUpdates?limit=10&timeout=0`

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Telegram API Error (${res.status})`)
  }

  return res.json()
}

