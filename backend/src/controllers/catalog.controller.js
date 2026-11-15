import { getCatalog as readCatalog } from '../services/catalog/catalog.js';

export async function getCatalog(req, res, next) {
  try {
    res.json(await readCatalog());
  } catch (error) {
    next(error);
  }
}
