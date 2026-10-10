import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api';
import { LogoMark } from '@/components/Logo';
import { Button, ErrorText, Input } from '@/components/ui';
import { colors, space, type } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';
import { t } from '@/lib/i18n';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <CosmicScreen>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LogoMark size={56} />
        <Text style={type.h1}>{t('Hola de nuevo')}</Text>
        <Text style={type.bodyMuted}>{t('Ingresa a tu cuenta para continuar tu camino.')}</Text>
        <Input
          label={t('Correo electrónico')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder={t('tu@correo.com')}
        />
        <Input
          label={t('Contraseña')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
          onSubmitEditing={submit}
        />
        <ErrorText message={error} />
        <Button title={t('Ingresar')} onPress={submit} loading={loading} disabled={!email || !password} />
        <Button title={t('¿No tienes cuenta? Regístrate')} variant="ghost" small onPress={() => router.replace('/register')} />
      </ScrollView>
    </KeyboardAvoidingView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg, backgroundColor: colors.bg, flexGrow: 1 },
});
