import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage } from '@/lib/api';
import type { Availability, ReaderDashboard } from '@/lib/types';
import { Button, Card, ErrorText, Loading } from '@/components/ui';
import { colors, fonts, space, type } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';

// Lundi en premier, comme au Pérou ; les clés suivent getDay() (0 = dimanche).
const DAYS = [
  { key: '1', label: 'Lunes' },
  { key: '2', label: 'Martes' },
  { key: '3', label: 'Miércoles' },
  { key: '4', label: 'Jueves' },
  { key: '5', label: 'Viernes' },
  { key: '6', label: 'Sábado' },
  { key: '0', label: 'Domingo' },
] as const;

type DayKey = (typeof DAYS)[number]['key'];

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function Stepper({ value, onChange, min, max }: { value: string; onChange: (v: string) => void; min: number; max: number }) {
  const m = toMin(value);
  return (
    <View style={styles.stepper}>
      <Pressable hitSlop={8} onPress={() => m - 30 >= min && onChange(toHHMM(m - 30))}>
        <Ionicons name="remove-circle-outline" size={24} color={colors.accent} />
      </Pressable>
      <Text style={styles.time}>{value}</Text>
      <Pressable hitSlop={8} onPress={() => m + 30 <= max && onChange(toHHMM(m + 30))}>
        <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
      </Pressable>
    </View>
  );
}

export default function ReaderAvailability() {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ReaderDashboard>('/reader/me')
      .then((d) => setAvailability(d.availability))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (!availability) return error ? <ErrorText message={error} /> : <Loading />;

  function setDay(key: DayKey, value: { start: string; end: string } | undefined) {
    setAvailability((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api('/reader/availability', { method: 'PUT', body: { availability } });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <CosmicScreen>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={type.bodyMuted}>
        Horarios en los que los clientes pueden reservar una videollamada (hora de Lima). El chat está disponible siempre.
      </Text>
      {DAYS.map((d) => {
        const range = availability[d.key];
        return (
          <Card key={d.key} style={styles.day}>
            <View style={styles.dayHead}>
              <Text style={type.h3}>{d.label}</Text>
              <Switch
                value={!!range}
                onValueChange={(on) => setDay(d.key, on ? { start: '10:00', end: '18:00' } : undefined)}
                trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
                thumbColor={colors.cream}
              />
            </View>
            {range && (
              <View style={styles.range}>
                <Stepper value={range.start} min={0} max={toMin(range.end) - 30} onChange={(start) => setDay(d.key, { ...range, start })} />
                <Text style={type.small}>a</Text>
                <Stepper value={range.end} min={toMin(range.start) + 30} max={23 * 60 + 30} onChange={(end) => setDay(d.key, { ...range, end })} />
              </View>
            )}
          </Card>
        );
      })}
      <ErrorText message={error} />
      <Button title="Guardar horarios" onPress={save} loading={saving} />
    </ScrollView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.md, paddingBottom: space.xxl },
  day: { gap: space.md, paddingVertical: 12 },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  range: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { fontFamily: fonts.semibold, fontSize: 16, color: colors.cream, width: 52, textAlign: 'center' },
});
