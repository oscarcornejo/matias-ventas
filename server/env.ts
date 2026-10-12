import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD debe tener al menos 8 caracteres'),
  MP_ACCESS_TOKEN: z.string().min(1, 'MP_ACCESS_TOKEN es obligatoria'),
  MP_WEBHOOK_SECRET: z.string().min(1, 'MP_WEBHOOK_SECRET es obligatoria'),
  APP_URL: z
    .string()
    .url('APP_URL debe ser una URL válida')
    .transform((url) => url.replace(/\/+$/, '')),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Lee y valida las variables de entorno la primera vez que se necesitan. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Variables de entorno inválidas:\n${detail}`);
  }
  cached = parsed.data;
  return cached;
}

/** Solo para tests. */
export function resetEnvCache(): void {
  cached = undefined;
}
