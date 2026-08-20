import type { FormConfig } from "@/types";

interface FormCardProps {
  form: FormConfig;
  isClosed?: boolean;
}

export function FormCard({ form, isClosed = false }: FormCardProps) {
  const isNew =
    form.newForm === true ||
    String(form.newForm || "").trim().toLowerCase() === "yes" ||
    String(form.newForm || "").trim().toLowerCase() === "true";

  const priorityVal = String(form.priority ?? form.isPriority ?? "").trim().toLowerCase();
  const isPriority =
    form.priority === true ||
    form.isPriority === true ||
    priorityVal === "yes" ||
    priorityVal === "true";

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
