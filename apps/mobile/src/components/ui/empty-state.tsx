import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';
import { Button } from './button';

type EmptyStateProps = {
  message: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <AppText color="inkMuted" style={styles.message}>
        {message}
      </AppText>
      {action && <Button label={action.label} onPress={action.onPress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: theme.spacing[4],
    paddingVertical: theme.spacing[8],
    paddingHorizontal: theme.spacing[4],
  },
  message: {
    textAlign: 'center',
  },
});
