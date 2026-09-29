import { Tabs } from 'expo-router';
import { Ellipsis, House, Package, Receipt, Users, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { theme } from '@/theme';

function TabIcon({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <Icon size={22} strokeWidth={2} color={focused ? theme.colors.ink : theme.colors.inkMuted} />
    </View>
  );
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <AppText
      variant="caption"
      color={focused ? 'ink' : 'inkMuted'}
      style={focused && styles.labelActive}
    >
      {label}
    </AppText>
  );
}

const tabs = [
  { name: 'index', label: 'Accueil', Icon: House },
  { name: 'orders', label: 'Commandes', Icon: Receipt },
  { name: 'stock', label: 'Stock', Icon: Package },
  { name: 'customers', label: 'Clients', Icon: Users },
  { name: 'more', label: 'Plus', Icon: Ellipsis },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.surface },
        tabBarStyle: styles.tabBar,
      }}
    >
      {tabs.map(({ name, label, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            tabBarIcon: ({ focused }) => <TabIcon Icon={Icon} focused={focused} />,
            tabBarLabel: ({ focused }) => <TabLabel label={label} focused={focused} />,
          }}
        />
      ))}
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
  labelActive: {
    fontFamily: theme.typography.heading.fontFamily,
  },
});
