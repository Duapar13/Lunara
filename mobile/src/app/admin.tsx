import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import type { Reader } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { Button, Card, Chip, EmptyState, Loading } from '@/components/ui';
import { space, type } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';

const STATUSES = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'approved', label: 'Aprobados' },
  { key: 'rejected', label: 'Rechazados' },
] as const;

/** Validation manuelle des voyantes : un profil n'est visible qu'une fois approuvé. */
export default function Admin() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]['key']>('pending');
  const { data, loading, reload } = useFetch<{ readers: Reader[] }>(`/admin/readers?status=${status}`);

  async function decide(reader: Reader, next: 'approved' | 'rejected' | 'pending') {
    try {
      await api(`/admin/readers/${reader.id}/status`, { method: 'POST', body: { status: next } });
      reload();
    } catch (err) {
      Alert.alert('Error', errorMessage(err));
    }
  }

  return (
    <CosmicScreen>
    <FlatList
      data={data?.readers ?? []}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={{ padding: space.xl, gap: space.md }}
      ListHeaderComponent={
        <View style={styles.filters}>
          {STATUSES.map((s) => (
            <Chip key={s.key} label={s.label} selected={status === s.key} onPress={() => setStatus(s.key)} />
          ))}
        </View>
      }
      ListEmptyComponent={loading ? <Loading /> : <EmptyState icon="checkmark-done-outline" title="Nada por revisar" />}
      renderItem={({ item }) => (
        <Card style={{ gap: space.md }}>
          <View style={styles.head}>
            <Avatar name={item.name} url={item.avatarUrl} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{item.name}</Text>
              <Text style={type.small}>{item.email}</Text>
            </View>
          </View>
          {!!item.headline && <Text style={type.body}>{item.headline}</Text>}
          {!!item.bio && <Text style={type.small}>{item.bio}</Text>}
          <Text style={type.small}>
            {item.specialties.join(' · ')} · {item.yearsExperience} años de experiencia
          </Text>
          <View style={styles.actions}>
            {status !== 'approved' && <Button title="Aprobar" small onPress={() => decide(item, 'approved')} style={{ flex: 1 }} />}
            {status !== 'rejected' && (
              <Button title="Rechazar" small variant="secondary" onPress={() => decide(item, 'rejected')} style={{ flex: 1 }} />
            )}
          </View>
        </Card>
      )}
    />
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8, marginBottom: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', gap: space.md },
});
