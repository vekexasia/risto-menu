"use client";

import { useState } from "react";
import { locales, type Locale } from "@/lib/i18n-config";
import { translateText } from "@/lib/api";
import { Flag } from "@/components/ui/Flag";

const STANDARD_LOCALE_META: Record<string, { label: string }> = {
  en: { label: "English" },
  de: { label: "Deutsch" },
  fr: { label: "Français" },
  es: { label: "Español" },
  nl: { label: "Nederlands" },
  ru: { label: "Русский" },
  pt: { label: "Português" },
};

const STANDARD_LOCALES: Locale[] = (locales as readonly string[]).filter(
  (l): l is Locale => l !== "it" && l in STANDARD_LOCALE_META
);

type I18nData = Record<string, Record<string, string>>;

export type TranslationField = {
  key: string;
  label: string;
  multiline?: boolean;
  sourceValue: string;
};

interface TranslationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** Fields to show in non-Italian tabs (name, desc, etc.) */
  fields: TranslationField[];
  /** Current i18n map: { [locale]: { [fieldKey]: value } } */
  i18n: I18nData;
  onI18nChange: (updated: I18nData) => void;
  /** Content to render inside the Italian tab */
  children: React.ReactNode;
  /** Enabled non-Italian locales for public visibility. null/undefined = all enabled. */
  enabledLocales?: string[] | null;
  /** Disabled non-Italian locales — completely hidden from admin and frontend. */
  disabledLocales?: string[] | null;
  /** Admin-defined custom locales (e.g. [{code:"vec", name:"Veneto"}]) */
  customLocales?: { code: string; name: string; flagUrl?: string | null }[] | null;
}

async function callTranslateApi(
  sourceText: string,
  targetLocale: string,
  field: string
): Promise<string> {
  const { translatedText } = await translateText(sourceText, targetLocale, field);
  return translatedText;
}

