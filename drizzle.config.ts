import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/training/schema.ts',
  dbCredentials: { url: process.env.DATABASE_URL || process.env.POSTGRES_URL || '' },
});
