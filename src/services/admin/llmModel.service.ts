import db from '@/libs/drizzleClient.lib';
import { eq, and, or, ilike, count, asc, desc, sql } from 'drizzle-orm';
import { llmModelsTable, llmProvidersTable } from '@/models/llmIntegrate.model';
import { NotFoundError, BadRequest } from '@/core/error';
import {
  GetLlmModelsQueryDto,
  CreateLlmModelDto,
  UpdateLlmModelDto,
} from '@/dtos/admin/llmModel.dto';

class AdminLlmModelService {
  // ============ GET ALL MODELS ============
  async getAllModels(filters: GetLlmModelsQueryDto) {
    const { providerId, providerName, isAvailable, isDefault, page = '1', limit = '50', search } = filters;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];

    if (providerId) conditions.push(eq(llmModelsTable.providerId, providerId));
    if (providerName) conditions.push(ilike(llmProvidersTable.name, `%${providerName}%`));
    if (isAvailable !== undefined) conditions.push(eq(llmModelsTable.isAvailable, isAvailable));
    if (isDefault !== undefined) conditions.push(eq(llmModelsTable.isDefault, isDefault));

    // Search by model name or description
    if (search) {
      conditions.push(
        or(
          ilike(llmModelsTable.name, `%${search}%`),
          ilike(llmModelsTable.description, `%${search}%`)
        )!
      );
    }

