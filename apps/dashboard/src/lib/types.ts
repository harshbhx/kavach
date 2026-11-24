// Mirrors docs/API_CONTRACTS.md. Keep in sync with backend/kavach/models.py.

export type AgentName = 'recon' | 'injection' | 'social' | 'monitor' | 'patcher' | 'auditor' | 'referee'
export type Squad = 'red' | 'blue' | 'neutral'

export interface KavachEvent<T = Record<string, unknown>> {
  run_id: string
  seq: number
  ts: string
  t_rel_ms: number
  type: string
  round: number | null
  agent: string | null
  data: T
}

export interface ToolCallRecord {
  request_id: string
  ts: string
  session_user: string
  tool: string
  args: Record<string, unknown>
  executed: boolean
  blocked_by: string | null
  result: Record<string, unknown>
}

export interface AgentMessage {
  seq: number
  round: number | null
  agent: AgentName
  squad: Squad
  text: string
  mentions: string[]
}

export interface ToolCard {
  seq: number
  round: number | null
  kind: 'attack' | 'replay' | 'probe' | 'benign'
  ref: string
  verdict: 'breach' | 'blocked' | 'ok'
  ruleId: string | null
  configVersion: string
  record: ToolCallRecord | null
  inputBlockedBy: string | null
}

export interface AttackInfo {
  attack_id: string
  agent: string
  technique: string
  goal: string
  message: string
  source: string
}

export interface UtilityReport {
  score: number
  passed: number
  total: number
  failed: { id: string; message: string; why: string }[]
}

export interface AuditResult {
  attempt: number
  candidate_version: string
  decision: 'approve' | 'veto'
  replay: { total: number; still_breaching: number }
  utility: UtilityReport | null
  reasons: string[]
}

export interface PatchProposed {
  attempt: number
  candidate_version: string
  changelog: string[]
  rationale: string
  prompt_diff_stats: { added: number; removed: number }
  policy_changes: string[]
  config_key: string
}

export interface RoundSummary {
  round: number
  config_attacked: string
  total_attacks: number
  breaching: number
  errors: number
  breach_rate: number
  findings_by_rule: Record<string, number>
  attempts: number
  vetoes: number
  applied_version: string | null
  utility_applied: number | null
  tth_seconds: number | null
  status: 'hardened' | 'unhardened' | 'no_breach' | 'running'
}

export interface RunCompleted {
  final_breach_rate: number | null
  final_utility: number | null
  total_exploits: number
  owasp_breakdown: Record<string, number>
  deployed_version: string
}

export interface TargetConfig {
  version: string
  system_prompt: string
  guard_policy: Record<string, unknown>
}

export interface Health {
  ok: boolean
  brain_provider: string
  band_enabled: boolean
  target_url: string
  target_model: string
  target_ok: boolean
}
