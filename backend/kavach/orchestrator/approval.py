"""Human approval of patches: a patch that passed the Auditor waits here until a person decides.

A decision arrives from the Band room (the live Referee forwards `@Referee approve v2`) or from the dashboard, both
through POST /api/runs/{run_id}/approval. The code-computed audit still decides whether a patch is good enough to ask
about; a person only gets the final say on shipping it.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Literal

Decision = Literal["approve", "reject"]


@dataclass
class PendingApproval:
    version: str
    round: int
    attempt: int
    future: asyncio.Future = field(repr=False)

    def decide(self, decision: Decision, by: str, source: str, reason: str | None = None) -> bool:
        """Settle the wait. False if it was already settled (a second click, or a reply after the timeout)."""
        if self.future.done():
            return False
        self.future.set_result({"decision": decision, "by": by, "source": source, "reason": reason})
        return True
