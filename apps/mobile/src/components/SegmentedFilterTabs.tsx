import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  LayoutChangeEvent 
} from 'react-native';

export type CategoryTab = 'home' | 'vault' | 'archive' | 'trash';

interface TabItem {
  id: CategoryTab;
  label: string;
}

const TABS: TabItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'vault', label: 'Vault' },
  { id: 'archive', label: 'Archive' },
  { id: 'trash', label: 'Trash' },
];

interface SegmentedFilterTabsProps {
  activeTab: CategoryTab;
  onSelectTab: (tab: CategoryTab) => void;
}

export const SegmentedFilterTabs: React.FC<SegmentedFilterTabsProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const activeIndex = Math.max(0, TABS.findIndex(t => t.id === activeTab));
  const animatedIndex = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: activeIndex,
      damping: 22,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, animatedIndex]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const padding = 3;
  const availableWidth = containerWidth ? containerWidth - padding * 2 : 0;
  const tabWidth = availableWidth / TABS.length;

  const translateX = animatedIndex.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, tabWidth, tabWidth * 2, tabWidth * 3],
  });

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Smooth Sliding Active Indicator Pill matching Web */}
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.sliderIndicator,
            {
              width: tabWidth,
              transform: [{ translateX }],
            },
          ]}
        />
      )}

      {/* Tab Buttons */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isVault = tab.id === 'vault';

          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.75}
              onPress={() => onSelectTab(tab.id)}
              style={styles.tabBtn}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive
                    ? isVault
                      ? styles.tabLabelActiveVault
                      : styles.tabLabelActive
                    : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#11151F',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginHorizontal: 20,
    position: 'relative',
    height: 42,
    justifyContent: 'center',
  },
  sliderIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: '#1E2638',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  tabLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  tabLabelInactive: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  tabLabelActiveVault: {
    color: '#F59E0B',
    fontWeight: '800',
  },
});
