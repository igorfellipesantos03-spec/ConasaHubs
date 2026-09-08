import * as hubService from '../services/hubService.js';
import {
  hubSchema,
  updateHubSchema,
  curatorHubSchema,
  categorySchema,
} from '../validators/contentValidators.js';

export async function list(req, res) {
  res.json({ hubs: await hubService.listHubs(req.user) });
}

export async function detail(req, res) {
  res.json({ hub: await hubService.getHubBySlug(req.user, req.params.slug) });
}

export async function create(req, res) {
  const data = hubSchema.parse(req.body);
  const hub = await hubService.createHub(
    req.user,
    { ...data, description: data.description || null },
    req.ip,
  );
  res.status(201).json({ hub });
}

export async function update(req, res) {
  // O curador reapresenta o setor; o admin também mexe na identidade dele.
  const schema = req.user.role === 'ADMIN' ? updateHubSchema : curatorHubSchema;
  const data = schema.parse(req.body);

  const hub = await hubService.updateHub(req.user, req.params.hubId, data, req.ip);
  res.json({ hub });
}

export async function deactivate(req, res) {
  await hubService.deactivateHub(req.user, req.params.hubId, req.ip);
  res.status(204).end();
}

export async function createCategory(req, res) {
  const data = categorySchema.parse(req.body);
  const category = await hubService.createCategory(req.user, req.hub, data, req.ip);
  res.status(201).json({ category });
}

export async function updateCategory(req, res) {
  const data = categorySchema.partial().parse(req.body);
  const category = await hubService.updateCategory(
    req.user,
    req.hub,
    req.params.categoryId,
    data,
    req.ip,
  );
  res.json({ category });
}

export async function deleteCategory(req, res) {
  await hubService.deleteCategory(req.user, req.hub, req.params.categoryId, req.ip);
  res.status(204).end();
}
