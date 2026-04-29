import type { I18nMap } from './types';

export type LocalizedContentField = 'name' | 'description' | 'title';

export interface LocalizedContentEntity {
  name?: string;
  title?: string;
  description?: string;
  desc?: string;
  i18n?: I18nMap;
}

interface RestaurantContentPresentationConfig {
  primaryLanguage: string;
  secondaryLanguage?: string;
  enabledUiLocales?: string[];
  dualDisplayFields?: LocalizedContentField[];
}

export interface ContentDisplayText {
  primary: string;
  secondary?: string;
  isDualDisplay: boolean;
}

// Frontend-owned presentation overrides until restaurant-level localization
// settings are exposed by the catalog/API. Self-hosters can extend this map
// with per-restaurant primary/secondary language rules.
const RESTAURANT_CONTENT_PRESENTATION: Record<string, RestaurantContentPresentationConfig> = {};

export function getLocalizedContentValue(
  entity: LocalizedContentEntity,
  field: LocalizedContentField,
  language?: string
): string {
  if (language) {
    const translatedValue = getTranslatedFieldValue(entity.i18n, language, field);
    if (translatedValue) {
      return translatedValue;
    }
  }

  return getBaseFieldValue(entity, field);
}

export function getContentDisplayText({
  entity,
  field = 'name',
  locale,
  restaurantId,
}: {
  entity: LocalizedContentEntity;
  field?: LocalizedContentField;
  locale?: string;
  restaurantId?: string;
}): ContentDisplayText {
  const localeValue = getLocalizedContentValue(entity, field, locale);
  const config = restaurantId ? RESTAURANT_CONTENT_PRESENTATION[restaurantId] : undefined;

  if (!config || !shouldUseDualDisplay(config, field, locale)) {
    return {
      primary: localeValue,
      secondary: undefined,
      isDualDisplay: false,
    };
  }

  const primary =
    getLocalizedContentValue(entity, field, config.primaryLanguage) || localeValue;
  const secondary = config.secondaryLanguage
    ? getLocalizedContentValue(entity, field, config.secondaryLanguage)
    : undefined;

  if (!secondary || normalizeForComparison(primary) === normalizeForComparison(secondary)) {
    return {
      primary,
      secondary: undefined,
      isDualDisplay: false,
    };
  }

  return {
    primary,
    secondary,
    isDualDisplay: true,
  };
}

export function getSearchableContentTexts({
  entity,
  field = 'name',
  locale,
  restaurantId,
}: {
  entity: LocalizedContentEntity;
  field?: LocalizedContentField;
  locale?: string;
  restaurantId?: string;
}): string[] {
  const config = restaurantId ? RESTAURANT_CONTENT_PRESENTATION[restaurantId] : undefined;
  const shouldIncludeDualDisplayVariants = !!config && shouldUseDualDisplay(config, field, locale);
  const values = [
    getBaseFieldValue(entity, field),
    getLocalizedContentValue(entity, field, locale),
    shouldIncludeDualDisplayVariants && config?.primaryLanguage
      ? getLocalizedContentValue(entity, field, config.primaryLanguage)
      : '',
    shouldIncludeDualDisplayVariants && config?.secondaryLanguage
      ? getLocalizedContentValue(entity, field, config.secondaryLanguage)
      : '',
  ];

  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function shouldUseDualDisplay(
  config: RestaurantContentPresentationConfig,
  field: LocalizedContentField,
  locale?: string
): boolean {
  const allowedFields = config.dualDisplayFields ?? ['name'];
  const allowedLocales = config.enabledUiLocales;

  if (!allowedFields.includes(field)) {
    return false;
  }

  if (!allowedLocales || allowedLocales.length === 0) {
    return true;
  }

  return !!locale && allowedLocales.includes(locale);
}

function getBaseFieldValue(
  entity: LocalizedContentEntity,
  field: LocalizedContentField
): string {
  if (field === 'name') {
    return entity.name?.trim() || '';
  }

  if (field === 'title') {
    return entity.title?.trim() || '';
  }

  return entity.description?.trim() || entity.desc?.trim() || '';
}

function getTranslatedFieldValue(
  i18n: I18nMap | undefined,
  language: string,
  field: LocalizedContentField
): string {
  const translation = i18n?.[language];
  if (!translation) {
    return '';
  }

  if (field === 'name') {
    return translation.name?.trim() || '';
  }

  if (field === 'title') {
    return translation.title?.trim() || '';
  }

  return translation.description?.trim() || translation.desc?.trim() || '';
}

function normalizeForComparison(value: string): string {
  return value.trim().toLocaleLowerCase();
}
