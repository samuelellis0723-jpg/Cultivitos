import FieldError from './FieldError.jsx';

export default function ChoiceGroup({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  hint,
}) {
  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <fieldset className="fv-choice-group" aria-describedby={describedBy}>
      <legend className="fv-choice-legend">{legend}</legend>
      {hint ? (
        <span id={hintId} className="fv-hint">
          {hint}
        </span>
      ) : null}
      <div className="fv-choice-options">
        {(options ?? []).map((opt) => (
          <label key={opt.valor} className="fv-choice-option">
            <input
              type="radio"
              name={name}
              value={opt.valor}
              checked={value === opt.valor}
              onChange={() => onChange(opt.valor)}
            />
            <span>{opt.etiqueta}</span>
          </label>
        ))}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
