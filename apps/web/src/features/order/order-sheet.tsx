"use client";

import {
  CalendarDays,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  RotateCcw,
  Store,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ErrorState } from "@/components/app/states";
import { PaymentBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan, useShop, useShopId } from "@/features/shop/shop-context";
import { apiErrorMessage } from "@/lib/api-client";
import {
  formatAr,
  formatDateTime,
  formatDayLabel,
  formatPhone,
  whatsAppUrl,
} from "@/lib/format";
import { cn } from "@/lib/utils";

import { parcelNumber, type Order } from "./order-api";
import { orderRecapMessage } from "./order-message";
import {
  actionLabels,
  confirmTexts,
  destructiveStatuses,
  SOURCE_LABELS,
  TRANSITIONS,
  type OrderStatus,
} from "./order-status";
import {
  customerName,
  isOverdue,
  orderErrorMessage,
  phoneOf,
} from "./order-utils";
import { PaymentDialog } from "./payment-dialog";
import { DateChoice, TimeSlotChoice } from "./schedule-fields";
import { slotLabel, type TimeSlot } from "./time-slot";
import {
  useAssignDriver,
  useChangeOrderStatus,
  useDrivers,
  useOrder,
  useUpdateOrder,
} from "./use-orders";

function Section({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: typeof User;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 border-b px-5 py-4 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Icon className="size-3.5" /> {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatusActions({ order }: { order: Order }) {
  const change = useChangeOrderStatus(order.id);
  const [confirm, setConfirm] = useState<OrderStatus | null>(null);
  const next = TRANSITIONS[order.status];
  const forward = next.filter((s) => !destructiveStatuses.includes(s));
  const destructive = next.filter((s) => destructiveStatuses.includes(s));
  if (next.length === 0) return null;

  const move = async (status: OrderStatus) => {
    try {
      await change.mutateAsync(status);
      setConfirm(null);
      toast.success(
        `${parcelNumber(order)} : ${actionLabels[status].toLowerCase()} — fait.`,
      );
    } catch (error) {
      setConfirm(null);
      toast.error(orderErrorMessage(error));
    }
  };

  const request = (status: OrderStatus) =>
    confirmTexts[status] ? setConfirm(status) : move(status);
  const confirmText = confirm ? confirmTexts[confirm] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {forward.map((status, i) => (
          <Button
            key={status}
            size="sm"
            variant={i === 0 ? "default" : "outline"}
            disabled={change.isPending}
            onClick={() => request(status)}
          >
            {change.isPending && change.variables === status && (
              <Loader2 className="animate-spin" />
            )}
            {actionLabels[status]}
          </Button>
        ))}
        {destructive.map((status) => (
          <Button
            key={status}
            size="sm"
            variant="ghost"
            className="text-danger hover:bg-danger-soft hover:text-danger"
            onClick={() => request(status)}
          >
            {actionLabels[status]}
          </Button>
        ))}
      </div>
      {confirm && confirmText && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirmText.title}
          description={confirmText.message}
          confirmLabel={actionLabels[confirm]}
          pending={change.isPending}
          onConfirm={() => move(confirm)}
        />
      )}
    </div>
  );
}

