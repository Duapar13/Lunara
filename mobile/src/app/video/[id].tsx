import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage } from '@/lib/api';
import { Button, EmptyState, Loading } from '@/components/ui';
import { colors, fonts, radius, space } from '@/theme';
import { t } from '@/lib/i18n';

/**
 * Visio Daily.co dans une WebView : fonctionne dans Expo Go, sans module WebRTC natif.
 * La salle Daily expire d'elle-même à la fin du créneau (30 min / 1 h).
 */
export default function VideoCall() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const [url, setUrl] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    (async () => {
      const cam = await Camera.requestCameraPermissionsAsync();
      const mic = await Camera.requestMicrophonePermissionsAsync();
      if (!cam.granted || !mic.granted) {
        setError(t('Necesitamos acceso a tu cámara y micrófono para la videollamada. Actívalos en los ajustes de tu teléfono.'));
        return;
      }
      try {
        const res = await api<{ url: string; endsAt: string }>(`/consultations/${id}/video`, { method: 'POST' });
        setUrl(res.url);
        setEndsAt(new Date(res.endsAt).getTime());
      } catch (err) {
        setError(errorMessage(err));
      }
    })();
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = endsAt ? Math.max(0, endsAt - now) : null;
  const mm = remaining != null ? String(Math.floor(remaining / 60000)).padStart(2, '0') : '--';
  const ss = remaining != null ? String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0') : '--';

  function leave() {
    Alert.alert(t('Salir de la videollamada'), t('Podrás volver a entrar mientras dure tu horario.'), [
      { text: t('Quedarme'), style: 'cancel' },
      { text: t('Salir'), style: 'destructive', onPress: () => router.back() },
    ]);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.bar}>
        <Pressable onPress={leave} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={colors.cream} />
        </Pressable>
        <View style={styles.timer}>
          <View style={[styles.rec, remaining != null && remaining < 5 * 60_000 && { backgroundColor: colors.warning }]} />
          <Text style={styles.timerText}>
            {mm}:{ss}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </SafeAreaView>

      {error ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: space.xl }}>
          <EmptyState icon="videocam-off-outline" title={t('No se pudo iniciar la videollamada')} text={error} />
          <Button title={t('Volver')} variant="secondary" onPress={() => router.back()} />
        </View>
      ) : !url ? (
        <Loading />
      ) : (
        <WebView
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: colors.bg }}
          originWhitelist={['https://*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          allowsProtectedMedia
          startInLoadingState
          renderLoading={() => <Loading />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  rec: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  timerText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.cream, fontVariant: ['tabular-nums'] },
});
