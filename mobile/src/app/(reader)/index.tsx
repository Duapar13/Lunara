import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CosmicScreen, GlassCard, GradientText } from '@/components/Cosmic';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useConsultations, useFetch } from '@/lib/hooks';
import { useSocket } from '@/lib/socket';
import { firstName, formatPrice } from '@/lib/format';
import type { ReaderDashboard } from '@/lib/types';
import { Logo } from '@/components/Logo';
import { ConsultationRow } from '@/components/ConsultationRow';
import { Card, EmptyState, ErrorText, ListRow, Loading, Rating, SectionHeader } from '@/components/ui';
import { colors, fonts, space, type } from '@/theme';

export default function ReaderDashboardScreen() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { data, setData, error, refreshing, refresh } = useFetch<ReaderDashboard>('/reader/me');
  const { consultations } = useConsultations('active');
  const [toggling, setToggling] = useState(false);

  if (!data) return error ? <ErrorText message={error} /> : <Loading />;
  const { reader, stats } = data;
  const pending = reader.status !== 'approved';

  async function setOnline(online: boolean) {
    if (online && !socket?.connected) {
      Alert.alert('Sin conexión', 'Revisa tu internet para aparecer en línea.');
      return;
    }
    setToggling(true);
    try {
      await api('/reader/online', { method: 'POST', body: { online } });
      setData((d) => d && { ...d, reader: { ...d.reader, online } });
    } catch (err) {
      Alert.alert('No disponible', errorMessage(err));
    } finally {
      setToggling(false);
    }
  }

  return (
    <CosmicScreen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      >
        <View style={styles.header}>
          <Logo size={32} />
          <Rating avg={reader.ratingAvg} count={reader.ratingCount} />
        </View>
        <View>
          <Text style={type.h1}>Hola, {firstName(user?.name ?? '')}</Text>
          <Text style={type.bodyMuted}>Tu panel de experto/a</Text>
        </View>

        {pending && (
          <Card style={styles.pending}>
            <Ionicons name="hourglass-outline" size={20} color={colors.gold} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={type.h3}>{reader.status === 'rejected' ? 'Perfil no aprobado' : 'Perfil en revisión'}</Text>
              <Text style={type.small}>
                {reader.status === 'rejected'
                  ? 'Escríbenos a soporte@lunara.app para conocer los motivos.'
                  : 'Completa tu presentación, foto, precios y horarios. Te avisaremos cuando tu perfil sea publicado.'}
              </Text>
            </View>
          </Card>
        )}

        <Card style={styles.online}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={type.h3}>{reader.online ? 'Estás en línea' : 'Estás desconectado/a'}</Text>
            <Text style={type.small}>
              {reader.online
                ? 'Los clientes pueden reservarte una videollamada ahora mismo.'
                : 'Activa para recibir videollamadas inmediatas.'}
            </Text>
          </View>
          <Switch
            value={reader.online}
            onValueChange={setOnline}
            disabled={toggling || pending}
            trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
            thumbColor={colors.cream}
          />
        </Card>

        <LinearGradient
          colors={['rgba(226,185,127,0.85)', 'rgba(109,91,255,0.45)', 'rgba(226,185,127,0.6)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.earnBorder}
        >
          <LinearGradient colors={['#2A1F5C', '#130E29']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.earn}>
            <View style={styles.earnOrb} />
            <Text style={styles.earnLabel}>GANANCIAS DEL MES</Text>
            <GradientText style={styles.earnValue}>{formatPrice(stats.earningsMonthCents)}</GradientText>
            <Text style={type.small}>
              Total acumulado {formatPrice(stats.earningsTotalCents)} · neto tras comisión ({Math.round(stats.commission * 100)} %)
            </Text>
          </LinearGradient>
        </LinearGradient>

        <View style={styles.stats}>
          <GlassCard style={{ flex: 1 }} contentStyle={styles.stat}>
            <Ionicons name="chatbubbles" size={18} color={colors.accent} />
            <Text style={styles.statValue}>{stats.openConsultations}</Text>
            <Text style={type.small}>abiertas</Text>
          </GlassCard>
          <GlassCard style={{ flex: 1 }} contentStyle={styles.stat}>
            <Ionicons name="star" size={18} color={colors.gold} />
            <Text style={styles.statValue}>{reader.ratingCount ? reader.ratingAvg.toFixed(1) : '—'}</Text>
            <Text style={type.small}>{reader.ratingCount} reseñas</Text>
          </GlassCard>
          <GlassCard style={{ flex: 1 }} contentStyle={styles.stat}>
            <Ionicons name="sparkles" size={18} color={colors.accent} />
            <Text style={styles.statValue}>{reader.consultationsCount}</Text>
            <Text style={type.small}>realizadas</Text>
          </GlassCard>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Próximas consultas" action="Ver todas" onAction={() => router.push('/(reader)/consultations')} />
          {consultations.length === 0 ? (
            <EmptyState icon="calendar-outline" title="Sin consultas por ahora" text="Las nuevas reservas aparecerán aquí al instante." />
          ) : (
            consultations.slice(0, 4).map((c) => <ConsultationRow key={c.id} c={c} viewer="reader" />)
          )}
        </View>

        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="pricetags-outline" label="Paquetes y precios" onPress={() => router.push('/reader-offers')} />
          <ListRow icon="time-outline" label="Horarios de videollamada" onPress={() => router.push('/reader-availability')} />
          <ListRow icon="create-outline" label="Editar perfil público" onPress={() => router.push('/edit-profile')} />
          {reader.status === 'approved' && (
            <ListRow icon="eye-outline" label="Ver mi perfil como cliente" onPress={() => router.push(`/expert/${reader.id}`)} />
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pending: { flexDirection: 'row', gap: 12, borderColor: 'rgba(212, 167, 106, 0.35)' },
  online: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { alignItems: 'center', gap: 4, paddingVertical: 14 },
  statValue: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.cream },
  earnBorder: { borderRadius: 26, padding: 1.2 },
  earn: { borderRadius: 25, padding: 22, gap: 6, overflow: 'hidden' },
  earnOrb: { position: 'absolute', width: 200, height: 200, borderRadius: 100, right: -60, top: -90, backgroundColor: colors.primary, opacity: 0.3 },
  earnLabel: { ...type.label, color: colors.gold },
  earnValue: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 48 },
});
