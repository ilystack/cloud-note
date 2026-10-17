import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { Trash2, ArrowUpRight } from 'lucide-react-native';

interface TrashBentoCardProps {
  count: number;
  onPress: () => void;
  isOnlyCard?: boolean;
}

export const TrashBentoCard: React.FC<TrashBentoCardProps> = ({
  count,
  onPress,
  isOnlyCard = false,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        isOnlyCard && styles.onlyCard,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Trash2 size={18} color="#F43F5E" />
          </View>
          <View>
            <Text style={styles.title}>Trash Bin</Text>
            <Text style={styles.subtitle}>Soft-deleted items</Text>
          </View>
        </View>

        <View style={styles.arrowBadge}>
          <ArrowUpRight size={14} color="#FDA4AF" />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.countRow}>
          <Text style={styles.countText}>{count}</Text>
          <Text style={styles.itemLabel}>{count === 1 ? 'item' : 'items'}</Text>
        </View>
        <Text style={styles.hintText}>
          {count > 0 ? 'Tap to view gallery, restore or purge' : 'Trash is empty'}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Bento Vault System</Text>
        <Text style={styles.actionText}>View Gallery →</Text>
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
    borderColor: 'rgba(244, 63, 94, 0.25)',
    minHeight: 180,
    justifyContent: 'space-between',
  },
  onlyCard: {
    paddingVertical: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  arrowBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginVertical: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  countText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FDA4AF',
  },
  itemLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  hintText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerText: {
    fontSize: 11,
    color: '#475569',
  },
  actionText: {
    fontSize: 11,
    color: '#F43F5E',
    fontWeight: '600',
  },
});
