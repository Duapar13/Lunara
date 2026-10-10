import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { CosmicScreen, Float, GlassCard, GradientText } from '@/components/Cosmic';
import { Button } from '@/components/ui';
import { colors, fonts, space, type } from '@/theme';

const FEATURES = [
  { icon: 'shield-checkmark', text: 'Expertos verificados' },
  { icon: 'videocam', text: 'Chat y video en vivo' },
  { icon: 'lock-closed', text: 'Pago seguro en S/' },
] as const;

export default function Welcome() {
  return (
    <CosmicScreen intensity={1.4}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <Animated.View entering={FadeInDown.duration(900)}>
            <Float distance={10} duration={3600}>
              <View style={styles.halo}>
                <LinearGradient
                  colors={['rgba(212,167,106,0.45)', 'rgba(109,91,255,0.25)', 'rgba(109,91,255,0)']}
                  style={styles.haloGlow}
                />
                <Image source={require('../../assets/logo-mark.png')} style={styles.mark} contentFit="cover" />
              </View>
            </Float>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).duration(800)} style={{ alignItems: 'center' }}>
            <GradientText style={styles.brand}>Lunara</GradientText>
            <Text style={styles.tagline}>TAROT Y GUÍA ESPIRITUAL</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(450).duration(800)} style={{ alignItems: 'center', gap: 10 }}>
            <Text style={styles.title}>Respuestas reales</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={styles.title}>para </Text>
              <GradientText style={styles.titleAccent} colors={['#C4B5FF', '#8A7BFF', '#E2B97F']}>
                tu camino.
              </GradientText>
            </View>
            <Text style={[type.bodyMuted, { textAlign: 'center', maxWidth: 320 }]}>
              Tarotistas y guías espirituales por chat o videollamada. Seguro, rápido y confidencial.
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.delay(650).duration(800)} style={styles.features}>
          {FEATURES.map((f) => (
            <GlassCard key={f.text} style={{ flex: 1 }} contentStyle={styles.feature}>
              <Ionicons name={f.icon} size={18} color={colors.gold} />
              <Text style={styles.featureText}>{f.text}</Text>
            </GlassCard>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(800).duration(800)} style={styles.actions}>
          <Button title="Comenzar mi camino" iconRight="arrow-forward" onPress={() => router.push('/register')} />
          <Button title="Ya tengo cuenta" variant="secondary" onPress={() => router.push('/login')} />
          <Button
            title="¿Eres tarotista? Únete como experto"
            variant="ghost"
            small
            icon="moon-outline"
            onPress={() => router.push({ pathname: '/register', params: { role: 'reader' } })}
          />
        </Animated.View>
      </SafeAreaView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  top: { alignItems: 'center', gap: space.lg, marginTop: space.lg },
  halo: { alignItems: 'center', justifyContent: 'center', width: 190, height: 190 },
  haloGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95 },
  mark: {
    width: 128,
    height: 128,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(212,167,106,0.5)',
  },
  brand: { fontFamily: fonts.display, fontSize: 46, letterSpacing: 1 },
  tagline: { fontFamily: fonts.medium, fontSize: 11, letterSpacing: 4, color: colors.gold, marginTop: 2 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.cream, textAlign: 'center' },
  titleAccent: { fontFamily: fonts.displayItalic, fontSize: 30, lineHeight: 36 },
  features: { flexDirection: 'row', gap: 8 },
  feature: { alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 6 },
  featureText: { fontFamily: fonts.medium, fontSize: 11, color: colors.cream, textAlign: 'center' },
  actions: { gap: space.md, marginBottom: space.lg },
});
