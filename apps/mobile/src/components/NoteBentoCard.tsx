import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { LocalNote } from '@cloudnotes/shared-types';
import { getPaletteByColor } from '@cloudnotes/design-system';
import { 
  FileText, 
  Lock, 
  Unlock,
  Paperclip, 
  Trash2, 
  Archive, 
  ArchiveRestore, 
  RotateCcw,
  Clock
} from 'lucide-react-native';

interface NoteBentoCardProps {
  note: LocalNote;
  variant?: 'compact' | 'full';
  isTrash?: boolean;
  isVaultUnlocked?: boolean;
  onPress: () => void;
  onDelete: () => void;
  onArchiveToggle?: () => void;
  onRestore?: () => void;
}

// Clean markdown excerpt helper matching web
function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '[Image]')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{1,3}.*?`{1,3}/gs, '[Code]')
    .replace(/>\s+/g, '')
    .replace(/[-*+]\s+/g, '• ')
    .replace(/\n+/g, ' ')
    .trim();
}

export const NoteBentoCard: React.FC<NoteBentoCardProps> = ({
  note,
  variant = 'compact',
  isTrash = false,
  isVaultUnlocked = false,
  onPress,
  onDelete,
  onArchiveToggle,
  onRestore,
}) => {
  const palette = getPaletteByColor(note.cover_color);
  const isLocked = Boolean(note.is_locked);
  const isArchived = Boolean(note.is_archived);

  let attachmentCount = 0;
  if (note.attachments_json) {
    try {
      const arr = JSON.parse(note.attachments_json);
      if (Array.isArray(arr)) attachmentCount = arr.length;
    } catch {
      attachmentCount = 0;
    }
  }

  const updatedDate = new Date(note.client_updated_at || note.updated_at || Date.now());
  const dateStr = updatedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const timeStr = updatedDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const formattedDate = `${dateStr}, ${timeStr}`;

  const rawExcerpt = note.excerpt || note.content || '';
  const displayExcerpt = isLocked && !isVaultUnlocked 
    ? '●●● Encrypted with Stealth PIN'
    : cleanMarkdown(rawExcerpt) || 'No content provided.';

  // --- FULL WIDTH VARIANT (Single / Memanjang) ---
  if (variant === 'full') {
    return (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        style={[
          styles.fullCard,
          {
            borderLeftColor: palette.primary,
            borderLeftWidth: 4,
          },
        ]}
      >
        {/* Top Header Row */}
        <View style={styles.fullHeaderRow}>
          <View style={styles.fullTitleGroup}>
            <View style={[styles.iconBadge, { backgroundColor: palette.bgDark, borderColor: palette.borderDark }]}>
              <FileText size={15} color={palette.primary} />
            </View>
            <Text style={styles.fullTitle} numberOfLines={1}>
              {note.title || 'Untitled Note'}
            </Text>
          </View>

          <View style={styles.badgesRow}>
            {isLocked && (
              isVaultUnlocked ? (
                <View style={styles.unlockedBadge}>
                  <Unlock size={11} color="#10B981" />
                  <Text style={styles.unlockedText}>Unlocked</Text>
                </View>
              ) : (
                <View style={styles.lockedBadge}>
                  <Lock size={11} color="#F59E0B" />
                </View>
              )
            )}
            {attachmentCount > 0 && (
              <View style={styles.attachBadge}>
                <Paperclip size={11} color="#94A3B8" />
                <Text style={styles.badgeText}>{attachmentCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Excerpt Body */}
        <Text style={styles.fullExcerpt} numberOfLines={2}>
          {displayExcerpt}
        </Text>

        {/* Footer Row matching Web */}
        <View style={styles.fullFooterRow}>
          <View style={styles.clockRow}>
            <Clock size={12} color="#64748B" />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          <View style={styles.actionsRow}>
            {isTrash && onRestore && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={onRestore}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <RotateCcw size={14} color="#10B981" />
              </TouchableOpacity>
            )}

            {!isTrash && onArchiveToggle && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={onArchiveToggle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isArchived ? (
                  <ArchiveRestore size={14} color="#60A5FA" />
                ) : (
                  <Archive size={14} color="#94A3B8" />
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={14} color={isTrash ? '#EF4444' : '#64748B'} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // --- COMPACT VARIANT (2-Column Pair / Mengecil) ---
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.compactCard,
        {
          borderTopColor: palette.primary,
          borderTopWidth: 3,
        },
      ]}
    >
      {/* Top Header */}
      <View style={styles.compactHeader}>
        <View style={[styles.iconBadge, { backgroundColor: palette.bgDark, borderColor: palette.borderDark }]}>
          <FileText size={14} color={palette.primary} />
        </View>

        <View style={styles.badgesRow}>
          {isLocked && (
            isVaultUnlocked ? (
              <View style={styles.unlockedBadge}>
                <Unlock size={10} color="#10B981" />
              </View>
            ) : (
              <View style={styles.lockedBadge}>
                <Lock size={10} color="#F59E0B" />
              </View>
            )
          )}
          {attachmentCount > 0 && (
            <View style={styles.attachBadge}>
              <Paperclip size={10} color="#94A3B8" />
              <Text style={styles.badgeText}>{attachmentCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Title */}
      <Text style={styles.compactTitle} numberOfLines={2}>
        {note.title || 'Untitled Note'}
      </Text>

      {/* Excerpt */}
      <Text style={styles.compactExcerpt} numberOfLines={3}>
        {displayExcerpt}
      </Text>

      {/* Compact Footer */}
      <View style={styles.compactFooter}>
        <View style={styles.clockRow}>
          <Clock size={11} color="#64748B" />
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        <View style={styles.actionsRow}>
          {isTrash && onRestore && (
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={onRestore}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RotateCcw size={13} color="#10B981" />
            </TouchableOpacity>
          )}

          {!isTrash && onArchiveToggle && (
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={onArchiveToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isArchived ? (
                <ArchiveRestore size={13} color="#60A5FA" />
              ) : (
                <Archive size={13} color="#64748B" />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={13} color={isTrash ? '#EF4444' : '#64748B'} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // --- FULL CARD STYLES ---
  fullCard: {
    backgroundColor: '#11151F',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    minHeight: 140,
    justifyContent: 'space-between',
    width: '100%',
  },
  fullHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fullTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  fullTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    flex: 1,
  },
  fullExcerpt: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 10,
  },
  fullFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },

  // --- COMPACT CARD STYLES ---
  compactCard: {
    flex: 1,
    backgroundColor: '#11151F',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    minHeight: 165,
    justifyContent: 'space-between',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
    lineHeight: 19,
  },
  compactExcerpt: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
    flex: 1,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },

  // --- SHARED STYLES ---
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: 3,
  },
  unlockedText: {
    fontSize: 9.5,
    color: '#10B981',
    fontWeight: '700',
  },
  attachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  badgeText: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 10.5,
    color: '#64748B',
    fontFamily: 'System',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 3,
  },
});
