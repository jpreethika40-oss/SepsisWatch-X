/**
 * Ember Design System - Warm Clinical Color Palette.
 * Compliant with warm charcoal, ember orange, gold, and emerald specification.
 */

export const EMBER_PALETTE = {
  dark: {
    bgBase: '#0C0B0A',
    surface: '#151311',
    elevated: '#1E1B18',
    border: '#332E29',
    text: '#F3EEE8',
    muted: '#A09689',
    primary: '#F97316', // Ember orange
    gold: '#FBBF24',
    accent: '#10B981', // Emerald
    stable: '#22C55E',
    watch: '#FACC15',
    critical: '#EF4444',
    uncertain: '#B8B0A4',
  },
  light: {
    bgBase: '#FAF8F4',
    surface: '#FFFFFF',
    elevated: '#F1EDE6',
    border: '#DDD6CB',
    text: '#1C1917',
    primary: '#C2410C',
    accent: '#047857',
    stable: '#15803D',
    watch: '#A16207',
    critical: '#B91C1C',
    uncertain: '#57534E',
  },
  // Categorical chart palette for multi-series (Hospital A = ember orange, Hospital B = emerald)
  charts: [
    '#F97316', // Ember Orange (Hospital A)
    '#FBBF24', // Gold
    '#22C55E', // Green
    '#EF4444', // Red
    '#A8A29E', // Warm grey
    '#84CC16', // Lime
    '#B45309', // Amber-brown
    '#78716C', // Stone
  ],
  hospitalA: '#F97316',
  hospitalB: '#10B981',
};
