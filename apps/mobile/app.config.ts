import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extends app.json. The Google Sign-In plugin is only needed for iOS builds and
// requires the reversed iOS client ID, so it is added only when that is configured.
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  // FCM credentials for push notifications (google-services.json, not committed):
  // an EAS file variable on build servers, a local path otherwise.
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

  return {
    ...(config as ExpoConfig),
    android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
    plugins: [
      ...(config.plugins ?? []),
      ['expo-notifications', { color: '#16325C' }],
      ...(iosUrlScheme
        ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, object]]
        : []),
    ],
  };
};
