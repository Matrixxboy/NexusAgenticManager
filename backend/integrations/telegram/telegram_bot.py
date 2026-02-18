"""
Telegram Bot Integration — NEXUS Mobile Access
Lets Utsav interact with NEXUS agents from his phone.
Supports: chat, task queries, daily reminders push.
"""
import asyncio
from typing import Optional
from loguru import logger
from config import settings


# ── Command definitions ─────────────────────────────────────────
COMMANDS = {
    "/start":   "Welcome message + command list",
    "/tasks":   "Show today's pending tasks",
    "/brief":   "Get morning briefing now",
    "/summary": "Get evening summary now",
    "/ask":     "Ask NEXUS anything — /ask <your question>",
    "/project": "List active projects",
    "/focus":   "What should I focus on right now?",
    "/status":  "NEXUS system status",
}

WELCOME_MSG = """🧠 *NEXUS — Online*

Your personal AI system is connected.

*Commands:*
/tasks — Today's tasks
/brief — Morning briefing
/summary — Evening summary
/focus — What to work on now
/project — Active projects
/status — System status

Or just type anything to chat with NEXUS directly."""


class TelegramBot:
    """
    Async Telegram bot for NEXUS mobile access.
    Run with: asyncio.run(bot.start())
    """

    def __init__(self):
        self._app = None
        self._chat_id = settings.telegram_chat_id

    def _get_app(self):
        if self._app is None:
            if not settings.telegram_bot_token:
                raise RuntimeError("TELEGRAM_BOT_TOKEN not set in .env")
            from telegram.ext import (
                Application, CommandHandler, MessageHandler,
                filters, ContextTypes,
            )
            from telegram import Update

            self._Update = Update
            self._ContextTypes = ContextTypes

            self._app = (
                Application.builder()
                .token(settings.telegram_bot_token)
                .build()
            )
            self._register_handlers()
            logger.info("Telegram bot initialized")
        return self._app

    def _register_handlers(self):
        from telegram.ext import CommandHandler, MessageHandler, filters

        handlers = [
            CommandHandler("start",   self._cmd_start),
            CommandHandler("tasks",   self._cmd_tasks),
            CommandHandler("brief",   self._cmd_brief),
            CommandHandler("summary", self._cmd_summary),
            CommandHandler("focus",   self._cmd_focus),
            CommandHandler("project", self._cmd_projects),
            CommandHandler("status",  self._cmd_status),
            CommandHandler("ask",     self._cmd_ask),
            MessageHandler(filters.TEXT & ~filters.COMMAND, self._handle_message),
        ]
        for h in handlers:
            self._app.add_handler(h)

    # ── Security — only respond to Utsav ──────────────────────────
    def _is_authorized(self, update) -> bool:
        if not self._chat_id:
            return True  # No restriction set
        return str(update.effective_chat.id) == str(self._chat_id)

    def _unauthorized_reply(self, update):
        return update.message.reply_text("⛔ Unauthorized.")

    # ── Command handlers ────────────────────────────────────────────
    async def _cmd_start(self, update, context):
        if not self._is_authorized(update):
            return await self._unauthorized_reply(update)
        await update.message.reply_text(WELCOME_MSG, parse_mode="Markdown")

    async def _cmd_tasks(self, update, context):
        if not self._is_authorized(update):
            return
        from agents.pm import atlas
        result = await atlas.run({"message": "List all pending tasks for today, grouped by project. Be brief."})
        await update.message.reply_text(f"📋 *Tasks*\n\n{result['output']}", parse_mode="Markdown")

    async def _cmd_brief(self, update, context):
        if not self._is_authorized(update):
            return
        from agents.pm import atlas
        briefing = await atlas.morning_briefing()
        await update.message.reply_text(f"☀️ *Morning Briefing*\n\n{briefing}", parse_mode="Markdown")

    async def _cmd_summary(self, update, context):
        if not self._is_authorized(update):
            return
        from agents.pm import atlas
        summary = await atlas.evening_summary()
        await update.message.reply_text(f"🌆 *Evening Summary*\n\n{summary}", parse_mode="Markdown")

    async def _cmd_focus(self, update, context):
        if not self._is_authorized(update):
            return
        from agents.orchestrator import orchestrator
        result = await orchestrator.run({
            "message": "What single thing should I focus on right now? Give me one clear answer."
        })
        await update.message.reply_text(f"🎯 *Focus*\n\n{result['output']}", parse_mode="Markdown")

    async def _cmd_projects(self, update, context):
        if not self._is_authorized(update):
            return
        from agents.pm import atlas
        result = await atlas.run({"message": "List all active projects with their current status in 2-3 words each."})
        await update.message.reply_text(f"🗂️ *Projects*\n\n{result['output']}", parse_mode="Markdown")

    async def _cmd_status(self, update, context):
        if not self._is_authorized(update):
            return
        from llm.local import ollama_client
        ollama_ok = await ollama_client.is_available()
        status_msg = (
            f"🧠 *NEXUS Status*\n\n"
            f"Backend: ✅ Online\n"
            f"Ollama: {'✅ Connected' if ollama_ok else '❌ Offline'}\n"
            f"Agents: ATLAS · ORACLE · COMPASS · FORGE\n"
            f"Memory: ChromaDB + SQLite"
        )
        await update.message.reply_text(status_msg, parse_mode="Markdown")

    async def _cmd_ask(self, update, context):
        if not self._is_authorized(update):
            return
        question = " ".join(context.args) if context.args else ""
        if not question:
            await update.message.reply_text("Usage: /ask <your question>")
            return
        await self._process_message(update, question)

    async def _handle_message(self, update, context):
        if not self._is_authorized(update):
            return
        text = update.message.text
        await self._process_message(update, text)

    async def _process_message(self, update, text: str):
        """Route a plain message through NEXUS orchestrator."""
        await update.message.reply_text("🧠 Thinking...")
        try:
            from agents.orchestrator import orchestrator
            result = await orchestrator.run({"message": text})
            response = result.get("output", "No response")
            # Telegram message limit: 4096 chars
            if len(response) > 4000:
                response = response[:4000] + "\n\n[truncated]"
            await update.message.reply_text(response)
        except Exception as e:
            logger.error(f"Telegram message processing error: {e}")
            await update.message.reply_text(f"❌ Error: {str(e)[:200]}")

    # ── Push notifications (called by scheduler) ───────────────────
    async def push_message(self, text: str, parse_mode: str = "Markdown") -> bool:
        """Send a proactive message to Utsav's chat."""
        if not self._chat_id:
            logger.warning("Telegram: TELEGRAM_CHAT_ID not set, skipping push")
            return False
        try:
            app = self._get_app()
            await app.bot.send_message(
                chat_id=self._chat_id,
                text=text[:4000],
                parse_mode=parse_mode,
            )
            return True
        except Exception as e:
            logger.error(f"Telegram push_message error: {e}")
            return False

    async def start(self):
        """Start the bot (blocking — run in separate thread/process)."""
        app = self._get_app()
        logger.info("🤖 Telegram bot starting...")
        await app.run_polling(drop_pending_updates=True)

    def is_configured(self) -> bool:
        return bool(settings.telegram_bot_token)


telegram_bot = TelegramBot()
