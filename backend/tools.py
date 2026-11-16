"""
Tools available to the PocketDev Mobile Agent.
Provides shell execution, file system operations, git tracking, and device inspection.
"""

import os
import sys
import subprocess
import shutil
from typing import Dict, Any, List, Optional
from pathlib import Path


class ToolRegistry:
    def __init__(self, workspace_dir: str):
        self.workspace_dir = Path(workspace_dir).resolve()
        os.makedirs(self.workspace_dir, exist_ok=True)

    def _resolve_path(self, rel_or_abs_path: str) -> Path:
        p = Path(rel_or_abs_path)
        if not p.is_absolute():
            p = self.workspace_dir / p
        return p.resolve()

    def run_shell(self, command: str, timeout_seconds: int = 60) -> Dict[str, Any]:
        """Execute a shell command inside the workspace directory."""
        try:
            # On Linux/Android Termux use sh/bash, on Windows use powershell/cmd
            shell_cmd = command
            is_win = sys.platform == "win32"
            
            res = subprocess.run(
                shell_cmd,
                shell=True,
                cwd=str(self.workspace_dir),
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                encoding="utf-8",
                errors="replace"
            )
            return {
                "exit_code": res.returncode,
                "stdout": res.stdout,
                "stderr": res.stderr,
                "status": "success" if res.returncode == 0 else "error"
            }
        except subprocess.TimeoutExpired:
            return {
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Command timed out after {timeout_seconds} seconds.",
                "status": "timeout"
            }
        except Exception as e:
            return {
                "exit_code": -1,
                "stdout": "",
                "stderr": str(e),
                "status": "exception"
            }

    def read_file(self, path: str, start_line: Optional[int] = None, end_line: Optional[int] = None) -> Dict[str, Any]:
        """Read text contents of a file, optionally bounded by line numbers (1-indexed)."""
        target = self._resolve_path(path)
        if not target.exists() or not target.is_file():
            return {"status": "error", "message": f"File not found: {path}"}
        
        try:
            with open(target, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            
            total_lines = len(lines)
            s_idx = max(0, (start_line - 1)) if start_line is not None else 0
            e_idx = min(total_lines, end_line) if end_line is not None else total_lines
            
            selected_lines = lines[s_idx:e_idx]
            content = "".join(selected_lines)
            
            return {
                "status": "success",
                "path": str(target.relative_to(self.workspace_dir) if target.is_relative_to(self.workspace_dir) else target),
                "total_lines": total_lines,
                "lines_read": f"{s_idx + 1}-{e_idx}",
                "content": content
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def write_file(self, path: str, content: str, overwrite: bool = True) -> Dict[str, Any]:
        """Write content to a file. Creates parent directories automatically."""
        target = self._resolve_path(path)
        if target.exists() and not overwrite:
            return {"status": "error", "message": f"File already exists and overwrite=False: {path}"}
        
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            with open(target, "w", encoding="utf-8") as f:
                f.write(content)
            return {
                "status": "success",
                "path": str(target.relative_to(self.workspace_dir) if target.is_relative_to(self.workspace_dir) else target),
                "bytes_written": len(content.encode("utf-8"))
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def patch_file(self, path: str, target_block: str, replacement_block: str) -> Dict[str, Any]:
        """Replace an exact substring/block within a file."""
        target = self._resolve_path(path)
        if not target.exists():
            return {"status": "error", "message": f"File not found: {path}"}
        
        try:
            with open(target, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            
            if target_block not in content:
                return {
                    "status": "error",
                    "message": "Target text block not found in file. Ensure exact match including whitespace."
                }
            
            occurrences = content.count(target_block)
            new_content = content.replace(target_block, replacement_block)
            with open(target, "w", encoding="utf-8") as f:
                f.write(new_content)
                
            return {
                "status": "success",
                "path": str(target.relative_to(self.workspace_dir) if target.is_relative_to(self.workspace_dir) else target),
                "replacements_made": occurrences
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def list_directory(self, path: str = ".", max_depth: int = 2) -> Dict[str, Any]:
        """List files and directories relative to workspace."""
        base = self._resolve_path(path)
        if not base.exists() or not base.is_dir():
            return {"status": "error", "message": f"Directory not found: {path}"}
        
        items = []
        try:
            for root, dirs, files in os.walk(base):
                rel_root = Path(root).relative_to(base)
                depth = len(rel_root.parts)
                if depth >= max_depth:
                    dirs.clear()
                    continue
                
                # Filter out heavy/hidden dirs
                dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "__pycache__", "venv", ".git")]
                
                for d in dirs:
                    items.append({"name": d, "type": "dir", "rel_path": str(rel_root / d)})
                for f in files:
                    if f.startswith("."):
                        continue
                    p = Path(root) / f
                    items.append({
                        "name": f,
                        "type": "file",
                        "size_bytes": p.stat().st_size,
                        "rel_path": str(rel_root / f)
                    })
            return {"status": "success", "count": len(items), "items": items}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def git_checkpoint(self, message: str) -> Dict[str, Any]:
        """Automatically stage changes and commit as a safety checkpoint."""
        git_dir = self.workspace_dir / ".git"
        if not git_dir.exists():
            # Initialize git if not already a repo
            init_res = self.run_shell("git init")
            if init_res["status"] != "success":
                return {"status": "error", "message": "Failed to initialize git repository."}
            self.run_shell("git config user.name 'PocketDev Mobile'")
            self.run_shell("git config user.email 'agent@pocketdev.local'")
        
        add_res = self.run_shell("git add -A")
        commit_res = self.run_shell(f'git commit -m "{message}"')
        return {
            "status": "success",
            "git_add": add_res["stdout"],
            "git_commit": commit_res["stdout"] or commit_res["stderr"]
        }

    def get_device_status(self) -> Dict[str, Any]:
        """Inspect device environment (Termux, OS, battery if available)."""
        info = {
            "platform": sys.platform,
            "python_version": sys.version,
            "workspace": str(self.workspace_dir),
            "is_android": "ANDROID_ROOT" in os.environ or "TERMUX_VERSION" in os.environ
        }
        
        # Check Termux battery if available
        if shutil.which("termux-battery-status"):
            bat_res = self.run_shell("termux-battery-status", timeout_seconds=3)
            info["battery"] = bat_res.get("stdout")
            
        return {"status": "success", "device_info": info}
