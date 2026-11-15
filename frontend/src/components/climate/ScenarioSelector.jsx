const tabs = [['habitual', 'Habitual'], ['seco', 'Más seco'], ['humedo', 'Más lluvioso']];
export default function ScenarioSelector({ value, onChange, prefix = 'scenario', panelId }) {
  return <div className="fv-tablist" role="tablist" aria-label="Escenarios hipotéticos">
    {tabs.map(([id, label], index) => <button key={id} id={`${prefix}-${id}`} type="button" role="tab" aria-controls={panelId} aria-selected={value === id} tabIndex={value === id ? 0 : -1} className="fv-tab-btn" onClick={() => onChange(id)} onKeyDown={e => {
      const next = e.key === 'ArrowRight' ? (index + 1) % 3 : e.key === 'ArrowLeft' ? (index + 2) % 3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : null;
      if (next !== null) { e.preventDefault(); onChange(tabs[next][0]); document.getElementById(`${prefix}-${tabs[next][0]}`)?.focus(); }
    }}>{label}</button>)}
  </div>;
}
