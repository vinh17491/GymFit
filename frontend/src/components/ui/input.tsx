import { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, id, label, error, hint, icon, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || `input-${generatedId.replace(/:/g, '')}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const describedBy = [ariaDescribedBy, error ? errorId : hint ? hintId : undefined].filter(Boolean).join(' ') || undefined;

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && <label className="label" htmlFor={inputId}>{label}</label>}
        <div className="relative">
          {icon && <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>}
          <input
            ref={ref}
            id={inputId}
            className={cn('input', icon && 'pl-10', error && 'input-error', className)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...props}
          />
        </div>
        {error ? <p id={errorId} className="form-error" role="alert">{error}</p> : hint && <p id={hintId} className="form-hint">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
export default Input;
