// Pantallas del flujo compartido de importación: buscando → revisar dudosas → hecho.
import { useNavigate } from 'react-router-dom'
import type { ImportFlow } from '../lib/import/useImportFlow'

export function ImportFlowView({ flow }: { flow: ImportFlow }) {
  const nav = useNavigate()
  const { step, progress, sure, doubtful, notFound, summary } = flow
  const resolved = sure.length + doubtful.filter((d) => d.chosenItem).length

  if (step === 'matching') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
        <div className="w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
        <h2 className="serif text-xl font-semibold">Buscando tus obras…</h2>
        {progress && <p className="text-sm text-mute">{progress.current} de {progress.total}</p>}
        <p className="text-xs text-mute max-w-xs leading-relaxed">Las casamos con el catálogo (Wikidata, TVmaze, Open Library y MusicBrainz).</p>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="flex-1 flex flex-col gap-6 p-5 max-w-md mx-auto w-full">
        <div className="rounded-3xl bg-surface border border-line p-5">
          <div className="label-caps text-mute">Resultado</div>
          <div className="serif text-3xl font-semibold mt-1">{sure.length} encontradas</div>
          <p className="text-xs text-mute mt-2">
            {doubtful.length} dudosas · {notFound.length} sin encontrar
          </p>
        </div>

        {doubtful.length > 0 && (
          <section className="space-y-3">
            <h2 className="label-caps text-mute px-1">Revisa las dudosas</h2>
            <div className="space-y-3">
              {doubtful.map((d, idx) => (
                <div key={idx} className="bg-surface border border-line rounded-2xl p-4 space-y-3">
                  <div className="text-sm font-semibold">
                    {d.row.title} {d.row.year ? <span className="text-mute font-normal">({d.row.year})</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {d.candidates.slice(0, 3).map((c, cIdx) => {
                      const chosen = d.chosenItem?.title === c.title
                      return (
                        <button
                          key={cIdx}
                          onClick={() => flow.resolveCandidate(idx, c)}
                          className={`min-h-[40px] text-xs px-3 rounded-xl border text-left ${chosen ? 'bg-accent text-accent-ink border-accent' : 'bg-surface2 border-line text-ink'}`}
                        >
                          {c.title} ({c.year ?? '?'}){chosen ? ' ✓' : ''}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => flow.skipCandidate(idx)}
                      className={`min-h-[40px] text-xs px-3 rounded-xl border ${d.chosenItem === null ? 'bg-stamp-red/20 text-stamp-red border-stamp-red' : 'bg-surface2 border-line text-mute'}`}
                    >
                      Ninguna
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-auto pt-2">
          <button
            onClick={flow.confirm}
            className="w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold active:scale-[0.98] transition-transform"
          >
            Añadir {resolved} {resolved === 1 ? 'obra' : 'obras'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-5">
        <div className="w-14 h-14 rounded-full bg-accent/20 text-accent flex items-center justify-center text-2xl font-bold">✓</div>
        <h2 className="serif text-2xl font-semibold">Hecho</h2>
        {summary && (
          <p className="text-sm text-mute max-w-xs leading-relaxed">
            Hemos añadido {summary.created} {summary.created === 1 ? 'obra nueva' : 'obras nuevas'} a tus estanterías
            {summary.updated > 0 && ` y puesto estrellas a ${summary.updated}`}.
            {summary.skipped > 0 && ` Otras ${summary.skipped} ya estaban.`}
          </p>
        )}
        <button onClick={() => nav('/')} className="mt-2 px-6 min-h-[48px] rounded-2xl bg-accent text-accent-ink font-semibold active:scale-95 transition-transform">
          Ir a mis estanterías
        </button>
      </div>
    )
  }

  return null
}
