import { Linking } from 'react-native';

export { formatPhone } from '@/utils/format';

export function callPhone(phone: string) {
  return Linking.openURL(`tel:${phone}`);
}

/** Opens a WhatsApp chat; wa.me wants the international number without "+". */
export function openWhatsApp(phone: string) {
  const international = phone.startsWith('0') ? `261${phone.slice(1)}` : phone;
  return Linking.openURL(`https://wa.me/${international}`);
}
