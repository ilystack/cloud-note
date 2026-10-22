import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';

export type CategoryTab = 'home' | 'vault' | 'archived' | 'trash';

interface TabItem {
  id: CategoryTab;
  label: string;
}

const TABS: TabItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'vault', label: 'Vault' },
  { id: 'archived', label: 'Archived' },
  { id: 'trash', label: 'Trash' },
];

interface PillFilterTabsProps {
  activeTab: CategoryTab;
  onSelectTab: (tab: CategoryTab) => void;
}

export const PillFilterTabs: React.FC<PillFilterTabsProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        // Custom active pill styles per tab:
        // Home & Archived: Gray / Slate matching Web
        // Vault: Amber
        // Trash: Red
        let activePillStyle = styles.activePillNeutral;
        let activeTextStyle = styles.activeTextNeutral;

        if (tab.id === 'vault') {
          activePillStyle = styles.activePillVault;
          activeTextStyle = styles.activeTextVault;
        } else if (tab.id === 'trash') {
          activePillStyle = styles.activePillTrash;
          activeTextStyle = styles.activeTextTrash;
        }

        return (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.7}
            onPress={() => onSelectTab(tab.id)}
            style={[
              styles.tabItem,
              isActive && activePillStyle,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                isActive ? activeTextStyle : styles.inactiveText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  tabItem: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  // Home & Archived: Gray neutral pill matching Web
  activePillNeutral: {
    borderColor: '#475569',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  activeTextNeutral: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  // Vault: Amber pill
  activePillVault: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  activeTextVault: {
    color: '#F59E0B',
    fontWeight: '800',
  },
  // Trash: Red pill
  activePillTrash: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  activeTextTrash: {
    color: '#EF4444',
    fontWeight: '800',
  },
  tabText: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  inactiveText: {
    color: '#64748B',
    fontWeight: '600',
  },
});
