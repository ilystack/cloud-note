import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing, 
  TouchableOpacity 
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Pen } from 'lucide-react-native';

export const AnimatedNotesTitle: React.FC = () => {
  const anim = useRef(new Animated.Value(0)).current;

  const triggerAnimation = () => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 850,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerAnimation();
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  // Revealed width of underline drawing in sync with pen: 0 -> 102px
  const revealWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 102],
  });

  // Gliding pen position & rotation matching web keyframes
  const penTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-2, 88],
  });

  const penTranslateY = anim.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [-8, -6, -9, -8],
  });

  const penRotate = anim.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: ['-14deg', '-8deg', '-15deg', '-12deg'],
  });

  const penOpacity = anim.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [0, 1, 1],
  });

  return (
    <TouchableOpacity 
      activeOpacity={0.85} 
      onPress={triggerAnimation}
      style={styles.container}
    >
      <Text style={styles.myText}>MY</Text>
      <View style={styles.notesWrapper}>
        <Text style={styles.notesText}>NOTES</Text>
        
        {/* Animated Scribble Underline + Gliding Pen */}
        <View style={styles.underlineTrack}>
          {/* Revealed SVG Stroke */}
          <Animated.View style={[styles.strokeReveal, { width: revealWidth }]}>
            <Svg width={102} height={14} viewBox="0 0 100 12" fill="none">
              <Path
                d="M2 7C28 3 68 2 98 8"
                stroke="#F59E0B"
                strokeWidth={2.6}
                strokeLinecap="round"
              />
              <Path
                d="M10 9.5C36 7 72 6.5 90 10.5"
                stroke="#F59E0B"
                strokeWidth={1.3}
                strokeLinecap="round"
                opacity={0.65}
              />
            </Svg>
          </Animated.View>

          {/* Gliding Pen Icon */}
          <Animated.View
            style={[
              styles.penContainer,
              {
                opacity: penOpacity,
                transform: [
                  { translateX: penTranslateX },
                  { translateY: penTranslateY },
                  { rotate: penRotate },
                ],
              },
            ]}
          >
            <Pen size={13} color="#F59E0B" strokeWidth={2.4} />
          </Animated.View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  myText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
    lineHeight: 25,
    fontFamily: 'System',
  },
  notesWrapper: {
    position: 'relative',
    marginTop: -1,
  },
  notesText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 2.2,
    lineHeight: 28,
    fontFamily: 'System',
    paddingRight: 6,
  },
  underlineTrack: {
    position: 'relative',
    width: 102,
    height: 14,
    marginTop: 1,
    overflow: 'visible',
  },
  strokeReveal: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 14,
    overflow: 'hidden',
  },
  penContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 10,
    pointerEvents: 'none',
  },
});
