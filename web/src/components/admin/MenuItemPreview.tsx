"use client";

import Image from "next/image";

/**
 * Decoupled visual preview of a menu item.
 *
 * Mirrors the look of the public menu's MenuItem + MenuItemDetail components
 * but does NOT import them — so the admin preview never breaks the public
 * site, and the public site never breaks the admin. If the public visuals
 * change, this file should be updated by hand to stay in sync.
 *
 * Takes a plain data object: pre-resolved primary-locale name/description,
 * no store access, no router, no i18n hook.
 */

interface PreviewItemData {
  name: string;
  description?: string;
  price: number;
  priceUnit?: string;
  image?: string | null;
  allergens?: string[];
  outOfStock?: boolean;
  frozen?: boolean;
}

const ALLERGEN_SHORT: Record<string, string> = {
  "Anidride-Solforosa-e-Solfiti": "SO2",
  Arachidi: "AR",
  Crostacei: "CR",
  "Frutta-a-Guscio": "FG",
  Glutine: "GL",
  "Latte-e-Derivati": "LA",
  Lupini: "LU",
  Molluschi: "MO",
  Pesce: "PE",
  Sedano: "SE",
  Senape: "SN",
  Sesamo: "SS",
  Soia: "SO",
  Uova: "UO",
};

function formatPrice(price: number, unit?: string): string {
  const formatted = `€ ${price.toFixed(2).replace(".", ",")}`;
  return unit ? `${formatted}/${unit}` : formatted;
}

function sanitizeRichText(html: string): string {
  if (!html) return "";
  let safe = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  safe = safe
    .replace(/&lt;(\/?)b&gt;/gi, "<$1b>")
    .replace(/&lt;(\/?)i&gt;/gi, "<$1i>")
    .replace(/&lt;(\/?)u&gt;/gi, "<$1u>");
  return safe;
}

/** The list-card collapsed view, as seen in the menu list. */
export function MenuItemCardPreview({ item }: { item: PreviewItemData }) {
  const hasDescription = !!item.description?.trim();
  return (
    <article
      className={`relative border-b-2 border-gray-100 bg-white ${
        item.outOfStock ? "opacity-60" : ""
      }`}
    >
      <div className="px-4 py-4">
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className={`text-base font-medium text-gray-900 ${
                item.outOfStock ? "line-through" : ""
              }`}
            >
              {item.name || <span className="text-gray-400 italic">Untitled</span>}
            </h3>
            {hasDescription && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                {item.description}
              </p>
            )}
            {item.allergens && item.allergens.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.allergens.map((allergen) => (
                  <span
                    key={allergen}
                    className="inline-flex h-5 items-center rounded bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700"
                    title={allergen.replace(/-/g, " ")}
                  >
                    {ALLERGEN_SHORT[allergen] || allergen.slice(0, 2).toUpperCase()}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 font-medium tracking-wide text-gray-700">
              {formatPrice(item.price, item.priceUnit)}
            </p>
            {item.outOfStock && (
              <span className="mt-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Out of Stock
              </span>
            )}
            {item.frozen && (
              <span className="mt-1 inline-block text-xs text-gray-400">
                * Contains frozen ingredients
              </span>
            )}
          </div>
          {item.image && (
            <div className="flex-shrink-0">
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gray-200">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/** The expanded detail view, as seen when a customer taps a card. */
export function MenuItemExpandedPreview({ item }: { item: PreviewItemData }) {
  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
      {item.image && (
        <div className="relative w-full aspect-[4/3] bg-gray-200">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="p-6">
        <div className={item.image ? "flex justify-between items-start gap-4 mb-3" : "mb-3"}>
          <h2 className="text-2xl font-bold text-gray-800 flex-1">
            {item.name || <span className="text-gray-400 italic">Untitled</span>}
          </h2>
          <span className="text-2xl font-bold text-primary whitespace-nowrap">
            {formatPrice(item.price, item.priceUnit)}
          </span>
        </div>
        {item.allergens && item.allergens.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {item.allergens.map((allergen) => (
              <span
                key={allergen}
                className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                title={allergen.replace(/-/g, " ")}
              >
                {ALLERGEN_SHORT[allergen] || allergen}
              </span>
            ))}
          </div>
        )}
        {item.description && (
          <p
            className="text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.description) }}
          />
        )}
        {item.frozen && (
          <p className="mt-4 text-sm text-gray-500 italic">
            * Contains frozen ingredients
          </p>
        )}
      </div>
    </div>
  );
}
