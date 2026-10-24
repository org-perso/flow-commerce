import { router, Stack } from 'expo-router';
import { Check, MapPin, Plus, Store, TriangleAlert, Truck, X } from 'lucide-react-native';
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
import type { Order, OrderPatch } from '@/features/order/order-api';
import { DateChoice } from '@/features/order/date-choice';
import type { TimeSlot } from '@/features/order/time-slot';
import { TimeSlotChoice } from '@/features/order/time-slot-choice';
import { PAYMENT_METHODS } from '@/features/order/order-status';
import { QuantityStepper } from '@/features/order/quantity-stepper';
import {
  placeSearchKey,
  useCreateOrder,
  useRecentPlaces,
  useUpdateOrder,
} from '@/features/order/use-orders';
import type { Product } from '@/features/product/product-api';
import { useProducts } from '@/features/product/use-products';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { hitSlopFor, textStyles, theme } from '@/theme';
import { businessToday, formatAr, formatPhone, operatorOf, type Operator } from '@/utils/format';

type Line = { product: Product; quantity: number };
/** At most 3 numbers per order (the API refuses more). */
const MAX_PHONES = 3;

/** Digits of a number as the API stores it: "+261 34 12 345 67" → "0341234567". */
function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  return /^261\d{9}$/.test(digits) ? `0${digits.slice(3)}` : digits;
}

const toInt = (text: string) => {
  const digits = text.replace(/\s/g, '');
  return /^\d+$/.test(digits) ? Number(digits) : null;
};

type OrderFormProps = {
  /** Editing this order; creating a new one otherwise. */
  order?: Order;
  /** New order opened from a customer's page: that customer is preselected. */
  customerId?: string;
  /** "Recommander": a new order prefilled from this one (products, delivery, customer). */
  template?: Order;
};

/** A product known only from an order line (until the product list has loaded). */
const lineProduct = (item: NonNullable<Order['items']>[number]): Product => ({
  id: item.productId,
  name: item.productName,
  description: null,
  image: null,
  category: null,
  sellingPrice: item.unitSellingPrice,
  stockQuantity: Number.POSITIVE_INFINITY,
  lowStockThreshold: 0,
  isLowStock: false,
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
});

/**
 * New order (F-06) or edit of an existing one. Lines can only change while the order is
 * pending (RG-24): after confirmation the stock is taken, so they are shown locked.
 */
