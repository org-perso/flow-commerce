import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extends app.json. The Google Sign-In plugin is only needed for iOS builds and
// requires the reversed iOS client ID, so it is added only when that is configured.
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

  return {
    ...(config as ExpoConfig),
    plugins: [
      ...(config.plugins ?? []),
      ...(iosUrlScheme
        ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, object]]
        : []),
    ],
  };
};
