import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CosmicScreen } from '@/components/Cosmic';
import { useAuth } from '@/lib/auth';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Card, ListRow } from '@/components/ui';
import { space, type } from '@/theme';
import { t } from '@/lib/i18n';
import { LanguageSwitch } from '@/components/LanguageSwitch';

export default function ClientProfile() {
  const { user, logout } = useAuth();

  function confirmLogout() {
    Alert.alert(t('Cerrar sesión'), t('¿Quieres cerrar tu sesión?'), [
      { text: t('Cancelar'), style: 'cancel' },
      { text: t('Cerrar sesión'), style: 'destructive', onPress: () => logout().then(() => router.replace('/welcome')) },
    ]);
  }

  return (
    <CosmicScreen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProfileHeader />
        <Card>
          <LanguageSwitch />
        </Card>
        <Card style={styles.menu}>
          <ListRow icon="person-outline" label={t('Editar perfil')} onPress={() => router.push('/edit-profile')} />
          <ListRow icon="heart-outline" label={t('Mis favoritos')} onPress={() => router.push('/favorites')} />
          <ListRow icon="chatbubbles-outline" label={t('Mis consultas')} onPress={() => router.push('/(client)/consultations')} />
          {user?.role === 'admin' && (
            <ListRow icon="shield-checkmark-outline" label={t('Validación de expertos')} onPress={() => router.push('/admin')} />
          )}
        </Card>
        <Card style={styles.menu}>
          <ListRow
            icon="help-circle-outline"
            label={t('Ayuda y soporte')}
            onPress={() => Linking.openURL('mailto:soporte@lunara.app')}
          />
          <ListRow icon="log-out-outline" label={t('Cerrar sesión')} danger onPress={confirmLogout} />
        </Card>
        <View style={{ alignItems: 'center' }}>
          <Text style={type.small}>{t('Las lecturas son una guía de reflexión y no reemplazan')}</Text>
          <Text style={type.small}>{t('el consejo médico, legal o financiero.')}</Text>
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
