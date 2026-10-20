import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  useWindowDimensions, 
  Platform 
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Sparkles, User } from 'lucide-react-native';

interface CurvedBottomBarProps {
  onPressAdd: () => void;
  onPressAi: () => void;
  onPressProfile: () => void;
}

export const CurvedBottomBar: React.FC<CurvedBottomBarProps> = ({
  onPressAdd,
  onPressAi,
  onPressProfile,
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const barHeight = 58;
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 18 : 10);
  const totalHeight = barHeight + bottomPadding;

  const cx = width / 2;

  // Scooped cutout notch path around center FAB
  // Curves down at (cx - 54) -> dips to y=34 at cx -> curves back to y=0 at (cx + 54)
  const notchPath = `
    M 0 0
    L ${cx - 54} 0
    C ${cx - 44} 0, ${cx - 37} 7, ${cx - 31} 17
    C ${cx - 23} 30, ${cx - 13} 34, ${cx} 34
    C ${cx + 13} 34, ${cx + 23} 30, ${cx + 31} 17
    C ${cx + 37} 7, ${cx + 44} 0, ${cx + 54} 0
    L ${width} 0
    L ${width} ${totalHeight}
    L 0 ${totalHeight}
    Z
  `;

  // Stroke only for the top edge & curve to give a clean border
  const topBorderPath = `
    M 0 0
    L ${cx - 54} 0
    C ${cx - 44} 0, ${cx - 37} 7, ${cx - 31} 17
    C ${cx - 23} 30, ${cx - 13} 34, ${cx} 34
    C ${cx + 13} 34, ${cx + 23} 30, ${cx + 31} 17
    C ${cx + 37} 7, ${cx + 44} 0, ${cx + 54} 0
    L ${width} 0
  `;

  return (
    <View style={[styles.container, { height: totalHeight }]} pointerEvents="box-none">
      {/* Background SVG with curved scoop */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={totalHeight}>
          {/* Main Bar Fill */}
          <Path d={notchPath} fill="#0F172A" />
          {/* Crisp Top Border */}
          <Path
            d={topBorderPath}
            stroke="#1E293B"
            strokeWidth={1.5}
            fill="none"
          />
        </Svg>
      </View>

      {/* Interactive Actions Row */}
      <View style={[styles.actionsRow, { height: barHeight, paddingBottom: 2 }]}>
        {/* Left Action: Ask AI */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.navItem}
          onPress={onPressAi}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <View style={styles.iconCircle}>
            <Sparkles size={19} color="#C084FC" />
          </View>
          <Text style={styles.navLabel}>Ask AI</Text>
        </TouchableOpacity>

        {/* Center Placeholder spacer for the FAB scooped notch */}
        <View style={styles.fabSpacer} />

        {/* Right Action: Profile */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.navItem}
          onPress={onPressProfile}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <View style={styles.iconCircle}>
            <User size={19} color="#94A3B8" />
          </View>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Center FAB Button inside the scoop */}
      <View style={[styles.fabContainer, { left: cx - 28 }]} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.fab}
          onPress={onPressAdd}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Plus size={28} color="#0B0F19" strokeWidth={3} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  fabSpacer: {
    width: 72,
  },
  fabContainer: {
    position: 'absolute',
    top: -16,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#0B0F19',
    elevation: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
