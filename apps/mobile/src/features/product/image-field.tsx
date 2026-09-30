import { Image } from 'expo-image';
import { Camera, ImagePlus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { pickProductImage } from '@/lib/product-image';
import { theme } from '@/theme';

type ImageFieldProps = {
  /** Local uri (just picked) or stored URL. */
  value: string | null;
  onChange: (uri: string | null) => void;
};

export function ImageField({ value, onChange }: ImageFieldProps) {
  const [busy, setBusy] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    setBusy(true);
    try {
      const uri = await pickProductImage(source);
      if (uri) onChange(uri);
    } catch {
      Alert.alert(
        'Accès refusé',
        source === 'camera'
          ? "Autorisez l'appareil photo dans les réglages du téléphone."
          : 'Autorisez l’accès aux photos dans les réglages du téléphone.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppText variant="label">Photo (facultatif)</AppText>
      <View style={styles.row}>
        <View style={styles.preview}>
          {value ? (
            <Image source={{ uri: value }} style={styles.image} contentFit="cover" />
          ) : (
            <ImagePlus size={theme.layout.iconLg} color={theme.colors.inkMuted} strokeWidth={2} />
          )}
        </View>
        <View style={styles.actions}>
          <Button
            label="Galerie"
            icon={ImagePlus}
            compact
            loading={busy}
            onPress={() => pick('library')}
          />
          <Button label="Appareil photo" icon={Camera} compact onPress={() => pick('camera')} />
          {value && (
            <Button
              label="Retirer"
              icon={Trash2}
              variant="ghost"
              compact
              onPress={() => onChange(null)}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing[1],
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  preview: {
    width: theme.layout.thumbnail,
    height: theme.layout.thumbnail,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  actions: {
    flex: 1,
    gap: theme.spacing[2],
    justifyContent: 'center',
  },
});
