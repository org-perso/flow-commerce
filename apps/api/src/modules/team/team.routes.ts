import { Router } from 'express';
import { z } from 'zod';

import { currentMember, currentShopId, currentUser } from '../../http/context.js';
import { idParam } from '../../http/params.js';
import { requirePermission, ROLES } from '../shop/permissions.js';
import {
  changeMemberRole,
  createInvitation,
  joinWithCode,
  leaveShop,
  listDrivers,
  listInvitations,
  listMembers,
  removeMember,
  revokeInvitation,
  setNickname,
} from './team.service.js';

const roleSchema = z.object({ role: z.enum(ROLES) }).strict();
const invitationSchema = z.object({ role: z.enum(['MANAGER', 'CM', 'DRIVER']) }).strict();
/** Pseudo in a shop: 2 to 30 characters; empty means "use my account name". */
const nicknameField = z
  .string()
  .trim()
  .max(30)
  .transform((v) => v || null)
  .refine((v) => v === null || v.length >= 2, 'Two characters at least.')
  .nullable();

const joinSchema = z
  .object({ code: z.string().trim().length(6), nickname: nicknameField.default(null) })
  .strict();

/** /shops/:shopId/members — owner and manager (RG-58 is checked per target role). */
export const membersRouter = Router();
membersRouter.use(requirePermission('team'));

membersRouter.get('/', async (req, res) => {
  res.json(await listMembers(currentShopId(req)));
});

membersRouter.patch('/:userId', async (req, res) => {
  const { role } = roleSchema.parse(req.body);
  const userId = idParam(req.params.userId, 'Member');
  res.json(await changeMemberRole(currentShopId(req), currentMember(req), userId, role));
});

membersRouter.delete('/:userId', async (req, res) => {
  await removeMember(currentShopId(req), currentMember(req), idParam(req.params.userId, 'Member'));
  res.status(204).end();
});

/** /shops/:shopId/invitations — owner and manager. */
export const invitationsRouter = Router();
invitationsRouter.use(requirePermission('team'));

invitationsRouter.get('/', async (req, res) => {
  res.json(await listInvitations(currentShopId(req), currentMember(req)));
});

invitationsRouter.post('/', async (req, res) => {
  const { role } = invitationSchema.parse(req.body);
  res.status(201).json(await createInvitation(currentShopId(req), currentMember(req), role));
});

invitationsRouter.delete('/:invitationId', async (req, res) => {
  const invitationId = idParam(req.params.invitationId, 'Invitation');
  await revokeInvitation(currentShopId(req), currentMember(req), invitationId);
  res.status(204).end();
});

/** POST /shops/:shopId/leave — any member, except the last owner. */
export const leaveRouter = Router();

leaveRouter.post('/', async (req, res) => {
  await leaveShop(currentShopId(req), currentMember(req).userId);
  res.status(204).end();
});

/** POST /invitations/join — not shop-scoped: the user is not a member yet. */
export const joinRouter = Router();

joinRouter.post('/join', async (req, res) => {
  const { code, nickname } = joinSchema.parse(req.body);
  res.status(201).json(await joinWithCode(currentUser(req).id, code, nickname));
});

/** /shops/:shopId/drivers — names only, to assign a delivery (owner, manager, CM). */
export const driversRouter = Router();
driversRouter.use(requirePermission('orders'));

driversRouter.get('/', async (req, res) => {
  res.json(await listDrivers(currentShopId(req)));
});

/** PATCH /shops/:shopId/me — any member sets their own pseudo in the shop. */
export const myMembershipRouter = Router();

myMembershipRouter.patch('/', async (req, res) => {
  const { nickname } = z.object({ nickname: nicknameField }).strict().parse(req.body);
  res.json(await setNickname(currentShopId(req), currentMember(req).userId, nickname));
});
