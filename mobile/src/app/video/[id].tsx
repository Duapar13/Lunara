import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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
      // Sur le web, c'est la page d'appel (iframe) qui demande la caméra au navigateur.
      const cam = Platform.OS === 'web' ? { granted: true } : await Camera.requestCameraPermissionsAsync();
      const mic = Platform.OS === 'web' ? { granted: true } : await Camera.requestMicrophonePermissionsAsync();
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
  function handleCallMessage(data: unknown) {
    try {
      const { source, type } = JSON.parse(String(data)) as { source?: string; type?: string };
      if (source !== 'lunara-call') return;
      if (type === 'hangup' || type === 'ended') {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }
    } catch {
      // message inattendu : ignoré
    }
  }
  const onMessage = (event: WebViewMessageEvent) => handleCallMessage(event.nativeEvent.data);

  // Version web : la page d'appel est dans une iframe et parle via window.postMessage.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: MessageEvent) => handleCallMessage(event.data);
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  });

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

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src={url}
          title="Lunara"
          allow="camera; microphone; autoplay; fullscreen"
          style={{ border: 0, width: '100%', height: '100%', background: colors.bg }}
        />
      </View>
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
