import { router, Tabs } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { TabIconSvg, type TabIconName } from '@/components/ui/tab-icons';
import { theme } from '@/theme';

function TabIcon({ icon, focused }: { icon: TabIconName; focused: boolean }) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <TabIconSvg
        name={icon}
        size={theme.layout.iconLg}
        color={focused ? theme.colors.ink : theme.colors.inkMuted}
      />
    </View>
  );
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <AppText
      variant="caption"
      color={focused ? 'ink' : 'inkMuted'}
      style={focused && styles.labelActive}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={theme.layout.minFontScale}
    >
      {label}
    </AppText>
  );
}

/** Gold button in the middle of the tab bar: the app's main action, a new order. */
function NewOrderButton() {
  return (
    <View style={styles.actionSlot}>
      <Pressable
        onPress={() => router.push('/orders/new')}
        accessibilityRole="button"
        accessibilityLabel="Nouvelle commande"
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Plus size={theme.layout.iconLg} color={theme.colors.onGold} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const tabs = [
  { name: 'index', label: 'Accueil', icon: 'home' },
  { name: 'orders', label: 'Commandes', icon: 'receiptLong' },
  { name: 'stock', label: 'Stock', icon: 'inventory' },
  { name: 'customers', label: 'Clients', icon: 'group' },
] as const;

function tabScreen({ name, label, icon }: (typeof tabs)[number]) {
  return (
    <Tabs.Screen
      key={name}
      name={name}
      options={{
        title: label,
        tabBarIcon: ({ focused }) => <TabIcon icon={icon} focused={focused} />,
        tabBarLabel: ({ focused }) => <TabLabel label={label} focused={focused} />,
      }}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.surface },
        tabBarStyle: styles.tabBar,
      }}
    >
      {tabs.slice(0, 2).map(tabScreen)}
      {/* Placeholder route: the button opens the order form instead of a tab. */}
      <Tabs.Screen name="new" options={{ tabBarButton: () => <NewOrderButton /> }} />
      {tabs.slice(2).map(tabScreen)}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surfaceRaised,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    elevation: 0,
    shadowOpacity: 0,
  },
  iconPill: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  iconPillActive: {
    backgroundColor: theme.colors.navySoft,
  },
  actionSlot: {
    flex: 1,
    alignItems: 'center',
  },
  action: {
    width: theme.layout.tabAction,
    height: theme.layout.tabAction,
    marginTop: -theme.spacing[4],
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gold,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
  labelActive: {
    fontFamily: theme.typography.heading.fontFamily,
  },
});
