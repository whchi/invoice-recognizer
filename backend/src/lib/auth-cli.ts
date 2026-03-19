import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';

// 建立一個假的 D1 資料庫實例來欺騙 CLI
const dummyDb = drizzle({} as any);

export const auth = betterAuth({
  database: drizzleAdapter(dummyDb, { provider: 'sqlite' }),
  emailAndPassword: { enabled: true },
  // 這裡只需要放會影響 Schema 結構的 plugins 即可
  // basePath, secret, trustedOrigins 等 runtime 設定在這邊都不需要
});
