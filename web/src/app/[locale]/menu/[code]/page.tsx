import { Suspense } from "react";
import MenuPageClient from "../MenuPageClient";

export default function MenuByCodePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      }
    >
      <MenuPageClient />
    </Suspense>
  );
}
