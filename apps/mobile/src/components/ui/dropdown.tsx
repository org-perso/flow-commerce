import { Check, ChevronDown, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { FlatList, Keyboard, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hitSlopFor, theme } from '@/theme';

import { AppText } from './app-text';
import { Button } from './button';
import { ListRow } from './list-row';

type DropdownProps<V extends string> = {
  /** Title of the list that opens. */
  title: string;
  options: readonly { value: V; label: string; leading?: ReactNode }[];
  value: V;
  onChange: (value: V) => void;
  /** Icon before the current value in the trigger. */
  icon?: LucideIcon;
};

/** Compact select: shows the current option, a tap opens the full list. */
export function Dropdown<V extends string>({
  title,
  options,
  value,
  onChange,
  icon: Icon,
}: DropdownProps<V>) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${title} : ${current?.label ?? ''}`}
        hitSlop={hitSlopFor(theme.layout.controlHeight)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        {Icon && <Icon size={theme.layout.iconSm} color={theme.colors.ink} strokeWidth={2} />}
        <AppText variant="label" numberOfLines={1} style={styles.triggerText}>
          {current?.label}
        </AppText>
        <ChevronDown size={theme.layout.iconSm} color={theme.colors.ink} strokeWidth={2} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <AppText variant="heading" style={styles.flex}>
              {title}
            </AppText>
            <Button label="Fermer" variant="ghost" compact onPress={() => setOpen(false)} />
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            renderItem={({ item, index }) => (
              <ListRow
                divider={index > 0}
                leading={item.leading}
                title={item.label}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                trailing={
                  item.value === value ? (
                    <Check size={theme.layout.iconMd} color={theme.colors.blue} strokeWidth={2} />
                  ) : undefined
                }
              />
            )}
            contentContainerStyle={styles.list}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing[1],
    minHeight: theme.layout.controlHeight,
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.pill,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  triggerText: {
    fontFamily: theme.typography.heading.fontFamily,
    color: theme.colors.ink,
  },
  modal: {
    flex: 1,
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.sizes.tapMin,
  },
  list: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
