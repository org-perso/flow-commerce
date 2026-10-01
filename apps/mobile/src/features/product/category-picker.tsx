import { Check, ChevronDown, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertBanner, AppText, Button, ListRow, TextField } from '@/components/ui';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

import type { Category } from './product-api';
import { useCategories, useCreateCategory } from './use-products';

type CategoryPickerProps = {
  value: string | null;
  onChange: (categoryId: string | null) => void;
};

/** Select field opening the shop's categories, with a way to add a new one. */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const createCategory = useCreateCategory();
  const selected = categories.data?.find((c) => c.id === value);

  const choose = (category: Category | null) => {
    onChange(category?.id ?? null);
    setOpen(false);
  };

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      choose(await createCategory.mutateAsync(name));
      setNewName('');
    } catch (error) {
      // Already exists: just select it.
      if (error instanceof ApiError && error.status === 409 && error.body.categoryId) {
        onChange(error.body.categoryId as string);
        setNewName('');
        setOpen(false);
      }
    }
  };

  const createError =
    createCategory.error &&
    !(createCategory.error instanceof ApiError && createCategory.error.status === 409)
      ? apiErrorMessage(createCategory.error)
      : null;

  return (
    <View style={styles.field}>
      <AppText variant="label">Catégorie (facultatif)</AppText>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Catégorie : ${selected?.name ?? 'aucune'}`}
        style={({ pressed }) => [styles.select, pressed && styles.pressed]}
      >
        <AppText color={selected ? 'ink' : 'inkMuted'} style={styles.flex} numberOfLines={1}>
          {selected?.name ?? 'Choisir une catégorie'}
        </AppText>
        <ChevronDown size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <AppText variant="heading" style={styles.flex}>
              Catégorie
            </AppText>
            <Button label="Fermer" variant="ghost" compact onPress={() => setOpen(false)} />
          </View>
          <View style={styles.addRow}>
            <View style={styles.flex}>
              <TextField
                label="Nouvelle catégorie"
                value={newName}
                onChangeText={setNewName}
                placeholder="Ex. Parfums"
                maxLength={100}
                onSubmitEditing={add}
                returnKeyType="done"
              />
            </View>
            <View style={styles.addButton}>
              <Button
                label="Ajouter"
                icon={Plus}
                loading={createCategory.isPending}
                onPress={add}
              />
            </View>
          </View>
          {createError && <AlertBanner tone="danger" message={createError} />}
          <FlatList
            data={categories.data ?? []}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={<ListRow title="Aucune catégorie" onPress={() => choose(null)} />}
            renderItem={({ item }) => (
              <ListRow
                divider
                title={item.name}
                onPress={() => choose(item)}
                trailing={
                  item.id === value ? (
                    <Check size={theme.layout.iconMd} color={theme.colors.blue} strokeWidth={2} />
                  ) : undefined
                }
              />
            )}
            style={styles.list}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: theme.spacing[1],
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    minHeight: theme.sizes.tapMin,
    paddingHorizontal: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
  },
  modal: {
    flex: 1,
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.sizes.tapMin,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing[2],
  },
  addButton: {
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
  },
  list: {
    borderRadius: theme.radius.md,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
