export type Garment = {
  chip: string; description: string; size: string
  modelCode: string; modelDescription: string; occupation: string
  employeeCode: string; employeeName: string; conveyor: string; slot: string
  status: string; availability: string; type: string; date: Date | null
  delivery?: Delivery // set when the chip is in the "roupa por entregar" file
}
export type Model = { code: string; description: string; items: Garment[] }
export type Row = unknown[]

const s = (v: unknown) => (v == null ? '' : String(v).trim())
// Excel serial day -> Date (UTC)
const toDate = (v: unknown) => (typeof v === 'number' ? new Date(Math.round((v - 25569) * 864e5)) : null)

/** Each garment spans 2 rows in the export (merged cells): row A has chip/model/status/type/date,
 *  row B has size/employee name/conveyor/slot/availability. Data starts at row 3 (index 2). */
export function parseGarments(rows: Row[]): Garment[] {
  if (s(rows[0]?.[1]) !== 'Chip Code') throw new Error('Isto não parece ser o ficheiro Garments (falta a coluna "Chip Code").')
  const out: Garment[] = []
  for (let i = 2; i + 1 < rows.length; i += 2) {
    const a = rows[i], b = rows[i + 1]
    if (!s(a[1])) continue
    out.push({
      chip: s(a[1]), description: s(a[2]), size: s(b[2]),
      modelCode: s(a[3]), modelDescription: s(a[4]), occupation: s(a[5]),
      employeeCode: s(a[6]), employeeName: s(b[6]), conveyor: s(b[7]), slot: s(b[8]),
      status: s(a[8]), availability: s(b[9]), type: s(a[10]), date: toDate(a[11]),
    })
  }
  return out
}

export function groupByModel(gs: Garment[]): Model[] {
  const m = new Map<string, Model>()
  for (const g of gs) {
    let x = m.get(g.modelCode)
    if (!x) m.set(g.modelCode, (x = { code: g.modelCode, description: g.modelDescription, items: [] }))
    x.items.push(g)
  }
  return [...m.values()].sort((a, b) => a.description.localeCompare(b.description))
}

/** distinct values of a field, most frequent first */
export const distinct = (gs: Garment[], k: 'status' | 'availability') => {
  const c = new Map<string, number>()
  for (const g of gs) c.set(g[k], (c.get(g[k]) ?? 0) + 1)
  return [...c].sort((a, b) => b[1] - a[1]).map(([v]) => v)
}

// ---- "roupa por entregar" file: Nome Colaborador | Descrição Artigo | Número Chip | Data Levantamento | Categoria
export type Delivery = { chip: string; employeeName: string; employeeCode: string; description: string; category: string; date: Date | null }

export const isDeliveryFile = (rows: Row[]) => s(rows[0]?.[0]) === 'Nome Colaborador'

/** "Nome - 39387", "Nome 39565", "Nome (26852)", "Nome - 38442 - 1", "Nome----28694" -> name + number (3+ digits). No number -> code ''. */
export function splitEmployee(raw: unknown): { name: string; code: string } {
  const t = s(raw).replace(/\s+/g, ' ')
  const m = t.match(/^(.+?)[\s(-]*(\d{3,})\)?(?:\s*-\s*\d+)?$/)
  return m ? { name: m[1].trim(), code: m[2] } : { name: t, code: '' }
}

export function parseDelivery(rows: Row[]): Delivery[] {
  if (!isDeliveryFile(rows)) throw new Error('Isto não parece ser o ficheiro "roupa por entregar" (falta a coluna "Nome Colaborador").')
  const out: Delivery[] = []
  for (const r of rows.slice(1)) {
    if (!s(r[2])) continue
    const { name, code } = splitEmployee(r[0])
    out.push({ chip: s(r[2]), employeeName: name, employeeCode: code, description: s(r[1]), category: s(r[4]), date: toDate(r[3]) })
  }
  return out
}

/** Attach each delivery to the garment with the same chip (duplicate chips: last row wins). unmatched = chips not in the garments list. */
export function mergeDelivery(gs: Garment[], ds: Delivery[]) {
  const byChip = new Map(ds.map(d => [d.chip, d]))
  const merged = gs.map(g => (byChip.has(g.chip) ? { ...g, delivery: byChip.get(g.chip) } : g))
  return { garments: merged, unmatched: byChip.size - merged.filter(g => g.delivery).length }
}
