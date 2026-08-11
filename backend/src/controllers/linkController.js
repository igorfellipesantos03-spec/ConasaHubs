import * as linkService from '../services/linkService.js';
import {
  createLinkSchema,
  updateLinkSchema,
  reorderSchema,
} from '../validators/contentValidators.js';

export async function create(req, res) {
  const data = createLinkSchema.parse(req.body);
  const link = await linkService.createLink(req.user, req.hub, data, req.ip);
  res.status(201).json({ link });
}

export async function update(req, res) {
  const data = updateLinkSchema.parse(req.body);
  const link = await linkService.updateLink(req.user, req.hub, req.params.linkId, data, req.ip);
  res.json({ link });
}

export async function remove(req, res) {
  await linkService.deleteLink(req.user, req.hub, req.params.linkId, req.ip);
  res.status(204).end();
}

export async function reorder(req, res) {
  const { items } = reorderSchema.parse(req.body);
  const links = await linkService.reorderLinks(req.user, req.hub, items, req.ip);
  res.json({ links });
}
