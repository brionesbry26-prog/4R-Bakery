// 4R Bakery design tokens. Use these instead of raw hex values in components.
export const palette = {
  primary: '#8E1EA2',
  secondary: '#C654C3',
  accent: '#ED96D7',
  frosting: '#FFC0DE',
  surface: '#FFFFFF',
  deepText: '#2D0A34',
};

const colors = {
  ...palette,
  // Derived tints (same hues, lighter values) for backgrounds and states.
  background: '#FFF5FA',
  frostingLight: '#FFE3F0',
  primaryLight: '#F3E3F6',
  border: '#F2C6E5',
  mutedText: '#6B4A72', // 7.3:1 on white — readable secondary text
  disabled: '#CDB8D1',
  disabledText: '#8C7A90',
  success: '#2E7D4F',
  successLight: '#E3F4EA',
  warning: '#9A5B00',
  warningLight: '#FFF1D6',
  danger: '#B3261E',
  dangerLight: '#FDE7E6',
  overlay: 'rgba(45, 10, 52, 0.45)',
};

export default colors;
