import { memo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, fallbackWeights, fontFamilies, typeScale } from '../constants/theme';
import { useFontsReady } from '../context/FontContext';

export function fontStyle(weight, fontsReady) {
  return fontsReady ? { fontFamily: fontFamilies[weight] } : { fontWeight: fallbackWeights[weight] };
}

function AppText({ variant = 'body', weight, color = colors.deepText, style, children, ...rest }) {
  const fontsReady = useFontsReady();
  const scale = typeScale[variant] || typeScale.body;
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={[
        { fontSize: scale.size, lineHeight: scale.lineHeight, color },
        fontStyle(weight || scale.weight, fontsReady),
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export default memo(AppText);

export const textStyles = StyleSheet.create({
  center: { textAlign: 'center' },
});
