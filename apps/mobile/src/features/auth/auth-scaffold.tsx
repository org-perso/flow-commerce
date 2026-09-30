import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { theme } from '@/theme';

type AuthScaffoldProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AuthScaffold({ title, subtitle, children }: AuthScaffoldProps) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.brand}>
            <View style={styles.brandRow}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                accessibilityIgnoresInvertColors
              />
              <AppText variant="title" color="onNavy">
                FlowCommerce
              </AppText>
            </View>
            <AppText variant="label" color="onNavyMuted">
              De la commande au bénéfice, directement depuis votre téléphone.
            </AppText>
          </View>
          <View style={styles.card}>
            <View style={styles.heading}>
              <AppText variant="title">{title}</AppText>
              {subtitle && <AppText color="inkMuted">{subtitle}</AppText>}
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.navy,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  brand: {
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[8],
  },
  card: {
    flexGrow: 1,
    gap: theme.spacing[4],
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing[6],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  logo: {
    width: theme.layout.appLogo,
    height: theme.layout.appLogo,
    borderRadius: theme.radius.md,
  },
  heading: {
    gap: theme.spacing[1],
  },
});
