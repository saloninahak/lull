import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** a quiet line under the field, read out with it */
  hint?: string;
};

/** a soft pill input with a small muted label (readme 3.1: pills, hairlines) */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, className, ...rest },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={id} className="meta pl-4">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-describedby={hint ? hintId : undefined}
        className={cx(
          'h-11 w-full rounded-pill border border-hairline bg-surface px-4 text-[15px] text-ink',
          'placeholder:text-muted transition-colors duration-200 ease-soft',
          'hover:border-ink/15 focus-visible:outline-offset-0',
          className,
        )}
        {...rest}
      />
      {hint ? (
        <p id={hintId} role="alert" className="meta pl-4">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
