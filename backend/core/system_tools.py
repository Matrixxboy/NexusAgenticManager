"""
System Tools — Safe environment access for agents (mostly FORGE).
"""
import os
import subprocess
from typing import List, Dict, Any, Optional
from loguru import logger

class SystemTools:
    """
    Exposes safe wrappers for file system and command execution.
    """
    
    @staticmethod
    def list_dir(path: str = ".") -> str:
        """List files in a directory."""
        try:
            items = os.listdir(path)
            return "\n".join(items)
        except Exception as e:
            return f"Error listing directory: {e}"

    @staticmethod
    def read_file(path: str) -> str:
        """Read text file content."""
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            return f"Error reading file: {e}"

    @staticmethod
    def write_file(path: str, content: str) -> str:
        """Write content to a file."""
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            return f"Successfully wrote to {path}"
        except Exception as e:
            return f"Error writing file: {e}"

    @staticmethod
    def run_command(command: str) -> str:
        """Run a shell command (blocked: rm, sudo, etc)."""
        blacklist = ["rm", "sudo", "shutdown", "reboot", "format", "del"]
        if any(b in command for b in blacklist):
            return "Command blocked for safety."
        
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                timeout=30
            )
            return f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        except Exception as e:
            return f"Command execution failed: {e}"

system_tools = SystemTools()
