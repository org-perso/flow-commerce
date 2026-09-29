import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

type AvatarProps = {
  /** Used for the initials (2 letters max). */
  name: string;
  /** Product thumbnail: shown with small rounded corners instead of a circle. */
  imageUri?: string | null;
};

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? '').slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ name, imageUri }: AvatarProps) {
  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.base, styles.image]}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View style={[styles.base, styles.circle]} accessible={false}>
      <AppText variant="label" style={styles.initials}>
        {initials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: theme.layout.avatar,
    height: theme.layout.avatar,
  },
  circle: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.navySoft,
  },
  initials: {
    fontFamily: theme.typography.heading.fontFamily,
    color: theme.colors.ink,
  },
});
