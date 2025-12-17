import { Suspense } from "react";
import CustomerVerifyClient from "./CustomerVerifyClient";

export default function CustomerVerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Verifying...</div>}>
      <CustomerVerifyClient />
    </Suspense>
  );
}
