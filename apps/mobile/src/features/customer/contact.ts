import { Linking } from 'react-native';

/** "0341234567" → "034 12 345 67" (Madagascar mobile format); other numbers unchanged. */
export function formatPhone(phone: string): string {
  const m = /^(0\d{2})(\d{2})(\d{3})(\d{2})$/.exec(phone);
  return m ? m.slice(1).join(' ') : phone;
}

export function callPhone(phone: string) {
  return Linking.openURL(`tel:${phone}`);
}

/** Opens a WhatsApp chat; wa.me wants the international number without "+". */
export function openWhatsApp(phone: string) {
  const international = phone.startsWith('0') ? `261${phone.slice(1)}` : phone;
  return Linking.openURL(`https://wa.me/${international}`);
}
