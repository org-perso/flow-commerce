import { Linking } from 'react-native';

export { formatPhone } from '@/utils/format';

export function callPhone(phone: string) {
  return Linking.openURL(`tel:${phone}`);
}

/** Opens a WhatsApp chat, with a message ready to send; wa.me wants the number without "+". */
export function openWhatsApp(phone: string, text?: string) {
  const international = phone.startsWith('0') ? `261${phone.slice(1)}` : phone;
  const message = text ? `?text=${encodeURIComponent(text)}` : '';
  return Linking.openURL(`https://wa.me/${international}${message}`);
}
