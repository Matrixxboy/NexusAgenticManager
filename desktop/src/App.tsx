import { useEffect } from "react";
import { useNexusStore } from "./store/nexusStore";
import Sidebar from "./components/sidebar/Sidebar";
import ChatView from "./components/chat/ChatView";
import TelegramView from "./components/chat/TelegramView";
import ProjectsView from "./components/projects/ProjectsView";
import SettingsView from "./components/settings/SettingsView";
import CommandBar from "./components/commandbar/CommandBar";
import { ToastContainer, NotificationPanel } from "./components/notifications/NotificationSystem";
import { ResearchView, CareerView, CodeView } from "./components/research/AgentViews";
import { checkHealth } from "./lib/api";

export default function App() {
  const { currentView, setOllamaOnline, pushNotification, settings } = useNexusStore();

  // ── Health polling ─────────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const h = await checkHealth();
        const online = h.ollama === "connected";
        setOllamaOnline(online);
      } catch {
        setOllamaOnline(false);
      }
    };

    poll();
    const interval = setInterval(poll, 15000); // every 15s
    return () => clearInterval(interval);
  }, []);

  // ── Desktop notification permission ───────────────────────────
  useEffect(() => {
    if (settings.notifDesktop && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── Startup notification ───────────────────────────────────────
  useEffect(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    setTimeout(() => {
      pushNotification({
        type: "agent",
        title: `${greeting}, Utsav`,
        body: "NEXUS is online. All 5 agents ready.",
        agent: "NEXUS",
      });
    }, 1200);
  }, []);

  // ── Global keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const { setView, toggleCommandBar } = useNexusStore.getState();
      if (e.key === "k") { e.preventDefault(); toggleCommandBar(); }
      if (e.key === "1") { e.preventDefault(); setView("chat"); }
      if (e.key === "2") { e.preventDefault(); setView("projects"); }
      if (e.key === "3") { e.preventDefault(); setView("research"); }
      if (e.key === "4") { e.preventDefault(); setView("career"); }
      if (e.key === "5") { e.preventDefault(); setView("code"); }
      if (e.key === "6") { e.preventDefault(); setView("telegram"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const VIEW_MAP: Record<string, JSX.Element> = {
    chat:     <ChatView />,
    projects: <ProjectsView />,
    research: <ResearchView />,
    career:   <CareerView />,
    code:     <CodeView />,
    telegram: <TelegramView />,
    settings: <SettingsView />,
  };

  return (
    <div
      className="grid-bg"
      style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {VIEW_MAP[currentView] || <ChatView />}
      </main>

      {/* Global overlays */}
      <CommandBar />
      <NotificationPanel />
      <ToastContainer />
    </div>
  );
}
