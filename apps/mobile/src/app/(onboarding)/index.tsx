import { router } from 'expo-router';
import { KeyRound, Store, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { signOut } from '@/features/auth/auth-service';
import { theme } from '@/theme';

function Choice({
  icon: Icon,
  title,
  subtitle,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon size={theme.layout.iconLg} color={theme.colors.onGold} strokeWidth={2} />
      </View>
      <View style={styles.text}>
        <AppText variant="heading">{title}</AppText>
        <AppText color="inkMuted">{subtitle}</AppText>
      </View>
    </Pressable>
  );
}

/** First launch without a shop: create one, or join one with a code (F-11). */
export default function OnboardingChoiceScreen() {
  return (
    <AuthScaffold title="Bienvenue !" subtitle="Comment voulez-vous utiliser FlowCommerce ?">
      <Choice
        icon={Store}
        title="Créer ma boutique"
        subtitle="Je vends en ligne et je gère mes commandes."
        onPress={() => router.push('/create-shop')}
      />
      <Choice
        icon={KeyRound}
        title="Rejoindre une boutique"
        subtitle="J’ai reçu un code d’invitation (gérant, CM, livreur)."
        onPress={() => router.push('/join')}
      />
      <Button label="Se déconnecter" variant="ghost" onPress={signOut} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
  icon: {
    width: theme.layout.avatar,
    height: theme.layout.avatar,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gold,
  },
  text: {
    flex: 1,
    gap: theme.spacing[1],
  },
});
