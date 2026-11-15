import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Desde backend/src/services/catalog/ se suben 4 niveles hasta la raíz del repo,
// donde está data/catalog.json
const CATALOG_PATH = path.resolve(__dirname, '../../../../data/catalog.json');

export async function getCatalog() {
  const contenido = await fs.readFile(CATALOG_PATH, 'utf-8');
  return JSON.parse(contenido);
}

export default { getCatalog };