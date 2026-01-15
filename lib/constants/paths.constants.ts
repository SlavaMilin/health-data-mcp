import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const MIGRATIONS_DIR = join(__dirname, '..', '..', 'migrations');
export const DEFAULT_DB_PATH = join(__dirname, '..', '..', 'data', 'health_data.db');
