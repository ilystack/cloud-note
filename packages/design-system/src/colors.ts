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
    cardBgLight: '#FDF3E3',
    cardBorderLight: '#FCE0BC',
    cardBgDark: '#201910',
    cardBorderDark: 'rgba(245, 158, 11, 0.28)',
    cardHoverDark: '#281f14',
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
    cardBgLight: '#EDF9F2',
    cardBorderLight: '#C7F1DC',
    cardBgDark: '#101e16',
    cardBorderDark: 'rgba(16, 185, 129, 0.28)',
    cardHoverDark: '#14271c',
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
    cardBgLight: '#EDF4FE',
    cardBorderLight: '#CADDFD',
    cardBgDark: '#111a29',
    cardBorderDark: 'rgba(59, 130, 246, 0.28)',
    cardHoverDark: '#152134',
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
    cardBgLight: '#F3EEFE',
    cardBorderLight: '#DFD1FD',
    cardBgDark: '#1b1328',
    cardBorderDark: 'rgba(139, 92, 246, 0.28)',
    cardHoverDark: '#231834',
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
    cardBgLight: '#FEECEF',
    cardBorderLight: '#FDCED6',
    cardBgDark: '#261217',
    cardBorderDark: 'rgba(244, 63, 94, 0.28)',
    cardHoverDark: '#2f161c',
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
    cardBgLight: '#E8F8FA',
    cardBorderLight: '#BDECF2',
    cardBgDark: '#0e1c22',
    cardBorderDark: 'rgba(6, 182, 212, 0.28)',
    cardHoverDark: '#12252c',
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
    cardBgLight: '#F3F4F6',
    cardBorderLight: '#E5E7EB',
    cardBgDark: '#18191e',
    cardBorderDark: 'rgba(255, 255, 255, 0.14)',
    cardHoverDark: '#202128',
  },
];

export const DEFAULT_COVER_COLOR = '#F59E0B';

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length !== 6) {
    return { h: 38, s: 92, l: 50 };
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function getPaletteByColor(hexColor?: string): NoteCoverPalette {
  if (!hexColor) return NOTE_PALETTES[0];
  const found = NOTE_PALETTES.find(p => p.primary.toLowerCase() === hexColor.toLowerCase());
  if (found) return found;

  const { h, s } = hexToHsl(hexColor);
  const isAchromatic = s < 8;
  const cardBgLight = isAchromatic ? '#F3F4F6' : `hsl(${h}, ${Math.min(s, 70)}%, 93%)`;
  const cardBorderLight = isAchromatic ? '#E5E7EB' : `hsl(${h}, ${Math.min(s, 60)}%, 86%)`;
  const cardBgDark = isAchromatic ? '#18191e' : `hsl(${h}, ${Math.min(s, 40)}%, 11%)`;
  const cardBorderDark = isAchromatic ? 'rgba(255, 255, 255, 0.12)' : `hsl(${h}, ${Math.min(s, 40)}%, 24%)`;
  const cardHoverDark = isAchromatic ? '#202128' : `hsl(${h}, ${Math.min(s, 45)}%, 14%)`;

  return {
    id: 'custom',
    name: 'Custom',
    primary: hexColor,
    bgLight: hexColor + '20',
    bgDark: hexColor + '28',
    borderLight: hexColor + '40',
    borderDark: hexColor + '48',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    cardBgLight,
    cardBorderLight,
    cardBgDark,
    cardBorderDark,
    cardHoverDark,
  };
}
