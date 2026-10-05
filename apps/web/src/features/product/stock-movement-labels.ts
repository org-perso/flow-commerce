import type { StockMovement } from "./product-api";

export const movementLabels: Record<StockMovement["type"], string> = {
  AJOUT: "Entrée",
  RETRAIT: "Sortie",
  AJUSTEMENT: "Inventaire",
  VENTE: "Vente",
  RETOUR: "Retour",
};
