import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SecureStore (Keychain / Keystore) sur mobile ; il n'existe pas sur le web, où l'on utilise localStorage.
const web = Platform.OS === 'web';

export const storage = {
  get: (key: string) => (web ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null) : SecureStore.getItemAsync(key)),
  set: async (key: string, value: string) => {
    if (web) globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  remove: async (key: string) => {
    if (web) globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};
