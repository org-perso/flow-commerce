import { BellRing } from 'lucide-react-native';
import { useState } from 'react';

import { Button, InlineBanner } from '@/components/ui';
import { apiErrorMessage } from '@/lib/api-client';

import { useDeliveriesToNotify, useNotifyDrivers } from './use-orders';

/**
 * "Notifier les livreurs (3)": assigning sends nothing; this sends one grouped notification
 * per driver once the round is ready. Shown only when something is waiting (F-17).
 */
export function NotifyDriversButton() {
  const toNotify = useDeliveriesToNotify(true);
  const notify = useNotifyDrivers();
  const [sent, setSent] = useState<number>();

  if (notify.isError) {
    return <InlineBanner tone="danger" message={apiErrorMessage(notify.error)} />;
  }
  if (sent !== undefined && !toNotify.data?.orders) {
    return (
      <InlineBanner
        tone="success"
        message={`✓ ${sent} livreur${sent > 1 ? 's' : ''} prévenu${sent > 1 ? 's' : ''}`}
      />
    );
  }
  const count = toNotify.data?.orders ?? 0;
  if (count === 0) return null;
  return (
    <Button
      label={`Notifier les livreurs (${count})`}
      icon={BellRing}
      variant="dark"
      fullWidth
      loading={notify.isPending}
      onPress={() => notify.mutate(undefined, { onSuccess: (r) => setSent(r.drivers) })}
    />
  );
}
