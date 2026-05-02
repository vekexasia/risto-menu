"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { uploadEntryImage, deleteEntryImage } from "@/lib/imageUpload";
import { ApiError, updateEntry, createEntry, reorderEntries, deleteEntry, moveEntry, translateText } from "@/lib/api";
import { useRestaurantStore, useCategories } from "@/stores/restaurantStore";
import { SortableList, DragHandle } from "@/components/admin/SortableList";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { useTranslations } from "@/lib/i18n";

const STANDARD_TRANSLATION_LOCALES = ["en", "de", "fr", "es", "nl", "ru", "pt"];
const TRANSLATE_THROTTLE_MS = 2200; // Gentle pacing: ~27 requests/min, below backend's 30/min limit.

// All available allergen ids — labels are looked up via t("entries.allergen.<id>")
const ALLERGEN_IDS = [
  "Glutine",
  "Crostacei",
  "Uova",
  "Pesce",
  "Arachidi",
  "Soia",
  "Latte-e-Derivati",
  "Frutta-a-Guscio",
  "Sedano",
  "Senape",
  "Sesamo",
  "Anidride-Solforosa-e-Solfiti",
  "Lupini",
  "Molluschi",
];

interface I18nData {
  [locale: string]: {
    name?: string | null;
    desc?: string | null;
  };
}

interface MenuEntry {
  id: string;
  name: string;
  desc?: string;
  price: number;
  order: number;
  outOfStock: boolean;
  frozen: boolean;
  image?: string;
  allergens: string[];
  priceUnit?: string;
  i18n?: I18nData;
  menuIds: string[];
  hidden: boolean;
}

interface Category {
  id: string;
  name: string;
}

// Simple rich text editor component
function RichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const t = useTranslations("admin");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText =
      value.substring(0, start) + before + selectedText + after + value.substring(end);

    onChange(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex gap-1 p-1 bg-gray-50 border-b">
        <button
          type="button"
          onClick={() => insertFormatting("<b>", "</b>")}
          className="px-2 py-1 text-sm font-bold hover:bg-gray-200 rounded"
          title={t("entries.editor.bold")}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("<i>", "</i>")}
          className="px-2 py-1 text-sm italic hover:bg-gray-200 rounded"
          title={t("entries.editor.italic")}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("<u>", "</u>")}
          className="px-2 py-1 text-sm underline hover:bg-gray-200 rounded"
          title={t("entries.editor.underline")}
        >
          U
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm resize-none focus:outline-none"
        rows={rows}
        placeholder={placeholder}
      />
    </div>
  );
}

