import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL || "";

export const isDbAvailable = () => {
  return !!dbUrl && dbUrl.length > 10;
};

export const db = isDbAvailable()
  ? drizzleNeon(neon(dbUrl), { schema })
  : (null as unknown as ReturnType<typeof drizzleNeon<typeof schema>>);
