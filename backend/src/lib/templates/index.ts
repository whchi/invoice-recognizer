import type { Db } from '@backend/db';
import { templates, user, userFavoriteTemplates } from '@backend/db/schema';
import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { validateFieldNames } from './validate';

export type Template = typeof templates.$inferSelect;

export async function listTemplates(db: Db) {
  return db.select().from(templates).all();
}

export async function getTemplate(db: Db, id: string) {
  const [row] = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return row ?? null;
}

export async function createTemplate(db: Db, data: { name: string; fields: string[]; createdBy?: string | null }) {
  const fieldValidation = validateFieldNames(data.fields);
  if (!fieldValidation.ok) {
    return { ok: false as const, errors: fieldValidation.errors };
  }

  const id = ulid();
  await db.insert(templates).values({
    id,
    name: data.name,
    fields: JSON.stringify(data.fields),
    isSystem: 0,
    createdBy: data.createdBy ?? null,
  });

  return { ok: true as const, id };
}

export async function updateTemplate(db: Db, id: string, data: { name?: string; fields?: string[] }) {
  if (data.fields) {
    const fieldValidation = validateFieldNames(data.fields);
    if (!fieldValidation.ok) {
      return { ok: false as const, errors: fieldValidation.errors };
    }
  }

  const existing = await getTemplate(db, id);
  if (!existing) {
    return { ok: false as const, errors: ['template not found'] };
  }
  if (existing.isSystem) {
    return { ok: false as const, errors: ['cannot modify system templates'] };
  }

  const updates: Partial<{ name: string; fields: string }> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.fields !== undefined) updates.fields = JSON.stringify(data.fields);

  if (Object.keys(updates).length > 0) {
    await db.update(templates).set(updates).where(eq(templates.id, id));
  }

  return { ok: true as const };
}

export async function deleteTemplate(db: Db, id: string) {
  const existing = await getTemplate(db, id);
  if (!existing) {
    return { ok: false as const, errors: ['template not found'] };
  }
  if (existing.isSystem) {
    return { ok: false as const, errors: ['cannot delete system templates'] };
  }

  await db.delete(templates).where(eq(templates.id, id));
  return { ok: true as const };
}

export async function setDefaultTemplate(db: Db, userId: string, templateId: string | null) {
  if (templateId !== null) {
    const tmpl = await getTemplate(db, templateId);
    if (!tmpl) {
      return { ok: false as const, errors: ['template not found'] };
    }
  }

  await db.update(user).set({ defaultTemplateId: templateId }).where(eq(user.id, userId));

  return { ok: true as const };
}

export async function toggleFavorite(db: Db, userId: string, templateId: string) {
  const tmpl = await getTemplate(db, templateId);
  if (!tmpl) {
    return { ok: false as const, errors: ['template not found'] };
  }

  const [existing] = await db
    .select()
    .from(userFavoriteTemplates)
    .where(and(eq(userFavoriteTemplates.userId, userId), eq(userFavoriteTemplates.templateId, templateId)))
    .limit(1);

  if (existing) {
    await db
      .delete(userFavoriteTemplates)
      .where(and(eq(userFavoriteTemplates.userId, userId), eq(userFavoriteTemplates.templateId, templateId)));
    return { ok: true as const, favorited: false };
  }

  await db.insert(userFavoriteTemplates).values({ userId, templateId });
  return { ok: true as const, favorited: true };
}

export async function getUserFavorites(db: Db, userId: string) {
  return db
    .select({ templateId: userFavoriteTemplates.templateId })
    .from(userFavoriteTemplates)
    .where(eq(userFavoriteTemplates.userId, userId))
    .all();
}

export async function seedSystemTemplates(db: Db) {
  const existing = await db.select().from(templates).where(eq(templates.isSystem, 1)).all();

  if (existing.length > 0) return;

  const templateA = {
    id: ulid(),
    name: 'Legacy Invoice',
    fields: JSON.stringify([
      'is_invoice',
      'document_type',
      'expense_date',
      'invoice_number',
      'locale',
      'amount',
      'currency',
    ]),
    isSystem: 1,
    createdBy: null,
  };

  const templateB = {
    id: ulid(),
    name: 'Accounting Basic',
    fields: JSON.stringify([
      'vendor_name',
      'vendor_tax_id',
      'expense_date',
      'invoice_number',
      'subtotal',
      'tax',
      'total',
      'currency',
      'payment_method',
    ]),
    isSystem: 1,
    createdBy: null,
  };

  await db.insert(templates).values([templateA, templateB]);
}
