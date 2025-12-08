import db from '@/libs/drizzleClient.lib';
import { eq, and, count, asc } from 'drizzle-orm';
import { llmApiKeyModelTable, providerLlmApiKeysTable, llmModelsTable, llmProvidersTable } from '@/models/llmIntegrate.model';
import { NotFoundError, BadRequest } from '@/core/error';
import {
  GetLlmApiKeyModelsQueryDto,
  CreateLlmApiKeyModelDto,
  UpdateLlmApiKeyModelDto,
} from '@/dtos/admin/llmApiKeyModel.dto';

class AdminLlmApiKeyModelService {
  // ============ GET ALL API KEY-MODEL RELATIONS ============
  async getAllApiKeyModels(filters: GetLlmApiKeyModelsQueryDto) {
    const { apiKeyId, modelId, providerId, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (apiKeyId) conditions.push(eq(llmApiKeyModelTable.apiKeyId, apiKeyId));
    if (modelId) conditions.push(eq(llmApiKeyModelTable.modelId, modelId));
    if (providerId) {
      // Join with provider_llm_api_keys to filter by provider
      conditions.push(eq(providerLlmApiKeysTable.providerId, providerId));
    }

    const query = db
      .select({
        id: llmApiKeyModelTable.id,
        apiKeyId: llmApiKeyModelTable.apiKeyId,
        modelId: llmApiKeyModelTable.modelId,
        modelName: llmModelsTable.name,
        providerName: llmProvidersTable.name,
        requestPerMinute: llmApiKeyModelTable.requestPerMinute,
        requestPerDay: llmApiKeyModelTable.requestPerDay,
        createdAt: llmApiKeyModelTable.createdAt,
      })
      .from(llmApiKeyModelTable)
      .leftJoin(providerLlmApiKeysTable, eq(llmApiKeyModelTable.apiKeyId, providerLlmApiKeysTable.keyId))
      .leftJoin(llmModelsTable, eq(llmApiKeyModelTable.modelId, llmModelsTable.modelId))
      .leftJoin(llmProvidersTable, eq(providerLlmApiKeysTable.providerId, llmProvidersTable.providerId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(llmApiKeyModelTable.id))
      .limit(limit)
      .offset(offset);

    const relations = await query;

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(llmApiKeyModelTable)
      .leftJoin(providerLlmApiKeysTable, eq(llmApiKeyModelTable.apiKeyId, providerLlmApiKeysTable.keyId))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      relations,
      total: Number(totalResult[0]?.count || 0),
      page,
      limit,
    };
  }

  // ============ GET API KEY-MODEL RELATION BY ID ============
  async getApiKeyModelById(id: number) {
    const relation = await db
      .select({
        id: llmApiKeyModelTable.id,
        apiKeyId: llmApiKeyModelTable.apiKeyId,
        modelId: llmApiKeyModelTable.modelId,
        modelName: llmModelsTable.name,
        providerName: llmProvidersTable.name,
        requestPerMinute: llmApiKeyModelTable.requestPerMinute,
        requestPerDay: llmApiKeyModelTable.requestPerDay,
        createdAt: llmApiKeyModelTable.createdAt,
      })
      .from(llmApiKeyModelTable)
      .leftJoin(providerLlmApiKeysTable, eq(llmApiKeyModelTable.apiKeyId, providerLlmApiKeysTable.keyId))
      .leftJoin(llmModelsTable, eq(llmApiKeyModelTable.modelId, llmModelsTable.modelId))
      .leftJoin(llmProvidersTable, eq(providerLlmApiKeysTable.providerId, llmProvidersTable.providerId))
      .where(eq(llmApiKeyModelTable.id, id))
      .limit(1);

    if (!relation[0]) {
      throw new NotFoundError('API key-model relation not found');
    }

    return relation[0];
  }

  // ============ CREATE API KEY-MODEL RELATION ============
  async createApiKeyModel(payload: CreateLlmApiKeyModelDto) {
    // Verify API key exists
    const apiKey = await db
      .select()
      .from(providerLlmApiKeysTable)
      .where(eq(providerLlmApiKeysTable.keyId, payload.apiKeyId))
      .limit(1);

    if (!apiKey[0]) {
      throw new NotFoundError('API key not found');
    }

    // Verify model exists
    const model = await db
      .select()
      .from(llmModelsTable)
      .where(eq(llmModelsTable.modelId, payload.modelId))
      .limit(1);

    if (!model[0]) {
      throw new NotFoundError('LLM model not found');
    }

    // Check if relation already exists
    const existingRelation = await db
      .select()
      .from(llmApiKeyModelTable)
      .where(
        and(
          eq(llmApiKeyModelTable.apiKeyId, payload.apiKeyId),
          eq(llmApiKeyModelTable.modelId, payload.modelId)
        )
      )
      .limit(1);

    if (existingRelation[0]) {
      throw new BadRequest('API key-model relation already exists');
    }

    const [newRelation] = await db
      .insert(llmApiKeyModelTable)
      .values({
        apiKeyId: payload.apiKeyId,
        modelId: payload.modelId,
        requestPerMinute: payload.requestPerMinute,
        requestPerDay: payload.requestPerDay,
      })
      .returning();

    return newRelation;
  }

  // ============ UPDATE API KEY-MODEL RELATION ============
  async updateApiKeyModel(id: number, payload: UpdateLlmApiKeyModelDto) {
    // Verify relation exists
    const existingRelation = await db
      .select()
      .from(llmApiKeyModelTable)
      .where(eq(llmApiKeyModelTable.id, id))
      .limit(1);

    if (!existingRelation[0]) {
      throw new NotFoundError('API key-model relation not found');
    }

    // If updating apiKeyId, verify it exists
    if (payload.apiKeyId && payload.apiKeyId !== existingRelation[0].apiKeyId) {
      const apiKey = await db
        .select()
        .from(providerLlmApiKeysTable)
        .where(eq(providerLlmApiKeysTable.keyId, payload.apiKeyId))
        .limit(1);

      if (!apiKey[0]) {
        throw new NotFoundError('API key not found');
      }
    }

    // If updating modelId, verify it exists
    if (payload.modelId && payload.modelId !== existingRelation[0].modelId) {
      const model = await db
        .select()
        .from(llmModelsTable)
        .where(eq(llmModelsTable.modelId, payload.modelId))
        .limit(1);

      if (!model[0]) {
        throw new NotFoundError('LLM model not found');
      }
    }

    // Check for duplicate if updating both apiKeyId and modelId
    if (payload.apiKeyId && payload.modelId) {
      const duplicateRelation = await db
        .select()
        .from(llmApiKeyModelTable)
        .where(
          and(
            eq(llmApiKeyModelTable.apiKeyId, payload.apiKeyId),
            eq(llmApiKeyModelTable.modelId, payload.modelId)
          )
        )
        .limit(1);

      if (duplicateRelation[0] && duplicateRelation[0].id !== id) {
        throw new BadRequest('API key-model relation already exists');
      }
    }

    const [updatedRelation] = await db
      .update(llmApiKeyModelTable)
      .set({
        ...(payload.apiKeyId && { apiKeyId: payload.apiKeyId }),
        ...(payload.modelId && { modelId: payload.modelId }),
        ...(payload.requestPerMinute !== undefined && { requestPerMinute: payload.requestPerMinute }),
        ...(payload.requestPerDay !== undefined && { requestPerDay: payload.requestPerDay }),
      })
      .where(eq(llmApiKeyModelTable.id, id))
      .returning();

    return updatedRelation;
  }

  // ============ DELETE API KEY-MODEL RELATION ============
  async deleteApiKeyModel(id: number) {
    const relation = await db
      .select()
      .from(llmApiKeyModelTable)
      .where(eq(llmApiKeyModelTable.id, id))
      .limit(1);

    if (!relation[0]) {
      throw new NotFoundError('API key-model relation not found');
    }

    await db.delete(llmApiKeyModelTable).where(eq(llmApiKeyModelTable.id, id));

    return { message: 'API key-model relation deleted successfully' };
  }
}

export const adminLlmApiKeyModelService = new AdminLlmApiKeyModelService();

