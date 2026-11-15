import Icon from '../common/Icon.jsx';

export default function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <span id={id} className="fv-field-error" role="alert">
      <Icon name="alert" size={15} />
      <span>{message}</span>
    </span>
  );
}
