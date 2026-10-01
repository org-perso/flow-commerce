import type { RequestHandler } from 'express';

import { currentMember } from '../../http/context.js';
import { ProblemError } from '../../http/problem.js';

export const ROLES = ['OWNER', 'MANAGER', 'CM', 'DRIVER'] as const;
export type Role = (typeof ROLES)[number];

/**
 * What each role may do (af-v2 §4). Routes check permissions, never roles, so making
 * them configurable per shop later only means storing this table.
 */
const ROLE_PERMISSIONS = {
  OWNER: [
    'shop.settings',
    'dashboard',
    'costs',
    'expenses',
    'catalog.read',
    'catalog.write',
    'customers',
    'orders',
    'team',
  ],
  MANAGER: [
    'dashboard',
    'costs',
    'expenses',
    'catalog.read',
    'catalog.write',
    'customers',
    'orders',
    'team',
  ],
  CM: ['catalog.read', 'customers', 'orders'],
  DRIVER: ['deliveries'],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof ROLE_PERMISSIONS)[Role][number];

export function can(role: Role, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly Permission[]).includes(permission);
}

/** 403 unless the current member's role has the permission (after requireShop). */
export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!can(currentMember(req).role, permission)) {
      throw new ProblemError(403, 'Forbidden', 'Your role does not allow this action.');
    }
    next();
  };
}

/** GET (reading) needs `read`, any other method (writing) needs `write`. */
export function requireReadWrite(read: Permission, write: Permission): RequestHandler {
  return (req, res, next) => requirePermission(req.method === 'GET' ? read : write)(req, res, next);
}

/** Response fields that reveal costs and margins (RG-60). */
const COST_FIELDS = new Set(['purchasePrice', 'unitPurchasePrice', 'stockValue', 'stockSaleValue']);

function stripCosts(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripCosts);
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !COST_FIELDS.has(key))
      .map(([key, v]) => [key, stripCosts(v)]),
  );
}

/**
 * Members without the `costs` permission never receive purchase prices or stock values
 * (RG-60): removed from every shop-scoped JSON response, not only hidden by the app.
 */
export const hideCostsUnlessAllowed: RequestHandler = (req, res, next) => {
  if (!can(currentMember(req).role, 'costs')) {
    const json = res.json.bind(res);
    res.json = (body) => json(stripCosts(body));
  }
  next();
};
