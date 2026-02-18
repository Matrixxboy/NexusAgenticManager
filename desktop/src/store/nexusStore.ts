import { create } from "zustand";

export type Agent = "NEXUS"|"ATLAS"|"ORACLE"|"COMPASS"|"FORGE";
export type View = "chat"|"projects"|"research"|"career"|"code"|"settings"|"telegram";

export interface Message {
  id: string;
  role: "user"|"assistant";
  content: string;
  agent: Agent;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface Notification {
  id: string;
  type: "info"|"success"|"warning"|"error"|"agent";
  title: string;
  body: string;
  agent?: Agent;
  timestamp: Date;
  read: boolean;
  action?: { label: string; onClick: () => void };
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  github_repo: string;
  taskCount?: number;
  completedCount?: number;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  status: string;
  priority: string;
  description?: string;
}

export interface AgentStatus {
  name: Agent;
  online: boolean;
  lastActive?: Date;
}

interface NexusState {
  // Core
  messages: Message[];
  sessionId: string | null;
  currentView: View;
  isLoading: boolean;
  backendUrl: string;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  showNotifPanel: boolean;

  // Projects & Tasks
  projects: Project[];
  tasks: Task[];
  activeProjectId: number | null;

  // Agent statuses
  agentStatuses: AgentStatus[];
  ollamaOnline: boolean;
  telegramConnected: boolean;

  // Command bar
  commandBarOpen: boolean;

  // Settings
  settings: {
    telegramToken: string;
    telegramChatId: string;
    githubToken: string;
    notionKey: string;
    ollamaModel: string;
    morningTime: string;
    eveningTime: string;
    notifSound: boolean;
    notifDesktop: boolean;
  };

  // Actions
  addMessage: (m: Omit<Message,"id"|"timestamp">) => void;
  updateLastMessage: (content: string) => void;
  setLoading: (v: boolean) => void;
  setView: (v: View) => void;
  setSessionId: (id: string) => void;
  clearChat: () => void;

  pushNotification: (n: Omit<Notification,"id"|"timestamp"|"read">) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  toggleNotifPanel: () => void;

  setProjects: (p: Project[]) => void;
  setTasks: (t: Task[]) => void;
  setActiveProject: (id: number | null) => void;

  setOllamaOnline: (v: boolean) => void;
  setTelegramConnected: (v: boolean) => void;
  toggleCommandBar: () => void;
  updateSettings: (s: Partial<NexusState["settings"]>) => void;
}

export const useNexusStore = create<NexusState>((set, get) => ({
  messages: [],
  sessionId: null,
  currentView: "chat",
  isLoading: false,
  backendUrl: "http://localhost:8000",
  notifications: [],
  unreadCount: 0,
  showNotifPanel: false,
  projects: [],
  tasks: [],
  activeProjectId: null,
  agentStatuses: [
    { name: "ATLAS", online: true },
    { name: "ORACLE", online: true },
    { name: "COMPASS", online: true },
    { name: "FORGE", online: true },
  ],
  ollamaOnline: false,
  telegramConnected: false,
  commandBarOpen: false,
  settings: {
    telegramToken: "",
    telegramChatId: "",
    githubToken: "",
    notionKey: "",
    ollamaModel: "llama3.1:8b",
    morningTime: "09:00",
    eveningTime: "18:30",
    notifSound: true,
    notifDesktop: true,
  },

  addMessage: (m) => set((s) => ({
    messages: [...s.messages, { ...m, id: crypto.randomUUID(), timestamp: new Date() }],
  })),
  updateLastMessage: (content) => set((s) => {
    const msgs = [...s.messages];
    if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content, isStreaming: false };
    return { messages: msgs };
  }),
  setLoading: (v) => set({ isLoading: v }),
  setView: (v) => set({ currentView: v }),
  setSessionId: (id) => set({ sessionId: id }),
  clearChat: () => set({ messages: [], sessionId: null }),

  pushNotification: (n) => {
    const notif: Notification = { ...n, id: crypto.randomUUID(), timestamp: new Date(), read: false };
    set((s) => ({
      notifications: [notif, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    }));
    // Desktop notification
    if (get().settings.notifDesktop && "Notification" in window && Notification.permission === "granted") {
      new Notification(`NEXUS — ${n.title}`, { body: n.body, icon: "/icon.png" });
    }
  },
  markAllRead: () => set((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, read: true })),
    unreadCount: 0,
  })),
  dismissNotification: (id) => set((s) => ({
    notifications: s.notifications.filter((n) => n.id !== id),
    unreadCount: s.notifications.filter((n) => !n.read && n.id !== id).length,
  })),
  toggleNotifPanel: () => set((s) => ({ showNotifPanel: !s.showNotifPanel })),

  setProjects: (p) => set({ projects: p }),
  setTasks: (t) => set({ tasks: t }),
  setActiveProject: (id) => set({ activeProjectId: id }),

  setOllamaOnline: (v) => set({ ollamaOnline: v }),
  setTelegramConnected: (v) => set({ telegramConnected: v }),
  toggleCommandBar: () => set((s) => ({ commandBarOpen: !s.commandBarOpen })),
  updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
}));
