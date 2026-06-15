import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text, Dimensions, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSettings } from '@/context/SettingsContext';

const { width: W, height: H } = Dimensions.get('window');

function clamp(val: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(val, min), max);
}

export default function ImageViewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ uri: string }>();
  const uri = Array.isArray(rawParams.uri) ? rawParams.uri[0] : rawParams.uri;
  const { isRTL } = useSettings();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const resetTransform = () => {
    'worklet';
    scale.value = withSpring(1, { damping: 20 });
    savedScale.value = 1;
    offsetX.value = withSpring(0, { damping: 20 });
    offsetY.value = withSpring(0, { damping: 20 });
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, 1, 5);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1.05) resetTransform();
    });

  const panGesture = Gesture.Pan()
    .minDistance(1)
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      const mx = Math.max(0, (W * scale.value - W) / 2);
      const my = Math.max(0, (H * scale.value - H) / 2);
      offsetX.value = clamp(savedX.value + e.translationX, -mx, mx);
      offsetY.value = clamp(savedY.value + e.translationY, -my, my);
    })
    .onEnd(() => {
      savedX.value = offsetX.value;
      savedY.value = offsetY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      if (scale.value > 1.5) {
        resetTransform();
      } else {
        scale.value = withSpring(2.5, { damping: 20 });
        savedScale.value = 2.5;
      }
    });

  const zoomAndPan = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.closeBtn, { top: topPad + 8 }]}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={26} color="#fff" />
      </TouchableOpacity>

      <View style={[styles.labelBadge, { top: topPad + 12 }]}>
        <Ionicons name="shield-checkmark" size={14} color="#fff" />
        <Text style={styles.labelText}>{isRTL ? 'الصورة الأصلية' : 'Original Photo'}</Text>
      </View>

      <GestureDetector gesture={doubleTap}>
        <GestureDetector gesture={zoomAndPan}>
          <Animated.View style={[styles.imageWrapper, animatedStyle]}>
            {uri ? (
              <Image
                source={{ uri }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.noImage}>
                <Ionicons name="image-outline" size={60} color="#555" />
                <Text style={{ color: '#555', marginTop: 12 }}>{isRTL ? 'لا توجد صورة' : 'No image'}</Text>
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </GestureDetector>

      <View style={[styles.hintBar, { bottom: insets.bottom + 16 }]}>
        <Text style={styles.hintText}>{isRTL ? 'قرّب بإصبعين • اضغط مرتين للتكبير/التصغير' : 'Pinch to zoom • Double tap to zoom in/out'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  closeBtn: {
    position: 'absolute', left: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#00000088',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 20,
  },
  labelBadge: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00000066',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 20,
  },
  labelText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_500Medium' },
  imageWrapper: { width: W, height: H },
  image: { width: '100%', height: '100%' },
  noImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hintBar: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#00000066',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 20,
  },
  hintText: { color: '#ffffff99', fontSize: 12, fontFamily: 'Inter_400Regular' },
});
