"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminContent from "../AdminContent";

import AdminCategoriesPage from "@/components/admin/pages/CategoriesPage";
import CategoryEntriesPage from "@/components/admin/pages/EntriesPage";
import AdminHoursPage from "@/components/admin/pages/HoursPage";
import AdminMenusPage from "@/components/admin/pages/MenusPage";
import AdminSettingsPage, { type SettingsSection } from "@/components/admin/pages/SettingsPage";
import AnalyticsPage from "@/components/admin/pages/AnalyticsPage";

function AdminRouterInner() {
  const searchParams = useSearchParams();
  const section = searchParams.get("s");

  let content: React.ReactNode;
  switch (section) {
    case "menus":
      content = <AdminMenusPage />;
      break;
    case "entries":
      content = <CategoryEntriesPage />;
      break;
    case "hours":
      content = <AdminHoursPage />;
      break;
    case "settings":
      content = <AdminSettingsPage />;
      break;
    case "settings-profile":
    case "settings-languages":
    case "settings-communications":
    case "settings-chat-ai":
    case "settings-publishing": {
      const sub = section.replace("settings-", "") as SettingsSection;
      content = <AdminSettingsPage section={sub} />;
      break;
    }
    case "analytics":
      content = <AnalyticsPage />;
      break;
    case "categories":
    default:
      content = <AdminCategoriesPage />;
      break;
  }

  return <AdminContent>{content}</AdminContent>;
}

export default function AdminCatchAllPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <AdminRouterInner />
    </Suspense>
  );
}
