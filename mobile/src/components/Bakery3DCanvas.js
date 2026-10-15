import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { colors } from '../constants/theme';
import useReducedMotion from '../hooks/useReducedMotion';
import ErrorBoundary from './ErrorBoundary';

/**
 * Interactive bakery visual rendered as layered "2.5D" artwork: each layer has
 * a depth value and is transformed with perspective, rotation and parallax so
 * the scene reads as three-dimensional — without a GL renderer.
 *
 * Why not React Three Fiber / expo-gl? A WebGL scene adds several MB of JS,
 * a native GL context and version coupling with the Expo SDK, for a decorative
 * element. Animated transforms run on the native UI thread, cost almost
 * nothing at startup and work in Expo Go on Android, iOS and web.
 *
 * - Gentle float + sway loops (native driver).
 * - Optional device tilt via expo-sensors (skipped if unavailable).
 * - Honors the OS "Reduce Motion" setting: renders a static scene.
 * - pointerEvents="none": never blocks touches or scrolling.
 * - Starts when the JS thread is idle and pauses when `active` is false.
 * - Wrapped in an ErrorBoundary that falls back to a flat 2D illustration.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
// Run work once the JS thread is idle (after first paint / navigation).
function whenIdle(fn) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout: 1500 });
    return () => cancelIdleCallback?.(id);
  }
  const id = setTimeout(fn, 300);
  return () => clearTimeout(id);
}

const PLATE_W = 168;
const PLATE_H = 168;

const LAYERS = [
  // depth: 0 (far) .. 1 (near). Positions are % of the canvas.
  { key: 'wheat-l', icon: 'barley', size: 54, color: colors.accent, left: '4%', top: '38%', depth: 0.2, phase: 0.3, rotate: -18 },
  { key: 'wheat-r', icon: 'barley', size: 48, color: colors.accent, left: '80%', top: '18%', depth: 0.25, phase: 0.7, rotate: 22 },
  { key: 'bread', icon: 'bread-slice', size: 66, color: colors.secondary, left: '10%', top: '6%', depth: 0.45, phase: 0.1, rotate: -10 },
  { key: 'cupcake', icon: 'cupcake', size: 62, color: colors.secondary, left: '68%', top: '50%', depth: 0.55, phase: 0.55, rotate: 8 },
  { key: 'croissant', icon: 'food-croissant', size: 112, color: colors.primary, left: '30%', top: '24%', depth: 1, phase: 0, rotate: -6 },
];

const SPRINKLES = [
  { left: '22%', top: '78%', size: 10, color: colors.secondary },
  { left: '60%', top: '12%', size: 8, color: colors.primary },
  { left: '88%', top: '76%', size: 12, color: colors.accent },
  { left: '6%', top: '84%', size: 7, color: colors.primary },
  { left: '50%', top: '86%', size: 9, color: colors.accent },
];

function StaticBakeryArt({ height }) {
  return (
    <View style={[styles.canvas, { height }]} pointerEvents="none">
      <View style={styles.plate} />
      {LAYERS.map((l) => (
        <View key={l.key} style={[styles.layer, { left: l.left, top: l.top, transform: [{ rotate: `${l.rotate}deg` }] }]}>
          <MaterialCommunityIcons name={l.icon} size={l.size} color={l.color} />
        </View>
      ))}
    </View>
  );
}

function AnimatedBakeryScene({ height, active }) {
  const float = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return undefined;
    let loops = [];
    let subscription = null;
    let cancelled = false;

    const cancelIdle = whenIdle(async () => {
      if (cancelled) return;
      const floatLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(float, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
      const swayLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(sway, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(sway, { toValue: -1, duration: 4200, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
      loops = [floatLoop, swayLoop];
      loops.forEach((l) => l.start());

      // Optional device-tilt parallax.
      try {
        const { Accelerometer } = require('expo-sensors');
        const available = await Accelerometer.isAvailableAsync();
        if (!available || cancelled) return;
        Accelerometer.setUpdateInterval(120);
        subscription = Accelerometer.addListener(({ x, y }) => {
          const clamp = (v) => Math.max(-1, Math.min(1, v));
          Animated.parallel([
            Animated.timing(tiltX, { toValue: clamp(x * 1.6), duration: 120, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(tiltY, { toValue: clamp(y * 1.6), duration: 120, useNativeDriver: USE_NATIVE_DRIVER }),
          ]).start();
        });
      } catch {
        // Sensors unavailable: keep the ambient animation only.
      }
    });

    return () => {
      cancelled = true;
      cancelIdle();
      loops.forEach((l) => l.stop());
      subscription?.remove?.();
    };
  }, [active, float, sway, tiltX, tiltY]);

  const sceneRotateY = Animated.add(Animated.multiply(sway, 8), Animated.multiply(tiltX, 10)).interpolate({
    inputRange: [-20, 20],
    outputRange: ['-20deg', '20deg'],
  });
  const sceneRotateX = tiltY.interpolate({ inputRange: [-1, 1], outputRange: ['8deg', '-8deg'] });

  return (
    <View style={[styles.canvas, { height }]} pointerEvents="none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ perspective: 700 }, { rotateX: sceneRotateX }, { rotateY: sceneRotateY }] },
        ]}
      >
        <Animated.View
          style={[styles.plate, { transform: [{ scale: float.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] }]}
        />
        {SPRINKLES.map((s, i) => (
          <Animated.View
            key={`s${i}`}
            style={[
              styles.sprinkle,
              {
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                backgroundColor: s.color,
                transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, i % 2 ? 6 : -6] }) }],
              },
            ]}
          />
        ))}
        {LAYERS.map((l) => {
          const amplitude = 6 + l.depth * 10;
          const translateY = float.interpolate({
            inputRange: [0, 1],
            outputRange: l.phase > 0.5 ? [amplitude, -amplitude] : [-amplitude, amplitude],
          });
          // Nearer layers shift more with tilt -> depth parallax.
          const translateX = Animated.add(Animated.multiply(tiltX, -14 * l.depth), Animated.multiply(sway, 4 * l.depth));
          const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: [`${l.rotate - 6}deg`, `${l.rotate + 6}deg`] });
          return (
            <Animated.View
              key={l.key}
              style={[
                styles.layer,
                { left: l.left, top: l.top, zIndex: Math.round(l.depth * 10) },
                { transform: [{ translateX }, { translateY }, { rotate }, { scale: 0.85 + l.depth * 0.15 }] },
              ]}
            >
              {/* Offset "shadow" copy gives each flat icon some thickness. */}
              <MaterialCommunityIcons name={l.icon} size={l.size} color={colors.frosting} style={styles.extrude} />
              <MaterialCommunityIcons name={l.icon} size={l.size} color={l.color} />
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
}

function Bakery3DCanvas({ height = 220, active = true }) {
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  // Defer mounting the animated scene so it never delays first paint.
  useEffect(() => {
    return whenIdle(() => setReady(true));
  }, []);

  const fallback = <StaticBakeryArt height={height} />;
  if (reducedMotion || !ready) return fallback;
  return (
    <ErrorBoundary fallback={fallback}>
      <AnimatedBakeryScene height={height} active={active} />
    </ErrorBoundary>
  );
}

export default memo(Bakery3DCanvas);

const styles = StyleSheet.create({
  canvas: { width: '100%', overflow: 'visible' },
  plate: {
    position: 'absolute',
    left: '50%',
    top: '8%',
    width: PLATE_W,
    height: PLATE_H,
    marginLeft: -PLATE_W / 2,
    borderRadius: PLATE_H / 2,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    opacity: 0.85,
  },
  layer: { position: 'absolute' },
  extrude: { position: 'absolute', left: 4, top: 5 },
  sprinkle: { position: 'absolute', borderRadius: 999, opacity: 0.9 },
});
