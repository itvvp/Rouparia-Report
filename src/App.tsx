import { useMemo, useState } from 'react'
import type { User } from './auth.ts'
import { Icon, TopBar } from './ui.tsx'
import { distinct, groupByModel, isDeliveryFile, mergeDelivery, parseDelivery, parseGarments, type Delivery, type Garment, type Row } from './parse.ts'

// availability values not shown as columns (still counted in Total)
const HIDDEN = new Set(['Change type of allowance', 'ToRepair', 'Unavailable'])
const fmt = (d: Date | null) => (d ? d.toLocaleDateString('pt-PT', { timeZone: 'UTC' }) : '')

export default function App({ user, onLogout, onUsers }: { user: User; onLogout: () => void; onUsers?: () => void }) {
  const [garments, setGarments] = useState<Garment[] | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null)
  const [files, setFiles] = useState<{ garments?: string; deliveries?: string }>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [over, setOver] = useState(false)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  // Accepts 1+ files; each is recognised by its header row, so drop order doesn't matter.
  async function load(input?: FileList | null) {
    const list = Array.from(input ?? []) // copy now: the input is reset right after, which empties the live FileList
    if (!list.length) return
    setErr(''); setBusy(true)
    await new Promise(r => setTimeout(r, 30)) // let "A processar…" paint before the blocking parse
    const XLSX = await import('xlsx')
    for (const f of list) {
      try {
        const sheets = XLSX.read(await f.arrayBuffer(), { dense: true }).Sheets
        // ponytail: parses on the main thread (~seconds for 37k garments); move to a Worker if it janks
        const rows = XLSX.utils.sheet_to_json(Object.values(sheets)[0], { header: 1, defval: null }) as Row[]
        if (isDeliveryFile(rows)) { setDeliveries(parseDelivery(rows)); setFiles(x => ({ ...x, deliveries: f.name })) }
        else { setGarments(parseGarments(rows)); setFiles(x => ({ ...x, garments: f.name })); setOpen(null) }
      } catch (e) {
        setErr(`${f.name}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    setBusy(false)
  }

  const view = useMemo(() => {
    if (!garments) return null
    const { garments: gs, unmatched } = deliveries ? mergeDelivery(garments, deliveries) : { garments, unmatched: 0 }
    const needle = q.trim().toLowerCase()
    const all = groupByModel(gs)
    return {
      total: gs.length, nModels: all.length, unmatched,
      pending: gs.filter(g => g.delivery).length,
      models: all.filter(m => !needle || (m.code + ' ' + m.description).toLowerCase().includes(needle)),
      statuses: distinct(gs, 'status'), avails: distinct(gs, 'availability').filter(v => !HIDDEN.has(v)),
    }
  }, [garments, deliveries, q])

  const count = (items: Garment[], k: 'status' | 'availability', v: string) => items.filter(g => g[k] === v).length

  // Exports what is on screen (respects the filter): sheet "Por modelo" = the table, sheet "Peças" = 1 row per garment.
  async function exportXlsx() {
    if (!view) return
    const XLSX = await import('xlsx')
    const porModelo = view.models.map(m => ({
      Modelo: m.code, Descrição: m.description, Total: m.items.length,
      ...(deliveries && { 'Por entregar': m.items.filter(g => g.delivery).length }),
      ...Object.fromEntries(view.statuses.map(v => [v, count(m.items, 'status', v)])),
      ...Object.fromEntries(view.avails.map(v => [v, count(m.items, 'availability', v)])),
    }))
    const pecas = view.models.flatMap(m => m.items.map(g => ({
      Modelo: g.modelCode, 'Descrição modelo': g.modelDescription, Chip: g.chip, Descrição: g.description, Tamanho: g.size,
      Ocupação: g.occupation, 'Cód. funcionário': g.employeeCode, Funcionário: g.employeeName, Conveyor: g.conveyor, Slot: g.slot,
      Estado: g.status, Disponibilidade: g.availability, Tipo: g.type, 'Últ. operação': g.date,
      ...(deliveries && {
        'Por entregar': g.delivery ? 'Sim' : '', 'Entrega - cód. funcionário': g.delivery?.employeeCode,
        'Entrega - funcionário': g.delivery?.employeeName, 'Entrega - categoria': g.delivery?.category, 'Entrega - data levantamento': g.delivery?.date,
      }),
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porModelo), 'Por modelo')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pecas, { dateNF: 'dd/mm/yyyy' }), 'Peças')
    XLSX.writeFile(wb, 'Garments_2026_por_modelo.xlsx', { cellDates: true })
  }

  const loaded = Object.values(files).join(' + ')

  return (
    <main>
      <TopBar user={user}>
        {onUsers && <button className="ghost" onClick={onUsers}><Icon name="users" />Utilizadores</button>}
        <button className="ghost" onClick={onLogout}><Icon name="logout" />Sair</button>
      </TopBar>
      <label
        className={'drop' + (over ? ' over' : '') + (loaded ? ' small' : '')}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); load(e.dataTransfer.files) }}
      >
        <input type="file" accept=".xlsx" multiple hidden onChange={e => { load(e.target.files); e.target.value = '' }} />
        <Icon name="upload" />
        <span>{busy ? 'A processar…' : loaded ? <><b>{loaded}</b> — larga mais ficheiros para adicionar ou substituir</> : <><b>Arrasta aqui os ficheiros Excel</b> (Garments e roupa por entregar) ou clica para escolher</>}</span>
      </label>
      {err && <p className="err" role="alert">{err}</p>}
      {deliveries && !garments && <p className="err">Falta o ficheiro Garments para juntar a roupa por entregar.</p>}

      {view && (
        <>
          <p className="sum">
            <b>{view.total.toLocaleString('pt-PT')}</b> peças · <b>{view.nModels}</b> modelos
            {deliveries && <> · <b>{view.pending.toLocaleString('pt-PT')}</b> por entregar</>}
            {view.unmatched > 0 && <span className="err"> · {view.unmatched} chips por entregar não existem no Garments</span>}
          </p>
          <div className="bar">
            <label className="search-wrap"><Icon name="search" />
              <input className="search" type="search" placeholder="Filtrar modelo (código ou descrição)" aria-label="Filtrar modelo" value={q} onChange={e => setQ(e.target.value)} />
            </label>
            <button onClick={exportXlsx} disabled={!view.models.length}><Icon name="download" />Exportar Excel</button>
          </div>
          <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Modelo</th><th>Descrição</th><th className="n">Total</th>
                {deliveries && <th className="n pend">Por entregar</th>}
                {view.statuses.map(v => <th key={v} className="n">{v}</th>)}
                {view.avails.map(v => <th key={v} className="n alt">{v}</th>)}
              </tr>
            </thead>
            {view.models.map(m => (
              <tbody key={m.code}>
                <tr className="model" onClick={() => setOpen(open === m.code ? null : m.code)}>
                  <td className="code"><span className={'chev' + (open === m.code ? ' open' : '')}><Icon name="chevron" /></span>{m.code}</td><td>{m.description}</td><td className="n"><b>{m.items.length}</b></td>
                  {deliveries && <td className="n pend">{m.items.filter(g => g.delivery).length || '–'}</td>}
                  {view.statuses.map(v => <td key={v} className="n">{count(m.items, 'status', v) || '–'}</td>)}
                  {view.avails.map(v => <td key={v} className="n alt">{count(m.items, 'availability', v) || '–'}</td>)}
                </tr>
                {open === m.code && (
                  <tr><td colSpan={3 + (deliveries ? 1 : 0) + view.statuses.length + view.avails.length} className="items">
                    <table>
                      <thead><tr><th>Chip</th><th>Tam.</th><th>Funcionário</th><th>Estado</th><th>Disponib.</th><th>Tipo</th><th>Últ. operação</th>{deliveries && <th>Por entregar a</th>}</tr></thead>
                      <tbody>{[...m.items].sort((a, b) => +!!b.delivery - +!!a.delivery).map(g => (
                        <tr key={g.chip} className={g.delivery ? 'pend' : ''}>
                          <td>{g.chip}</td><td>{g.size}</td><td>{g.employeeCode} {g.employeeName}</td><td>{g.status}</td><td>{g.availability}</td><td>{g.type}</td><td>{fmt(g.date)}</td>
                          {deliveries && <td>{g.delivery && `${g.delivery.employeeCode} ${g.delivery.employeeName} · ${g.delivery.category} · ${fmt(g.delivery.date)}`}</td>}
                        </tr>
                      ))}</tbody>
                    </table>
                  </td></tr>
                )}
              </tbody>
            ))}
          </table>
          </div>
        </>
      )}
    </main>
  )
}
