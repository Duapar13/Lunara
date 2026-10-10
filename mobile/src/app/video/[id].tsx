import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Camera } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { api, errorMessage } from '@/lib/api';
import { getLang, t } from '@/lib/i18n';
import { CosmicScreen } from '@/components/Cosmic';
import { Button, EmptyState, Loading } from '@/components/ui';
import { colors, space } from '@/theme';

/**
 * Visio maison : notre page WebRTC (servie par l'API Lunara) dans une WebView.
 * Fonctionne dans Expo Go sans module natif ; la signalisation passe par notre Socket.io
 * et le média en direct entre les téléphones, ou par notre relais TURN si besoin.
 */
export default function VideoCall() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useKeepAwake();

  useEffect(() => {
    (async () => {
      const cam = await Camera.requestCameraPermissionsAsync();
      const mic = await Camera.requestMicrophonePermissionsAsync();
      if (!cam.granted || !mic.granted) {
        setError(t('Necesitamos acceso a tu cámara y micrófono para la videollamada. Actívalos en los ajustes de tu teléfono.'));
        return;
      }
      try {
        const res = await api<{ url: string }>(`/consultations/${id}/video`, { method: 'POST', body: { lang: getLang() } });
        setUrl(res.url);
      } catch (err) {
        setError(errorMessage(err));
      }
    })();
  }, [id]);

  // La page d'appel prévient l'app quand on raccroche ou quand le créneau est terminé.
  function onMessage(event: WebViewMessageEvent) {
    try {
      const { type } = JSON.parse(event.nativeEvent.data) as { type?: string };
      if ((type === 'hangup' || type === 'ended') && router.canGoBack()) router.back();
    } catch {
      // message inattendu : ignoré
    }
  }

  if (error) {
    return (
      <CosmicScreen>
        <SafeAreaView style={styles.center}>
          <EmptyState icon="videocam-off-outline" title={t('No se pudo iniciar la videollamada')} text={error} />
          <Button title={t('Volver')} variant="secondary" onPress={() => router.back()} />
        </SafeAreaView>
      </CosmicScreen>
    );
  }

  if (!url) {
    return (
      <CosmicScreen>
        <Loading />
      </CosmicScreen>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        originWhitelist={['https://*']}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        allowsProtectedMedia
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => (
          <View style={StyleSheet.absoluteFill}>
            <CosmicScreen>
              <Loading />
            </CosmicScreen>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  webview: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', padding: space.xl },
});
