/**
 * Universal Color Palettes & Theme Tokens for CloudNotes
 */

export interface NoteCoverPalette {
  id: string;
  name: string;
  primary: string; // Accent color
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  badge: string;
  cardBgLight: string;
  cardBgDark: string;
  cardBorderLight: string;
  cardBorderDark: string;
  cardHoverDark: string;
}

export const NOTE_PALETTES: NoteCoverPalette[] = [
  {
    id: 'amber',
    name: 'Warm Amber',
    primary: '#F59E0B',
    bgLight: '#FEF3C7',
    bgDark: 'rgba(245, 158, 11, 0.16)',
    borderLight: '#FDE68A',
    borderDark: 'rgba(245, 158, 11, 0.32)',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    cardBgLight: '#FDFBF7',
    cardBorderLight: '#F3E8CE',
    cardBgDark: '#1c1813',
    cardBorderDark: 'rgba(245, 158, 11, 0.28)',
    cardHoverDark: '#231e17',
  },
  {
    id: 'emerald',
    name: 'Emerald Mint',
    primary: '#10B981',
    bgLight: '#D1FAE5',
    bgDark: 'rgba(16, 185, 129, 0.16)',
    borderLight: '#A7F3D0',
    borderDark: 'rgba(16, 185, 129, 0.32)',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    cardBgLight: '#F7FCF9',
    cardBorderLight: '#D3EFE1',
    cardBgDark: '#121c16',
    cardBorderDark: 'rgba(16, 185, 129, 0.28)',
    cardHoverDark: '#17241c',
  },
  {
    id: 'sapphire',
    name: 'Sapphire Blue',
    primary: '#3B82F6',
    bgLight: '#DBEAFE',
    bgDark: 'rgba(59, 130, 246, 0.16)',
    borderLight: '#BFDBFE',
    borderDark: 'rgba(59, 130, 246, 0.32)',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    cardBgLight: '#F7FAFD',
    cardBorderLight: '#D6E5F8',
    cardBgDark: '#131924',
    cardBorderDark: 'rgba(59, 130, 246, 0.28)',
    cardHoverDark: '#18202d',
  },
  {
    id: 'violet',
    name: 'Royal Violet',
    primary: '#8B5CF6',
    bgLight: '#EDE9FE',
    bgDark: 'rgba(139, 92, 246, 0.16)',
    borderLight: '#DDD6FE',
    borderDark: 'rgba(139, 92, 246, 0.32)',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    cardBgLight: '#FAF7FD',
    cardBorderLight: '#E5DAF6',
    cardBgDark: '#191424',
    cardBorderDark: 'rgba(139, 92, 246, 0.28)',
    cardHoverDark: '#1f192d',
  },
  {
    id: 'rose',
    name: 'Ruby Rose',
    primary: '#F43F5E',
    bgLight: '#FFE4E6',
    bgDark: 'rgba(244, 63, 94, 0.16)',
    borderLight: '#FECDD3',
    borderDark: 'rgba(244, 63, 94, 0.32)',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    cardBgLight: '#FDF6F7',
    cardBorderLight: '#F8D7DF',
    cardBgDark: '#221318',
    cardBorderDark: 'rgba(244, 63, 94, 0.28)',
    cardHoverDark: '#29171e',
  },
  {
    id: 'cyan',
    name: 'Cyan Teal',
    primary: '#06B6D4',
    bgLight: '#CFFAFE',
    bgDark: 'rgba(6, 182, 212, 0.16)',
    borderLight: '#A5F3FC',
    borderDark: 'rgba(6, 182, 212, 0.32)',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    cardBgLight: '#F5FBFC',
    cardBorderLight: '#D0EDF3',
    cardBgDark: '#111d22',
    cardBorderDark: 'rgba(6, 182, 212, 0.28)',
    cardHoverDark: '#16252b',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Slate',
    primary: '#a1a1aa',
    bgLight: '#F1F5F9',
    bgDark: 'rgba(161, 161, 170, 0.16)',
    borderLight: '#CBD5E1',
    borderDark: 'rgba(255, 255, 255, 0.14)',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    cardBgLight: '#F9FAFB',
    cardBorderLight: '#E2E5E9',
    cardBgDark: '#18191e',
    cardBorderDark: 'rgba(255, 255, 255, 0.14)',
    cardHoverDark: '#202128',
  },
];

export const DEFAULT_COVER_COLOR = '#F59E0B';

export function getPaletteByColor(hexColor?: string): NoteCoverPalette {
  if (!hexColor) return NOTE_PALETTES[0];
  const found = NOTE_PALETTES.find(p => p.primary.toLowerCase() === hexColor.toLowerCase());
  return found || NOTE_PALETTES[0];
}
