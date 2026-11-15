"""
Core Agent Engine for Antigravity Mobile.
Drives the Gemini agentic loop, tool dispatch, and streaming execution updates.
"""

import os
import json
import asyncio
from typing import AsyncGenerator, Dict, Any, List, Optional
from google import genai
from google.genai import types

from backend.tools import ToolRegistry

# System instructions that give the agent its autonomous identity and mobile guardrails
SYSTEM_INSTRUCTION = """
You are Antigravity Mobile, an autonomous agentic AI software engineer and IDE companion running directly on an Android device (via Termux Linux environment).

Your Mission:
1. Help the user build, code, debug, refactor, and manage software repositories directly on this device.
2. You have direct access to tools: shell execution, reading files, writing files, targeted code patching, listing directories, and git checkpoints.
3. Use your tools proactively to inspect files, execute tests, verify your changes, and maintain git history.
4. Always checkpoint with git before undertaking destructive or large multi-file operations.
5. Provide clear, concise explanations. When you perform tool calls, summarize the outcome clearly.
6. Remember that you are operating on a mobile device: prefer lightweight commands, clean dependencies, and verify exit codes.
"""

class AntigravityAgent:
    def __init__(self, workspace_dir: str, api_key: Optional[str] = None, model_name: str = "gemini-2.5-flash"):
        self.workspace_dir = workspace_dir
        self.tools = ToolRegistry(workspace_dir)
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model_name = model_name
        
        # Initialize Google GenAI client
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        self.chat_history: List[Dict[str, Any]] = []

    def set_api_key(self, api_key: str):
        self.api_key = api_key
        self.client = genai.Client(api_key=self.api_key)

    def _get_tool_declarations(self) -> List[Any]:
        """Convert ToolRegistry methods to Gemini function declarations."""
        return [
            self.tools.run_shell,
            self.tools.read_file,
            self.tools.write_file,
            self.tools.patch_file,
            self.tools.list_directory,
            self.tools.git_checkpoint,
            self.tools.get_device_status,
        ]

    def _execute_tool(self, func_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch tool calls to ToolRegistry."""
        tool_map = {
            "run_shell": self.tools.run_shell,
            "read_file": self.tools.read_file,
            "write_file": self.tools.write_file,
            "patch_file": self.tools.patch_file,
            "list_directory": self.tools.list_directory,
            "git_checkpoint": self.tools.git_checkpoint,
            "get_device_status": self.tools.get_device_status,
        }
        if func_name not in tool_map:
            return {"status": "error", "message": f"Unknown tool: {func_name}"}
        
        try:
            return tool_map[func_name](**args)
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def stream_run(self, user_prompt: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute an agentic turn with Gemini function-calling loop.
        Yields structured events for the frontend UI.
        """
        if not self.client:
            yield {
                "type": "error",
                "message": "GEMINI_API_KEY is not set. Please provide a valid Gemini API key in settings."
            }
            return

        yield {"type": "status", "data": "Thinking..."}

        # Create or retrieve chat session with tools enabled
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.2,
            tools=self._get_tool_declarations(),
        )

        # Build contents from history + new user prompt
        contents = []
        for msg in self.chat_history:
            contents.append(msg)
        
        new_user_msg = types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_prompt)]
        )
        contents.append(new_user_msg)
        self.chat_history.append(new_user_msg)

        max_turns = 10
        turn_count = 0

        while turn_count < max_turns:
            turn_count += 1
            try:
                # Call Gemini model
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model_name,
                    contents=contents,
                    config=config
                )
            except Exception as e:
                yield {"type": "error", "message": f"API error: {str(e)}"}
                return

            candidate = response.candidates[0] if response.candidates else None
            if not candidate:
                yield {"type": "error", "message": "No response returned from model."}
                return

            model_parts = candidate.content.parts if candidate.content else []
            function_calls = [p.function_call for p in model_parts if p.function_call]
            text_parts = [p.text for p in model_parts if p.text]

            # Stream out any text the model produced in this step
            full_text = "".join(text_parts)
            if full_text:
                yield {"type": "chunk", "text": full_text}

            # Record model turn in conversation history
            contents.append(candidate.content)
            self.chat_history.append(candidate.content)

            # If no tool calls were requested, we are done with this turn!
            if not function_calls:
                break

            # Process function calls
            function_response_parts = []
            for fc in function_calls:
                fn_name = fc.name
                fn_args = dict(fc.args) if fc.args else {}

                yield {
                    "type": "tool_call",
                    "tool": fn_name,
                    "args": fn_args
                }

                yield {"type": "status", "data": f"Running {fn_name}..."}

                # Run tool execution asynchronously
                tool_output = await asyncio.to_thread(self._execute_tool, fn_name, fn_args)

                yield {
                    "type": "tool_result",
                    "tool": fn_name,
                    "result": tool_output
                }

                # Prepare function response part for the next turn to feed back to Gemini
                function_response_parts.append(
                    types.Part.from_function_response(
                        name=fn_name,
                        response={"result": tool_output}
                    )
                )

            # Add function responses back to contents for Gemini to evaluate
            fn_response_content = types.Content(
                role="user",
                parts=function_response_parts
            )
            contents.append(fn_response_content)
            self.chat_history.append(fn_response_content)
            
            yield {"type": "status", "data": "Evaluating tool results..."}

        yield {"type": "done"}
