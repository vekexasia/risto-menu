import { z } from 'zod';

// ── Enums ───────────────────────────────────────────────────────────

export const MenuVisibilitySchema = z.enum(['all', 'seated', 'takeaway', 'hidden']);
export type MenuVisibility = z.infer<typeof MenuVisibilitySchema>;

export const MENU_VISIBILITIES = MenuVisibilitySchema.options;

export const MembershipRoleSchema = z.enum(['owner', 'manager', 'editor', 'staff']);
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;

export const MEMBERSHIP_ROLES = MembershipRoleSchema.options;

export const AllergenSchema = z.enum([
  'Anidride-Solforosa-e-Solfiti',
  'Arachidi',
  'Crostacei',
  'Frutta-a-Guscio',
  'Glutine',
  'Latte-e-Derivati',
  'Lupini',
  'Molluschi',
  'Pesce',
  'Sedano',
  'Senape',
  'Sesamo',
  'Soia',
  'Uova',
]);
export type Allergen = z.infer<typeof AllergenSchema>;

export const ALLERGENS = AllergenSchema.options;

export const ExtrasTypeSchema = z.enum(['zeroorone', 'zeroormulti']);
export type ExtrasType = z.infer<typeof ExtrasTypeSchema>;

export const MenuSelectionSchema = z.enum(['SEATED', 'TAKEAWAY']);
export type MenuSelection = z.infer<typeof MenuSelectionSchema>;

export const AnalyticsPeriodSchema = z.enum(['24h', '7d', '30d', 'all']);
export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriodSchema>;

export const PublicationStateSchema = z.enum(['draft', 'published']);
export type PublicationState = z.infer<typeof PublicationStateSchema>;

// ── i18n ────────────────────────────────────────────────────────────

export const I18nMapSchema = z.record(z.string(), z.record(z.string(), z.string()));
export type I18nMap = z.infer<typeof I18nMapSchema>;
