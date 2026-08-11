import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';
import * as adminService from '../services/adminService.js';
import { listAudit } from '../services/auditService.js';

const router = Router();

router.use(requireAuth, requireAdmin);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  search: z.string().trim().max(80).optional(),
});

const updateUserSchema = z
  .object({
    role: z.enum(['USER', 'ADMIN']).optional(),
    active: z.boolean().optional(),
    hubId: z.string().uuid().nullable().optional(),
    hubOverride: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Nada para atualizar.');

const curatorSchema = z.object({
  userId: z.string().uuid(),
  hubId: z.string().uuid(),
});

const deptMappingSchema = z.object({
  protheusDeptCode: z.string().trim().min(1).max(20),
  protheusDeptName: z.string().trim().max(80).optional(),
  hubId: z.string().uuid(),
});

router.get(
  '/users',
  asyncRoute(async (req, res) => {
    res.json(await adminService.listUsers(paginationSchema.parse(req.query)));
  }),
);

router.patch(
  '/users/:userId',
  asyncRoute(async (req, res) => {
    const user = await adminService.updateUser(
      req.user,
      req.params.userId,
      updateUserSchema.parse(req.body),
      req.ip,
    );
    res.json({ user });
  }),
);

router.get(
  '/curators',
  asyncRoute(async (req, res) => {
    res.json({ curators: await adminService.listCurators(req.query.hubId) });
  }),
);

router.post(
  '/curators',
  asyncRoute(async (req, res) => {
    await adminService.addCurator(req.user, curatorSchema.parse(req.body), req.ip);
    res.status(201).end();
  }),
);

router.delete(
  '/curators/:userId/:hubId',
  asyncRoute(async (req, res) => {
    await adminService.removeCurator(req.user, curatorSchema.parse(req.params), req.ip);
    res.status(204).end();
  }),
);

router.get(
  '/dept-mappings',
  asyncRoute(async (req, res) => {
    res.json({ mappings: await adminService.listDeptMappings() });
  }),
);

router.put(
  '/dept-mappings',
  asyncRoute(async (req, res) => {
    const mapping = await adminService.upsertDeptMapping(
      req.user,
      deptMappingSchema.parse(req.body),
      req.ip,
    );
    res.json({ mapping });
  }),
);

router.delete(
  '/dept-mappings/:id',
  asyncRoute(async (req, res) => {
    await adminService.deleteDeptMapping(req.user, req.params.id, req.ip);
    res.status(204).end();
  }),
);

router.get(
  '/audit',
  asyncRoute(async (req, res) => {
    const { page, pageSize } = paginationSchema.parse(req.query);
    res.json(await listAudit({ page, pageSize, entity: req.query.entity }));
  }),
);

export default router;
