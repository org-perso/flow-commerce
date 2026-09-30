import { Redirect } from 'expo-router';

/** Never shown: the tab bar's "+" opens /orders/new directly. */
export default function NewOrderTab() {
  return <Redirect href="/orders/new" />;
}