// Render rich text with HTML tags
function RichText({ html, className }: { html: string; className?: string }) {
  // Only allow safe tags: b, i, u
  const sanitizedHtml = html
    .replace(/<(?!\/?(?:b|i|u)>)[^>]*>/gi, "")
    .replace(/</g, "&lt;")
    .replace(/&lt;(\/?)b&gt;/gi, "<$1b>")
    .replace(/&lt;(\/?)i&gt;/gi, "<$1i>")
    .replace(/&lt;(\/?)u&gt;/gi, "<$1u>");

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

export default function EntriesPage() {
  const t = useTranslations("admin");
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryId = searchParams.get("category");
  const entryId = searchParams.get("entry");
  const entryName = searchParams.get("entryName");

  const allCategories = useCategories();

  const [category, setCategory] = useState<Category | null>(null);
  const [entries, setEntries] = useState<MenuEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<MenuEntry | null>(null);
  const [dismissedDeepLinkEntryId, setDismissedDeepLinkEntryId] = useState<string | null>(null);
  const [isNewEntry, setIsNewEntry] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reorder mode state
  const [reorderMode, setReorderMode] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  /** Menu filter: "ALL" = no filter, "NONE" = entries with no menu memberships, otherwise a menu id. */
  const [menuFilter, setMenuFilter] = useState<string>("ALL");
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<MenuEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Move entry state
  const [movingEntry, setMovingEntry] = useState(false);
  const [selectedTargetCategory, setSelectedTargetCategory] = useState<string>("");

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active translation tab
  const [activeTranslationTab, setActiveTranslationTab] = useState("it");

  // Bulk translate state
  const [bulkTranslating, setBulkTranslating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    done: number;
    total: number;
    success: number;
    failed: number;
    current?: string;
    status?: string;
  } | null>(null);

  const closeEditModal = () => {
    if (entryId) {
      setDismissedDeepLinkEntryId(entryId);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("entry");
      params.delete("entryName");
      const nextUrl = `/admin?${params.toString()}`;
      window.history.replaceState(null, "", nextUrl);
      router.replace(nextUrl);
    }
    setEditingEntry(null);
    setIsNewEntry(false);
  };

  // Load all categories for the move dropdown (also loads entries when API is enabled)
  const { loadRestaurant, categoriesCache, isLoading: storeLoading, data: restaurantData } = useRestaurantStore();

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  // Load entries from the D1-backed store once it has data
  useEffect(() => {
    if (!categoryId) return;
    if (storeLoading) return;
    if (!restaurantData) return; // store hasn't loaded yet — wait

    const catPath = `menuEntries/${categoryId}`;
    const cachedCat = categoriesCache.get(catPath);

    if (!cachedCat) {
      setError("entries.categoryNotFound");
      setLoading(false);
      return;
    }

    setError(null);
    setCategory({ id: cachedCat.id, name: cachedCat.name });

    const loadedEntries: MenuEntry[] = cachedCat.entries.map((e) => ({
      id: e.id,
      name: e.name,
      desc: e.description || "",
      price: e.price,
      order: e.order,
      outOfStock: e.outOfStock,
      frozen: e.containsFrozenIngredient,
      image: e.image,
      allergens: (e.allergens || []) as string[],
      priceUnit: e.priceUnit,
      i18n: (e.i18n || {}) as I18nData,
      menuIds: e.menuIds,
      hidden: e.hidden,
    }));

    setEntries(loadedEntries);
    setLoading(false);
  }, [categoryId, categoriesCache, storeLoading, restaurantData]);

  useEffect(() => {
    if ((!entryId && !entryName) || entries.length === 0) return;
    if (entryId && dismissedDeepLinkEntryId === entryId) return;
    if (entryId && editingEntry?.id === entryId) return;
    const entry = entries.find((e) => e.id === entryId) ?? entries.find((e) => entryName && e.name === entryName);
    if (!entry) return;
    setDismissedDeepLinkEntryId(null);
    setEditingEntry(entry);
    setIsNewEntry(false);
    setActiveTranslationTab("it");
  }, [entryId, entryName, entries, editingEntry?.id, dismissedDeepLinkEntryId]);

  useEffect(() => {
    if (!categoryId) {
      setError("entries.categoryNotSpecified");
      setLoading(false);
    }
  }, [categoryId]);

  const formatPrice = (price: number, priceUnit?: string) => {
    const formatted = `€ ${price.toFixed(2).replace(".", ",")}`;
    return priceUnit ? `${formatted}/${priceUnit}` : formatted;
  };

  const disabledTranslationLocales = (restaurantData?.features?.disabledLocales ?? []) as string[];
  const customTranslationLocales = ((restaurantData?.features?.customLocales ?? []) as { code: string }[]).map((c) => c.code);
  const adminTranslationLocales = Array.from(
    new Set([
      ...STANDARD_TRANSLATION_LOCALES,
      ...customTranslationLocales,
    ].filter((code) => !disabledTranslationLocales.includes(code)))
  );

  const allMenus = restaurantData?.menus ?? [];
  const hiddenEntriesCount = entries.filter((e) => e.hidden || e.menuIds.length === 0).length;
  const filteredByMenu = menuFilter === "ALL"
    ? entries
    : menuFilter === "NONE"
      ? entries.filter((e) => e.menuIds.length === 0)
      : entries.filter((e) => e.menuIds.includes(menuFilter));
  const visibleEntries = (showHidden || reorderMode)
    ? filteredByMenu
    : filteredByMenu.filter((e) => !e.hidden && e.menuIds.length > 0);

  const missingTranslationLocales = (entry: MenuEntry) =>
    adminTranslationLocales.filter((locale) => {
      const translated = entry.i18n?.[locale];
      const missingName = entry.name.trim() && !translated?.name?.trim();
      const missingDesc = entry.desc?.trim() && !translated?.desc?.trim();
      return missingName || missingDesc;
    });

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const sanitizeI18nData = (i18n?: I18nData | null): Record<string, Record<string, string>> => {
    const sanitized: Record<string, Record<string, string>> = {};
    for (const [locale, fields] of Object.entries(i18n || {})) {
      const localeData: Record<string, string> = {};
      if (typeof fields?.name === "string" && fields.name.trim()) localeData.name = fields.name;
      if (typeof fields?.desc === "string" && fields.desc.trim()) localeData.desc = fields.desc;
      if (Object.keys(localeData).length > 0) sanitized[locale] = localeData;
    }
    return sanitized;
  };

  const describeWorkItem = (item: { entry: MenuEntry; locale: string; field: "name" | "desc" }) =>
    `${item.entry.name} → ${item.locale.toUpperCase()} (${item.field === "name" ? t("entries.fieldNameLabel") : t("entries.fieldDescLabel")})`;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !editingEntry || !categoryId) return;

    const file = e.target.files[0];
    setUploadingImage(true);
    setSaveError(null);

    try {
      const imageUrl = await uploadEntryImage(editingEntry.id, file);

      setEditingEntry({ ...editingEntry, image: imageUrl });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingEntry.id ? { ...e, image: imageUrl } : e
        )
      );
    } catch (err) {
      console.error("Error uploading image:", err);
      setSaveError(t("entries.uploadFailed"));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!editingEntry || !categoryId) return;

    setUploadingImage(true);
    setSaveError(null);

    try {
      const success = await deleteEntryImage(editingEntry.id);

      if (success) {
        setEditingEntry({ ...editingEntry, image: undefined });
        setEntries((prev) =>
          prev.map((e) =>
            e.id === editingEntry.id ? { ...e, image: undefined } : e
          )
        );
      } else {
        setSaveError(t("entries.removeImageFailed"));
      }
    } catch (err) {
      console.error("Error deleting image:", err);
      setSaveError(t("entries.removeImageFailed"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!editingEntry || !categoryId) return;

    setSaving(true);
    setSaveError(null);

    try {
      const entryPayload = {
        name: editingEntry.name,
        description: editingEntry.desc || "",
        price: editingEntry.price,
        outOfStock: editingEntry.outOfStock,
        frozen: editingEntry.frozen,
        allergens: editingEntry.allergens,
        priceUnit: editingEntry.priceUnit || undefined,
        i18n: sanitizeI18nData(editingEntry.i18n),
        menuIds: editingEntry.menuIds,
        hidden: editingEntry.hidden,
      };

      await updateEntry(editingEntry.id, entryPayload);

      // Update local state
      setEntries((prev) =>
        prev.map((e) => (e.id === editingEntry.id ? editingEntry : e))
      );

      closeEditModal();
    } catch (err) {
      console.error("Error saving entry:", err);
      setSaveError(t("entries.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const toggleAllergen = (allergenId: string) => {
    if (!editingEntry) return;

    const currentAllergens = editingEntry.allergens || [];
    const newAllergens = currentAllergens.includes(allergenId)
      ? currentAllergens.filter((a) => a !== allergenId)
      : [...currentAllergens, allergenId];

    setEditingEntry({ ...editingEntry, allergens: newAllergens });
  };

  // Create new entry
  const handleAddEntry = () => {
    const maxOrder = entries.length > 0 ? Math.max(...entries.map(e => e.order)) + 1 : 0;
    const defaultMenuIds = (restaurantData?.menus ?? []).map((m) => m.id);
    const newEntry: MenuEntry = {
      id: "", // Will be set after creation
      name: "",
      desc: "",
      price: 0,
      order: maxOrder,
      outOfStock: false,
      frozen: false,
      allergens: [],
      menuIds: defaultMenuIds,
      hidden: false,
    };
    setEditingEntry(newEntry);
    setIsNewEntry(true);
    setActiveTranslationTab("it");
  };

  // Save new or existing entry
  const handleSaveNewEntry = async () => {
    if (!editingEntry || !categoryId) return;

    setSaving(true);
    setSaveError(null);

    try {
      const res = await createEntry(categoryId, {
        name: editingEntry.name,
        description: editingEntry.desc || "",
        price: editingEntry.price,
        order: editingEntry.order,
        outOfStock: editingEntry.outOfStock,
        frozen: editingEntry.frozen,
        allergens: editingEntry.allergens,
        priceUnit: editingEntry.priceUnit || undefined,
        i18n: sanitizeI18nData(editingEntry.i18n),
        menuIds: editingEntry.menuIds,
        hidden: editingEntry.hidden,
      });
      const newId = res.id;

      // Add to local state with the new ID
      const savedEntry = { ...editingEntry, id: newId };
      setEntries((prev) => [...prev, savedEntry]);

      closeEditModal();
    } catch (err) {
      console.error("Error creating entry:", err);
      setSaveError(t("entries.createFailed"));
    } finally {
      setSaving(false);
    }
  };

  // Move entry up or down
  const handleReorder = async (reordered: MenuEntry[]) => {
    // Optimistic local update
    setEntries(reordered.map((entry, i) => ({ ...entry, order: i })));

    try {
      await reorderEntries(
        reordered.map((entry, index) => ({ id: entry.id, order: index }))
      );
    } catch (err) {
      console.error("Error reordering entries:", err);
    }
  };

  // Delete entry
  const handleDeleteEntry = async () => {
    if (!deleteConfirm || !categoryId) return;

    setDeleting(true);

    try {
      await deleteEntry(deleteConfirm.id);

      // Update local state
      setEntries((prev) => prev.filter((e) => e.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting entry:", err);
    } finally {
      setDeleting(false);
    }
  };

  // Move entry to another category
  const handleMoveEntryToCategory = async (targetCategoryId: string) => {
    if (!editingEntry || !categoryId || !targetCategoryId || targetCategoryId === categoryId) {
      return;
    }

    setMovingEntry(true);
    setSaveError(null);

    try {
      await moveEntry(editingEntry.id, targetCategoryId);

      // Close modal and navigate to target category
      setEditingEntry(null);
      setSelectedTargetCategory("");
      router.push(`/admin?s=entries&category=${targetCategoryId}`);
    } catch (err) {
      console.error("Error moving entry:", err);
      setSaveError(t("entries.moveFailed"));
    } finally {
      setMovingEntry(false);
    }
  };

  /**
   * Bulk-translate all entries in the current category.
   * @param overwrite When false (default), skips fields that already have a translation.
   */
  const handleBulkTranslate = async (overwrite = false) => {
    if (!categoryId) return;

    const disabledCodes = (restaurantData?.features?.disabledLocales ?? []) as string[];
    const customCodes = ((restaurantData?.features?.customLocales ?? []) as { code: string }[]).map((c) => c.code);
    const standardCodes = STANDARD_TRANSLATION_LOCALES.filter((l) => !disabledCodes.includes(l));
    const nonItLocales = Array.from(new Set([...standardCodes, ...customCodes.filter((l) => !disabledCodes.includes(l))]));

    type WorkItem = {
      entry: MenuEntry;
      locale: string;
      field: "name" | "desc";
      sourceText: string;
    };

    const workItems: WorkItem[] = [];

    for (const entry of entries) {
      for (const locale of nonItLocales) {
        if (entry.name.trim()) {
          const existing = entry.i18n?.[locale]?.["name"];
          if (!existing || overwrite) {
            workItems.push({ entry, locale, field: "name", sourceText: entry.name });
          }
        }
        if (entry.desc?.trim()) {
          const existing = entry.i18n?.[locale]?.["desc"];
          if (!existing || overwrite) {
            workItems.push({ entry, locale, field: "desc", sourceText: entry.desc });
          }
        }
      }
    }

    if (workItems.length === 0) {
      setBulkProgress({ done: 0, total: 0, success: 0, failed: 0, current: t("entries.bulk.allComplete") });
      setTimeout(() => setBulkProgress(null), 3000);
      return;
    }

    setBulkTranslating(true);
    setBulkProgress({ done: 0, total: workItems.length, success: 0, failed: 0, current: t("entries.bulk.preparing") });

    // Build mutable i18n maps per entry
    const i18nByEntry: Record<string, I18nData> = {};
    for (const entry of entries) {
      i18nByEntry[entry.id] = JSON.parse(JSON.stringify(entry.i18n || {}));
    }

    let done = 0;
    let success = 0;
    let failed = 0;
    for (const item of workItems) {
      const current = describeWorkItem(item);
      setBulkProgress({ done, total: workItems.length, success, failed, current });

      try {
        const { translatedText } = await translateText(item.sourceText, item.locale, item.field);
        if (translatedText) {
          if (!i18nByEntry[item.entry.id][item.locale]) {
            i18nByEntry[item.entry.id][item.locale] = {};
          }
          i18nByEntry[item.entry.id][item.locale][item.field] = translatedText;
          success++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        if (err instanceof ApiError && err.status === 429) {
          setBulkProgress({
            done,
            total: workItems.length,
            success,
            failed,
            current,
            status: t("entries.bulk.autoPause"),
          });
          await sleep(60_000);
        }
      }
      done++;
      const hasMore = done < workItems.length;
      setBulkProgress({
        done,
        total: workItems.length,
        success,
        failed,
        current,
        status: hasMore ? t("entries.bulk.translationInProgress") : undefined,
      });
      if (hasMore) await sleep(TRANSLATE_THROTTLE_MS);
    }

    // Persist each entry that changed. Sanitize first because old imported data can contain null i18n fields.
    const savedI18nByEntry: Record<string, Record<string, Record<string, string>>> = {};
    for (const entry of entries) {
      const updatedI18n = sanitizeI18nData(i18nByEntry[entry.id]);
      const originalI18n = sanitizeI18nData(entry.i18n);
      if (JSON.stringify(updatedI18n) === JSON.stringify(originalI18n)) continue;
      try {
        await updateEntry(entry.id, { i18n: updatedI18n });
        savedI18nByEntry[entry.id] = updatedI18n;
      } catch (err) {
        failed++;
        console.error("Bulk translate save error:", err);
      }
    }

    // Update local state only for entries that were successfully persisted.
    setEntries((prev) =>
      prev.map((e) => savedI18nByEntry[e.id] ? { ...e, i18n: savedI18nByEntry[e.id] } : e)
    );

    setBulkTranslating(false);
    setBulkProgress((prev) => prev ? { ...prev, status: undefined, current: t("entries.bulk.completed") } : null);
    setTimeout(() => setBulkProgress(null), 5000);
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="text-gray-500">{t("entries.loadingEntries")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {t(error)}
        </div>
        <Link
          href={`/admin?s=categories`}
          className="mt-4 inline-block text-primary hover:underline"
        >
          {t("entries.backToCategories")}
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Header with back button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/admin?s=categories`}
            className="p-2 hover:bg-gray-100 rounded-lg shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-gray-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </Link>
          <h2 className="text-lg font-bold text-primary tracking-wider truncate">
            {category?.name.toUpperCase()}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {allMenus.length > 0 && !reorderMode && (
            <select
              value={menuFilter}
              onChange={(e) => setMenuFilter(e.target.value)}
              className="px-2 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 border-0"
              title={t("entries.filterByMenu")}
            >
              <option value="ALL">{t("entries.allMenus")}</option>
              {allMenus.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
              <option value="NONE">{t("entries.noMenu")}</option>
            </select>
          )}
          {hiddenEntriesCount > 0 && !reorderMode && (
            <button
              onClick={() => setShowHidden((v) => !v)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                showHidden ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={showHidden ? t("entries.hideHidden") : t("entries.showHidden")}
            >
              <i className={`fa-solid ${showHidden ? "fa-eye" : "fa-eye-slash"}`} style={{ fontSize: 11 }} />
              {showHidden ? t("entries.hideHiddenShort") : t("entries.showHiddenShort").replace("{count}", String(hiddenEntriesCount))}
            </button>
          )}
          <button
            onClick={() => setReorderMode(!reorderMode)}
            className={`p-2 rounded-lg transition-colors ${
              reorderMode ? "bg-primary text-white" : "hover:bg-gray-100 text-gray-600"
            }`}
            title={reorderMode ? t("entries.endReorder") : t("entries.reorder")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <button
            onClick={handleAddEntry}
            className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            title={t("entries.addEntry")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Bulk translate bar */}
      {!reorderMode && entries.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  ✨
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{t("entries.bulk.title")}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {bulkTranslating
                      ? bulkProgress?.current ?? t("entries.bulk.translationInProgress")
                      : t("entries.bulk.fillOrUpdate")}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {bulkProgress && bulkProgress.total > 0 && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {bulkProgress.done}/{bulkProgress.total}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleBulkTranslate(false)}
                disabled={bulkTranslating}
                className="px-3 py-2 text-xs font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t("entries.bulk.missing")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t("entries.bulk.retranslateConfirm"))) {
                    handleBulkTranslate(true);
                  }
                }}
                disabled={bulkTranslating}
                className="px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t("entries.bulk.retranslate")}
              </button>
            </div>
          </div>

          {bulkProgress && (
            <div className="border-t border-gray-100 bg-gray-50/70 px-3 py-2 space-y-2">
              {bulkProgress.total > 0 && (
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all"
                    style={{ width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%` }}
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {bulkProgress.total > 0 && (
                  <span className="font-semibold text-gray-700">
                    {Math.round((bulkProgress.done / bulkProgress.total) * 100)}%
                  </span>
                )}
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                  {t("entries.bulk.completedCount").replace("{count}", String(bulkProgress.success))}
                </span>
                {bulkProgress.failed > 0 && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                    {t("entries.bulk.failedCount").replace("{count}", String(bulkProgress.failed))}
                  </span>
                )}
                {bulkProgress.status && (
                  <span className="text-gray-500">{bulkProgress.status}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Entries list */}
      {reorderMode ? (
        <SortableList
          items={visibleEntries}
          onReorder={handleReorder}
          className="space-y-3"
          renderItem={(entry, _index, dragHandleProps) => (
            <div
              className={`bg-white rounded-xl p-4 shadow-sm flex gap-4 ${
                entry.outOfStock ? "opacity-50" : ""
              } transition-shadow`}
            >
              <div className="flex flex-col justify-center gap-1">
                <DragHandle
                  ref={dragHandleProps.ref}
                  listeners={dragHandleProps.listeners}
                  attributes={dragHandleProps.attributes}
                />
                <button
                  onClick={() => setDeleteConfirm(entry)}
                  className="p-1 hover:bg-red-100 rounded text-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 flex gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{entry.name}</h4>
                  {entry.desc && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      <RichText html={entry.desc} />
                    </p>
                  )}
                  <p className="text-primary font-medium mt-2">
                    {formatPrice(entry.price, entry.priceUnit)}
                  </p>
                </div>
                {entry.image && (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                    <Image
                      src={entry.image}
                      alt={entry.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        />
      ) : (
        <div className="space-y-3">
          {visibleEntries.map((entry) => {
            const missingLocales = missingTranslationLocales(entry);
            return (
            <div
              key={entry.id}
              className={`bg-white rounded-xl p-4 shadow-sm flex gap-4 ${
                entry.outOfStock ? "opacity-50" : ""
              } cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => {
                setEditingEntry(entry);
                setIsNewEntry(false);
                setActiveTranslationTab("it");
              }}
            >
              <div className="flex-1 flex gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{entry.name}</h4>
                  {entry.desc && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      <RichText html={entry.desc} />
                    </p>
                  )}
                  <p className="text-primary font-medium mt-2">
                    {formatPrice(entry.price, entry.priceUnit)}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {entry.hidden && (
                      <span className="text-xs text-orange-500 font-medium">{t("entries.tag.hidden")}</span>
                    )}
                    {entry.menuIds.length === 0 && (
                      <span className="text-xs text-amber-600 font-medium">{t("entries.tag.noMenu")}</span>
                    )}
                    {allMenus.length > 1 && entry.menuIds.length > 0 && entry.menuIds.length < allMenus.length && (
                      <span className="text-xs text-gray-500 font-medium">
                        {allMenus.filter((m) => entry.menuIds.includes(m.id)).map((m) => m.title).join(" · ")}
                      </span>
                    )}
                    {entry.outOfStock && (
                      <span className="text-xs text-red-500 font-medium">{t("entries.tag.outOfStock")}</span>
                    )}
                    {entry.frozen && !entry.outOfStock && (
                      <span className="text-xs text-blue-500 font-medium">{t("entries.tag.frozen")}</span>
                    )}
                  </div>
                  {missingLocales.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] font-medium text-amber-700">{t("entries.missingLabel")}</span>
                      {missingLocales.map((locale) => (
                        <span
                          key={locale}
                          className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5"
                        >
                          {locale}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {entry.image && (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                    <Image
                      src={entry.image}
                      alt={entry.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          {t("entries.entryEmpty")}
        </div>
      )}

      {/* Edit/Add Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10">
              <h3 className="font-bold text-lg">{isNewEntry ? t("entries.modal.newTitle") : t("entries.modal.editTitle")}</h3>
              <button
                onClick={closeEditModal}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Image Section - only for existing entries */}
              {!isNewEntry && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("entries.modal.imageLabel")}
                </label>
                {editingEntry.image ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-200">
                    <Image
                      src={editingEntry.image}
                      alt={editingEntry.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute bottom-2 right-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 disabled:opacity-50"
                        title={t("entries.modal.changeImage")}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteImage}
                        disabled={uploadingImage}
                        className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 disabled:opacity-50"
                        title={t("entries.modal.removeImage")}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-white font-medium">{t("common.loading")}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <div className="text-gray-500">{t("common.loading")}</div>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-10 h-10 text-gray-400"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                          />
                        </svg>
                        <span className="text-sm text-gray-500">
                          {t("entries.modal.uploadImageCta")}
                        </span>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              )}

              {/* Translation Tabs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("entries.modal.nameDescLabel")}
                </label>
                <TranslationTabs
                  activeTab={activeTranslationTab}
                  onTabChange={setActiveTranslationTab}
                  enabledLocales={restaurantData?.features?.enabledLocales}
                  disabledLocales={restaurantData?.features?.disabledLocales}
                  customLocales={restaurantData?.features?.customLocales}
                  fields={[
                    { key: "name", label: t("entries.modal.nameField"), sourceValue: editingEntry.name },
                    { key: "desc", label: t("entries.modal.descField"), multiline: true, sourceValue: editingEntry.desc || "" },
                  ]}
                  i18n={(editingEntry.i18n || {}) as Record<string, Record<string, string>>}
                  onI18nChange={(updated) =>
                    setEditingEntry((prev) => prev ? { ...prev, i18n: updated as I18nData } : prev)
                  }
                >
                  {/* Italian fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {t("entries.modal.nameItalianMain")}
                      </label>
                      <input
                        type="text"
                        value={editingEntry.name}
                        onChange={(e) =>
                          setEditingEntry({ ...editingEntry, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {t("entries.modal.descItalianMain")}
                      </label>
                      <RichTextEditor
                        value={editingEntry.desc || ""}
                        onChange={(value) =>
                          setEditingEntry({ ...editingEntry, desc: value })
                        }
                        placeholder={t("entries.modal.descPlaceholder")}
                      />
                    </div>
                  </div>
                </TranslationTabs>
              </div>

              {/* Price */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("entries.modal.priceLabel")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEntry.price}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("entries.modal.unitLabel")}
                  </label>
                  <input
                    type="text"
                    value={editingEntry.priceUnit || ""}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        priceUnit: e.target.value || undefined,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder={t("entries.modal.unitPlaceholder")}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingEntry.outOfStock}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        outOfStock: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t("entries.modal.outOfStock")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingEntry.frozen}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        frozen: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t("entries.modal.frozen")}</span>
                </label>
              </div>

              {/* Menu memberships */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("entries.modal.menuLabel")}
                </label>
                {allMenus.length === 0 ? (
                  <p className="text-xs text-gray-500">{t("entries.modal.noMenusDefined")}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {allMenus.map((menu) => {
                      const isSelected = editingEntry.menuIds.includes(menu.id);
                      return (
                        <label
                          key={menu.id}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-primary/10 border-primary"
                              : "bg-white border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const next = isSelected
                                ? editingEntry.menuIds.filter((id) => id !== menu.id)
                                : [...editingEntry.menuIds, menu.id];
                              setEditingEntry({ ...editingEntry, menuIds: next });
                            }}
                            className="sr-only"
                          />
                          <span className="flex-1">
                            <span className="block text-sm font-medium">{menu.title}</span>
                            <span className="block text-xs text-gray-500">{menu.code}</span>
                          </span>
                          {isSelected && (
                            <span className="text-primary text-sm">✓</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
                <label className="flex items-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    checked={editingEntry.hidden}
                    onChange={(e) => setEditingEntry({ ...editingEntry, hidden: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t("entries.modal.hideFromPublic")}</span>
                </label>
              </div>

              {/* Allergens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("entries.modal.allergensLabel")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALLERGEN_IDS.map((id) => {
                    const label = t(`entries.allergen.${id}`);
                    return (
                      <label
                        key={id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          editingEntry.allergens.includes(id)
                            ? "bg-primary/10 border-primary"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={editingEntry.allergens.includes(id)}
                          onChange={() => toggleAllergen(id)}
                          className="sr-only"
                        />
                        <Image
                          src={`/images/allergeni-${id}.png`}
                          alt={label}
                          width={24}
                          height={24}
                          className="rounded-full"
                          unoptimized
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Move to category - only for existing entries */}
              {!isNewEntry && allCategories.length > 1 && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("entries.modal.moveToCategory")}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTargetCategory}
                      onChange={(e) => setSelectedTargetCategory(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg bg-white"
                      disabled={movingEntry}
                    >
                      <option value="">{t("entries.modal.selectCategory")}</option>
                      {allCategories
                        .filter((cat) => cat.id !== categoryId)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleMoveEntryToCategory(selectedTargetCategory)}
                      disabled={!selectedTargetCategory || movingEntry}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-blue-700"
                    >
                      {movingEntry ? t("entries.modal.moving") : t("entries.modal.moveButton")}
                    </button>
                  </div>
                </div>
              )}

              <div className="h-20" />

              {/* Sticky modal footer */}
              <div className="sticky bottom-0 -mx-4 -mb-4 bg-white border-t p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] z-10">
                {saveError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-3">
                    {saveError}
                  </div>
                )}
                <button
                  onClick={isNewEntry ? handleSaveNewEntry : handleSaveEntry}
                  disabled={saving || uploadingImage || (isNewEntry && !editingEntry.name.trim())}
                  className="w-full py-3 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? t("common.saving") : isNewEntry ? t("entries.modal.creatingEntry") : t("entries.modal.savingChanges")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-red-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t("entries.delete.title")}</h3>
              <p className="text-gray-500 mb-6">
                {(() => {
                  const parts = t("entries.delete.confirm").split("{name}");
                  return parts.map((part, i) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && <strong>{deleteConfirm.name}</strong>}
                    </span>
                  ));
                })()}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleDeleteEntry}
                  disabled={deleting}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? t("common.deleting") : t("common.delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
