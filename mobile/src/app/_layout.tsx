import { useEffect } from 'react';
import { View } from 'react-native';
import { DarkTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_500Medium_Italic,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '@/lib/auth';
import { SocketProvider } from '@/lib/socket';
import { NoticeBanner } from '@/components/NoticeBanner';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.cream,
    border: colors.border,
    primary: colors.accent,
  },
};

function RootNavigator() {
  const { loading } = useAuth();
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_500Medium_Italic,
    PlayfairDisplay_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const ready = fontsLoaded && !loading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.cream,
          headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 16 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: '' }} />
        <Stack.Screen name="register" options={{ title: '' }} />
        <Stack.Screen name="(client)" options={{ headerShown: false }} />
        <Stack.Screen name="(reader)" options={{ headerShown: false }} />
        <Stack.Screen name="expert/[id]" options={{ title: '' , headerTransparent: true }} />
        <Stack.Screen name="book/[id]" options={{ title: 'Reservar consulta' }} />
        <Stack.Screen name="consultation/[id]" options={{ title: 'Consulta' }} />
        <Stack.Screen name="video/[id]" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="review/[id]" options={{ title: 'Tu reseña', presentation: 'modal' }} />
        <Stack.Screen name="reading/[id]" options={{ title: 'Registrar tirada' }} />
        <Stack.Screen name="deepen/[id]" options={{ title: 'Profundizar con IA' }} />
        <Stack.Screen name="favorites" options={{ title: 'Mis favoritos' }} />
        <Stack.Screen name="edit-profile" options={{ title: 'Editar perfil' }} />
        <Stack.Screen name="reader-offers" options={{ title: 'Paquetes y precios' }} />
        <Stack.Screen name="reader-availability" options={{ title: 'Horarios' }} />
        <Stack.Screen name="admin" options={{ title: 'Validación de expertos' }} />
      </Stack>
      <NoticeBanner />
      <StatusBar style="light" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <AuthProvider>
        <SocketProvider>
          <RootNavigator />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
