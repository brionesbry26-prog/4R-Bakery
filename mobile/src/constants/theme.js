import colors from './colors';

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 };

export const radii = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

// Minimum touch target recommended by Apple HIG / Material (44-48dp).
export const touchTarget = 48;

export const fontFamilies = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
};

// Used when Montserrat fails to load: system font with a matching weight.
export const fallbackWeights = { regular: '400', medium: '500', semibold: '600', bold: '700' };

export const typeScale = {
  display: { size: 30, lineHeight: 38, weight: 'bold' },
  h1: { size: 24, lineHeight: 32, weight: 'bold' },
  h2: { size: 20, lineHeight: 28, weight: 'semibold' },
  h3: { size: 17, lineHeight: 24, weight: 'semibold' },
  body: { size: 15, lineHeight: 22, weight: 'regular' },
  bodyMedium: { size: 15, lineHeight: 22, weight: 'medium' },
  small: { size: 13, lineHeight: 18, weight: 'regular' },
  label: { size: 14, lineHeight: 20, weight: 'medium' },
  price: { size: 16, lineHeight: 22, weight: 'semibold' },
  caption: { size: 12, lineHeight: 16, weight: 'medium' },
};

export const shadow = {
  // Deliberately subtle: flat design with a hint of lift.
  card: {
    shadowColor: colors.deepText,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
};

export { colors };
