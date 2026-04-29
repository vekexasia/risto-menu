import { describe, expect, it } from 'vitest';
import {
  getContentDisplayText,
  getLocalizedContentValue,
  getSearchableContentTexts,
} from './content-presentation';

describe('content presentation', () => {
  const entity = {
    name: 'Baccalà mantecato',
    title: 'Menu',
    description: 'Ricetta classica',
    i18n: {
      en: {
        name: 'Creamed cod',
        title: 'Menu',
        description: 'Classic recipe',
      },
      vec: {
        name: 'Bacalà mantecà',
        title: 'Menù',
        desc: 'Riceta classica',
      },
    },
  };

  describe('getLocalizedContentValue', () => {
    it('returns locale translation when present', () => {
      expect(getLocalizedContentValue(entity, 'name', 'en')).toBe('Creamed cod');
    });

    it('supports desc/description aliases', () => {
      expect(getLocalizedContentValue(entity, 'description', 'vec')).toBe('Riceta classica');
      expect(getLocalizedContentValue(entity, 'description', 'en')).toBe('Classic recipe');
    });

    it('supports title translations', () => {
      expect(getLocalizedContentValue(entity, 'title', 'vec')).toBe('Menù');
    });

    it('falls back to base content when translation is missing', () => {
      expect(getLocalizedContentValue(entity, 'name', 'de')).toBe('Baccalà mantecato');
    });
  });

  describe('getContentDisplayText', () => {
    it('keeps Venetian UI single-line now that translations are complete', () => {
      expect(
        getContentDisplayText({
          entity,
          field: 'name',
          locale: 'vec',
          restaurantId: 'demo-restaurant',
        })
      ).toEqual({
        primary: 'Bacalà mantecà',
        secondary: undefined,
        isDualDisplay: false,
      });
    });

    it('keeps Italian UI single-line', () => {
      expect(
        getContentDisplayText({
          entity,
          field: 'name',
          locale: 'it',
          restaurantId: 'demo-restaurant',
        })
      ).toEqual({
        primary: 'Baccalà mantecato',
        secondary: undefined,
        isDualDisplay: false,
      });
    });

    it('keeps other locales single-line for now', () => {
      expect(
        getContentDisplayText({
          entity,
          field: 'name',
          locale: 'en',
          restaurantId: 'demo-restaurant',
        })
      ).toEqual({
        primary: 'Creamed cod',
        secondary: undefined,
        isDualDisplay: false,
      });
    });

    it('does not force dual display for descriptions', () => {
      expect(
        getContentDisplayText({
          entity,
          field: 'description',
          locale: 'it',
          restaurantId: 'demo-restaurant',
        })
      ).toEqual({
        primary: 'Ricetta classica',
        secondary: undefined,
        isDualDisplay: false,
      });
    });

    it('falls back to base text when Venetian translation is missing', () => {
      expect(
        getContentDisplayText({
          entity: {
            name: 'Sarde in saor',
            i18n: {
              en: { name: 'Sweet and sour sardines' },
            },
          },
          field: 'name',
          locale: 'vec',
          restaurantId: 'demo-restaurant',
        })
      ).toEqual({
        primary: 'Sarde in saor',
        secondary: undefined,
        isDualDisplay: false,
      });
    });
  });

  describe('getSearchableContentTexts', () => {
    it('includes both Venetian and Italian names for Venetian UI search', () => {
      expect(
        getSearchableContentTexts({
          entity,
          field: 'name',
          locale: 'vec',
          restaurantId: 'demo-restaurant',
        })
      ).toEqual(['Baccalà mantecato', 'Bacalà mantecà']);
    });

    it('keeps Italian search on Italian names only', () => {
      expect(
        getSearchableContentTexts({
          entity,
          field: 'name',
          locale: 'it',
          restaurantId: 'demo-restaurant',
        })
      ).toEqual(['Baccalà mantecato']);
    });
  });
});
