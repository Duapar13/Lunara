import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { api, errorMessage } from '@/lib/api';
import type { User } from '@/lib/types';
import { Avatar } from './Avatar';
import { colors, type } from '@/theme';
import { t } from '@/lib/i18n';

/** Avatar modifiable (galerie → upload multipart) + nom et e-mail. */
export function ProfileHeader() {
  const { user, setUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  if (!user) return null;

  async function changeAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const form = new FormData();
    // React Native accepte cet objet { uri, name, type } comme fichier dans un FormData.
    form.append('avatar', {
      uri: asset.uri,
      name: asset.fileName ?? 'avatar.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    setUploading(true);
    try {
      const res = await api<{ user: User }>('/me/avatar', { method: 'POST', form });
      setUser(res.user);
    } catch (err) {
      Alert.alert(t('No se pudo subir la foto'), errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={changeAvatar}>
        <Avatar name={user.name} url={user.avatarUrl} size={88} />
        <View style={styles.edit}>
          {uploading ? <ActivityIndicator size="small" color={colors.cream} /> : <Ionicons name="camera" size={14} color={colors.cream} />}
        </View>
      </Pressable>
      <Text style={type.h2}>{user.name}</Text>
      <Text style={type.small}>{user.email}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  edit: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
