import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CosmicScreen } from '@/components/Cosmic';
import { useAuth } from '@/lib/auth';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Card, ListRow } from '@/components/ui';
import { space, type } from '@/theme';

export default function ClientProfile() {
  const { user, logout } = useAuth();

  function confirmLogout() {
    Alert.alert('Cerrar sesión', '¿Quieres cerrar tu sesión?', [
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
          <ListRow icon="person-outline" label="Editar perfil" onPress={() => router.push('/edit-profile')} />
          <ListRow icon="heart-outline" label="Mis favoritos" onPress={() => router.push('/favorites')} />
          <ListRow icon="chatbubbles-outline" label="Mis consultas" onPress={() => router.push('/(client)/consultations')} />
          {user?.role === 'admin' && (
            <ListRow icon="shield-checkmark-outline" label="Validación de expertos" onPress={() => router.push('/admin')} />
          )}
        </Card>
        <Card style={styles.menu}>
          <ListRow
            icon="help-circle-outline"
            label="Ayuda y soporte"
            onPress={() => Linking.openURL('mailto:soporte@lunara.app')}
          />
          <ListRow icon="log-out-outline" label="Cerrar sesión" danger onPress={confirmLogout} />
        </Card>
        <View style={{ alignItems: 'center' }}>
          <Text style={type.small}>Las lecturas son una guía de reflexión y no reemplazan</Text>
          <Text style={type.small}>el consejo médico, legal o financiero.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.xl },
  menu: { paddingVertical: 4 },
});
