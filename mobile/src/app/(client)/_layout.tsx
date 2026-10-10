import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { tab, tabScreenOptions } from '@/components/TabBar';

export default function ClientTabs() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/welcome" />;
  if (user.role === 'reader') return <Redirect href="/(reader)" />;

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="index" options={tab('Inicio', 'home-outline', 'home')} />
      <Tabs.Screen name="explore" options={tab('Explorar', 'search-outline', 'search')} />
      <Tabs.Screen name="tarot" options={tab('Tarot', 'sparkles-outline', 'sparkles')} />
      <Tabs.Screen name="consultations" options={tab('Consultas', 'chatbubbles-outline', 'chatbubbles')} />
      <Tabs.Screen name="profile" options={tab('Perfil', 'person-outline', 'person')} />
    </Tabs>
  );
}
