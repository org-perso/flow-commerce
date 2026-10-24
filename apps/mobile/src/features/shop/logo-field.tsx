import { Alert } from 'react-native';

import { ImageField } from '@/features/product/image-field';
import { apiErrorMessage } from '@/lib/api-client';

import { useActiveShop, useUpdateShopLogo } from './use-shop';

/** Shop logo, saved as soon as it is picked or removed (no form to submit). Owner only. */
export function LogoField() {
  const shop = useActiveShop();
  const update = useUpdateShopLogo(shop.id);
  return (
    <ImageField
      label="Logo de la boutique (facultatif)"
      value={shop.logo ?? null}
      loading={update.isPending}
      onChange={(uri) =>
        update.mutate(uri, {
          onError: (error) => Alert.alert('Logo non enregistré', apiErrorMessage(error)),
        })
      }
    />
  );
}
