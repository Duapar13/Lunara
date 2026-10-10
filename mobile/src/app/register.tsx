import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api';
import { Button, ErrorText, Input } from '@/components/ui';
import { colors, fonts, radius, space, type } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';
import { t } from '@/lib/i18n';

const ROLES = [
  { key: 'client', icon: 'sparkles-outline', title: 'Busco una consulta', text: 'Encuentra expertos y reserva tu lectura.' },
  { key: 'reader', icon: 'moon-outline', title: 'Soy experto/a', text: 'Ofrece tus lecturas y recibe clientes.' },
] as const;

export default function Register() {
  const params = useLocalSearchParams<{ role?: string }>();
  const { register } = useAuth();
  const [role, setRole] = useState<'client' | 'reader'>(params.role === 'reader' ? 'reader' : 'client');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adult, setAdult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await register({ role, name: name.trim(), email: email.trim(), password });
      router.replace(role === 'reader' ? '/edit-profile' : '/');
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
        <Text style={type.h1}>{t('Crea tu cuenta')}</Text>

        <View style={styles.roles}>
          {ROLES.map((r) => {
            const selected = role === r.key;
            return (
              <Pressable key={r.key} onPress={() => setRole(r.key)} style={[styles.role, selected && styles.roleSelected]}>
                <Ionicons name={r.icon} size={22} color={selected ? colors.cream : colors.accent} />
                <Text style={styles.roleTitle}>{t(r.title)}</Text>
                <Text style={type.small}>{t(r.text)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Input label={t('Nombre y apellido')} value={name} onChangeText={setName} placeholder={t('Ej. Lucía Ramos')} autoComplete="name" />
        <Input
          label={t('Correo electrónico')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder={t('tu@correo.com')}
        />
        <Input
          label={t('Contraseña')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder={t('Mínimo 8 caracteres')}
        />

        <Pressable style={styles.check} onPress={() => setAdult(!adult)}>
          <Ionicons name={adult ? 'checkbox' : 'square-outline'} size={22} color={adult ? colors.primary : colors.textMuted} />
          <Text style={[type.small, { flex: 1 }]}>
            {t('Confirmo que soy mayor de 18 años y entiendo que las lecturas son una guía de reflexión.')}
          </Text>
        </Pressable>

        {role === 'reader' && (
          <Text style={styles.note}>
            {t('Revisaremos tu perfil antes de publicarlo. Podrás completar tu presentación, tus precios y tus horarios mientras tanto.')}
          </Text>
        )}

        <ErrorText message={error} />
        <Button
          title={t('Crear cuenta')}
          onPress={submit}
          loading={loading}
          disabled={!name || !email || password.length < 8 || !adult}
        />
        <Button title={t('Ya tengo cuenta')} variant="ghost" small onPress={() => router.replace('/login')} />
      </ScrollView>
    </KeyboardAvoidingView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg, flexGrow: 1 },
  roles: { flexDirection: 'row', gap: space.md },
  role: {
    flex: 1,
    gap: 6,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleSelected: { borderColor: colors.primary, backgroundColor: '#221A48' },
  roleTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cream, marginTop: 4 },
  check: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  note: { ...type.small, color: colors.gold },
});
