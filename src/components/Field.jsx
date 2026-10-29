import { useId } from "react";

/**
 * Reusable form field: label + control + helper text + error message.
 * The control is passed as a render function so we can wire up the
 * accessibility attributes (id, aria-describedby, aria-invalid) in one place.
 */
export default function Field({
  label,
  required = false,
  helper,
  error,
  counter, // optional { current, max }
  children,
}) {
  const id = useId();
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  const describedBy =
    [helper ? helperId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={`field ${error ? "field--error" : ""}`}>
      <div className="field__label-row">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        <span
          className={`field__badge ${required ? "field__badge--required" : ""}`}
        >
          {required ? "Required" : "Optional"}
        </span>
      </div>

      {helper && (
        <p className="field__helper" id={helperId}>
          {helper}
        </p>
      )}

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : undefined,
      })}

      <div className="field__footer">
        {error ? (
          <p className="field__error" id={errorId} role="alert">
            {error}
          </p>
        ) : (
          <span />
        )}
        {counter && (
          <span
            className={`field__counter ${
              counter.current > counter.max ? "field__counter--over" : ""
            }`}
          >
            {counter.current}/{counter.max}
          </span>
        )}
      </div>
    </div>
  );
}
