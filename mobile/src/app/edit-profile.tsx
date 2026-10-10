import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LANGUAGES, SPECIALTIES } from '@/lib/format';
import type { ReaderDashboard, User } from '@/lib/types';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Button, Chip, ErrorText, Input, Loading } from '@/components/ui';
import { space, type } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const isReader = user?.role === 'reader';
  const [name, setName] = useState(user?.name ?? '');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [years, setYears] = useState('0');
  const [ready, setReady] = useState(!isReader);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReader) return;
    api<ReaderDashboard>('/reader/me')
      .then(({ reader }) => {
        setHeadline(reader.headline);
        setBio(reader.bio ?? '');
        setSpecialties(reader.specialties);
        setLanguages(reader.languages);
        setYears(String(reader.yearsExperience));
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setReady(true));
  }, [isReader]);

  if (!ready) return <Loading />;

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ user: User }>('/me', { method: 'PATCH', body: { name: name.trim() } });
      setUser(res.user);
      if (isReader) {
        await api('/reader/profile', {
          method: 'PUT',
          body: {
            headline: headline.trim(),
            bio: bio.trim(),
            specialties,
            languages,
            yearsExperience: Math.min(80, Math.max(0, parseInt(years, 10) || 0)),
          },
        });
      }
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <CosmicScreen>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ProfileHeader />
        <Input label="Nombre visible" value={name} onChangeText={setName} maxLength={80} />

        {isReader && (
          <>
            <Input
              label="Presentación corta"
              value={headline}
              onChangeText={setHeadline}
              maxLength={120}
              placeholder="Ej. Tarotista · Amor y relaciones"
            />
            <Input
              label="Sobre mí"
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={2000}
              placeholder="Cuenta tu experiencia, tu forma de leer y cómo acompañas a tus consultantes."
            />
            <Input
              label="Años de experiencia"
              value={years}
              onChangeText={(v) => setYears(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
            />
            <View style={styles.block}>
              <Text style={type.h3}>Especialidades</Text>
              <View style={styles.chips}>
                {SPECIALTIES.map((s) => (
                  <Chip key={s} label={s} selected={specialties.includes(s)} onPress={() => toggle(specialties, setSpecialties, s)} />
                ))}
              </View>
            </View>
            <View style={styles.block}>
              <Text style={type.h3}>Idiomas</Text>
              <View style={styles.chips}>
                {LANGUAGES.map((l) => (
                  <Chip key={l} label={l} selected={languages.includes(l)} onPress={() => toggle(languages, setLanguages, l)} />
                ))}
              </View>
            </View>
          </>
        )}

        <ErrorText message={error} />
        <Button title="Guardar" onPress={save} loading={saving} disabled={name.trim().length < 2} />
      </ScrollView>
    </KeyboardAvoidingView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  block: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
