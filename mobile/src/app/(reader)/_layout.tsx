import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { tab, tabScreenOptions } from '@/components/TabBar';

export default function ReaderTabs() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/welcome" />;
  if (user.role !== 'reader') return <Redirect href="/(client)" />;

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="index" options={tab('Panel', 'grid-outline', 'grid')} />
      <Tabs.Screen name="consultations" options={tab('Consultas', 'chatbubbles-outline', 'chatbubbles')} />
      <Tabs.Screen name="profile" options={tab('Perfil', 'person-outline', 'person')} />
    </Tabs>
  );
}