export function TranslationTabs({
  activeTab,
  onTabChange,
  fields,
  i18n,
  onI18nChange,
  children,
  enabledLocales,
  disabledLocales,
  customLocales,
}: TranslationTabsProps) {
  // Filter out disabled locales — they are completely hidden from admin.
  const disabledSet = new Set(disabledLocales ?? []);
  const allLocales: { code: string; label: string; customFlagUrl?: string | null }[] = [
    ...STANDARD_LOCALES.map((l) => ({ code: l, label: STANDARD_LOCALE_META[l].label })),
    ...(customLocales ?? []).map((cl) => ({ code: cl.code, label: cl.name, customFlagUrl: cl.flagUrl ?? null })),
  ].filter((l) => !disabledSet.has(l.code));
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  const getValue = (locale: string, fieldKey: string) =>
    i18n?.[locale]?.[fieldKey] || "";

  const setValue = (locale: string, fieldKey: string, value: string) => {
    const updated: I18nData = { ...i18n };
    if (value.trim()) {
      updated[locale] = { ...updated[locale], [fieldKey]: value };
    } else {
      const localeData = { ...(updated[locale] || {}) };
      delete localeData[fieldKey];
      if (Object.keys(localeData).length === 0) {
        delete updated[locale];
      } else {
        updated[locale] = localeData;
      }
    }
    onI18nChange(updated);
  };

  const translateField = async (locale: string, field: TranslationField) => {
    if (!field.sourceValue.trim()) return;
    const stateKey = `${locale}.${field.key}`;
    setTranslating((t) => ({ ...t, [stateKey]: true }));
    try {
      const translated = await callTranslateApi(field.sourceValue, locale, field.key);
      setValue(locale, field.key, translated);
    } catch {
      // user can retry manually
    } finally {
      setTranslating((t) => ({ ...t, [stateKey]: false }));
    }
  };

  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const translateBulkAcrossLocales = async (overwrite: boolean) => {
    type WorkItem = { locale: string; field: TranslationField };
    const workItems: WorkItem[] = [];
    for (const locale of allLocales.map((l) => l.code)) {
      for (const field of fields) {
        if (!field.sourceValue.trim()) continue;
        const existing = getValue(locale, field.key);
        if (existing && !overwrite) continue;
        workItems.push({ locale, field });
      }
    }
    if (workItems.length === 0) return;

    setBulkRunning(true);
    setBulkProgress({ done: 0, total: workItems.length });

    const results: Record<string, Record<string, string>> = {};
    let done = 0;
    for (const item of workItems) {
      try {
        const translated = await callTranslateApi(item.field.sourceValue, item.locale, item.field.key);
        if (!results[item.locale]) results[item.locale] = {};
        results[item.locale][item.field.key] = translated;
      } catch {
        // skip individual failures
      }
      done++;
      setBulkProgress({ done, total: workItems.length });
    }

    if (Object.keys(results).length > 0) {
      const updated: I18nData = { ...i18n };
      for (const [locale, fieldsMap] of Object.entries(results)) {
        updated[locale] = { ...(updated[locale] || {}), ...fieldsMap };
      }
      onI18nChange(updated);
    }
    setBulkRunning(false);
    setTimeout(() => setBulkProgress(null), 2500);
  };

  const translateAllFields = async (locale: string) => {
    // Collect all results before writing to avoid stale-closure overwrites.
    // If we called setValue after each await, each call would close over the
    // i18n from *this* render and the second write would erase the first.
    const results: Record<string, string> = {};
    for (const field of fields) {
      if (!field.sourceValue.trim()) continue;
      const stateKey = `${locale}.${field.key}`;
      setTranslating((t) => ({ ...t, [stateKey]: true }));
      try {
        results[field.key] = await callTranslateApi(field.sourceValue, locale, field.key);
      } catch {
        // user can retry the individual field manually
      } finally {
        setTranslating((t) => ({ ...t, [stateKey]: false }));
      }
    }
    if (Object.keys(results).length > 0) {
      const updated: I18nData = { ...i18n };
      updated[locale] = { ...(updated[locale] || {}), ...results };
      onI18nChange(updated);
    }
  };

  /** True if every non-empty source field has a translation for this locale */
  const isLocaleComplete = (locale: string) =>
    fields
      .filter((f) => f.sourceValue.trim())
      .every((f) => getValue(locale, f.key).trim());

  const isTranslatingLocale = (locale: string) =>
    fields.some((f) => translating[`${locale}.${f.key}`]);

  return (
    <div>
      {/* Bulk translate actions */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => translateBulkAcrossLocales(false)}
          disabled={bulkRunning}
          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Mancanti
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Ritraduci tutto? Sovrascriverà le traduzioni esistenti.")) {
              translateBulkAcrossLocales(true);
            }
          }}
          disabled={bulkRunning}
          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Ritraduci
        </button>
        {bulkProgress && (
          <span className="text-xs text-gray-500">
            {bulkRunning
              ? `Traduzione ${bulkProgress.done}/${bulkProgress.total}…`
              : `Completato (${bulkProgress.done}/${bulkProgress.total})`}
          </span>
        )}
      </div>

      {/* Tab row */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {/* Italian */}
        <button
          type="button"
          onClick={() => onTabChange("it")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "it"
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Flag code="it" decorative />
          <span>Italiano</span>
        </button>

        {/* Non-Italian locales */}
        {allLocales.map(({ code, label, customFlagUrl }) => {
          const complete = isLocaleComplete(code);
          const isActive = activeTab === code;
          const isPublic = enabledLocales == null || enabledLocales.includes(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => onTabChange(code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : isPublic
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100 border border-dashed border-gray-300"
              }`}
            >
              <Flag code={code} customUrl={customFlagUrl} decorative />
              <span>{label}</span>
              {!isPublic && (
                <span className={`text-xs px-1 rounded-full leading-4 ${isActive ? "bg-gray-300 text-gray-700" : "bg-gray-100 text-gray-400"}`}>
                  nascosta
                </span>
              )}
              <span
                className={`text-xs px-1 rounded-full leading-4 ${
                  complete
                    ? isActive
                      ? "bg-green-200 text-green-800"
                      : "bg-green-100 text-green-700"
                    : isActive
                    ? "bg-yellow-200 text-yellow-800"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {complete ? "✓" : "!"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Italian tab content */}
      {activeTab === "it" && <>{children}</>}

      {/* Non-Italian tab content */}
      {activeTab !== "it" && (() => {
        const locale = activeTab;
        const localeInfo = allLocales.find((l) => l.code === locale) ?? { code: locale, label: locale };
        const isRunning = isTranslatingLocale(locale);

        return (
          <div className="space-y-3">
            {/* Translate-all button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => translateAllFields(locale)}
                disabled={isRunning}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {isRunning ? "⏳ Traduzione in corso..." : `✨ Traduci tutto in ${localeInfo.label}`}
              </button>
            </div>

            {/* Per-field inputs */}
            {fields.map((field) => {
              const stateKey = `${locale}.${field.key}`;
              const isFieldTranslating = translating[stateKey];
              const currentValue = getValue(locale, field.key);

              return (
                <div key={field.key}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-500">
                      {field.label} ({localeInfo.label})
                    </label>
                    <button
                      type="button"
                      onClick={() => translateField(locale, field)}
                      disabled={isFieldTranslating || !field.sourceValue.trim()}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40"
                      title="Traduci automaticamente"
                    >
                      {isFieldTranslating ? "⏳" : "✨ Auto"}
                    </button>
                  </div>
                  {field.multiline ? (
                    <textarea
                      value={currentValue}
                      onChange={(e) => setValue(locale, field.key, e.target.value)}
                      placeholder={field.sourceValue || "Traduzione..."}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg text-sm resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => setValue(locale, field.key, e.target.value)}
                      placeholder={field.sourceValue}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
