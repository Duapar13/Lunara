import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { useReaders } from '@/lib/hooks';
import { ReaderCard } from '@/components/ReaderCard';
import { Button, EmptyState, Loading } from '@/components/ui';
import { space } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';
import { t } from '@/lib/i18n';

export default function Favorites() {
  const { readers, loading, toggleFavorite } = useReaders('/me/favorites');
  const visible = readers.filter((r) => r.isFavorite);
  return (
    <CosmicScreen>
    <FlatList
      data={visible}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={{ padding: space.xl }}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      renderItem={({ item }) => <ReaderCard reader={item} onToggleFavorite={toggleFavorite} />}
      ListEmptyComponent={
        loading ? (
          <Loading />
        ) : (
          <EmptyState
            icon="heart-outline"
            title={t('Aún no tienes favoritos')}
            text={t('Toca el corazón en el perfil de un experto para guardarlo aquí.')}
            action={<Button title={t('Explorar expertos')} small onPress={() => router.push('/(client)/explore')} />}
          />
        )
      }
    />
    </CosmicScreen>
  );
}
