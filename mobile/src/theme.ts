// Identité Lunara : 70 % de surfaces sobres, 20 % de violet, 10 % d'accents dorés au maximum.
export const colors = {
  bg: '#080812', // Noche profunda
  surface: '#1A1330', // Misterio
  surfaceAlt: '#120E22',
  border: 'rgba(167, 139, 250, 0.16)',
  primary: '#6D5BFF', // Energía violeta
  primaryPressed: '#5A48EC',
  accent: '#A78BFA', // Intuición
  cream: '#F5E7D6', // Luz lunar
  text: '#F5E7D6',
  textMuted: 'rgba(245, 231, 214, 0.64)',
  textFaint: 'rgba(245, 231, 214, 0.42)',
  gold: '#D4A76A', // Dorado Lunara
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  white: '#FFFFFF',
  overlay: 'rgba(8, 8, 18, 0.7)',
};

/** Dégradés de la marque (tuples pour expo-linear-gradient). */
export const gradients = {
  violet: ['#8A7BFF', '#6D5BFF', '#4F37E0'] as const,
  gold: ['#F6DDB0', '#D4A76A', '#A97C45'] as const,
  goldText: ['#FBE7C2', '#E2B97F', '#C08A4E'] as const,
  night: ['#120D2A', '#0B0A1C', '#080812'] as const,
  glass: ['rgba(40, 30, 78, 0.72)', 'rgba(22, 16, 44, 0.72)'] as const,
  border: ['rgba(167, 139, 250, 0.55)', 'rgba(167, 139, 250, 0.08)', 'rgba(212, 167, 106, 0.45)'] as const,
};

/** Dégradés d'avatar : un par personne, choisi de façon stable à partir du nom. */
export const avatarGradients = [
  ['#3B2A7A', '#6D5BFF'],
  ['#4A2560', '#A78BFA'],
  ['#2B2357', '#5B6CFF'],
  ['#5A3A2A', '#D4A76A'],
  ['#3A1F4F', '#C084FC'],
  ['#1F2F5A', '#7C9BFF'],
] as const;

export const fonts = {
  display: 'PlayfairDisplay_500Medium',
  displayBold: 'PlayfairDisplay_600SemiBold',
  displayItalic: 'PlayfairDisplay_500Medium_Italic',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.cream },
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.cream },
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 27, color: colors.cream },
  h3: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.cream },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.cream },
  bodyMuted: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  label: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 1.2, color: colors.textFaint },
} as const;
