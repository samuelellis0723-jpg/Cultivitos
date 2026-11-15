import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Apunta explícitamente a backend/data/catalog.json (o a la raíz si prefieres)
const CATALOG_PATH = path.resolve(__dirname, '../../../data/catalog.json');

export async function getCatalog(req, res, next) {
  try {
    const raw = await fs.readFile(CATALOG_PATH, 'utf-8');
    const catalog = JSON.parse(raw);
    res.json(catalog);
  } catch (error) {
    console.error('Error leyendo el catálogo:', error.message);
    // Devolvemos el error detallado en desarrollo para ver qué falló exactamente
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
}