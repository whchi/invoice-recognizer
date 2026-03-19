import { defineConfig } from 'drizzle-kit';
const isRemote = process.env.APP_MODE === 'online';

export default defineConfig({
  dialect: 'sqlite',
  schema: './backend/src/db/schema',
  out: './drizzle',
  ...(isRemote
    ? {
        driver: 'd1-http',
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID as string,
          databaseId: process.env.CLOUDFLARE_DATABASE_ID as string,
          token: process.env.CLOUDFLARE_D1_TOKEN as string,
        },
      }
    : {
        dbCredentials: {
          url: 'dev.sqlite',
        },
      }),
});
