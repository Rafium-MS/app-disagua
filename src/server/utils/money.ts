export function brlToCents(v?: string | number | null): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Math.round(v * 100)
  const only = v.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(only)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}
