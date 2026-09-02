import type { ReactNode } from "react";

/** The designed nothing. Title says what is missing, description says what to
 *  do, actions do it. `plain` drops the dashed frame for full-page use. */
export function EmptyState({ icon, title, description, actions, plain = false }: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  plain?: boolean;
}) {
  return (
    <div className={`ui-empty${plain ? " ui-empty--plain" : ""}`}>
      {icon && <span className="ui-empty__icon" aria-hidden="true">{icon}</span>}
      <h3 className="ui-empty__title">{title}</h3>
      {description && <p className="ui-empty__desc">{description}</p>}
      {actions && <div className="ui-empty__actions">{actions}</div>}
    </div>
  );
}
