import Icon from '../common/Icon.jsx';
import FieldError from './FieldError.jsx';

export default function FarmDetails({
  catalog,
  draft,
  errors,
  onChange,
  onToggleCrop,
  forceOpen,
}) {
  const hasNestedError = Boolean(
    errors.suelo || errors.drenaje || errors.mesInicio || errors.cultivosAnteriores
  );

  return (
    <details
      className="fv-details-box fv-form-section-full"
      open={forceOpen || hasNestedError || undefined}
    >
      <summary className="fv-details-summary">
        <span>Suelo, drenaje, historial y mes de inicio</span>
        <Icon name="chevronDown" size={20} />
      </summary>
      <div className="fv-details-body">
        <div className="fv-field">
          <label className="fv-label" htmlFor="finca-suelo">
            Tipo de suelo
          </label>
          <select
            id="finca-suelo"
            name="suelo"
            className="fv-select"
            value={draft.suelo}
            onChange={(e) => onChange('suelo', e.target.value)}
            aria-invalid={Boolean(errors.suelo)}
            aria-describedby={errors.suelo ? 'suelo-error' : undefined}
          >
            {(catalog?.opcionesFinca?.suelo ?? []).map((opt) => (
              <option key={opt.valor} value={opt.valor}>
                {opt.etiqueta}
              </option>
            ))}
          </select>
          <FieldError id="suelo-error" message={errors.suelo} />
        </div>

        <div className="fv-field">
          <label className="fv-label" htmlFor="finca-drenaje">
            Drenaje de la parcela
          </label>
          <select
            id="finca-drenaje"
            name="drenaje"
            className="fv-select"
            value={draft.drenaje}
            onChange={(e) => onChange('drenaje', e.target.value)}
            aria-invalid={Boolean(errors.drenaje)}
            aria-describedby={errors.drenaje ? 'drenaje-error' : undefined}
          >
            {(catalog?.opcionesFinca?.drenaje ?? []).map((opt) => (
              <option key={opt.valor} value={opt.valor}>
                {opt.etiqueta}
              </option>
            ))}
          </select>
          <FieldError id="drenaje-error" message={errors.drenaje} />
        </div>

        <div className="fv-field">
          <label className="fv-label" htmlFor="finca-mes-inicio">
            Mes de inicio previsto (1–12)
          </label>
          <select
            id="finca-mes-inicio"
            name="mesInicio"
            className="fv-select"
            value={draft.mesInicio}
            onChange={(e) => onChange('mesInicio', Number(e.target.value))}
            aria-invalid={Boolean(errors.mesInicio)}
            aria-describedby={errors.mesInicio ? 'mesInicio-error' : 'mesInicio-hint'}
          >
            {(catalog?.opcionesFinca?.mesInicio ?? []).map((opt) => (
              <option key={opt.valor} value={opt.valor}>
                {opt.valor} — {opt.etiqueta}
              </option>
            ))}
          </select>
          <span id="mesInicio-hint" className="fv-hint">
            Elige el mes en que planeas empezar.
          </span>
          <FieldError id="mesInicio-error" message={errors.mesInicio} />
        </div>

        <fieldset
          className="fv-choice-group"
          aria-describedby={
            errors.cultivosAnteriores ? 'cultivosAnteriores-error' : 'cultivosAnteriores-hint'
          }
        >
          <legend className="fv-choice-legend">
            Cultivos anteriores en la parcela (opcional)
          </legend>
          <span id="cultivosAnteriores-hint" className="fv-hint">
            Marca solo lo que se sembró antes en esta parcela. Si no lo sabes, déjalo sin marcar.
          </span>
          <div className="fv-choice-options">
            {(catalog?.cultivos ?? []).map((crop) => {
              const checked = (draft.cultivosAnteriores ?? []).includes(crop.id);
              return (
                <label key={crop.id} className="fv-choice-option">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleCrop(crop.id)}
                  />
                  <span>{crop.nombre}</span>
                </label>
              );
            })}
          </div>
          <FieldError id="cultivosAnteriores-error" message={errors.cultivosAnteriores} />
        </fieldset>
      </div>
    </details>
  );
}
