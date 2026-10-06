import {
  ChartColumn,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  Truck,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/features/shop/roles";

export type NavItem = {
  /** Path under /s/[shopId]. */
  path: string;
  label: string;
  icon: LucideIcon;
  permission: Permission | null;
  /** Second key after "g" (keyboard navigation). */
  key: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    path: "",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    permission: "dashboard",
    key: "d",
  },
  {
    path: "/commandes",
    label: "Commandes",
    icon: ReceiptText,
    permission: "orders",
    key: "c",
  },
  {
    path: "/rapports",
    label: "Recap des ventes",
    icon: ChartColumn,
    permission: "orders",
    key: "r",
  },
  {
    path: "/livraisons",
    label: "Livraisons",
    icon: Truck,
    permission: "orders",
    key: "l",
  },
  {
    path: "/stock",
    label: "Produits",
    icon: Package,
    permission: "catalog.read",
    key: "s",
  },
  {
    path: "/clients",
    label: "Clients",
    icon: Users,
    permission: "customers",
    key: "k",
  },
  {
    path: "/depenses",
    label: "Dépenses",
    icon: Wallet,
    permission: "expenses",
    key: "e",
  },
  {
    path: "/equipe",
    label: "Équipe",
    icon: UsersRound,
    permission: "team",
    key: "q",
  },
  {
    path: "/parametres",
    label: "Paramètres",
    icon: Settings,
    permission: null,
    key: "p",
  },
];
