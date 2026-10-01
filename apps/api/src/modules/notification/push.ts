import { env } from '../../config/env.js';

export type PushMessage = {
  /** Expo push token. */
  to: string;
  title: string;
  body: string;
  /** Read by the app when the notification is tapped. */
  data: Record<string, string>;
};

/** Result per message, in order: `unregistered` when the app was uninstalled. */
export type PushResult = { ok: boolean; unregistered?: boolean };

export type PushSender = (messages: PushMessage[]) => Promise<PushResult[]>;

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Expo accepts up to 100 messages per request. */
const BATCH = 100;

type ExpoTicket = { status: 'ok' | 'error'; details?: { error?: string } };

/** Sends through the Expo push service, which relays to FCM (Android) and APNs (iOS). */
export const expoPushSender: PushSender = async (messages) => {
  const results: PushResult[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(
        messages.slice(i, i + BATCH).map((m) => ({ ...m, sound: 'default', priority: 'high' })),
      ),
    });
    if (!response.ok) throw new Error(`Expo push failed: ${response.status}`);
    const { data } = (await response.json()) as { data: ExpoTicket[] };
    for (const ticket of data) {
      results.push({
        ok: ticket.status === 'ok',
        unregistered: ticket.details?.error === 'DeviceNotRegistered',
      });
    }
  }
  return results;
};
