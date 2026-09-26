import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata: Metadata = { title: "Console", robots: { index: false } };

export default async function AdminPage({ params }: PageProps<"/admin/[[...section]]">) {
  const { section } = await params;
  return <AdminConsole section={section?.[0] ?? ""} />;
}
