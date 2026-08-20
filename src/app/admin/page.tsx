import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Admin Login — Aangan Trust",
};

export default function AdminLoginPage() {
  return <LoginForm />;
}
