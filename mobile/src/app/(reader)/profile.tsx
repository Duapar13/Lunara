import { Alert, Linking, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CosmicScreen } from '@/components/Cosmic';
import { useAuth } from '@/lib/auth';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Card, ListRow } from '@/components/ui';
import { space } from '@/theme';

export default function ReaderProfile() {
  const { logout } = useAuth();

  function confirmLogout() {
    Alert.alert('Cerrar sesión', '¿Quieres cerrar tu sesión? Dejarás de aparecer en línea.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout().then(() => router.replace('/welcome')) },
    ]);
  }

  return (
    <CosmicScreen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProfileHeader />
        <Card style={styles.menu}>
          <ListRow icon="create-outline" label="Editar perfil público" onPress={() => router.push('/edit-profile')} />
          <ListRow icon="pricetags-outline" label="Paquetes y precios" onPress={() => router.push('/reader-offers')} />
          <ListRow icon="time-outline" label="Horarios" onPress={() => router.push('/reader-availability')} />
        </Card>
        <Card style={styles.menu}>
          <ListRow icon="help-circle-outline" label="Ayuda y soporte" onPress={() => Linking.openURL('mailto:soporte@lunara.app')} />
          <ListRow icon="log-out-outline" label="Cerrar sesión" danger onPress={confirmLogout} />
        </Card>
      </ScrollView>
    </SafeAreaView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.xl },
  menu: { paddingVertical: 4 },
});
