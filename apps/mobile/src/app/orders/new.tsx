import { router } from 'expo-router';
import { UserPlus, X } from 'lucide-react-native';
import { useDeferredValue, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  AlertBanner,
  AppText,
  Button,
  FilterChips,
  Screen,
  SearchBar,
  TextField,
} from '@/components/ui';
import type { Customer } from '@/features/customer/customer-api';
import { formatPhone } from '@/features/customer/contact';
import { useCustomers } from '@/features/customer/use-customers';
import { PAYMENT_METHODS } from '@/features/order/order-status';
import { QuantityStepper } from '@/features/order/quantity-stepper';
import { useCreateOrder } from '@/features/order/use-orders';
import type { Product } from '@/features/product/product-api';
import { useProducts } from '@/features/product/use-products';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { textStyles, theme } from '@/theme';
import { formatAr } from '@/utils/format';

type Line = { product: Product; quantity: number };
type NewCustomer = { name: string; phone: string; address: string };
type CustomerChoice =
  { kind: 'none' } | { kind: 'existing'; customer: Customer } | { kind: 'new'; draft: NewCustomer };

const toInt = (text: string) => {
  const digits = text.replace(/\s/g, '');
  return /^\d+$/.test(digits) ? Number(digits) : null;
};

export default function NewOrderScreen() {
  const createOrder = useCreateOrder();

  // Customer
  const [customer, setCustomer] = useState<CustomerChoice>({ kind: 'none' });
  const [customerSearch, setCustomerSearch] = useState('');
  const customerQuery = useDeferredValue(customerSearch.trim());
  const customerMatches = useCustomers(customerQuery, {
    enabled: customer.kind === 'none' && customerQuery.length >= 2,
  });

  // Products
  const [lines, setLines] = useState<Line[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const productQuery = useDeferredValue(productSearch.trim());
  const products = useProducts({ q: productQuery || undefined });

  // Delivery & payment
  const [deliveryFee, setDeliveryFee] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [confirmNow, setConfirmNow] = useState(false);
  const [formError, setFormError] = useState<string>();

  const itemsAmount = lines.reduce((sum, l) => sum + l.quantity * l.product.sellingPrice, 0);
  const fee = toInt(deliveryFee) ?? 0;

  const selectCustomer = (c: Customer) => {
    setCustomer({ kind: 'existing', customer: c });
    if (!address && c.address) setAddress(c.address);
  };

  const startNewCustomer = () => {
    // Prefill from what was typed: digits go to the phone, text to the name.
    const typed = customerSearch.trim();
    const isPhone = /^[\d\s+.-]+$/.test(typed);
    setCustomer({
      kind: 'new',
      draft: { name: isPhone ? '' : typed, phone: isPhone ? typed : '', address: '' },
    });
  };

  const updateDraft = (patch: Partial<NewCustomer>) =>
    setCustomer((c) => (c.kind === 'new' ? { ...c, draft: { ...c.draft, ...patch } } : c));

  const addProduct = (product: Product) => {
    setLines((current) => {
      const existing = current.find((l) => l.product.id === product.id);
      if (existing) {
        return current.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    setProductSearch('');
  };

  const setQuantity = (productId: string, quantity: number) =>
    setLines((current) =>
      quantity <= 0
        ? current.filter((l) => l.product.id !== productId)
        : current.map((l) => (l.product.id === productId ? { ...l, quantity } : l)),
    );

  const submit = async () => {
    setFormError(undefined);
    if (lines.length === 0) return setFormError('Ajoutez au moins un produit.');
    if (customer.kind === 'new' && !customer.draft.name.trim()) {
      return setFormError('Indiquez le nom du nouveau client.');
    }
    if (deliveryFee.trim() && toInt(deliveryFee) === null) {
      return setFormError('Frais de livraison : montant en Ariary, sans virgule.');
    }

    try {
      const order = await createOrder.mutateAsync({
        customerId: customer.kind === 'existing' ? customer.customer.id : null,
        customer:
          customer.kind === 'new'
            ? {
                name: customer.draft.name.trim(),
                phone: customer.draft.phone.trim() || null,
                address: customer.draft.address.trim() || address.trim() || null,
              }
            : null,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        deliveryFee: fee,
        paymentMethod: paymentMethod || null,
        address: address.trim() || null,
        status: confirmNow ? 'CONFIRMEE' : 'EN_ATTENTE',
      });
      router.replace(`/orders/${order.id}`);
    } catch {
      // Shown through createOrder.error.
    }
  };

  const apiError = createOrder.error;
  const errorMessage =
    formError ??
    (apiError instanceof ApiError && apiError.title === 'Insufficient Stock'
      ? insufficientStockMessage(apiError, lines)
      : apiError
        ? apiErrorMessage(apiError)
        : undefined);

  const suggestions = (products.data ?? [])
    .filter((p) => !lines.some((l) => l.product.id === p.id))
    .slice(0, 6);

  return (
    <Screen
      edges={[]}
      footer={
        <Button
          label={`Créer la commande · ${formatAr(itemsAmount + fee)}`}
          variant="primary"
          fullWidth
          loading={createOrder.isPending}
          onPress={submit}
        />
      }
    >
      {/* Client */}
      <View style={styles.section}>
        <AppText variant="heading">Client</AppText>
        {customer.kind === 'existing' && (
          <View style={styles.card}>
            <View style={styles.flex}>
              <AppText style={styles.strong}>{customer.customer.name}</AppText>
              <AppText variant="caption" color="inkMuted">
                {customer.customer.phone
                  ? formatPhone(customer.customer.phone)
                  : 'Pas de téléphone'}
              </AppText>
            </View>
            <Button label="Changer" variant="ghost" onPress={() => setCustomer({ kind: 'none' })} />
          </View>
        )}
        {customer.kind === 'new' && (
          <View style={styles.section}>
            <TextField
              label="Nom du client"
              value={customer.draft.name}
              onChangeText={(name) => updateDraft({ name })}
              autoCapitalize="words"
            />
            <TextField
              label="Téléphone"
              hint="Le client est retrouvé automatiquement par son numéro."
              value={customer.draft.phone}
              onChangeText={(phone) => updateDraft({ phone })}
              keyboardType="phone-pad"
            />
            <Button
              label="Annuler le nouveau client"
              icon={X}
              variant="ghost"
              onPress={() => setCustomer({ kind: 'none' })}
            />
          </View>
        )}
        {customer.kind === 'none' && (
          <View style={styles.section}>
            <SearchBar
              value={customerSearch}
              onChangeText={setCustomerSearch}
              placeholder="Nom ou téléphone du client"
            />
            {customerQuery.length >= 2 &&
              customerMatches.data?.slice(0, 5).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => selectCustomer(c)}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                >
                  <View style={styles.flex}>
                    <AppText style={styles.strong}>{c.name}</AppText>
                    <AppText variant="caption" color="inkMuted">
                      {c.phone ? formatPhone(c.phone) : 'Pas de téléphone'}
                    </AppText>
                  </View>
                </Pressable>
              ))}
            <Button
              label="Nouveau client"
              icon={UserPlus}
              variant="ghost"
              onPress={startNewCustomer}
            />
          </View>
        )}
      </View>

      {/* Produits */}
      <View style={styles.section}>
        <AppText variant="heading">Produits</AppText>
        {lines.map((line) => {
          const overStock = line.quantity > line.product.stockQuantity;
          return (
            <View key={line.product.id} style={styles.card}>
              <View style={styles.flex}>
                <AppText style={styles.strong} numberOfLines={1}>
                  {line.product.name}
                </AppText>
                <AppText variant="caption" color={overStock ? 'statusCancelledFg' : 'inkMuted'}>
                  {formatAr(line.product.sellingPrice)} ·{' '}
                  {overStock
                    ? `Stock : ${line.product.stockQuantity} seulement`
                    : `${line.product.stockQuantity} en stock`}
                </AppText>
              </View>
              <QuantityStepper
                value={line.quantity}
                onChange={(q) => setQuantity(line.product.id, q)}
              />
            </View>
          );
        })}
        <SearchBar
          value={productSearch}
          onChangeText={setProductSearch}
          placeholder="Ajouter un produit"
        />
        {suggestions.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => addProduct(p)}
            style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
          >
            <AppText style={styles.flex} numberOfLines={1}>
              {p.name}
            </AppText>
            <AppText variant="caption" color="inkMuted">
              {formatAr(p.sellingPrice)} · {p.stockQuantity} en stock
            </AppText>
          </Pressable>
        ))}
        {products.data?.length === 0 && (
          <AppText color="inkMuted">
            {productQuery
              ? 'Aucun produit trouvé.'
              : "Ajoutez d'abord des produits dans l'onglet Stock."}
          </AppText>
        )}
      </View>

      {/* Livraison & paiement */}
      <View style={styles.section}>
        <AppText variant="heading">Livraison et paiement</AppText>
        <TextField
          label="Frais de livraison (Ar)"
          value={deliveryFee}
          onChangeText={setDeliveryFee}
          placeholder="0"
          keyboardType="number-pad"
        />
        <TextField
          label="Adresse de livraison"
          value={address}
          onChangeText={setAddress}
          placeholder="Quartier, repère…"
          multiline
        />
        <AppText variant="label">Paiement</AppText>
        <FilterChips
          options={[
            { value: '', label: 'Non précisé' },
            ...PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
          ]}
          value={paymentMethod}
          onChange={setPaymentMethod}
        />
      </View>

      {/* Récapitulatif */}
      <View style={[styles.card, styles.summary]}>
        <SummaryLine label="Articles" value={formatAr(itemsAmount)} />
        <SummaryLine label="Livraison" value={formatAr(fee)} />
        <SummaryLine label="Total à payer" value={formatAr(itemsAmount + fee)} strong />
      </View>

      <View style={styles.card}>
        <View style={styles.flex}>
          <AppText style={styles.strong}>Commande confirmée</AppText>
          <AppText variant="caption" color="inkMuted">
            Retire le stock tout de suite. Sinon, la commande reste en attente.
          </AppText>
        </View>
        <Switch
          value={confirmNow}
          onValueChange={setConfirmNow}
          trackColor={{ true: theme.colors.blue, false: theme.colors.line }}
          accessibilityLabel="Commande confirmée"
        />
      </View>

      {errorMessage && <AlertBanner tone="danger" message={errorMessage} />}
    </Screen>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryLine}>
      <AppText color={strong ? 'ink' : 'inkMuted'} style={strong && styles.strong}>
        {label}
      </AppText>
      <AppText style={strong ? styles.total : styles.amount}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[3],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.sizes.tapMin,
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  flex: {
    flex: 1,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  summary: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: theme.spacing[2],
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  total: {
    ...textStyles.amountMd,
  },
  pressed: {
    opacity: 0.85,
  },
});

function insufficientStockMessage(error: ApiError, lines: Line[]): string {
  const name = lines.find((l) => l.product.id === error.body.productId)?.product.name;
  return `Stock insuffisant${name ? ` pour « ${name} »` : ''} : il en reste ${String(error.body.available)}.`;
}
