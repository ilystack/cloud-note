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
  Paperclip, 
  Trash2 
} from 'lucide-react-native';

interface NoteBentoCardProps {
  note: LocalNote;
  onPress: () => void;
  onDelete: () => void;
}

export const NoteBentoCard: React.FC<NoteBentoCardProps> = ({
  note,
  onPress,
  onDelete,
}) => {
  const palette = getPaletteByColor(note.cover_color);
  const isLocked = Boolean(note.is_locked);

  let attachmentCount = 0;
  if (note.attachments_json) {
    try {
      const arr = JSON.parse(note.attachments_json);
      if (Array.isArray(arr)) attachmentCount = arr.length;
    } catch {
      attachmentCount = 0;
    }
  }

  const dateStr = new Date(note.client_updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        {
          borderTopColor: palette.primary,
          borderTopWidth: 3,
        },
      ]}
    >
      {/* Top Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: palette.bgDark, borderColor: palette.borderDark }]}>
          <FileText size={16} color={palette.primary} />
        </View>

        <View style={styles.badgesRow}>
          {isLocked && (
            <View style={styles.lockBadge}>
              <Lock size={12} color="#F59E0B" />
            </View>
          )}
          {attachmentCount > 0 && (
            <View style={styles.attachBadge}>
              <Paperclip size={12} color="#94A3B8" />
              <Text style={styles.badgeText}>{attachmentCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {note.title || 'Untitled Note'}
      </Text>

      {/* Excerpt */}
      <Text style={styles.excerpt} numberOfLines={3}>
        {isLocked ? '●●● Encrypted with Stealth PIN' : (note.excerpt || 'No content')}
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.dateText}>{dateStr}</Text>

        <TouchableOpacity 
          style={styles.deleteBtn} 
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={15} color="#64748B" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1F293D',
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  attachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  excerpt: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  deleteBtn: {
    padding: 4,
  },
});
