import { router, useLocalSearchParams } from 'expo-router';
import { UserPlus, X } from 'lucide-react-native';
import { useDeferredValue, useState, type ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import {
  AlertBanner,
  AppText,
  Avatar,
  Button,
  FilterChips,
  ListGroup,
  ListRow,
  Screen,
  SearchBar,
  SectionHeader,
  TextField,
} from '@/components/ui';
import type { Customer } from '@/features/customer/customer-api';
import { useCustomer, useCustomers } from '@/features/customer/use-customers';
import type { OrderSource } from '@/features/order/order-api';
import { DateChoice } from '@/features/order/date-choice';
import { PAYMENT_METHODS, SOURCE_LABELS } from '@/features/order/order-status';
import { QuantityStepper } from '@/features/order/quantity-stepper';
import { useCreateOrder } from '@/features/order/use-orders';
import type { Product } from '@/features/product/product-api';
import { useProducts } from '@/features/product/use-products';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { textStyles, theme } from '@/theme';
import { businessToday, formatAr, formatPhone } from '@/utils/format';

type Line = { product: Product; quantity: number };
type CustomerChoice =
  | { kind: 'none' }
  | { kind: 'existing'; customer: Customer }
  | { kind: 'new'; name: string; phone: string };

const sourceOptions = [
  { value: '', label: 'Non précisée' },
  ...(Object.keys(SOURCE_LABELS) as OrderSource[]).map((value) => ({
    value,
    label: SOURCE_LABELS[value],
  })),
];

const toInt = (text: string) => {
  const digits = text.replace(/\s/g, '');
  return /^\d+$/.test(digits) ? Number(digits) : null;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}

export default function NewOrderScreen() {
  const createOrder = useCreateOrder();

  // Opened from a customer's page: that customer is preselected.
  const params = useLocalSearchParams<{ customerId?: string }>();
  const prefill = useCustomer(params.customerId);
  const [prefillDismissed, setPrefillDismissed] = useState(false);

  const [source, setSource] = useState<OrderSource | ''>('');

  // Customer
  const [choice, setChoice] = useState<CustomerChoice>({ kind: 'none' });
  const customer: CustomerChoice =
    choice.kind === 'none' && prefill.data && !prefillDismissed
      ? { kind: 'existing', customer: prefill.data }
      : choice;
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

  // Planned day
  const [scheduledDate, setScheduledDate] = useState<string | null>(businessToday());

  // Delivery
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryPlace, setDeliveryPlace] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('');
  const [confirmNow, setConfirmNow] = useState(false);
  const [formError, setFormError] = useState<string>();

  const itemsAmount = lines.reduce((sum, l) => sum + l.quantity * l.product.sellingPrice, 0);
  const fee = isDelivery ? (toInt(deliveryFee) ?? 0) : 0;

  const resetCustomer = () => {
    setPrefillDismissed(true);
    setChoice({ kind: 'none' });
  };

  const startNewCustomer = () => {
    // Prefill from what was typed: digits go to the phone, text to the name.
    const typed = customerSearch.trim();
    const isPhone = /^[\d\s+.-]+$/.test(typed);
    setChoice({ kind: 'new', name: isPhone ? '' : typed, phone: isPhone ? typed : '' });
  };

  const addProduct = (product: Product) => {
    setLines((current) =>
      current.some((l) => l.product.id === product.id)
        ? current.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...current, { product, quantity: 1 }],
    );
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
    if (customer.kind === 'new' && !customer.name.trim()) {
      return setFormError('Indiquez le nom du nouveau client.');
    }
    if (!scheduledDate) return setFormError('Indiquez une date valide (JJ/MM/AAAA).');
    if (isDelivery && deliveryFee.trim() && toInt(deliveryFee) === null) {
      return setFormError('Frais de livraison : montant en Ariary, sans virgule.');
    }

    try {
      const order = await createOrder.mutateAsync({
        customerId: customer.kind === 'existing' ? customer.customer.id : null,
        customer:
          customer.kind === 'new'
            ? { name: customer.name.trim(), phone: customer.phone.trim() || null }
            : null,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        source: source || null,
        scheduledDate,
        delivery: isDelivery
          ? {
              place: deliveryPlace.trim() || null,
              address: deliveryAddress.trim() || null,
              note: deliveryNote.trim() || null,
              fee,
            }
          : null,
        paymentMethod: paymentMethod || null,
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
      <Section title="Source">
        <FilterChips
          options={sourceOptions}
          value={source}
          onChange={(value) => setSource(value as OrderSource | '')}
        />
      </Section>

      <Section title="Client">
        {customer.kind === 'existing' && (
          <ListGroup>
            <ListRow
              leading={<Avatar name={customer.customer.name} />}
              title={customer.customer.name}
              subtitle={
                customer.customer.phones[0]
                  ? formatPhone(customer.customer.phones[0])
                  : 'Pas de téléphone'
              }
              trailing={<Button label="Changer" variant="ghost" compact onPress={resetCustomer} />}
            />
          </ListGroup>
        )}
        {customer.kind === 'new' && (
          <View style={styles.section}>
            <TextField
              label="Nom du client"
              value={customer.name}
              onChangeText={(name) => setChoice({ ...customer, name })}
              autoCapitalize="words"
            />
            <TextField
              label="Téléphone"
              hint="Si ce numéro est déjà connu, la fiche du client est réutilisée."
              value={customer.phone}
              onChangeText={(phone) => setChoice({ ...customer, phone })}
              keyboardType="phone-pad"
            />
            <Button
              label="Annuler le nouveau client"
              icon={X}
              variant="ghost"
              compact
              onPress={resetCustomer}
            />
          </View>
        )}
        {customer.kind === 'none' && (
          <View style={styles.section}>
            <SearchBar
              value={customerSearch}
              onChangeText={setCustomerSearch}
              placeholder="Nom, téléphone ou profil du client"
            />
            {customerQuery.length >= 2 && !!customerMatches.data?.length && (
              <ListGroup>
                {customerMatches.data.slice(0, 5).map((c) => (
                  <ListRow
                    key={c.id}
                    leading={<Avatar name={c.name} />}
                    title={c.name}
                    subtitle={
                      c.phones[0] ? formatPhone(c.phones[0]) : (c.socialProfile ?? undefined)
                    }
                    onPress={() => setChoice({ kind: 'existing', customer: c })}
                  />
                ))}
              </ListGroup>
            )}
            <Button
              label="Nouveau client"
              icon={UserPlus}
              variant="ghost"
              compact
              onPress={startNewCustomer}
            />
          </View>
        )}
      </Section>

      <Section title="Produits">
        {lines.length > 0 && (
          <ListGroup>
            {lines.map((line) => {
              const overStock = line.quantity > line.product.stockQuantity;
              return (
                <ListRow
                  key={line.product.id}
                  leading={<Avatar name={line.product.name} imageUri={line.product.image} />}
                  title={line.product.name}
                  subtitle={`${formatAr(line.product.sellingPrice)} · ${
                    overStock
                      ? `stock : ${line.product.stockQuantity} seulement`
                      : `${line.product.stockQuantity} en stock`
                  }`}
                  trailing={
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(q) => setQuantity(line.product.id, q)}
                    />
                  }
                />
              );
            })}
          </ListGroup>
        )}
        <SearchBar
          value={productSearch}
          onChangeText={setProductSearch}
          placeholder="Ajouter un produit"
        />
        {suggestions.length > 0 && (
          <ListGroup>
            {suggestions.map((p) => (
              <ListRow
                key={p.id}
                leading={<Avatar name={p.name} imageUri={p.image} />}
                title={p.name}
                subtitle={`${formatAr(p.sellingPrice)} · ${p.stockQuantity} en stock`}
                onPress={() => addProduct(p)}
              />
            ))}
          </ListGroup>
        )}
        {products.data?.length === 0 && (
          <AppText color="inkMuted">
            {productQuery
              ? 'Aucun produit trouvé.'
              : "Ajoutez d'abord des produits dans l'onglet Stock."}
          </AppText>
        )}
      </Section>

      <Section title="Date prévue">
        <DateChoice value={scheduledDate} onChange={setScheduledDate} />
      </Section>

      <Section title="Livraison">
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText style={styles.strong}>À livrer</AppText>
            <AppText variant="caption" color="inkMuted">
              {isDelivery
                ? 'Lieu, adresse et frais de livraison.'
                : 'Retrait ou remise en main propre.'}
            </AppText>
          </View>
          <Switch
            value={isDelivery}
            onValueChange={setIsDelivery}
            trackColor={{ true: theme.colors.blue, false: theme.colors.line }}
            accessibilityLabel="À livrer"
          />
        </View>
        {isDelivery && (
          <View style={styles.section}>
            <TextField
              label="Lieu de livraison"
              value={deliveryPlace}
              onChangeText={setDeliveryPlace}
              placeholder="Ex. Analakely, Ivandry…"
              maxLength={150}
            />
            <TextField
              label="Adresse de livraison"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Lot, rue, repère…"
              multiline
              maxLength={1000}
            />
            <TextField
              label="Précisions (facultatif)"
              value={deliveryNote}
              onChangeText={setDeliveryNote}
              placeholder="Ex. appeler avant, portail bleu…"
              multiline
              maxLength={1000}
            />
            <TextField
              label="Frais de livraison (Ar)"
              value={deliveryFee}
              onChangeText={setDeliveryFee}
              placeholder="0"
              keyboardType="number-pad"
            />
          </View>
        )}
      </Section>

      <Section title="Paiement">
        <FilterChips
          options={[
            { value: '', label: 'Non précisé' },
            ...PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
          ]}
          value={paymentMethod}
          onChange={setPaymentMethod}
        />
      </Section>

      <View style={styles.summary}>
        <SummaryLine label="Articles" value={formatAr(itemsAmount)} />
        {isDelivery && <SummaryLine label="Livraison" value={formatAr(fee)} />}
        <SummaryLine label="Total à payer" value={formatAr(itemsAmount + fee)} strong />
      </View>

      <View style={styles.switchRow}>
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

function insufficientStockMessage(error: ApiError, lines: Line[]): string {
  const name = lines.find((l) => l.product.id === error.body.productId)?.product.name;
  return `Stock insuffisant${name ? ` pour « ${name} »` : ''} : il en reste ${String(error.body.available)}.`;
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[3],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.layout.rowMinHeight,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
  },
  summary: {
    gap: theme.spacing[2],
    padding: theme.spacing[4],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  total: {
    ...textStyles.amountMd,
  },
});
