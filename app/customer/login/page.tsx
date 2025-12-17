import { Suspense } from "react";

import CustomerLoginClient from "./CustomerLoginClient";

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <CustomerLoginClient />
    </Suspense>
  );
}
