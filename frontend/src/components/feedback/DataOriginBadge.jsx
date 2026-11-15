export default function DataOriginBadge({ origin, antiguedadHoras }) {
  if (origin === 'demo') {
    return <span className="fv-badge fv-badge-demo">Demostración</span>;
  }
  if (origin === 'backup') {
    const ageText =
      typeof antiguedadHoras === 'number' && Number.isFinite(antiguedadHoras)
        ? ` · ${antiguedadHoras} h`
        : '';
    return <span className="fv-badge fv-badge-backup">Respaldo{ageText}</span>;
  }
  if (origin === 'live') {
    return <span className="fv-badge fv-badge-live">Datos en vivo</span>;
  }
  return <span className="fv-badge fv-badge-neutral">Origen no especificado</span>;
}
