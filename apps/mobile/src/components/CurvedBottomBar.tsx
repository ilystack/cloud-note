import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  useWindowDimensions 
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Plus, Bot, User } from 'lucide-react-native';

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
  const { width: screenWidth } = useWindowDimensions();

  const margin = 16;
  const barWidth = screenWidth - margin * 2;
  const barHeight = 64;
  const cr = 24; // Capsule corner radius on left & right ends
  const k = 0.5522847498 * cr; // Cubic bezier constant for exact corner circles
  const cx = barWidth / 2;

  // Concentric circular notch matching the exact circular shape of the 72px FAB (radius 36)
  // Notch circle radius is 44, creating an exact, uniform 8px gap around the button
  // Smooth shoulder cubic beziers transition seamlessly from horizontal line y=0 into the circular arc
  const notchPath = `
    L ${cx - 54} 0
    C ${cx - 48} 0, ${cx - 43.4} 9.41, ${cx - 41.35} 15.05
    C ${cx - 35.02} 32.43, ${cx - 18.5} 44, ${cx} 44
    C ${cx + 18.5} 44, ${cx + 35.02} 32.43, ${cx + 41.35} 15.05
    C ${cx + 43.4} 9.41, ${cx + 48} 0, ${cx + 54} 0
  `;

  const floatingBarPath = `
    M ${cr} 0
    ${notchPath}
    L ${barWidth - cr} 0
    C ${barWidth - cr + k} 0, ${barWidth} ${cr - k}, ${barWidth} ${cr}
    L ${barWidth} ${barHeight - cr}
    C ${barWidth} ${barHeight - cr + k}, ${barWidth - cr + k} ${barHeight}, ${barWidth - cr} ${barHeight}
    L ${cr} ${barHeight}
    C ${cr - k} ${barHeight}, 0 ${barHeight - cr + k}, 0 ${barHeight - cr}
    L 0 ${cr}
    C 0 ${cr - k}, ${cr - k} 0, ${cr} 0
    Z
  `;

  // Crisp top border outline along the top edge and cradle
  const topBorderPath = `
    M 0 ${cr}
    C 0 ${cr - k}, ${cr - k} 0, ${cr} 0
    ${notchPath}
    L ${barWidth - cr} 0
    C ${barWidth - cr + k} 0, ${barWidth} ${cr - k}, ${barWidth} ${cr}
  `;

  return (
    <View 
      style={[
        styles.outerContainer, 
        { 
          left: margin, 
          right: margin, 
          bottom: margin,
          height: barHeight,
        }
      ]} 
      pointerEvents="box-none"
    >
      {/* Background Floating SVG Bar with Deep Scoop */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={barWidth} height={barHeight}>
          {/* Main Bar Fill */}
          <Path d={floatingBarPath} fill="#18191D" />
          {/* Top & Cradle Border */}
          <Path
            d={topBorderPath}
            stroke="#27272A"
            strokeWidth={1.5}
            fill="none"
          />
        </Svg>
      </View>

      {/* Nav Actions inside Floating Bar */}
      <View style={[styles.actionsRow, { height: barHeight }]}>
        {/* Left Action: Ask AI with Bot icon */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.navItem}
          onPress={onPressAi}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <Bot size={22} color="#C084FC" strokeWidth={2.2} />
          <Text style={styles.navLabel}>Ask AI</Text>
        </TouchableOpacity>

        {/* Center Space for the Big Scoop FAB */}
        <View style={styles.fabSpacer} />

        {/* Right Action: Profile */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.navItem}
          onPress={onPressProfile}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <User size={22} color="#94A3B8" strokeWidth={2.2} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Extra-Large Floating Center FAB (72px, NO black border!) */}
      <View style={[styles.fabContainer, { left: cx - 36 }]} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.fab}
          onPress={onPressAdd}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Plus size={36} color="#121214" strokeWidth={3.2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.2,
    marginTop: 3,
  },
  fabSpacer: {
    width: 96,
  },
  fabContainer: {
    position: 'absolute',
    top: -36, // shifted upward so midpoint aligns with bar edge and floats over cradle
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
  fab: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    // NO BLACK BORDER! Clean seamless amber glow
    elevation: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
  },
});
