import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <div className="container-x">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
