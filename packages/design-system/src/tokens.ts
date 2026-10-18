/**
 * Design system tokens (radii, shadows, animations, typography)
 * Refined for Linear/Notion editorial aesthetics with Bento layouts
 */

export const BENTO_RADII = {
  sm: 'rounded-md',    // 6px - badges & chips
  md: 'rounded-lg',    // 8px - buttons & inputs
  lg: 'rounded-xl',    // 12px - cards & dropdowns
  xl: 'rounded-2xl',   // 16px - modals & containers
};

export const TRANSITIONS = {
  default: 'transition-all duration-200 ease-out',
  subtle: 'transition-colors duration-150 ease-out',
  spring: 'transition-all duration-250 cubic-bezier(0.16, 1, 0.3, 1)',
};

export const ELEVATIONS = {
  card: 'shadow-none',
  cardHover: 'hover:border-slate-700 hover:shadow-xl hover:shadow-black/40',
  modal: 'shadow-2xl shadow-black/80',
};

