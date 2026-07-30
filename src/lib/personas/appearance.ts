export const HEIGHT_PROFILES = ['petite', 'average', 'tall'] as const;
export const BODY_BUILDS = ['slim', 'average', 'feminine'] as const;
export const FIGURE_TYPES = ['hourglass', 'pear', 'rectangle', 'inverted', 'apple'] as const;
export const BUST_SIZES = ['small', 'medium', 'large'] as const;
export const PHYSIQUES = ['athletic', 'regular', 'soft'] as const;

export type HeightProfile = (typeof HEIGHT_PROFILES)[number];
export type BodyBuild = (typeof BODY_BUILDS)[number];
export type FigureType = (typeof FIGURE_TYPES)[number];
export type BustSize = (typeof BUST_SIZES)[number];
export type Physique = (typeof PHYSIQUES)[number];

export function isAllowedPersonaAppearanceValue(
  value: unknown,
  allowed: readonly string[],
): value is string {
  return typeof value === 'string' && allowed.includes(value);
}