function DriverField({ order }: { order: Order }) {
  const drivers = useDrivers();
  const assign = useAssignDriver(order.id);
  const done = TRANSITIONS[order.status].length === 0;
  const onChange = async (value: string) => {
    try {
      await assign.mutateAsync(value === "none" ? null : value);
      toast.success(value === "none" ? "Livreur retiré." : "Livreur assigné.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };
  if (done)
    return <p className="text-sm">{order.driver?.name ?? "Aucun livreur"}</p>;
  return (
    <div className="flex items-center gap-2">
      <Select
        value={order.driver?.userId ?? "none"}
        onValueChange={onChange}
        disabled={assign.isPending}
      >
        <SelectTrigger className="h-9" aria-label="Livreur">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">À prendre (aucun livreur)</SelectItem>
          {order.driver &&
            !drivers.data?.some((d) => d.userId === order.driver!.userId) && (
              <SelectItem value={order.driver.userId}>
                {order.driver.name ?? "Livreur"}
              </SelectItem>
            )}
          {drivers.data?.map((d) => (
            <SelectItem key={d.userId} value={d.userId}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {assign.isPending && (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

function DateDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const update = useUpdateOrder(order.id);
  const [date, setDate] = useState(order.scheduledDate);
  const [slot, setSlot] = useState<TimeSlot | null>(order.timeSlot);
  const save = async () => {
    try {
      await update.mutateAsync({ scheduledDate: date, timeSlot: slot });
      toast.success("Date mise à jour.");
      onClose();
    } catch {
      // Shown below.
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer la date</DialogTitle>
        </DialogHeader>
        {update.isError && <ErrorState error={update.error} />}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Livrer le</span>
          <DateChoice value={date} onChange={setDate} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Heure</span>
          <TimeSlotChoice value={slot} onChange={setSlot} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetail({ order }: { order: Order }) {
  const shopId = useShopId();
  const shop = useShop();
  const canCustomers = useCan("customers");
  const canCosts = useCan("costs");
  const [paying, setPaying] = useState(false);
  const [dating, setDating] = useState(false);
  const editable = TRANSITIONS[order.status].length > 0;
  const overdue = isOverdue(order);
  const phone = phoneOf(order);
  const slot = slotLabel(order.timeSlot);
  const profit =
    canCosts && order.items?.every((i) => i.unitPurchasePrice !== undefined)
      ? order.items.reduce(
          (sum, i) =>
            sum +
            i.quantity * (i.unitSellingPrice - (i.unitPurchasePrice ?? 0)),
          0,
        )
      : null;

  return (
    <>
      <SheetHeader>
        <SheetDescription className="font-semibold text-link">
          {parcelNumber(order)}
        </SheetDescription>
        <SheetTitle className="flex items-baseline justify-between gap-3 text-2xl">
          <span className="tabular">{formatAr(order.totalAmount)}</span>
        </SheetTitle>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <PaymentBadge isPaid={order.isPaid} method={order.paymentMethod} />
          {overdue && (
            <span className="text-xs font-semibold text-danger">En retard</span>
          )}
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto">
        <Section icon={Truck} title="Actions">
          <StatusActions order={order} />
          {!order.isPaid &&
            order.status !== "ANNULEE" &&
            order.status !== "RETOUR" && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setPaying(true)}
              >
                <Wallet /> Encaisser {formatAr(order.totalAmount)}
              </Button>
            )}
          {!editable && (
            <p className="text-sm text-muted-foreground">
              Commande terminée : plus d’action possible.
            </p>
          )}
          {/* Send the summary to the customer, or start a new order from this one. */}
          <div className="flex flex-wrap gap-2">
            {phone && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`${whatsAppUrl(phone)}?text=${encodeURIComponent(orderRecapMessage(order, shop.name))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle /> Envoyer le récap
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/s/${shopId}/commandes/nouvelle?depuis=${order.id}`}>
                <RotateCcw /> Recommander
              </Link>
            </Button>
          </div>
        </Section>

        <Section
          icon={User}
          title="Client"
          action={
            canCustomers && order.customer ? (
              <Link
                href={`/s/${shopId}/clients/${order.customer.id}`}
                className="text-xs font-medium text-link hover:underline"
              >
                Voir la fiche
              </Link>
            ) : undefined
          }
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{customerName(order)}</p>
              {phone ? (
                <p className="text-sm text-muted-foreground">
                  {formatPhone(phone)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pas de téléphone
                </p>
              )}
            </div>
            {phone && (
              <div className="flex gap-1.5">
                <Button variant="outline" size="icon-sm" asChild>
                  <a href={`tel:${phone}`} aria-label="Appeler">
                    <Phone />
                  </a>
                </Button>
                <Button variant="outline" size="icon-sm" asChild>
                  <a
                    href={whatsAppUrl(phone)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle />
                  </a>
                </Button>
              </div>
            )}
          </div>
        </Section>

        <Section
          icon={CalendarDays}
          title="Date"
          action={
            editable ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setDating(true)}
              >
                Changer
              </Button>
            ) : undefined
          }
        >
          <p className={cn("text-sm", overdue && "font-semibold text-danger")}>
            {formatDayLabel(order.scheduledDate)}
            {slot ? ` · ${slot}` : " · toute la journée"}
          </p>
        </Section>

        <Section
          icon={order.delivery ? MapPin : Store}
          title={order.delivery ? "Livraison" : "Remise"}
        >
          {order.delivery ? (
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold">
                {order.delivery.place ?? "Lieu non précisé"}
              </p>
              {order.delivery.address && <p>{order.delivery.address}</p>}
              {order.delivery.note && (
                <p className="text-muted-foreground">{order.delivery.note}</p>
              )}
              {order.delivery.phone && (
                <p className="text-muted-foreground">
                  Tél. livraison : {formatPhone(order.delivery.phone)}
                </p>
              )}
              <div className="mt-2 flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Livreur
                </span>
                <DriverField order={order} />
              </div>
            </div>
          ) : (
            <p className="text-sm">À récupérer en main propre.</p>
          )}
        </Section>

        <Section icon={Wallet} title="Produits et total">
          {order.items ? (
            <ul className="flex flex-col gap-2 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-medium">{item.quantity} ×</span>{" "}
                    {item.productName}
                    <span className="block text-xs text-muted-foreground">
                      {formatAr(item.unitSellingPrice)} l’unité
                    </span>
                  </span>
                  <span className="tabular font-medium">
                    {formatAr(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2 flex flex-col gap-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Articles</span>
              <span className="tabular">{formatAr(order.itemsAmount)}</span>
            </div>
            {order.delivery && (
              <div className="flex justify-between text-muted-foreground">
                <span>Livraison</span>
                <span className="tabular">
                  {order.deliveryFee ? formatAr(order.deliveryFee) : "Offerte"}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total à payer</span>
              <span className="tabular">{formatAr(order.totalAmount)}</span>
            </div>
            {profit !== null && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Bénéfice estimé</span>
                <span className="tabular font-semibold text-success">
                  {formatAr(profit)}
                </span>
              </div>
            )}
          </div>
        </Section>

        <section className="px-5 py-4 text-xs text-muted-foreground">
          Créée le {formatDateTime(order.createdAt)}
          {order.source ? ` · Source : ${SOURCE_LABELS[order.source]}` : ""}
          {order.paidAt ? ` · Payée le ${formatDateTime(order.paidAt)}` : ""}
        </section>
      </div>

      {editable && (
        <div className="flex gap-2 border-t p-4">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/s/${shopId}/commandes/${order.id}/modifier`}>
              <Pencil /> Modifier
            </Link>
          </Button>
        </div>
      )}

      {paying && <PaymentDialog order={order} open onOpenChange={setPaying} />}
      {dating && <DateDialog order={order} onClose={() => setDating(false)} />}
    </>
  );
}

/** Order detail in a side panel, opened from the tables (?commande=<id>). */
export function OrderSheet({
  orderId,
  onClose,
}: {
  orderId: string | null;
  onClose: () => void;
}) {
  const order = useOrder(orderId ?? undefined);
  return (
    <Sheet open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[440px]">
        {order.data ? (
          <OrderDetail order={order.data} />
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="sr-only">Commande</SheetTitle>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-40" />
            </SheetHeader>
            <div className="p-5">
              {order.isError ? (
                <ErrorState
                  error={order.error}
                  onRetry={() => order.refetch()}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-28" />
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
