import { Router } from 'express';

import { currentShopId } from '../../http/context.js';
import { requirePermission } from '../shop/permissions.js';
import { deliveriesToNotify, notifyDrivers } from './notification.service.js';

/** /shops/:shopId/deliveries — the "Notifier les livreurs" button (owner, manager, CM). */
export const deliveriesRouter = Router();
deliveriesRouter.use(requirePermission('orders'));

deliveriesRouter.get('/to-notify', async (req, res) => {
  res.json(await deliveriesToNotify(currentShopId(req)));
});

deliveriesRouter.post('/notify', async (req, res) => {
  res.json(await notifyDrivers(currentShopId(req)));
});
