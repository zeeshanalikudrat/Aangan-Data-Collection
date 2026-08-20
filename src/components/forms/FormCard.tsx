import type { FormConfig } from "@/types";

interface FormCardProps {
  form: FormConfig;
  isClosed?: boolean;
}

function checkIsTrueOrYes(val: unknown): boolean {
  if (val === true) return true;
  if (typeof val === "string") {
    const clean = val.trim().toLowerCase();
    return clean === "yes" || clean === "true" || clean === "1";
  }
  if (typeof val === "number") return val === 1;
  return false;
}

export function FormCard({ form, isClosed = false }: FormCardProps) {
  const isNew = checkIsTrueOrYes(form.newForm);
  const isPriority = checkIsTrueOrYes(form.priority) || checkIsTrueOrYes(form.isPriority);

  if (isClosed) {
    return (
      <div className="form-card form-card--closed" aria-disabled="true">
        <div className="form-card__content">
          <div className="form-card__header-row">
            <span className="form-card__title">{form.title}</span>
            <span className="badge badge--closed">Closed</span>
          </div>
          <div className="form-card__meta-row">
            <span className="form-card__id">{form.id}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <a
      href={`/forms/${form.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`form-card${isPriority ? " form-card--priority" : ""}`}
      title={`${form.title} (Opens in new tab)`}
    >
      <div className="form-card__content">
        <div className="form-card__header-row">
          <span className="form-card__title">{form.title}</span>
          {isNew && (
            <span className="badge badge--new">
              <span className="badge__dot" aria-hidden="true" />
              NEW
            </span>
          )}
        </div>
        <div className="form-card__meta-row">
          <span className="form-card__id">{form.id}</span>
        </div>
      </div>
      <span className="form-card__chevron" aria-hidden="true">→</span>
    </a>
  );
}
