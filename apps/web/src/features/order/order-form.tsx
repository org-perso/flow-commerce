"use client";

import {
  Check,
  Loader2,
  Lock,
  Minus,
  Plus,
  Search,
  Store,
  Trash2,
  Truck,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/app/avatar";
import { Field } from "@/components/app/field";
import { InlineAlert } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import type { Customer } from "@/features/customer/customer-api";
import { useCustomer, useCustomers } from "@/features/customer/use-customers";
import type { Product } from "@/features/product/product-api";
import { useProducts } from "@/features/product/use-products";
import { useCan, useShopId } from "@/features/shop/shop-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toInt } from "@/lib/form-fields";
import { businessToday, formatAr, formatPhone, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { Order, OrderPatch, OrderSource } from "./order-api";
import { PAYMENT_METHODS, SOURCE_LABELS } from "./order-status";
import { orderErrorMessage } from "./order-utils";
import { Chip, DateChoice, TimeSlotChoice } from "./schedule-fields";
import type { TimeSlot } from "./time-slot";
import { useCreateOrder, useUpdateOrder } from "./use-orders";

type Line = { product: Product; quantity: number };
type CustomerChoice =
  | { kind: "none" }
  | { kind: "existing"; customer: Customer }
  | { kind: "new"; name: string; phone: string };

/** A product known only from an order line (until the product list has loaded). */
const lineProduct = (item: NonNullable<Order["items"]>[number]): Product => ({
  id: item.productId,
  name: item.productName,
  description: null,
  image: null,
  category: null,
  purchasePrice: item.unitPurchasePrice,
  sellingPrice: item.unitSellingPrice,
  stockQuantity: Number.POSITIVE_INFINITY,
  lowStockThreshold: 0,
  isLowStock: false,
  archivedAt: null,
  createdAt: "",
  updatedAt: "",
});

function Step({
  n,
  title,
  right,
  children,
}: {
  n: number;
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="gap-4 px-5">
      <div className="flex items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
          {n}
        </span>
        <h2 className="flex-1 font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </Card>
  );
}

function Stepper({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  max: number;
}) {
  return (
    <div className="inline-flex items-center rounded-md border bg-card">
      <button
        type="button"
        aria-label="Retirer 1"
        className="flex size-8 items-center justify-center hover:bg-accent"
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-4" />
      </button>
      <input
        aria-label="Quantité"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = toInt(e.target.value);
          if (n !== null) onChange(n);
        }}
        className="tabular w-10 bg-transparent text-center text-sm font-semibold outline-none"
      />
      <button
        type="button"
        aria-label="Ajouter 1"
        disabled={value >= max}
        className="flex size-8 items-center justify-center hover:bg-accent disabled:opacity-40"
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/**
 * New order or edit of an existing one. Lines can only change while the order is pending:
 * after confirmation the stock is taken, so they are shown locked.
 */
export function OrderForm({
  order,
  customerId,
}: {
  order?: Order;
  customerId?: string;
}) {
  const router = useRouter();
  const shopId = useShopId();
  const canCosts = useCan("costs");
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder(order?.id ?? "");
  const editing = !!order;
  const linesEditable = !order || order.status === "EN_ATTENTE";
  const base = `/s/${shopId}/commandes`;

  const prefill = useCustomer(
    order ? (order.customer?.id ?? undefined) : customerId,
  );
  const [prefillDismissed, setPrefillDismissed] = useState(false);

  // Customer
  const [choice, setChoice] = useState<CustomerChoice>({ kind: "none" });
  const customer: CustomerChoice =
    choice.kind === "none" && prefill.data && !prefillDismissed
      ? { kind: "existing", customer: prefill.data }
      : choice;
  const [customerSearch, setCustomerSearch] = useState("");
  const customerQuery = useDebouncedValue(customerSearch.trim(), 250);
  const customerMatches = useCustomers(
    customerQuery,
    { limit: 6, offset: 0 },
    customer.kind === "none" && customerQuery.length >= 2,
  );

  // Products
  const [lineState, setLines] = useState<Line[]>(
    () =>
      order?.items?.map((i) => ({
        product: lineProduct(i),
        quantity: i.quantity,
      })) ?? [],
  );
  const [productSearch, setProductSearch] = useState("");
  const productQuery = useDebouncedValue(productSearch.trim(), 200);
  const products = useProducts(
    { q: productQuery || undefined },
    { limit: 8, offset: 0 },
    linesEditable,
  );
  const allProducts = useProducts({}, { limit: 200, offset: 0 }, editing);
  const lines = lineState.map((l) => ({
    ...l,
    product: allProducts.data?.find((p) => p.id === l.product.id) ?? l.product,
  }));

  // Planned day
  const [scheduledDate, setScheduledDate] = useState(
    order?.scheduledDate ?? businessToday(),
  );
  const [timeSlot, setTimeSlot] = useState<TimeSlot | null>(
    order?.timeSlot ?? null,
  );

  // Delivery
  const [isDelivery, setIsDelivery] = useState(!!order?.delivery);
  const [deliveryPlace, setDeliveryPlace] = useState(
    order?.delivery?.place ?? "",
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    order?.delivery?.address ?? "",
  );
  const [deliveryNote, setDeliveryNote] = useState(order?.delivery?.note ?? "");
  const [deliveryPhone, setDeliveryPhone] = useState(
    order?.delivery?.phone ?? "",
  );
  const [deliveryFee, setDeliveryFee] = useState(
    order?.deliveryFee ? String(order.deliveryFee) : "",
  );

  const [paymentMethod, setPaymentMethod] = useState(
    order?.paymentMethod ?? "",
  );
  const [isPaid, setIsPaid] = useState(order?.isPaid ?? false);
  const [source, setSource] = useState<OrderSource | "">(order?.source ?? "");
  const [confirmNow, setConfirmNow] = useState(false);
  const [formError, setFormError] = useState<string>();

  const itemsAmount = lines.reduce(
    (sum, l) => sum + l.quantity * l.product.sellingPrice,
    0,
  );
  const fee = isDelivery ? (toInt(deliveryFee) ?? 0) : 0;
  // The driver must be able to call: a delivery always needs a number.
  const customerPhone =
    customer.kind === "existing" ? (customer.customer.phones[0] ?? null) : null;
  const needsDeliveryPhone =
    isDelivery && customer.kind !== "new" && !customerPhone;
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  // Without purchase prices (CM) there is no profit to show.
  const profit =
    canCosts && lines.every((l) => l.product.purchasePrice !== undefined)
      ? lines.reduce(
          (sum, l) =>
            sum +
            l.quantity *
              (l.product.sellingPrice - (l.product.purchasePrice ?? 0)),
          0,
        )
      : null;

  const resetCustomer = () => {
    setPrefillDismissed(true);
    setChoice({ kind: "none" });
  };

  const startNewCustomer = () => {
    const typed = customerSearch.trim();
    const isPhone = /^[\d\s+.-]+$/.test(typed);
    setChoice({
      kind: "new",
      name: isPhone ? "" : typed,
      phone: isPhone ? typed : "",
    });
  };

  const addProduct = (product: Product) => {
    setLines((current) =>
      current.some((l) => l.product.id === product.id)
        ? current.map((l) =>
            l.product.id === product.id
              ? { ...l, quantity: l.quantity + 1 }
              : l,
          )
        : [...current, { product, quantity: 1 }],
    );
    setProductSearch("");
  };

  const setQuantity = (productId: string, quantity: number) =>
    setLines((current) =>
      quantity <= 0
        ? current.filter((l) => l.product.id !== productId)
        : current.map((l) =>
            l.product.id === productId ? { ...l, quantity } : l,
          ),
    );

  const pending = editing ? updateOrder.isPending : createOrder.isPending;

  const submit = async () => {
    setFormError(undefined);
    if (lines.length === 0) return setFormError("Ajoutez au moins un produit.");
    if (customer.kind === "new" && !customer.name.trim())
      return setFormError("Indiquez le nom du nouveau client.");
    if (!scheduledDate) return setFormError("Indiquez une date valide.");
    if (isDelivery && customer.kind === "new" && !customer.phone.trim()) {
      return setFormError(
        "Indiquez le téléphone du client : le livreur doit pouvoir appeler.",
      );
    }
    if (needsDeliveryPhone && !deliveryPhone.trim())
      return setFormError("Indiquez un numéro à appeler pour la livraison.");
    if (isDelivery && deliveryFee.trim() && toInt(deliveryFee) === null) {
      return setFormError(
        "Frais de livraison : montant en Ariary, sans virgule.",
      );
    }

    const delivery = isDelivery
      ? {
          place: deliveryPlace.trim() || null,
          address: deliveryAddress.trim() || null,
          note: deliveryNote.trim() || null,
          fee,
          phone: needsDeliveryPhone ? deliveryPhone.trim() : null,
        }
      : null;

    try {
      if (order) {
        const patch: OrderPatch = {
          customerId:
            customer.kind === "existing"
              ? customer.customer.id
              : !prefillDismissed
                ? (order.customer?.id ?? null)
                : null,
          source: source || null,
          scheduledDate,
          timeSlot,
          delivery,
          paymentMethod: paymentMethod || null,
          isPaid,
          ...(linesEditable
            ? {
                items: lines.map((l) => ({
                  productId: l.product.id,
                  quantity: l.quantity,
                })),
              }
            : {}),
        };
        await updateOrder.mutateAsync(patch);
        toast.success("Commande enregistrée.");
        router.push(`${base}?commande=${order.id}`);
      } else {
        const created = await createOrder.mutateAsync({
          customerId:
            customer.kind === "existing" ? customer.customer.id : null,
          customer:
            customer.kind === "new"
              ? {
                  name: customer.name.trim(),
                  phone: customer.phone.trim() || null,
                }
              : null,
          items: lines.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
          })),
          source: source || null,
          scheduledDate,
          timeSlot,
          delivery,
          paymentMethod: paymentMethod || null,
          isPaid,
          status: confirmNow ? "CONFIRMEE" : "EN_ATTENTE",
        });
        toast.success(
          `Commande #${String(created.number).padStart(3, "0")} créée.`,
        );
        router.push(`${base}?commande=${created.id}&quand=toutes`);
      }
    } catch {
      // Shown through the mutation error.
    }
  };

  // Ctrl/Cmd + Enter creates or saves from anywhere in the form.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void submitRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const apiError = editing ? updateOrder.error : createOrder.error;
  const errorMessage =
    formError ??
    (apiError
      ? orderErrorMessage(
          apiError,
          (id) => lines.find((l) => l.product.id === id)?.product.name,
        )
      : undefined);

  const suggestions = (products.data ?? [])
    .filter((p) => !lines.some((l) => l.product.id === p.id))
    .slice(0, 6);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-4">
        {/* 1. Client */}
        <Step n={1} title="Client">
          {customer.kind === "existing" && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <Avatar name={customer.customer.name} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {customer.customer.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[
                    customer.customer.phones[0]
                      ? formatPhone(customer.customer.phones[0])
                      : "Pas de téléphone",
                    `${plural(customer.customer.orderCount, "commande passée", "commandes passées")}`,
                  ].join(" · ")}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={resetCustomer}>
                Changer
              </Button>
            </div>
          )}
          {customer.kind === "new" && (
            <div className="grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-2">
              <Field label="Nom du client" htmlFor="new-name">
                <Input
                  id="new-name"
                  value={customer.name}
                  onChange={(e) =>
                    setChoice({ ...customer, name: e.target.value })
                  }
                  autoFocus
                />
              </Field>
              <Field
                label={
                  isDelivery
                    ? "Téléphone (obligatoire pour livrer)"
                    : "Téléphone"
                }
                htmlFor="new-phone"
                hint="Numéro déjà connu : sa fiche est reprise."
              >
                <Input
                  id="new-phone"
                  type="tel"
                  value={customer.phone}
                  placeholder="034 12 345 67"
                  onChange={(e) =>
                    setChoice({ ...customer, phone: e.target.value })
                  }
                />
              </Field>
            </div>
          )}
          {customer.kind === "none" && (
            <div className="relative">
              <label className="flex h-10 items-center gap-2 rounded-md border bg-card px-3 text-muted-foreground focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
                <Search className="size-4" />
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Nom, téléphone ou profil du client"
                  aria-label="Rechercher un client"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                />
              </label>
              {customerQuery.length >= 2 && !!customerMatches.data?.length && (
                <ul className="mt-2 divide-y rounded-lg border">
                  {customerMatches.data.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setChoice({ kind: "existing", customer: c })
                        }
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                      >
                        <Avatar name={c.name} />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">
                            {c.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {c.phones[0]
                              ? formatPhone(c.phones[0])
                              : (c.socialProfile ?? "")}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {customer.kind === "none" ? (
              <span className="text-muted-foreground">
                Sans client choisi : client de passage.
              </span>
            ) : (
              <button
                type="button"
                className="font-medium text-link hover:underline"
                onClick={resetCustomer}
              >
                Client de passage
              </button>
            )}
            {customer.kind !== "new" && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 font-medium text-link hover:underline"
                onClick={startNewCustomer}
              >
                <UserPlus className="size-4" /> Nouveau client
              </button>
            )}
          </div>
        </Step>

        {/* 2. Produits */}
        <Step
          n={2}
          title="Produits"
          right={
            <span className="text-sm text-muted-foreground">
              {plural(itemCount, "article")}
            </span>
          }
        >
          {!linesEditable && (
            <InlineAlert icon={Lock}>
              Produits verrouillés : la commande est confirmée. Annulez-la et
              recréez-la pour changer les produits.
            </InlineAlert>
          )}
          {linesEditable && (
            <>
              <label className="flex h-10 items-center gap-2 rounded-md border bg-card px-3 text-muted-foreground focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
                <Search className="size-4" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Ajouter un produit"
                  aria-label="Rechercher un produit"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                />
              </label>
              {(productQuery !== "" || lines.length === 0) &&
                suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={p.stockQuantity <= 0}
                        onClick={() => addProduct(p)}
                        className="flex h-10 items-center gap-2 rounded-lg border border-dashed bg-card pr-3 pl-1.5 text-sm hover:border-solid hover:bg-accent disabled:opacity-50"
                      >
                        <Avatar name={p.name} className="size-7 rounded-md" />
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground">
                          {formatAr(p.sellingPrice)} ·{" "}
                          {p.stockQuantity > 0
                            ? `${p.stockQuantity} en stock`
                            : "rupture"}
                        </span>
                        <Plus className="size-4 text-link" />
                      </button>
                    ))}
                  </div>
                )}
              {productQuery !== "" &&
                products.isSuccess &&
                suggestions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun produit trouvé pour « {productQuery} ».
                  </p>
                )}
            </>
          )}
          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              Aucun produit pour l’instant.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {lines.map((line) => {
                const max = Number.isFinite(line.product.stockQuantity)
                  ? line.product.stockQuantity
                  : 1_000_000;
                const last =
                  linesEditable &&
                  Number.isFinite(line.product.stockQuantity) &&
                  line.quantity >= line.product.stockQuantity;
                return (
                  <li
                    key={line.product.id}
                    className="flex flex-wrap items-center gap-3 p-3"
                  >
                    <Avatar
                      name={line.product.name}
                      className="size-9 rounded-md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {line.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatAr(line.product.sellingPrice)} l’unité
                      </p>
                      {last && (
                        <p className="text-xs font-semibold text-gold-ink">
                          Dernier(s) en stock : il sera épuisé après cette
                          commande.
                        </p>
                      )}
                    </div>
                    {linesEditable ? (
                      <Stepper
                        value={line.quantity}
                        max={max}
                        onChange={(q) =>
                          setQuantity(line.product.id, Math.min(q, max))
                        }
                      />
                    ) : (
                      <span className="text-sm">× {line.quantity}</span>
                    )}
                    <span className="tabular w-28 text-right font-semibold">
                      {formatAr(line.quantity * line.product.sellingPrice)}
                    </span>
                    {linesEditable && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Retirer ${line.product.name}`}
                        onClick={() => setQuantity(line.product.id, 0)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Step>

        {/* 3. Remise et date */}
        <Step n={3} title="Remise et date">
          <RadioGroup
            value={isDelivery ? "delivery" : "pickup"}
            onValueChange={(v) => setIsDelivery(v === "delivery")}
            className="grid-cols-2"
            aria-label="Mode de remise"
          >
            <RadioCard value="pickup">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Store className="size-4" /> Retrait
              </span>
              <span className="text-xs text-muted-foreground">
                En main propre
              </span>
            </RadioCard>
            <RadioCard value="delivery">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="size-4" /> Livraison
              </span>
              <span className="text-xs text-muted-foreground">
                À une adresse
              </span>
            </RadioCard>
          </RadioGroup>
          {isDelivery && (
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <Field
                label="Lieu de livraison"
                htmlFor="place"
                hint="Quartier ou repère : sert à regrouper les tournées."
              >
                <Input
                  id="place"
                  value={deliveryPlace}
                  onChange={(e) => setDeliveryPlace(e.target.value)}
                  placeholder="Analakely, Ivandry…"
                />
              </Field>
              <Field label="Frais (Ar)" htmlFor="fee">
                <Input
                  id="fee"
                  inputMode="numeric"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="0"
                />
              </Field>
              {needsDeliveryPhone && (
                <Field
                  label="Téléphone pour la livraison"
                  htmlFor="delivery-phone"
                  hint={
                    customer.kind === "existing"
                      ? "Ce client n’a pas de numéro : le livreur doit pouvoir appeler."
                      : "Client de passage : le livreur doit pouvoir appeler."
                  }
                  className="sm:col-span-2"
                >
                  <Input
                    id="delivery-phone"
                    type="tel"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    placeholder="034 00 000 00"
                  />
                </Field>
              )}
              <Field
                label="Adresse (facultatif)"
                htmlFor="address"
                className="sm:col-span-2"
              >
                <Input
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Rue, lot, repère…"
                />
              </Field>
              <Field
                label="Précisions (facultatif)"
                htmlFor="note"
                className="sm:col-span-2"
              >
                <Input
                  id="note"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Ex. appeler avant, portail bleu…"
                />
              </Field>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Date prévue</span>
            <DateChoice value={scheduledDate} onChange={setScheduledDate} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Heure</span>
            <TimeSlotChoice value={timeSlot} onChange={setTimeSlot} />
          </div>
        </Step>

        {/* 4. Paiement */}
        <Step n={4} title="Paiement">
          <RadioGroup
            value={isPaid ? "paid" : "unpaid"}
            onValueChange={(v) => setIsPaid(v === "paid")}
            className="grid-cols-2"
            aria-label="Paiement"
          >
            <RadioCard value="unpaid">
              <span className="text-sm font-semibold">À encaisser</span>
              <span className="block text-xs text-muted-foreground">
                Plus tard (ex. à la livraison)
              </span>
            </RadioCard>
            <RadioCard value="paid">
              <span className="text-sm font-semibold">Déjà payée</span>
              <span className="block text-xs text-muted-foreground">
                Réglée en totalité
              </span>
            </RadioCard>
          </RadioGroup>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Moyen de paiement</span>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => (
                <Chip
                  key={m}
                  active={paymentMethod === m}
                  onClick={() => setPaymentMethod(m === paymentMethod ? "" : m)}
                >
                  {m}
                </Chip>
              ))}
            </div>
          </div>
        </Step>

        {/* 5. Détails */}
        <Step
          n={5}
          title={editing ? "Source" : "Source et statut"}
          right={
            <span className="text-xs text-muted-foreground">Facultatif</span>
          }
        >
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Source de la commande</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SOURCE_LABELS) as OrderSource[]).map((value) => (
                <Chip
                  key={value}
                  active={source === value}
                  onClick={() => setSource(value === source ? "" : value)}
                >
                  {SOURCE_LABELS[value]}
                </Chip>
              ))}
            </div>
          </div>
        </Step>
      </div>

      {/* Summary */}
      <aside className="flex flex-col gap-4 xl:sticky xl:top-20">
        <Card className="gap-3 px-5">
          <h2 className="font-semibold">Récapitulatif</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Articles ({itemCount})</span>
              <span className="tabular">{formatAr(itemsAmount)}</span>
            </div>
            {isDelivery && (
              <div className="flex justify-between text-muted-foreground">
                <span>Livraison</span>
                <span className="tabular">
                  {fee ? formatAr(fee) : "Offerte"}
                </span>
              </div>
            )}
            <div className="h-px bg-border" />
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Total à payer</span>
              <span className="tabular text-2xl font-bold">
                {formatAr(itemsAmount + fee)}
              </span>
            </div>
            {profit !== null && profit > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Bénéfice estimé</span>
                <span className="tabular font-semibold text-success">
                  +{formatAr(profit)}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {isPaid
                ? `Payée${paymentMethod ? ` · ${paymentMethod}` : ""}`
                : "À encaisser"}
            </p>
          </div>
        </Card>

        {!editing && (
          <Card className="gap-3 px-5">
            <h2 className="text-sm font-semibold">Statut à la création</h2>
            <RadioGroup
              value={confirmNow ? "confirmed" : "pending"}
              onValueChange={(v) => setConfirmNow(v === "confirmed")}
              aria-label="Statut"
            >
              <RadioCard value="pending">
                <span className="text-sm font-semibold">En attente</span>
                <span className="block text-xs text-muted-foreground">
                  Le stock reste disponible jusqu’à confirmation.
                </span>
              </RadioCard>
              <RadioCard value="confirmed">
                <span className="text-sm font-semibold">Confirmée</span>
                <span className="block text-xs text-muted-foreground">
                  Le stock est retiré tout de suite.
                </span>
              </RadioCard>
            </RadioGroup>
          </Card>
        )}

        {errorMessage && (
          <InlineAlert tone="danger">{errorMessage}</InlineAlert>
        )}

        <Button
          variant="gold"
          size="lg"
          className="h-12 text-base"
          onClick={submit}
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Check />}
          {editing
            ? "Enregistrer"
            : `Créer la commande · ${formatAr(itemsAmount + fee)}`}
        </Button>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <kbd className="rounded border bg-muted px-1 font-mono">Ctrl</kbd> +{" "}
            <kbd className="rounded border bg-muted px-1 font-mono">Entrée</kbd>{" "}
            pour valider
          </span>
          <Link
            href={order ? `${base}?commande=${order.id}` : base}
            className={cn(
              "inline-flex items-center gap-1 hover:text-foreground",
            )}
          >
            <X className="size-3.5" /> Annuler
          </Link>
        </div>
      </aside>
    </div>
  );
}
