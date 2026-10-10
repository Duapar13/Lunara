import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';

/** Aiguillage selon la session : accueil, espace client ou tableau de bord voyante. */
export default function Index() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/welcome" />;
  if (user.role === 'reader') return <Redirect href="/(reader)" />;
  return <Redirect href="/(client)" />;
}
