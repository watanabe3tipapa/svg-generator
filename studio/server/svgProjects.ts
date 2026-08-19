import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { svgProjects } from "../drizzle/schema";
import { getDb } from "./db";

export type SvgProjectPayload = {
  id?: number;
  name: string;
  projectData: string;
  svgCode: string;
  isPublic: boolean;
};

export function createShareId() {
  return nanoid(12);
}

export async function listSvgProjectsForOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(svgProjects)
    .where(eq(svgProjects.ownerId, ownerId))
    .orderBy(desc(svgProjects.updatedAt));
}

export async function saveSvgProject(ownerId: number, payload: SvgProjectPayload) {
  const db = await getDb();
  if (!db) throw new Error("保存機能を利用できません。時間をおいて再度お試しください。");

  const name = payload.name.trim().slice(0, 160) || "Untitled SVG";
  if (payload.id) {
    const existing = await db
      .select()
      .from(svgProjects)
      .where(and(eq(svgProjects.id, payload.id), eq(svgProjects.ownerId, ownerId)))
      .limit(1);
    if (!existing[0]) throw new Error("保存対象のデザインが見つかりません。");

    await db
      .update(svgProjects)
      .set({ name, projectData: payload.projectData, svgCode: payload.svgCode, isPublic: payload.isPublic })
      .where(eq(svgProjects.id, payload.id));

    const updated = await db.select().from(svgProjects).where(eq(svgProjects.id, payload.id)).limit(1);
    return updated[0];
  }

  const shareId = createShareId();
  await db.insert(svgProjects).values({
    ownerId,
    shareId,
    name,
    projectData: payload.projectData,
    svgCode: payload.svgCode,
    isPublic: payload.isPublic,
  });
  const created = await db.select().from(svgProjects).where(eq(svgProjects.shareId, shareId)).limit(1);
  return created[0];
}

export async function getPublicSvgProject(shareId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      id: svgProjects.id,
      shareId: svgProjects.shareId,
      name: svgProjects.name,
      projectData: svgProjects.projectData,
      svgCode: svgProjects.svgCode,
      createdAt: svgProjects.createdAt,
      updatedAt: svgProjects.updatedAt,
    })
    .from(svgProjects)
    .where(and(eq(svgProjects.shareId, shareId), eq(svgProjects.isPublic, true)))
    .limit(1);
  return result[0];
}
