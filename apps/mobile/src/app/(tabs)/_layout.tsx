import { router, Tabs } from 'expo-router';
import { ShoppingCartPlus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { TabIconSvg, type TabIconName } from '@/components/ui/tab-icons';
import type { Role } from '@/features/shop/roles';
import { useActiveShop } from '@/features/shop/use-shop';
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
        <ShoppingCartPlus
          size={theme.layout.iconLg}
          color={theme.colors.onGold}
          strokeWidth={2.25}
        />
      </Pressable>
    </View>
  );
}

const tabs = [
  { name: 'index', label: 'Accueil', icon: 'home' },
  { name: 'orders', label: 'Commandes', icon: 'receiptLong' },
  { name: 'stock', label: 'Stock', icon: 'inventory' },
  { name: 'customers', label: 'Clients', icon: 'group' },
  // Driver space (F-13).
  { name: 'deliveries', label: 'Livraisons', icon: 'receiptLong' },
  { name: 'available', label: 'À prendre', icon: 'inventory' },
] as const;

type TabName = (typeof tabs)[number]['name'];

/** Tabs each role sees (F-14): the others are hidden, not just disabled. */
const TABS_BY_ROLE: Record<Role, readonly TabName[]> = {
  OWNER: ['index', 'orders', 'stock', 'customers'],
  MANAGER: ['index', 'orders', 'stock', 'customers'],
  CM: ['orders', 'stock', 'customers'],
  DRIVER: ['deliveries', 'available'],
};

function tabScreen({ name, label, icon }: (typeof tabs)[number], visible: boolean) {
  return (
    <Tabs.Screen
      key={name}
      name={name}
      options={{
        // href null removes the tab from the bar; the route stays declared.
        href: visible ? undefined : null,
        title: label,
        tabBarIcon: ({ focused }) => <TabIcon icon={icon} focused={focused} />,
        tabBarLabel: ({ focused }) => <TabLabel label={label} focused={focused} />,
      }}
    />
  );
}

export default function TabsLayout() {
  const { role } = useActiveShop();
  const visible = TABS_BY_ROLE[role];
  const screen = (tab: (typeof tabs)[number]) => tabScreen(tab, visible.includes(tab.name));
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.surface },
        tabBarStyle: styles.tabBar,
      }}
    >
      {tabs.slice(0, 2).map(screen)}
      {/* Placeholder route: the button opens the order form instead of a tab (not for drivers). */}
      <Tabs.Screen
        name="new"
        options={
          // Drivers do not create orders; the CM's 3 tabs leave no middle: floating button.
          role === 'DRIVER' || role === 'CM'
            ? { href: null }
            : { tabBarButton: () => <NewOrderButton /> }
        }
      />
      {tabs.slice(2).map(screen)}
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
