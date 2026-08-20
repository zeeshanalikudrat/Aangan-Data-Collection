import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormById } from "@/lib/forms-registry";
import { fetchLocationListFromGAS, fetchDropdownOptionsFromGAS } from "@/lib/gas-service";
import { FormRenderer } from "@/components/forms/FormRenderer";
import type { LocationMasterRow, DropdownMasterOption } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface FormPageProps {
  params: Promise<{ formId: string }>;
}

export async function generateMetadata({ params }: FormPageProps): Promise<Metadata> {
  const { formId } = await params;
  const form = getFormById(formId);

  return {
    title: form ? `${form.config.title} — Aangan Trust` : "Form Not Found",
  };
}

export default async function FormPage({ params }: FormPageProps) {
  const { formId } = await params;
  const form = getFormById(formId);

  if (!form || !form.config.enabled || form.config.status === "Closed") {
    notFound();
  }

  // Preload Master Location List and Dropdowns server-side for instant initial render
  let initialLocationList: LocationMasterRow[] = [];
  let initialDropdowns: DropdownMasterOption[] = [];

  try {
    const hasLocationField = form.fields.some((f) => f.dynamicSource?.type === "location");
    if (hasLocationField) {
      const locRes = await fetchLocationListFromGAS();
      if (locRes.success && locRes.data) {
        initialLocationList = locRes.data;
      }
    }

    const hasDropdownField = form.fields.some((f) => f.dynamicSource?.type === "dropdown");
    if (hasDropdownField) {
      const dropRes = await fetchDropdownOptionsFromGAS(formId);
      if (dropRes.success && dropRes.data) {
        initialDropdowns = dropRes.data;
      }
    }
  } catch (err) {
    console.warn("[FormPage] Preload failed, will fallback to client fetch:", err);
  }

  return (
    <div className="form-page">
      {/* Clean Form Page Header: Left = Form Title, Right = Form ID */}
      <header className="form-page__header">
        <div className="form-page__header-inner">
          <h1 className="form-page__title">{form.config.title}</h1>
          <span className="form-page__id">{form.config.id}</span>
        </div>
      </header>

      <main className="form-page__body">
        <div className="form-page__container">
          <Suspense fallback={<div style={{ padding: "48px 0", textAlign: "center" }}><span className="loading-spinner" /></div>}>
            <FormRenderer
              form={form}
              initialLocationList={initialLocationList}
              initialDropdowns={initialDropdowns}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
