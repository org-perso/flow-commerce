import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import type * as NotificationsModule from 'expo-notifications';
import { Alert, Platform } from 'react-native';

import { apiFetch } from '@/lib/api-client';

/**
 * expo-notifications, or null in Expo Go: since SDK 53 Expo Go has no push on Android and
 * even importing the module throws there. Loaded lazily so the app still runs in Expo Go.
 */
const Notifications: typeof NotificationsModule | null =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Platform.OS === 'web'
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-notifications') as typeof NotificationsModule);

// Notifications received while the app is open are shown too.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Token of this device, registered with the API; removed at sign-out. */
let registeredToken: string | null = null;

/** Explains why before the system prompt (shown once: the system remembers the answer). */
function askFirst(): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      'Activer les notifications ?',
      'Pour être prévenu des nouvelles livraisons, des commandes livrées et encaissées.',
      [
        { text: 'Plus tard', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Activer', onPress: () => resolve(true) },
      ],
    ),
  );
}

/**
 * Asks the permission if needed, then registers the Expo push token with the API.
 * Silent on failure: notifications are a bonus, never a blocker.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!Notifications || !Device.isDevice) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Livraisons et commandes',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      if (!canAskAgain || !(await askFirst())) return;
      ({ status } = await Notifications.requestPermissionsAsync());
      if (status !== 'granted') return;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiFetch('/me/push-token', {
      method: 'PUT',
      body: JSON.stringify({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android' }),
    });
    registeredToken = token;
  } catch (error) {
    console.warn('Push registration failed', error);
  }
}

/** At sign-out, before the session ends: this device stops receiving the user's notifications. */
export async function unregisterPushNotifications(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await apiFetch('/me/push-token', { method: 'DELETE', body: JSON.stringify({ token }) }).catch(
    () => {},
  );
}

/** Data the API puts in each notification (see the API notification service). */
export type PushData =
  | { type: 'deliveries'; tab: 'mine' | 'available'; shopId: string }
  | { type: 'order'; shopId: string; orderId: string };

/**
 * Calls `onTap` with the data of a tapped notification: the one that opened the app, then
 * each one tapped while it runs. Returns the unsubscribe function.
 */
export function onNotificationTap(onTap: (data: PushData) => void): () => void {
  if (!Notifications) return () => {};
  const handle = (response: NotificationsModule.NotificationResponse | null) => {
    const data = response?.notification.request.content.data as PushData | undefined;
    if (data?.shopId) onTap(data);
  };
  Notifications.getLastNotificationResponseAsync().then((response) => {
    handle(response);
    Notifications.clearLastNotificationResponseAsync?.();
  });
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
