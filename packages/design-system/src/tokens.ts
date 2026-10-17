/**
 * Design system tokens (radii, shadows, animations, typography)
 */

export const BENTO_RADII = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
};

export const TRANSITIONS = {
  default: 'transition-all duration-200 ease-in-out',
  spring: 'transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export const ELEVATIONS = {
  card: 'shadow-sm hover:shadow-md dark:shadow-none',
  cardHover: 'hover:-translate-y-0.5 hover:shadow-lg',
  modal: 'shadow-2xl',
};
