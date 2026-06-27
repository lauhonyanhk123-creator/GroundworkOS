import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export function generateId(): string {
  return randomUUID();
}

export async function nextSeqNumber(
  tableName: string,
  prefix: string
): Promise<string> {
  const year = new Date().getFullYear();
  const [row] = await db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM "${tableName}"`));
  const cnt = Number((row as any).cnt ?? (row as any).count ?? 0);
  const n = (cnt + 1).toString().padStart(3, "0");
  return `${prefix}-${year}-${n}`;
}
