import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

type ListGroupProps = { children: ReactNode };

/** Card grouping ListRows, with hairline dividers between them. */
export function ListGroup({ children }: ListGroupProps) {
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<{
    divider?: boolean;
  }>[];
  return (
    <View style={styles.group}>
      {rows.map((row, index) => cloneElement(row, { divider: index > 0 }))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceRaised,
  },
});
