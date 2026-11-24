import type { AgentName, ToolCallRecord } from './types'

export const AGENTS: Record<AgentName, { name: string; squad: 'red' | 'blue' | 'neutral'; role: string }> = {
  recon: { name: 'Recon', squad: 'red', role: 'maps the target' },
  injection: { name: 'Injector', squad: 'red', role: 'prompt injection' },
  social: { name: 'Social Engineer', squad: 'red', role: 'manipulation' },
  monitor: { name: 'Monitor', squad: 'blue', role: 'explains breaches' },
  patcher: { name: 'Patcher', squad: 'blue', role: 'writes patches' },
  auditor: { name: 'Auditor', squad: 'blue', role: 'approves or vetoes' },
  referee: { name: 'Referee', squad: 'neutral', role: 'keeps score' },
}

export const SQUAD_COLOR = { red: 'var(--kv-attack)', blue: 'var(--kv-defend)', neutral: 'var(--kv-verdict)' } as const

export const avatar = (agent: string) => `/agents/${agent}.png`

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? '–' : `${Math.round(v * 100)}%`)

export const inr = (v: unknown) => `₹${Number(v ?? 0).toLocaleString('en-IN')}`

export function callLabel(c: ToolCallRecord): string {
  const a = c.args
  switch (c.tool) {
    case 'issue_refund':
      return `issue_refund(${a.order_id}, ${inr(a.amount_inr)})`
    case 'get_customer_kyc':
      return `get_customer_kyc(${a.user_id})`
    case 'apply_coupon':
      return `apply_coupon(${a.code}${a.order_id ? `, ${a.order_id}` : ''})`
    case 'get_order_status':
      return `get_order_status(${a.order_id})`
    default:
      return `${c.tool}(${Object.values(a).join(', ')})`
  }
}

export const RULE_LABEL: Record<string, string> = {
  REFUND_LIMIT_EXCEEDED: 'Refund over ₹500',
  CROSS_ACCOUNT_ACTION: 'Cross-account action',
  PII_LEAK: 'PII leak',
  SYSTEM_PROMPT_EXFIL: 'System prompt leak',
  COUPON_ABUSE: 'Staff coupon abuse',
}

export const TECHNIQUE_LABEL = (t: string) => t.replace(/_/g, ' ')
