import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CosmicScreen } from '@/components/Cosmic';
import { Ionicons } from '@expo/vector-icons';
import { useReaders } from '@/lib/hooks';
import { SPECIALTIES } from '@/lib/format';
import { ReaderCard } from '@/components/ReaderCard';
import { Chip, ChipRow, EmptyState, ErrorText, Loading } from '@/components/ui';
import { colors, fonts, radius, space, type } from '@/theme';

const SORTS = [
  { key: '', label: 'Recomendados' },
  { key: 'rating', label: 'Mejor valorados' },
  { key: 'price', label: 'Precio' },
];

export default function Explore() {
  const params = useLocalSearchParams<{ specialty?: string }>();
  const [specialty, setSpecialty] = useState(params.specialty ?? '');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sort, setSort] = useState('');

  // Une catégorie touchée sur l'accueil remplace le filtre courant.
  const [lastParam, setLastParam] = useState(params.specialty);
  if (params.specialty !== lastParam) {
    setLastParam(params.specialty);
    if (params.specialty) setSpecialty(params.specialty);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const query = new URLSearchParams({
    ...(debounced && { q: debounced }),
    ...(specialty && { specialty }),
    ...(onlineOnly && { online: '1' }),
    ...(sort && { sort }),
  }).toString();
  const { readers, loading, error, refreshing, refresh, toggleFavorite } = useReaders(`/readers?${query}`);
  const visible = onlineOnly ? readers.filter((r) => r.online) : readers;

  return (
    <CosmicScreen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <FlatList
        data={visible}
        keyExtractor={(r) => String(r.id)}
        renderItem={({ item }) => <ReaderCard reader={item} onToggleFavorite={toggleFavorite} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[type.h1, styles.pad]}>Encontrar expertos</Text>
            <View style={[styles.search, styles.margin]}>
              <Ionicons name="search" size={18} color={colors.textFaint} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Nombre o especialidad"
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.accent}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {!!q && (
                <Pressable onPress={() => setQ('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textFaint} />
                </Pressable>
              )}
            </View>
            <ChipRow>
              <Chip label="Todos" selected={!specialty} onPress={() => setSpecialty('')} />
              {SPECIALTIES.map((s) => (
                <Chip key={s} label={s} selected={specialty === s} onPress={() => setSpecialty(specialty === s ? '' : s)} />
              ))}
            </ChipRow>
            <View style={[styles.filters, styles.margin]}>
              <Chip
                label="En línea ahora"
                icon="ellipse"
                selected={onlineOnly}
                onPress={() => setOnlineOnly(!onlineOnly)}
              />
              <View style={styles.sorts}>
                {SORTS.map((s) => (
                  <Pressable key={s.key} onPress={() => setSort(s.key)} hitSlop={6}>
                    <Text style={[styles.sort, sort === s.key && styles.sortActive]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <ErrorText message={error} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <EmptyState
              icon="search-outline"
              title={onlineOnly ? 'Nadie en línea en este momento' : 'Sin resultados'}
              text={onlineOnly ? 'Puedes reservar una videollamada con horario o escribir por chat.' : 'Prueba con otra búsqueda.'}
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
  header: { gap: space.lg, marginHorizontal: -space.xl, paddingTop: space.lg, paddingBottom: space.lg },
  pad: { paddingHorizontal: space.xl },
  margin: { marginHorizontal: space.xl },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.cream, fontFamily: fonts.regular, fontSize: 15 },
  filters: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  sorts: { flexDirection: 'row', gap: 12 },
  sort: { fontFamily: fonts.medium, fontSize: 13, color: colors.textFaint },
  sortActive: { color: colors.accent },
});
