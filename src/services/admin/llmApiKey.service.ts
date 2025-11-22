import db from '@/libs/drizzleClient.lib';
import { eq, and, or, ilike, count, asc } from 'drizzle-orm';
import { providerLlmApiKeysTable, llmProvidersTable } from '@/models/llmIntegrate.model';
import { NotFoundError, BadRequest } from '@/core/error';
import {
  GetLlmApiKeysQueryDto,
  CreateLlmApiKeyDto,
  UpdateLlmApiKeyDto,
} from '@/dtos/admin/llmApiKey.dto';

class AdminLlmApiKeyService {
  // ============ GET ALL API KEYS ============
  async getAllApiKeys(filters: GetLlmApiKeysQueryDto) {
    const { providerId, providerName, status, keyType, isDefault, page = 1, limit = 50, search } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (providerId) conditions.push(eq(providerLlmApiKeysTable.providerId, providerId));
    if (providerName) conditions.push(ilike(llmProvidersTable.name, `%${providerName}%`));
    if (status) conditions.push(eq(providerLlmApiKeysTable.status, status));
    if (keyType) conditions.push(eq(providerLlmApiKeysTable.keyType, keyType));
    if (isDefault !== undefined) conditions.push(eq(providerLlmApiKeysTable.isDefault, isDefault));

    // Search by key value (partial match, masked)
    if (search) {
      conditions.push(ilike(providerLlmApiKeysTable.keyValue, `%${search}%`));
    }

    const apiKeys = await db
      .select({
        keyId: providerLlmApiKeysTable.keyId,
        providerId: providerLlmApiKeysTable.providerId,
        providerName: llmProvidersTable.name,
        isDefault: providerLlmApiKeysTable.isDefault,
        priority: providerLlmApiKeysTable.priority,
        index: providerLlmApiKeysTable.index,
        keyValue: providerLlmApiKeysTable.keyValue,
        keyType: providerLlmApiKeysTable.keyType,
        status: providerLlmApiKeysTable.status,
        usageLimitPerDay: providerLlmApiKeysTable.usageLimitPerDay,
        createdAt: providerLlmApiKeysTable.createdAt,
      })
      .from(providerLlmApiKeysTable)
      .leftJoin(llmProvidersTable, eq(providerLlmApiKeysTable.providerId, llmProvidersTable.providerId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(providerLlmApiKeysTable.keyId))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(providerLlmApiKeysTable)
      .leftJoin(llmProvidersTable, eq(providerLlmApiKeysTable.providerId, llmProvidersTable.providerId))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      apiKeys,
      total: Number(totalResult[0]?.count || 0),
      page,
      limit,
    };
  }

  // ============ GET API KEY BY ID ============
  async getApiKeyById(keyId: number) {
    const apiKey = await db
      .select({
        keyId: providerLlmApiKeysTable.keyId,
        providerId: providerLlmApiKeysTable.providerId,
        providerName: llmProvidersTable.name,
        isDefault: providerLlmApiKeysTable.isDefault,
        priority: providerLlmApiKeysTable.priority,
        index: providerLlmApiKeysTable.index,
        keyValue: providerLlmApiKeysTable.keyValue,
        keyType: providerLlmApiKeysTable.keyType,
        status: providerLlmApiKeysTable.status,
        usageLimitPerDay: providerLlmApiKeysTable.usageLimitPerDay,
        createdAt: providerLlmApiKeysTable.createdAt,
      })
      .from(providerLlmApiKeysTable)
      .leftJoin(llmProvidersTable, eq(providerLlmApiKeysTable.providerId, llmProvidersTable.providerId))
      .where(eq(providerLlmApiKeysTable.keyId, keyId))
      .limit(1);

    if (!apiKey[0]) {
      throw new NotFoundError('API key not found');
    }

    return apiKey[0];
  }

  // ============ CREATE API KEY ============
  async createApiKey(payload: CreateLlmApiKeyDto) {
    // Verify provider exists
    const provider = await db
      .select()
      .from(llmProvidersTable)
      .where(eq(llmProvidersTable.providerId, payload.providerId))
      .limit(1);

    if (!provider[0]) {
      throw new NotFoundError('LLM provider not found');
    }

    const [newApiKey] = await db
      .insert(providerLlmApiKeysTable)
      .values({
        providerId: payload.providerId,
        isDefault: payload.isDefault,
        priority: payload.priority,
        index: payload.index,
        keyValue: payload.keyValue,
        keyType: payload.keyType,
        status: payload.status,
        usageLimitPerDay: payload.usageLimitPerDay,
      })
      .returning();

    return newApiKey;
  }

  // ============ UPDATE API KEY ============
  async updateApiKey(keyId: number, payload: UpdateLlmApiKeyDto) {
    // Verify API key exists
    const existingApiKey = await db
      .select()
      .from(providerLlmApiKeysTable)
      .where(eq(providerLlmApiKeysTable.keyId, keyId))
      .limit(1);

    if (!existingApiKey[0]) {
      throw new NotFoundError('API key not found');
    }

    // If updating provider, verify new provider exists
    if (payload.providerId && payload.providerId !== existingApiKey[0].providerId) {
      const provider = await db
        .select()
        .from(llmProvidersTable)
        .where(eq(llmProvidersTable.providerId, payload.providerId))
        .limit(1);

      if (!provider[0]) {
        throw new NotFoundError('LLM provider not found');
      }
    }

    const [updatedApiKey] = await db
      .update(providerLlmApiKeysTable)
      .set({
        ...(payload.providerId && { providerId: payload.providerId }),
        ...(payload.isDefault !== undefined && { isDefault: payload.isDefault }),
        ...(payload.priority !== undefined && { priority: payload.priority }),
        ...(payload.index !== undefined && { index: payload.index }),
        ...(payload.keyValue && { keyValue: payload.keyValue }),
        ...(payload.keyType && { keyType: payload.keyType }),
        ...(payload.status && { status: payload.status }),
        ...(payload.usageLimitPerDay !== undefined && { usageLimitPerDay: payload.usageLimitPerDay }),
      })
      .where(eq(providerLlmApiKeysTable.keyId, keyId))
      .returning();

    return updatedApiKey;
  }

  // ============ DELETE API KEY ============
  async deleteApiKey(keyId: number) {
    const apiKey = await db
      .select()
      .from(providerLlmApiKeysTable)
      .where(eq(providerLlmApiKeysTable.keyId, keyId))
      .limit(1);

    if (!apiKey[0]) {
      throw new NotFoundError('API key not found');
    }

    await db.delete(providerLlmApiKeysTable).where(eq(providerLlmApiKeysTable.keyId, keyId));

    return { message: 'API key deleted successfully' };
  }

  // ============ TOGGLE API KEY STATUS ============
  async toggleApiKeyStatus(keyId: number) {
    const apiKey = await db
      .select()
      .from(providerLlmApiKeysTable)
      .where(eq(providerLlmApiKeysTable.keyId, keyId))
      .limit(1);

    if (!apiKey[0]) {
      throw new NotFoundError('API key not found');
    }

    const newStatus = apiKey[0].status === 'active' ? 'inactive' : 'active';
    const [updatedApiKey] = await db
      .update(providerLlmApiKeysTable)
      .set({ status: newStatus })
      .where(eq(providerLlmApiKeysTable.keyId, keyId))
      .returning();

    return updatedApiKey;
  }
}

export const adminLlmApiKeyService = new AdminLlmApiKeyService();

