import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  Store,
  TriangleAlert,
  Truck,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useDeferredValue, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  AlertBanner,
  AppText,
  Avatar,
  Button,
  ListGroup,
  ListRow,
  Screen,
  SearchBar,
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
import { hitSlopFor, textStyles, theme } from '@/theme';
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
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
        isPaid,
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
  // Suggestions while searching, or to start an empty order.
  const showSuggestions = productQuery !== '' || lines.length === 0;

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const profit = lines.reduce(
    (sum, l) => sum + l.quantity * (l.product.sellingPrice - l.product.purchasePrice),
    0,
  );
  const moreSummary = [
    source ? SOURCE_LABELS[source] : null,
    confirmNow ? 'Confirmée' : 'En attente',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen
      edges={[]}
      footer={
        <View style={styles.footer}>
          <View style={styles.footerLine}>
            <AppText variant="caption" color="inkMuted" style={styles.flex} numberOfLines={1}>
              {itemCount} article{itemCount > 1 ? 's' : ''} · {isPaid ? 'Payée' : 'À encaisser'}
              {profit > 0 && (
                <AppText variant="caption" color="statusDeliveredFg" style={styles.strong}>
                  {` · +${formatAr(profit)} bénéfice`}
                </AppText>
              )}
            </AppText>
            <AppText style={styles.total}>{formatAr(itemsAmount + fee)}</AppText>
          </View>
          <Button
            label="Créer la commande"
            icon={Check}
            variant="primary"
            fullWidth
            loading={createOrder.isPending}
            onPress={submit}
          />
        </View>
      }
    >
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={theme.spacing[3]}
            >
              <X size={theme.layout.iconLg} color={theme.colors.ink} strokeWidth={2} />
            </Pressable>
          ),
        }}
      />

      {/* 1. Client */}
      <View style={styles.section}>
        <StepHeader step={1} title="Client" />
        {customer.kind === 'existing' && (
          <View style={[styles.card, styles.row]}>
            <Avatar name={customer.customer.name} />
            <View style={styles.flex}>
              <AppText style={styles.strong} numberOfLines={1}>
                {customer.customer.name}
              </AppText>
              <AppText variant="caption" color="inkMuted">
                {[
                  customer.customer.phones[0] ? formatPhone(customer.customer.phones[0]) : null,
                  `${customer.customer.orderCount} commande${customer.customer.orderCount > 1 ? 's' : ''} passée${customer.customer.orderCount > 1 ? 's' : ''}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </View>
            <Button label="Changer" variant="ghost" compact onPress={resetCustomer} />
          </View>
        )}
        {customer.kind === 'new' && (
          <View style={[styles.card, styles.section]}>
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
          </View>
        )}
        {customer.kind === 'none' && (
          <>
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
          </>
        )}
        <View style={styles.links}>
          {customer.kind === 'none' ? (
            <AppText variant="caption" color="inkMuted">
              Sans client choisi : client de passage.
            </AppText>
          ) : (
            <Button label="Client de passage" variant="ghost" compact onPress={resetCustomer} />
          )}
          {customer.kind !== 'new' && (
            <Button
              label="Nouveau client"
              icon={UserPlus}
              variant="ghost"
              compact
              onPress={startNewCustomer}
            />
          )}
        </View>
      </View>

      {/* 2. Produits */}
      <View style={styles.section}>
        <StepHeader
          step={2}
          title="Produits"
          right={
            itemCount > 0 ? (
              <AppText variant="caption" color="inkMuted">
                {itemCount} article{itemCount > 1 ? 's' : ''}
              </AppText>
            ) : undefined
          }
        />
        <SearchBar
          value={productSearch}
          onChangeText={setProductSearch}
          placeholder="Ajouter un produit"
        />
        {showSuggestions && suggestions.length > 0 && (
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
        {lines.length > 0 && (
          <View style={styles.card}>
            {lines.map((line, index) => (
              <OrderLine
                key={line.product.id}
                line={line}
                divider={index > 0}
                onQuantity={(q) => setQuantity(line.product.id, q)}
              />
            ))}
          </View>
        )}
      </View>

      {/* 3. Remise et date */}
      <View style={styles.section}>
        <StepHeader step={3} title="Remise et date" />
        <View style={styles.row}>
          <ChoiceCard
            icon={Store}
            title="Retrait"
            subtitle="En main propre"
            selected={!isDelivery}
            onPress={() => setIsDelivery(false)}
          />
          <ChoiceCard
            icon={Truck}
            title="Livraison"
            subtitle="À une adresse"
            selected={isDelivery}
            onPress={() => setIsDelivery(true)}
          />
        </View>
        {isDelivery && (
          <>
            <TextField
              label="Lieu de livraison"
              value={deliveryPlace}
              onChangeText={setDeliveryPlace}
              placeholder="Quartier : Analakely, Ivandry…"
              maxLength={150}
            />
            <TextField
              label="Adresse de livraison"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Rue, lot, repère…"
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
          </>
        )}
        <AppText variant="label">Date prévue</AppText>
        <DateChoice value={scheduledDate} onChange={setScheduledDate} />
      </View>

      {/* 4. Paiement */}
      <View style={styles.section}>
        <StepHeader step={4} title="Paiement" />
        <View style={styles.row}>
          <ChoiceCard
            icon={Clock}
            title="À encaisser"
            subtitle="Plus tard"
            selected={!isPaid}
            onPress={() => setIsPaid(false)}
          />
          <ChoiceCard
            icon={Check}
            title="Déjà payée"
            subtitle="Réglée"
            selected={isPaid}
            onPress={() => setIsPaid(true)}
          />
        </View>
        <ChipGroup
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
          value={paymentMethod}
          // A second tap on the selected method clears it (not specified).
          onChange={(m) => setPaymentMethod(m === paymentMethod ? '' : m)}
        />
      </View>

      {/* Less frequent options, folded. */}
      <View style={styles.card}>
        <Pressable
          onPress={() => setMoreOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: moreOpen }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Plus size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
          <View style={styles.flex}>
            <AppText style={styles.strong}>Source et statut</AppText>
            <AppText variant="caption" color="inkMuted">
              {moreSummary}
            </AppText>
          </View>
          {moreOpen ? (
            <ChevronUp size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
          ) : (
            <ChevronDown size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
          )}
        </Pressable>
        {moreOpen && (
          <View style={[styles.section, styles.more]}>
            <AppText variant="label">Source de la commande</AppText>
            <ChipGroup
              options={sourceOptions.filter((o) => o.value !== '')}
              value={source}
              onChange={(value) => setSource(value === source ? '' : (value as OrderSource))}
            />
            <View style={styles.row}>
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
          </View>
        )}
      </View>

      {errorMessage && <AlertBanner tone="danger" message={errorMessage} />}
    </Screen>
  );
}

/** Numbered step title: navy disc with the number, then the title. */
function StepHeader({ step, title, right }: { step: number; title: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.stepDisc}>
        <AppText variant="caption" color="onNavy" style={styles.strong}>
          {step}
        </AppText>
      </View>
      <AppText variant="heading" style={styles.flex}>
        {title}
      </AppText>
      {right}
    </View>
  );
}

/** One of two exclusive options, as a card with a radio dot. */
function ChoiceCard({
  icon: Icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.flex}>
        <View style={styles.choiceTitle}>
          <Icon size={theme.layout.iconSm} color={theme.colors.ink} strokeWidth={2} />
          <AppText style={styles.strong} numberOfLines={1}>
            {title}
          </AppText>
        </View>
        <AppText variant="caption" color="inkMuted" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Wrapping chips (all visible), navy with a check when selected. */
function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: string;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              Keyboard.dismiss();
              onChange(o.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={hitSlopFor(theme.layout.controlHeight)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            {selected && (
              <Check size={theme.layout.iconSm} color={theme.colors.onNavy} strokeWidth={2.5} />
            )}
            <AppText variant="label" color={selected ? 'onNavy' : 'ink'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Product line: unit price, stock hint, remove, quantity and subtotal. */
function OrderLine({
  line,
  divider,
  onQuantity,
}: {
  line: Line;
  divider: boolean;
  onQuantity: (quantity: number) => void;
}) {
  const { product, quantity } = line;
  const stock = product.stockQuantity;
  const warning =
    quantity > stock
      ? `Stock : ${stock} seulement`
      : quantity === stock
        ? stock === 1
          ? 'Dernier en stock'
          : 'Tout le stock'
        : null;

  return (
    <View style={[styles.line, divider && styles.lineDivider]}>
      <View style={styles.row}>
        <Avatar name={product.name} imageUri={product.image} />
        <View style={styles.flex}>
          <AppText style={styles.strong} numberOfLines={1}>
            {product.name}
          </AppText>
          <AppText variant="caption" color="inkMuted">
            {formatAr(product.sellingPrice)} l&apos;unité
          </AppText>
          {warning ? (
            <View style={styles.warning}>
              <TriangleAlert
                size={theme.layout.iconSm}
                color={quantity > stock ? theme.colors.statusCancelledFg : theme.colors.goldInk}
                strokeWidth={2}
              />
              <AppText
                variant="caption"
                color={quantity > stock ? 'statusCancelledFg' : 'goldInk'}
                style={styles.strong}
              >
                {warning}
              </AppText>
            </View>
          ) : (
            <AppText variant="caption" color="inkMuted">
              {stock} en stock
            </AppText>
          )}
        </View>
        <Pressable
          onPress={() => onQuantity(0)}
          accessibilityRole="button"
          accessibilityLabel={`Retirer ${product.name}`}
          hitSlop={theme.spacing[3]}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <X size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
        </Pressable>
      </View>
      <View style={[styles.row, styles.lineBottom]}>
        <QuantityStepper value={quantity} onChange={onQuantity} />
        <AppText style={[styles.flex, styles.subtotal]}>
          {formatAr(quantity * product.sellingPrice)}
        </AppText>
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  card: {
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing[4],
  },
  stepDisc: {
    width: theme.spacing[6],
    height: theme.spacing[6],
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.navy,
  },
  choice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.layout.rowMinHeight,
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  choiceSelected: {
    borderWidth: 2,
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navySoft,
  },
  choiceTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  radio: {
    width: theme.layout.iconMd,
    height: theme.layout.iconMd,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  radioDot: {
    width: theme.layout.dot + 2,
    height: theme.layout.dot + 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.onNavy,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    minHeight: theme.layout.controlHeight,
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.pill,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  chipSelected: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  more: {
    marginTop: theme.spacing[3],
    paddingTop: theme.spacing[3],
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
  },
  line: {
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
  },
  lineDivider: {
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
    paddingTop: theme.spacing[3],
  },
  lineBottom: {
    paddingLeft: theme.layout.avatar + theme.spacing[3],
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  subtotal: {
    textAlign: 'right',
    fontFamily: theme.typography.heading.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    gap: theme.spacing[3],
  },
  footerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  flex: {
    flex: 1,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  total: {
    ...textStyles.amountMd,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
