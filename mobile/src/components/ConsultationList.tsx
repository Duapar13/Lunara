import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CosmicScreen } from './Cosmic';
import { useConsultations } from '@/lib/hooks';
import { ConsultationRow } from './ConsultationRow';
import { Button, EmptyState, ErrorText, Loading } from './ui';
import { colors, fonts, radius, space, type } from '@/theme';

/** Liste « Activas / Historial » partagée par l'espace client et l'espace voyante. */
export function ConsultationList({ viewer, title }: { viewer: 'client' | 'reader'; title: string }) {
  const [scope, setScope] = useState<'active' | 'history'>('active');
  const { consultations, loading, error, refreshing, refresh } = useConsultations(scope);

  return (
    <CosmicScreen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <FlatList
        data={consultations}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => <ConsultationRow c={item} viewer={viewer} />}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View style={{ gap: space.lg, paddingTop: space.lg, paddingBottom: space.lg }}>
            <Text style={type.h1}>{title}</Text>
            <View style={styles.segment}>
              {(['active', 'history'] as const).map((s) => (
                <Pressable key={s} onPress={() => setScope(s)} style={[styles.segmentItem, scope === s && styles.segmentActive]}>
                  <Text style={[styles.segmentText, scope === s && { color: colors.cream }]}>
                    {s === 'active' ? 'Activas' : 'Historial'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ErrorText message={error} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <EmptyState
              icon={scope === 'active' ? 'calendar-outline' : 'time-outline'}
              title={scope === 'active' ? 'No tienes consultas activas' : 'Aún no hay historial'}
              text={
                viewer === 'client'
                  ? 'Reserva una consulta con un experto verificado.'
                  : 'Activa tu disponibilidad para recibir consultas.'
              }
              action={
                viewer === 'client' && scope === 'active' ? (
                  <Button title="Encontrar un experto" small onPress={() => router.push('/(client)/explore')} />
                ) : undefined
              }
            />
          )
        }
      />
    </SafeAreaView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.xl, paddingBottom: space.xxl },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
});
