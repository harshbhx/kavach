"""Executes tool calls for one chat turn: guard check → execute or block → record."""

from __future__ import annotations

from typing import Any

from kavach.models import GuardPolicy, ToolCallRecord
from kavach.target import guards, tools


class ToolRunner:
    def __init__(self, db: dict[str, Any], session_user: str, policy: GuardPolicy, request_id: str = ""):
        self.db = db
        self.session_user = session_user
        self.policy = policy
        self.request_id = request_id
        self.records: list[ToolCallRecord] = []

    def call(self, tool: str, raw_args: dict[str, Any]) -> dict[str, Any]:
        """Run one tool call and return what the model should see."""
        if tool not in tools.TOOL_NAMES:
            result = {"error": "UNKNOWN_TOOL", "tool": tool}
            self.records.append(self._record(tool, raw_args, False, "unknown_tool", result))
            return result
        args = tools.normalise_args(tool, raw_args)
        decision = guards.check_tool(tool, args, self.session_user, self.policy, self.db)
        if not decision.allowed:
            seen = decision.result or {"error": "BLOCKED_BY_POLICY"}
            self.records.append(self._record(tool, args, False, decision.blocked_by, seen))
            return seen
        result = tools.execute(tool, args, self.db)
        result = guards.post_process(tool, result, self.policy)
        executed = "error" not in result
        self.records.append(self._record(tool, args, executed, None, result))
        return result

    def _record(self, tool, args, executed, blocked_by, result) -> ToolCallRecord:
        return ToolCallRecord(
            request_id=self.request_id,
            session_user=self.session_user,
            tool=tool,
            args=args,
            executed=executed,
            blocked_by=blocked_by,
            result=result,
        )
