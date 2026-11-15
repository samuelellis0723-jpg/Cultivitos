import { useState } from 'react';
import ChoiceGroup from './ChoiceGroup.jsx';
import FieldError from './FieldError.jsx';

export default function WaterChoice({ options = [], value, onChange, error }) {
  const irrigation = options.filter(o => ['riego_apoyo', 'riego_completo'].includes(o.valor));
  const rain = options.find(o => o.valor === 'secano');
  const unknown = options.find(o => o.valor === 'desconocido');
  const [choosingType, setChoosingType] = useState(false);
  const isIrrigation = irrigation.some(o => o.valor === value);
  const legend = <><span className="farm-number">2</span> ¿Cómo recibe agua?</>;
  if (!rain || !unknown || irrigation.length + 2 !== options.length) return <ChoiceGroup name="riego" legend={legend} options={options} value={value} onChange={onChange} error={error} />;
  return <fieldset className="fv-choice-group">
    <legend className="fv-choice-legend">{legend}</legend>
    <div className="fv-choice-options">
      <label className="fv-choice-option"><input type="radio" name="water-group" checked={!choosingType && value === rain.valor} onChange={() => { setChoosingType(false); onChange(rain.valor); }} /><span>{rain.etiqueta}<small>El agua viene de la lluvia</small></span></label>
      <label className="fv-choice-option"><input type="radio" name="water-group" checked={choosingType || isIrrigation} onChange={() => { setChoosingType(true); if (!isIrrigation) onChange(''); }} /><span>Tengo riego<small>Elige a continuación el tipo</small></span></label>
    </div>
    {(choosingType || isIrrigation) && <div className="farm-irrigation-type"><label htmlFor="irrigation-type">¿Qué tipo de riego usas?</label><select id="irrigation-type" className="fv-select" value={isIrrigation ? value : ''} onChange={e => onChange(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'riego-error' : undefined}><option value="" disabled>Selecciona el tipo de riego</option>{irrigation.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}</select></div>}
    <label className="farm-water-unknown"><input type="radio" name="water-group" checked={!choosingType && value === unknown.valor} onChange={() => { setChoosingType(false); onChange(unknown.valor); }} />{unknown.etiqueta}</label>
    <FieldError id="riego-error" message={error} />
  </fieldset>;
}
