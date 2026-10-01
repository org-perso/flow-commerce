import { MessageCircle, Phone, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { hitSlopFor, theme } from '@/theme';
import { businessDate, businessToday, formatAr, formatDayLabel, formatPhone } from '@/utils/format';

import type { Customer } from './customer-api';
import { callPhone, openWhatsApp } from './contact';

/** "035 55 555 55 · +1 numéro", or the social profile when there is no phone. */
function contactLine(customer: Customer): string | undefined {
  const [main, ...others] = customer.phones;
  if (!main) return customer.socialProfile ?? undefined;
  const more = others.length ? ` · +${others.length} numéro${others.length > 1 ? 's' : ''}` : '';
  return formatPhone(main) + more;
}

/** Customer card: contact buttons, then orders count, total spent and last order day. */
export function CustomerRow({ customer, onPress }: { customer: Customer; onPress: () => void }) {
  const phone = customer.phones[0];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Avatar name={customer.name} />
        <View style={styles.info}>
          <AppText style={styles.strong} numberOfLines={1}>
            {customer.name}
          </AppText>
          {contactLine(customer) && (
            <AppText variant="caption" color="inkMuted" numberOfLines={2}>
              {contactLine(customer)}
            </AppText>
          )}
        </View>
        {phone && (
          <>
            <ContactButton
              icon={MessageCircle}
              label={`WhatsApp ${customer.name}`}
              onPress={() => openWhatsApp(phone)}
            />
            <ContactButton
              icon={Phone}
              label={`Appeler ${customer.name}`}
              filled
              onPress={() => callPhone(phone)}
            />
          </>
        )}
      </View>
      <View style={styles.stats}>
        <AppText variant="caption" color="inkMuted">
          <AppText variant="caption" style={styles.strong}>
            {customer.orderCount}
          </AppText>{' '}
          commande{customer.orderCount > 1 ? 's' : ''}
        </AppText>
        <AppText variant="caption" color="inkMuted" style={styles.flex}>
          <AppText variant="caption" style={styles.strong}>
            {formatAr(customer.totalSpent)}
          </AppText>{' '}
          dépensés
        </AppText>
        {customer.lastOrderAt && (
          <AppText variant="caption" color="inkMuted">
            {formatDayLabel(businessDate(customer.lastOrderAt), businessToday())}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

function ContactButton({
  icon: Icon,
  label,
  filled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  filled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={hitSlopFor(theme.layout.avatar)}
      style={({ pressed }) => [
        styles.contact,
        filled ? styles.contactFilled : styles.contactOutline,
        pressed && styles.pressed,
      ]}
    >
      <Icon size={theme.layout.iconMd} color={theme.colors.blue} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  info: {
    flex: 1,
    gap: theme.spacing[1] / 2,
  },
  contact: {
    width: theme.layout.avatar,
    height: theme.layout.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  contactOutline: {
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
  },
  contactFilled: {
    backgroundColor: theme.colors.navySoft,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4],
    paddingTop: theme.spacing[2],
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
  },
  flex: {
    flex: 1,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
    color: theme.colors.ink,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
