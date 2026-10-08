import { Icon, type IconName } from './icons.tsx';

interface StateMessageProps {
  /** `alert` for failures, default `status` for informational states. */
  tone?: 'status' | 'alert';
  icon?: IconName;
  title: string;
  hint?: string;
}

/**
 * A non-empty state that explains itself: an icon for shape, a heading for the
 * situation, and a hint for what to do next. Previously these were bare
 * sentences, which read as an unfinished screen.
 */
export function StateMessage({ tone = 'status', icon = 'empty', title, hint }: StateMessageProps) {
  return (
    <div className="state" role={tone}>
      <Icon name={icon} size={40} strokeWidth={1.5} className="state__icon" />
      <h2 className="state__title">{title}</h2>
      {hint ? <p className="state__hint">{hint}</p> : null}
    </div>
  );
}