    const models = await db
      .select({
        modelId: llmModelsTable.modelId,
        providerId: llmModelsTable.providerId,
        providerName: llmProvidersTable.name,
        name: llmModelsTable.name,
        priority: llmModelsTable.priority,
        isAvailable: llmModelsTable.isAvailable,
        isDefault: llmModelsTable.isDefault,
        description: llmModelsTable.description,
        createdAt: llmModelsTable.createdAt,
      })
      .from(llmModelsTable)
      .leftJoin(llmProvidersTable, eq(llmModelsTable.providerId, llmProvidersTable.providerId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(llmModelsTable.modelId))
      .limit(parseInt(limit))
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(llmModelsTable)
      .leftJoin(llmProvidersTable, eq(llmModelsTable.providerId, llmProvidersTable.providerId))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      models,
      total: Number(totalResult[0]?.count || 0),
      page: parseInt(page),
      limit: parseInt(limit),
    };
  }

  // ============ GET MODEL BY ID ============
  async getModelById(modelId: number) {
    const model = await db
      .select({
        modelId: llmModelsTable.modelId,
        providerId: llmModelsTable.providerId,
        providerName: llmProvidersTable.name,
        name: llmModelsTable.name,
        priority: llmModelsTable.priority,
        isAvailable: llmModelsTable.isAvailable,
        isDefault: llmModelsTable.isDefault,
        description: llmModelsTable.description,
        createdAt: llmModelsTable.createdAt,
      })
      .from(llmModelsTable)
      .leftJoin(llmProvidersTable, eq(llmModelsTable.providerId, llmProvidersTable.providerId))
      .where(eq(llmModelsTable.modelId, modelId))
      .limit(1);

    if (!model[0]) {
      throw new NotFoundError('LLM model not found');
    }

    return model[0];
  }

  // ============ CREATE MODEL ============
  async createModel(payload: CreateLlmModelDto) {
    // Verify provider exists
    const provider = await db
      .select()
      .from(llmProvidersTable)
      .where(eq(llmProvidersTable.providerId, payload.providerId))
      .limit(1);

    if (!provider[0]) {
      throw new NotFoundError('LLM provider not found');
    }

    // Check if model with same name already exists for this provider
    const existingModel = await db
      .select()
      .from(llmModelsTable)
      .where(
        and(
          eq(llmModelsTable.providerId, payload.providerId),
          eq(llmModelsTable.name, payload.name)
        )
      )
      .limit(1);

    if (existingModel[0]) {
      throw new BadRequest('Model with this name already exists for this provider');
    }

    // Allow multiple default models - no need to unset other defaults
    const [newModel] = await db
      .insert(llmModelsTable)
      .values({
        providerId: payload.providerId,
        name: payload.name,
        priority: payload.priority,
        isAvailable: payload.isAvailable,
        isDefault: payload.isDefault,
        description: payload.description,
      })
      .returning();

    return newModel;
  }

  // ============ UPDATE MODEL ============
  async updateModel(modelId: number, payload: UpdateLlmModelDto) {
    // Verify model exists
    const existingModel = await db
      .select()
      .from(llmModelsTable)
      .where(eq(llmModelsTable.modelId, modelId))
      .limit(1);

    if (!existingModel[0]) {
      throw new NotFoundError('LLM model not found');
    }

    // If updating provider, verify new provider exists
    if (payload.providerId && payload.providerId !== existingModel[0].providerId) {
      const provider = await db
        .select()
        .from(llmProvidersTable)
        .where(eq(llmProvidersTable.providerId, payload.providerId))
        .limit(1);

      if (!provider[0]) {
        throw new NotFoundError('LLM provider not found');
      }

      // Check if model with same name already exists for new provider
      const duplicateModel = await db
        .select()
        .from(llmModelsTable)
        .where(
          and(
            eq(llmModelsTable.providerId, payload.providerId),
            eq(llmModelsTable.name, payload.name || existingModel[0].name)
          )
        )
        .limit(1);

      if (duplicateModel[0] && duplicateModel[0].modelId !== modelId) {
        throw new BadRequest('Model with this name already exists for this provider');
      }
    }

    // If updating name, check for duplicates within same provider
    if (payload.name && payload.name !== existingModel[0].name) {
      const duplicateModel = await db
        .select()
        .from(llmModelsTable)
        .where(
          and(
            eq(llmModelsTable.providerId, payload.providerId || existingModel[0].providerId),
            eq(llmModelsTable.name, payload.name)
          )
        )
        .limit(1);

      if (duplicateModel[0] && duplicateModel[0].modelId !== modelId) {
        throw new BadRequest('Model with this name already exists for this provider');
      }
    }

    // Allow multiple default models - no need to unset other defaults
    const [updatedModel] = await db
      .update(llmModelsTable)
      .set({
        ...(payload.providerId && { providerId: payload.providerId }),
        ...(payload.name && { name: payload.name }),
        ...(payload.priority !== undefined && { priority: payload.priority }),
        ...(payload.isAvailable !== undefined && { isAvailable: payload.isAvailable }),
        ...(payload.isDefault !== undefined && { isDefault: payload.isDefault }),
        ...(payload.description !== undefined && { description: payload.description }),
      })
      .where(eq(llmModelsTable.modelId, modelId))
      .returning();

    return updatedModel;
  }

  // ============ DELETE MODEL ============
  async deleteModel(modelId: number) {
    const model = await db
      .select()
      .from(llmModelsTable)
      .where(eq(llmModelsTable.modelId, modelId))
      .limit(1);

    if (!model[0]) {
      throw new NotFoundError('LLM model not found');
    }

    await db.delete(llmModelsTable).where(eq(llmModelsTable.modelId, modelId));

    return { message: 'Model deleted successfully' };
  }

  // ============ TOGGLE MODEL AVAILABILITY ============
  async toggleModelAvailability(modelId: number) {
    const model = await db
      .select()
      .from(llmModelsTable)
      .where(eq(llmModelsTable.modelId, modelId))
      .limit(1);

    if (!model[0]) {
      throw new NotFoundError('LLM model not found');
    }

    const [updatedModel] = await db
      .update(llmModelsTable)
      .set({ isAvailable: !model[0].isAvailable })
      .where(eq(llmModelsTable.modelId, modelId))
      .returning();

    return updatedModel;
  }
}

export const adminLlmModelService = new AdminLlmModelService();