export function OrderForm({ order, customerId, template }: OrderFormProps) {
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder(order?.id ?? '');
  const editing = !!order;
  const linesEditable = !order || order.status === 'EN_ATTENTE';
  // Starting values: the edited order, or the order copied by "Recommander" (current prices,
  // planned today, not paid yet).
  const base = order ?? template;

  const prefill = useCustomer(base ? (base.customer?.id ?? undefined) : customerId);

  // Phones: up to 3, the first one is the number the driver calls.
  const [phones, setPhones] = useState<string[]>(() => {
    const start = base?.phones?.length
      ? base.phones
      : base?.delivery?.phone
        ? [base.delivery.phone]
        : [];
    return start.length > 0 ? start.map(formatPhone) : [''];
  });
  const filledPhones = phones.map((p) => p.trim()).filter(Boolean);
  const setPhoneAt = (index: number, value: string) =>
    setPhones((list) => list.map((p, i) => (i === index ? value : p)));

  // Customer: saved by default; a known number (or the customer the form was opened for)
  // links the order to that customer's card.
  const [saveCustomer, setSaveCustomer] = useState(base ? !!base.customer : true);
  const [customerName, setCustomerName] = useState('');
  const [ignoredId, setIgnoredId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Customer | null>(null);
  const lookupPhone = filledPhones.map(phoneDigits).find((d) => d.length >= 9) ?? '';
  const byPhone = useCustomers(lookupPhone, { enabled: lookupPhone.length >= 9 });
  const phoneMatch =
    byPhone.data?.find((c) => c.phones.some((p) => phoneDigits(p) === lookupPhone)) ?? null;
  const linked = [picked, phoneMatch, prefill.data].find((c) => c && c.id !== ignoredId) ?? null;
  // Name typed for a new customer: existing customers with that name are suggested.
  const nameQuery = useDeferredValue(customerName.trim());
  const byName = useCustomers(nameQuery, {
    enabled: saveCustomer && !linked && nameQuery.length >= 2,
  });

  /** Picks a suggested customer: their numbers fill the empty slots. */
  const pickCustomer = (c: Customer) => {
    setPicked(c);
    setIgnoredId(null);
    setPhones((list) => {
      const kept = list.map((p) => p.trim()).filter(Boolean);
      const known = new Set(kept.map(phoneDigits));
      const added = c.phones.filter((p) => !known.has(phoneDigits(p))).map(formatPhone);
      const next = [...kept, ...added].slice(0, MAX_PHONES);
      return next.length > 0 ? next : [''];
    });
  };

  // Products
  const [lineState, setLines] = useState<Line[]>(
    () => base?.items?.map((i) => ({ product: lineProduct(i), quantity: i.quantity })) ?? [],
  );
  const [productSearch, setProductSearch] = useState('');
  const productQuery = useDeferredValue(productSearch.trim());
  const products = useProducts({ q: productQuery || undefined });
  // Lines of an edited order get their product (stock, photo) once the list is there.
  const allProducts = useProducts({});
  const lines = lineState.map((l) => ({
    ...l,
    product: allProducts.data?.find((p) => p.id === l.product.id) ?? l.product,
  }));

  // Planned day
  const [scheduledDate, setScheduledDate] = useState<string | null>(
    order?.scheduledDate ?? businessToday(),
  );
  const [timeSlot, setTimeSlot] = useState<TimeSlot | null>(base?.timeSlot ?? null);

  // Delivery
  // New orders start as a delivery, the most common case; an edited order keeps its mode.
  const [isDelivery, setIsDelivery] = useState(base ? !!base.delivery : true);
  const [deliveryPlace, setDeliveryPlace] = useState(base?.delivery?.place ?? '');
  const [deliveryAddress, setDeliveryAddress] = useState(base?.delivery?.address ?? '');
  const [deliveryNote, setDeliveryNote] = useState(base?.delivery?.note ?? '');
  const [deliveryMore, setDeliveryMore] = useState(false);
  const showDeliveryMore = deliveryMore || !!deliveryAddress || !!deliveryNote;
  const [deliveryFee, setDeliveryFee] = useState(base?.deliveryFee ? String(base.deliveryFee) : '');

  const [paymentMethod, setPaymentMethod] = useState(base?.paymentMethod ?? '');
  const [isPaid, setIsPaid] = useState(order?.isPaid ?? false);
  const [formError, setFormError] = useState<string>();

  // Places already used, matching what is typed (4 at most); hidden once one is picked.
  const recentPlaces = useRecentPlaces();
  const typedPlace = placeSearchKey(deliveryPlace);
  const placeSuggestions = (recentPlaces.data ?? [])
    .filter((place) => {
      const key = placeSearchKey(place);
      return key !== typedPlace && key.includes(typedPlace);
    })
    .slice(0, 4);

  const itemsAmount = lines.reduce((sum, l) => sum + l.quantity * l.product.sellingPrice, 0);
  const fee = isDelivery ? (toInt(deliveryFee) ?? 0) : 0;
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
    if (filledPhones.some((p) => phoneDigits(p).length < 6)) {
      return setFormError('Un des numéros de téléphone est incomplet.');
    }
    if (isDelivery && filledPhones.length === 0) {
      return setFormError('Indiquez un numéro : le livreur doit pouvoir appeler.');
    }
    if (saveCustomer && !linked && !customerName.trim()) {
      return setFormError('Indiquez le nom du client, ou décochez « Enregistrer le client ».');
    }
    if (!scheduledDate) return setFormError('Indiquez une date valide (JJ/MM/AAAA).');
    if (isDelivery && deliveryFee.trim() && toInt(deliveryFee) === null) {
      return setFormError('Frais de livraison : montant en Ariary, sans virgule.');
    }

    const delivery = isDelivery
      ? {
          place: deliveryPlace.trim() || null,
          address: deliveryAddress.trim() || null,
          note: deliveryNote.trim() || null,
          fee,
          phone: filledPhones[0] ?? null,
        }
      : null;
    // Saved customer: sent with the numbers (the API finds the card by any of them and adds the
    // new ones). A known customer without any number typed is linked by its id.
    const customerFields = !saveCustomer
      ? { customerId: null, customer: null }
      : filledPhones.length > 0
        ? {
            customerId: null,
            customer: { name: (linked?.name ?? customerName).trim(), phones: filledPhones },
          }
        : linked
          ? { customerId: linked.id, customer: null }
          : { customerId: null, customer: { name: customerName.trim(), phones: [] } };

    if (order) {
      const patch: OrderPatch = {
        ...(customerFields.customer
          ? { customer: customerFields.customer }
          : { customerId: customerFields.customerId }),
        phones: filledPhones,
        scheduledDate,
        timeSlot,
        delivery,
        paymentMethod: paymentMethod || null,
        isPaid,
        ...(linesEditable
          ? { items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })) }
          : {}),
      };
      try {
        await updateOrder.mutateAsync(patch);
        router.back();
      } catch {
        // Shown through updateOrder.error.
      }
      return;
    }

    try {
      const created = await createOrder.mutateAsync({
        ...customerFields,
        phones: filledPhones,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        source: null,
        scheduledDate,
        timeSlot,
        delivery,
        paymentMethod: paymentMethod || null,
        isPaid,
        status: 'EN_ATTENTE',
      });
      router.replace(`/orders/${created.id}`);
    } catch {
      // Shown through createOrder.error.
    }
  };

  const apiError = editing ? updateOrder.error : createOrder.error;
  // "Stock insuffisant": offer the fix in one tap (reduce to what is left, or remove the line).
  const stockFix =
    linesEditable &&
    apiError instanceof ApiError &&
    apiError.title === 'Insufficient Stock' &&
    lines.some((l) => l.product.id === apiError.body.productId)
      ? {
          productId: String(apiError.body.productId),
          available: Number(apiError.body.available ?? 0),
        }
      : null;
  const applyStockFix = () => {
    if (!stockFix) return;
    setQuantity(stockFix.productId, stockFix.available);
    createOrder.reset();
    updateOrder.reset();
  };
  const errorMessage =
    formError ??
    (apiError instanceof ApiError && apiError.title === 'Insufficient Stock'
      ? insufficientStockMessage(apiError, lines)
      : apiError
        ? apiErrorMessage(apiError)
        : undefined);

  // 5 products at a time ("Voir plus" adds 5); back to 5 when the search changes.
  const [more, setMore] = useState({ query: '', shown: PRODUCTS_STEP });
  const shown = more.query === productQuery ? more.shown : PRODUCTS_STEP;
  const matching = (products.data ?? []).filter((p) => !lines.some((l) => l.product.id === p.id));
  const suggestions = matching.slice(0, shown);
  const hiddenCount = matching.length - suggestions.length;
  // Suggestions while searching, or to start an empty order.
  const showSuggestions = productQuery !== '' || lines.length === 0;

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  // Without purchase prices (CM, RG-60) there is no profit to show.
  const profit = lines.reduce(
    (sum, l) =>
      sum +
      (l.product.purchasePrice === undefined
        ? 0
        : l.quantity * (l.product.sellingPrice - l.product.purchasePrice)),
    0,
  );

  return (
    <Screen
      edges={[]}
      footer={
        <View style={styles.footer}>
          <View style={styles.footerLine}>
            <AppText variant="caption" color="inkMuted" style={styles.flex} numberOfLines={1}>
              {itemCount} article{itemCount > 1 ? 's' : ''} · {isPaid ? 'Payée' : 'Non payée'}
              {profit > 0 && (
                <AppText variant="caption" color="statusDeliveredFg" style={styles.strong}>
                  {` · +${formatAr(profit)} bénéfice`}
                </AppText>
              )}
            </AppText>
            <AppText style={styles.total}>{formatAr(itemsAmount + fee)}</AppText>
          </View>
          <Button
            label={editing ? 'Enregistrer' : 'Créer la commande'}
            icon={Check}
            variant="primary"
            fullWidth
            loading={editing ? updateOrder.isPending : createOrder.isPending}
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

      {/* 1. Produits */}
      <View style={styles.stepCard}>
        <StepHeader
          step={1}
          title="Produits"
          right={
            itemCount > 0 ? (
              <AppText variant="caption" color="inkMuted">
                {itemCount} article{itemCount > 1 ? 's' : ''}
              </AppText>
            ) : undefined
          }
        />
        {!linesEditable && (
          <AlertBanner message="Produits verrouillés : la commande est confirmée. Annulez-la et recréez-la pour changer les produits." />
        )}
        {linesEditable && (
          <SearchBar
            value={productSearch}
            onChangeText={setProductSearch}
            placeholder="Ajouter un produit"
          />
        )}
        {linesEditable && showSuggestions && suggestions.length > 0 && (
          <View>
            {suggestions.map((p, index) => (
              <Pressable
                key={p.id}
                onPress={() => addProduct(p)}
                accessibilityRole="button"
                accessibilityLabel={`Ajouter ${p.name}`}
                style={({ pressed }) => [
                  styles.pickRow,
                  index > 0 && styles.lineDivider,
                  pressed && styles.pressed,
                ]}
              >
                <Avatar name={p.name} imageUri={p.image} size="sm" />
                <View style={styles.flex}>
                  <AppText variant="label" style={styles.strong} numberOfLines={1}>
                    {p.name}
                  </AppText>
                  <AppText variant="caption" color="inkMuted">
                    {formatAr(p.sellingPrice)} · {p.stockQuantity} en stock
                  </AppText>
                </View>
                <Plus size={theme.layout.iconMd} color={theme.colors.blue} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        )}
        {linesEditable && showSuggestions && hiddenCount > 0 && (
          <Button
            label={`Voir plus de produits (${hiddenCount})`}
            variant="ghost"
            compact
            onPress={() => setMore({ query: productQuery, shown: shown + PRODUCTS_STEP })}
          />
        )}
        {linesEditable && products.data?.length === 0 && (
          <AppText color="inkMuted">
            {productQuery
              ? 'Aucun produit trouvé.'
              : "Ajoutez d'abord des produits dans l'onglet Produits."}
          </AppText>
        )}
        {lines.length > 0 && (
          <View style={styles.lines}>
            {lines.map((line, index) => (
              <OrderLine
                key={line.product.id}
                line={line}
                divider={index > 0}
                onQuantity={linesEditable ? (q) => setQuantity(line.product.id, q) : undefined}
              />
            ))}
          </View>
        )}
      </View>

      {/* 2. Téléphone(s): the numbers to reach the customer, first = the one the driver calls. */}
      <View style={styles.stepCard}>
        <StepHeader step={2} title={phones.length > 1 ? 'Téléphones' : 'Téléphone'} />
        {phones.map((value, index) => (
          <View key={index} style={styles.phoneRow}>
            <View style={styles.flex}>
              <TextField
                label={
                  index === 0
                    ? isDelivery
                      ? 'Numéro principal (obligatoire pour livrer)'
                      : 'Numéro principal'
                    : `Autre numéro ${index}`
                }
                value={value}
                onChangeText={(text) => setPhoneAt(index, text)}
                placeholder="034 00 000 00"
                keyboardType="phone-pad"
              />
            </View>
            <OperatorBadge phone={value} />
            {phones.length > 1 && (
              <Pressable
                onPress={() => setPhones((list) => list.filter((_, i) => i !== index))}
                accessibilityRole="button"
                accessibilityLabel="Retirer ce numéro"
                hitSlop={hitSlopFor(theme.layout.iconLg)}
                style={styles.phoneRemove}
              >
                <X size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        ))}
        {phones.length < MAX_PHONES && (
          <View style={styles.links}>
            <Button
              label="Ajouter un autre numéro"
              icon={Plus}
              variant="ghost"
              compact
              onPress={() => setPhones((list) => [...list, ''])}
            />
          </View>
        )}
      </View>

      {/* 3. Client: saved with the numbers above, or a walk-in customer. */}
      <View style={styles.stepCard}>
        <StepHeader step={3} title="Client" />
        <Pressable
          onPress={() => setSaveCustomer((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: saveCustomer }}
          style={styles.row}
        >
          <View style={[styles.checkbox, saveCustomer && styles.checkboxOn]}>
            {saveCustomer && (
              <Check size={theme.layout.iconSm} color={theme.colors.onNavy} strokeWidth={3} />
            )}
          </View>
          <View style={styles.flex}>
            <AppText style={styles.strong}>Enregistrer le client</AppText>
            <AppText variant="caption" color="inkMuted">
              {saveCustomer
                ? 'Avec les numéros ci-dessus, dans vos clients.'
                : 'Client de passage : les numéros restent sur la commande.'}
            </AppText>
          </View>
        </Pressable>
        {saveCustomer && linked && (
          <View style={[styles.inset, styles.row]}>
            <Avatar name={linked.name} size="sm" />
            <View style={styles.flex}>
              <AppText variant="caption" color="inkMuted">
                Client connu
              </AppText>
              <AppText style={styles.strong} numberOfLines={1}>
                {linked.name}
              </AppText>
              <AppText variant="caption" color="inkMuted">
                {`${linked.orderCount} commande${linked.orderCount > 1 ? 's' : ''} passée${linked.orderCount > 1 ? 's' : ''}`}
              </AppText>
            </View>
            <Button
              label="Ce n’est pas lui"
              variant="ghost"
              compact
              onPress={() => {
                setIgnoredId(linked.id);
                setPicked(null);
              }}
            />
          </View>
        )}
        {saveCustomer && !linked && (
          <>
            <TextField
              label="Nom du client"
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Ex. Rakoto Jean"
              autoCapitalize="words"
              maxLength={150}
            />
            {!!byName.data?.length && (
              <ListGroup>
                {byName.data.slice(0, 3).map((c) => (
                  <ListRow
                    key={c.id}
                    leading={<Avatar name={c.name} />}
                    title={c.name}
                    subtitle={c.phones[0] ? formatPhone(c.phones[0]) : 'Client existant'}
                    onPress={() => pickCustomer(c)}
                  />
                ))}
              </ListGroup>
            )}
          </>
        )}
      </View>

      {/* 4. Livraison */}
      <View style={styles.stepCard}>
        <StepHeader step={4} title="Livraison" />
        <ModeToggle isDelivery={isDelivery} onChange={setIsDelivery} />
        {isDelivery && (
          <>
            <View style={styles.fieldsRow}>
              <View style={styles.wide}>
                <TextField
                  label="Lieu de livraison"
                  value={deliveryPlace}
                  onChangeText={setDeliveryPlace}
                  placeholder="Analakely, Ivandry…"
                  maxLength={150}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label="Frais (Ar)"
                  value={deliveryFee}
                  onChangeText={setDeliveryFee}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            {placeSuggestions.length > 0 && (
              <View style={styles.chips}>
                {placeSuggestions.map((place) => (
                  <Pressable
                    key={place}
                    onPress={() => setDeliveryPlace(place)}
                    accessibilityRole="button"
                    accessibilityLabel={`Lieu : ${place}`}
                    style={({ pressed }) => [styles.placeChip, pressed && styles.pressed]}
                  >
                    <MapPin
                      size={theme.layout.iconSm}
                      color={theme.colors.inkMuted}
                      strokeWidth={2}
                    />
                    <AppText variant="label">{place}</AppText>
                  </Pressable>
                ))}
              </View>
            )}
            {/* Rarely needed: folded, unless already filled. */}
            {showDeliveryMore ? (
              <>
                <TextField
                  label="Adresse (facultatif)"
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
              </>
            ) : (
              <View style={styles.links}>
                <Button
                  label="Adresse et précisions"
                  icon={Plus}
                  variant="ghost"
                  compact
                  onPress={() => setDeliveryMore(true)}
                />
              </View>
            )}
          </>
        )}
        <View style={styles.divider} />
        <AppText variant="caption" color="inkMuted" style={styles.fieldLabel}>
          Livrer le
        </AppText>
        <DateChoice value={scheduledDate} onChange={setScheduledDate} />
        <AppText variant="caption" color="inkMuted" style={styles.fieldLabel}>
          Heure
        </AppText>
        <TimeSlotChoice value={timeSlot} onChange={setTimeSlot} />
      </View>

      {/* 4. Paiement */}
      <View style={styles.stepCard}>
        <StepHeader step={5} title="Paiement" />
        {/* One switch: not ticked means still to pay. */}
        <Pressable
          onPress={() => setIsPaid((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: isPaid }}
          style={styles.row}
        >
          <View style={styles.flex}>
            <AppText style={styles.strong}>Déjà payée</AppText>
            <AppText variant="caption" color="inkMuted">
              {isPaid ? 'Le client a réglé.' : 'Sinon, elle reste non payée.'}
            </AppText>
          </View>
          <Switch
            value={isPaid}
            onValueChange={setIsPaid}
            trackColor={{ true: theme.colors.blue, false: theme.colors.line }}
            accessibilityLabel="Déjà payée"
          />
        </Pressable>
        <ChipGroup
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
          value={paymentMethod}
          // A second tap on the selected method clears it (not specified).
          onChange={(m) => setPaymentMethod(m === paymentMethod ? '' : m)}
        />
      </View>

      {errorMessage && <AlertBanner tone="danger" message={errorMessage} />}
      {stockFix && (
        <Button
          label={stockFix.available > 0 ? `Réduire à ${stockFix.available}` : 'Retirer ce produit'}
          variant="dark"
          fullWidth
          onPress={applyStockFix}
        />
      )}
    </Screen>
  );
}

const OPERATOR_COLORS: Record<Operator, { bg: string; fg: string }> = {
  Telma: { bg: theme.colors.statusDeliveredBg, fg: theme.colors.statusDeliveredFg },
  Orange: { bg: theme.colors.goldSoft, fg: theme.colors.goldInk },
  Airtel: { bg: theme.colors.statusCancelledBg, fg: theme.colors.statusCancelledFg },
  Autre: { bg: theme.colors.navySoft, fg: theme.colors.inkMuted },
};

/** Telma / Orange / Airtel next to a number, as soon as its prefix is typed. */
function OperatorBadge({ phone }: { phone: string }) {
  const operator = operatorOf(phone);
  if (!operator) return null;
  const { bg, fg } = OPERATOR_COLORS[operator];
  return (
    <View style={[styles.operator, { backgroundColor: bg }]}>
      <AppText variant="caption" style={[styles.operatorText, { color: fg }]}>
        {operator}
      </AppText>
    </View>
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
      <AppText style={[styles.flex, styles.stepTitle]}>{title}</AppText>
      {right}
    </View>
  );
}

/** Livraison / À récupérer: one compact two-way toggle (delivery first, the usual case). */
function ModeToggle({
  isDelivery,
  onChange,
}: {
  isDelivery: boolean;
  onChange: (isDelivery: boolean) => void;
}) {
  const options = [
    { value: true, label: 'Livraison', icon: Truck },
    { value: false, label: 'À récupérer', icon: Store },
  ];
  return (
    <View style={styles.toggle} accessibilityRole="radiogroup">
      {options.map(({ value, label, icon: Icon }) => {
        const selected = value === isDelivery;
        return (
          <Pressable
            key={label}
            onPress={() => {
              Keyboard.dismiss();
              onChange(value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.toggleItem, selected && styles.toggleItemSelected]}
          >
            <Icon
              size={theme.layout.iconSm}
              color={selected ? theme.colors.onNavy : theme.colors.inkMuted}
              strokeWidth={2}
            />
            <AppText variant="label" color={selected ? 'onNavy' : 'ink'} style={styles.strong}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
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
  /** Absent when the lines are locked (confirmed order). */
  onQuantity?: (quantity: number) => void;
}) {
  const { product, quantity } = line;
  const stock = product.stockQuantity;
  // Locked lines already hold their stock; unknown stock (not loaded yet) shows no hint.
  const showStock = !!onQuantity && Number.isFinite(stock);
  const warning = !showStock
    ? null
    : quantity > stock
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
          ) : showStock ? (
            <AppText variant="caption" color="inkMuted">
              {stock} en stock
            </AppText>
          ) : null}
        </View>
        {onQuantity && (
          <Pressable
            onPress={() => onQuantity(0)}
            accessibilityRole="button"
            accessibilityLabel={`Retirer ${product.name}`}
            hitSlop={theme.spacing[3]}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <X size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      <View style={[styles.row, styles.lineBottom]}>
        {onQuantity ? (
          <QuantityStepper value={quantity} onChange={onQuantity} />
        ) : (
          <AppText color="inkMuted">× {quantity}</AppText>
        )}
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

/** Products listed at a time under the search field. */
const PRODUCTS_STEP = 5;

const styles = StyleSheet.create({
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing[2],
  },
  operator: {
    height: theme.layout.controlHeight,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.radius.md,
  },
  operatorText: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  phoneRemove: {
    height: theme.layout.controlHeight,
    justifyContent: 'center',
  },
  checkbox: {
    width: theme.layout.iconLg,
    height: theme.layout.iconLg,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: theme.colors.navy,
    borderColor: theme.colors.navy,
  },
  section: {
    gap: theme.spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  stepCard: {
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  stepTitle: {
    fontFamily: theme.typography.heading.fontFamily,
    fontSize: theme.typography.body.fontSize,
  },
  inset: {
    padding: theme.spacing[2],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  divider: {
    height: theme.layout.border,
    backgroundColor: theme.colors.line,
  },
  fieldLabel: {
    fontFamily: theme.typography.label.fontFamily,
    marginBottom: -theme.spacing[1],
  },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    minHeight: theme.layout.controlHeight - theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.layout.controlHeight,
    paddingVertical: theme.spacing[2],
  },
  lines: {
    marginTop: -theme.spacing[1],
  },
  toggle: {
    flexDirection: 'row',
    padding: theme.spacing[1] / 2,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  toggleItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    minHeight: theme.layout.controlHeight,
    borderRadius: theme.radius.sm,
  },
  toggleItemSelected: {
    backgroundColor: theme.colors.navy,
  },
  fieldsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[3],
  },
  wide: {
    flex: 2,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing[4],
  },
  stepDisc: {
    width: theme.spacing[4] + theme.spacing[1],
    height: theme.spacing[4] + theme.spacing[1],
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.navy,
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
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.pill,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  chipSelected: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
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
