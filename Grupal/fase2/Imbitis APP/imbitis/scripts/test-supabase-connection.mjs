import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const environmentPath = resolve('imbitis', 'src', 'environments', 'environment.ts');
const raw = readFileSync(environmentPath, 'utf-8');

const urlMatch = raw.match(/supabaseUrl:\s*'([^']+)'/);
const keyMatch = raw.match(/supabaseAnonKey:\s*'([^']+)'/);

if (!urlMatch || !keyMatch) {
  console.error('No se pudieron encontrar las credenciales de Supabase en environment.ts');
  process.exit(1);
}

const supabaseUrl = urlMatch[1];
const supabaseAnonKey = keyMatch[1];

const { createClient } = await import('@supabase/supabase-js');

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

try {
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.error('Fallo en la conexion a Supabase:', error.message);
    process.exitCode = 1;
  } else {
    const status = data.session ? 'Sesion activa detectada' : 'Sin sesion activa (respuesta correcta)';
    console.log('Conexion correcta a Supabase. Estado:', status);
  }
} catch (error) {
  console.error('Error inesperado al intentar conectar con Supabase:', error);
  process.exitCode = 1;
}
