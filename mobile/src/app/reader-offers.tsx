import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage } from '@/lib/api';
import { formatPrice, offerTitle } from '@/lib/format';
import type { OfferType, ReaderDashboard } from '@/lib/types';
import { Button, Card, ErrorText, Loading } from '@/components/ui';
import { colors, fonts, radius, space, type } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';

const PACKAGES: { type: OfferType; units: number }[] = [
  { type: 'chat', units: 1 },
  { type: 'chat', units: 3 },
  { type: 'chat', units: 5 },
  { type: 'video', units: 30 },
  { type: 'video', units: 60 },
];

type Row = { type: OfferType; units: number; price: string; active: boolean };

export default function ReaderOffers() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [commission, setCommission] = useState(0.3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ReaderDashboard>('/reader/me')
      .then(({ offers, stats }) => {
        setCommission(stats.commission);
        setRows(
          PACKAGES.map((p) => {
            const o = offers.find((x) => x.type === p.type && x.units === p.units);
            return { ...p, price: o ? (o.priceCents / 100).toFixed(2) : '', active: o?.active ?? false };
          }),
        );
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (!rows) return error ? <ErrorText message={error} /> : <Loading />;

  const cents = (price: string) => Math.round(parseFloat(price.replace(',', '.')) * 100);
  const invalid = rows.some((r) => r.active && !(cents(r.price) >= 500));

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev && prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api('/reader/offers', {
        method: 'PUT',
        body: {
          offers: rows!
            .filter((r) => r.active || r.price)
            .map((r) => ({ type: r.type, units: r.units, priceCents: cents(r.price) || 500, active: r.active })),
        },
      });
      router.back();
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
        <Text style={type.bodyMuted}>
          Precios fijos y transparentes en soles. Recibes el {Math.round((1 - commission) * 100)} % de cada consulta finalizada.
        </Text>
        {rows.map((r, i) => {
          const price = cents(r.price);
          return (
            <Card key={`${r.type}-${r.units}`} style={[styles.row, !r.active && { opacity: 0.6 }]}>
              <Ionicons name={r.type === 'chat' ? 'chatbubble-outline' : 'videocam-outline'} size={20} color={colors.accent} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={type.h3}>{offerTitle(r)}</Text>
                <Text style={type.small}>{price >= 500 ? `Recibes ${formatPrice(Math.round(price * (1 - commission)))}` : 'Mínimo S/ 5.00'}</Text>
              </View>
              <View style={styles.priceBox}>
                <Text style={styles.currency}>S/</Text>
                <TextInput
                  value={r.price}
                  onChangeText={(v) => update(i, { price: v.replace(/[^0-9.,]/g, '') })}
                  keyboardType="decimal-pad"
                  style={styles.priceInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.textFaint}
                  editable={r.active}
                />
              </View>
              <Switch
                value={r.active}
                onValueChange={(active) => update(i, { active })}
                trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
                thumbColor={colors.cream}
              />
            </Card>
          );
        })}
        <ErrorText message={error} />
        <Button title="Guardar precios" onPress={save} loading={saving} disabled={invalid} />
      </ScrollView>
    </KeyboardAvoidingView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.md, paddingBottom: space.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currency: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  priceInput: { width: 60, color: colors.cream, fontFamily: fonts.semibold, fontSize: 15, padding: 0 },
});
