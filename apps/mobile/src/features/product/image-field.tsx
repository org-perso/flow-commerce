import { Image } from 'expo-image';
import { Camera, Crown, ImagePlus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { pickProductImage } from '@/lib/product-image';
import { theme } from '@/theme';

/** Photos need Firebase Storage (Blaze plan): shown as a Premium feature until it is enabled. */
const PHOTO_PREMIUM = true;

type ImageFieldProps = {
  /** Local uri (just picked) or stored URL. */
  value: string | null;
  onChange: (uri: string | null) => void;
};

export function ImageField({ value, onChange }: ImageFieldProps) {
  const [busy, setBusy] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    if (PHOTO_PREMIUM) {
      Alert.alert(
        'Fonction Premium',
        'Les photos des produits arrivent bientôt avec l’offre Premium.',
      );
      return;
    }
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
      <View style={styles.labelRow}>
        <AppText variant="label">Photo (facultatif)</AppText>
        {PHOTO_PREMIUM && (
          <View style={styles.premium}>
            <Crown size={theme.layout.iconSm} color={theme.colors.goldInk} strokeWidth={2} />
            <AppText variant="caption" color="goldInk">
              Premium
            </AppText>
          </View>
        )}
      </View>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  premium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.goldSoft,
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
