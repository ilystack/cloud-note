import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export const AnimatedNotesTitle: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.myText}>My</Text>
      <View style={styles.notesWrapper}>
        <Text style={styles.notesText}>Notes</Text>
        
        {/* Aesthetic bespoke curved swoosh underline (static, no pen icon) */}
        <View style={styles.underlineTrack}>
          <Svg width={124} height={12} viewBox="0 0 124 12" fill="none">
            {/* Primary stylish curved stroke */}
            <Path
              d="M 2 6 C 36 12, 86 12, 121 3"
              stroke="#F59E0B"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Subtle secondary accent brush flick */}
            <Path
              d="M 14 9.5 C 45 13, 80 13, 106 8"
              stroke="#F59E0B"
              strokeWidth={1.4}
              strokeLinecap="round"
              opacity={0.65}
            />
          </Svg>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  myText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1.5,
    lineHeight: 36,
  },
  notesWrapper: {
    position: 'relative',
    marginTop: -2,
  },
  notesText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 1.5,
    lineHeight: 46,
    paddingRight: 8,
  },
  underlineTrack: {
    position: 'relative',
    width: 124,
    height: 12,
    marginTop: 0,
    overflow: 'visible',
  },
});
