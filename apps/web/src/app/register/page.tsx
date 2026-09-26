import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return (
    <div className="container-x">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}
