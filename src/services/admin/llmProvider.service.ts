import db from '@/libs/drizzleClient.lib';
import { eq, and, or, ilike, count, asc, max } from 'drizzle-orm';
import { llmProvidersTable } from '@/models/llmIntegrate.model';
import { NotFoundError, BadRequest } from '@/core/error';
import {
  GetLlmProvidersQueryDto,
  CreateLlmProviderDto,
  UpdateLlmProviderDto,
} from '@/dtos/admin/llmProvider.dto';

class AdminLlmProviderService {
  // ============ GET ALL PROVIDERS ============
  async getAllProviders(filters: GetLlmProvidersQueryDto) {
    const { isAvailable, isDefault, page = '1', limit = '50', search } = filters;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];

    if (isAvailable !== undefined) conditions.push(eq(llmProvidersTable.isAvailable, isAvailable));
    if (isDefault !== undefined) conditions.push(eq(llmProvidersTable.isDefault, isDefault));

    // Search by provider name or description
    if (search) {
      conditions.push(
        or(
          ilike(llmProvidersTable.name, `%${search}%`),
          ilike(llmProvidersTable.description, `%${search}%`)
        )!
      );
    }

    const providers = await db
      .select()
      .from(llmProvidersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(llmProvidersTable.providerId))
      .limit(parseInt(limit))
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(llmProvidersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      providers,
      total: Number(totalResult[0]?.count || 0),
      page: parseInt(page),
      limit: parseInt(limit),
    };
  }

  // ============ GET PROVIDER BY ID ============
  async getProviderById(providerId: number) {
    const provider = await db
      .select()
      .from(llmProvidersTable)
      .where(eq(llmProvidersTable.providerId, providerId))
      .limit(1);

    if (!provider[0]) {
      throw new NotFoundError('LLM provider not found');
    }

    return provider[0];
  }

  // ============ CREATE PROVIDER ============
  async createProvider(payload: CreateLlmProviderDto) {
    // Check if provider with same name already exists
    const existingProvider = await db
      .select()
      .from(llmProvidersTable)
      .where(eq(llmProvidersTable.name, payload.name))
      .limit(1);

    if (existingProvider[0]) {
      throw new BadRequest('Provider with this name already exists');
    }

    // Auto-increment index: get max index and add 1
    const maxIndexResult = await db
      .select({ maxIndex: max(llmProvidersTable.index) })
      .from(llmProvidersTable);
    
    const nextIndex = (maxIndexResult[0]?.maxIndex ?? -1) + 1;

    // Allow multiple default providers - no need to unset other defaults
    const [newProvider] = await db
      .insert(llmProvidersTable)
      .values({
        name: payload.name,
        isDefault: payload.isDefault,
        isAvailable: payload.isAvailable,
        index: nextIndex,
        description: payload.description,
        baseUrl: payload.baseUrl || null,
      })
      .returning();

    return newProvider;
  }

  // ============ UPDATE PROVIDER ============
  async updateProvider(providerId: number, payload: UpdateLlmProviderDto) {
    // Verify provider exists
    const existingProvider = await db
      .select()
      .from(llmProvidersTable)
      .where(eq(llmProvidersTable.providerId, providerId))
      .limit(1);

    if (!existingProvider[0]) {
      throw new NotFoundError('LLM provider not found');
    }

    // If updating name, check for duplicates
    if (payload.name && payload.name !== existingProvider[0].name) {
      const duplicateProvider = await db
        .select()
        .from(llmProvidersTable)
        .where(eq(llmProvidersTable.name, payload.name))
        .limit(1);

      if (duplicateProvider[0] && duplicateProvider[0].providerId !== providerId) {
        throw new BadRequest('Provider with this name already exists');
      }
    }

    // Allow multiple default providers - no need to unset other defaults
    const [updatedProvider] = await db
      .update(llmProvidersTable)
      .set({
        ...(payload.name && { name: payload.name }),
        ...(payload.index !== undefined && { index: payload.index }),
        ...(payload.isAvailable !== undefined && { isAvailable: payload.isAvailable }),
        ...(payload.isDefault !== undefined && { isDefault: payload.isDefault }),
        ...(payload.description !== undefined && { description: payload.description }),
        ...(payload.baseUrl !== undefined && { baseUrl: payload.baseUrl || null }),
      })
      .where(eq(llmProvidersTable.providerId, providerId))
      .returning();

    return updatedProvider;
  }

  // ============ DELETE PROVIDER ============
  async deleteProvider(providerId: number) {
    const provider = await db
      .select()
      .from(llmProvidersTable)
      .where(eq(llmProvidersTable.providerId, providerId))
      .limit(1);

    if (!provider[0]) {
      throw new NotFoundError('LLM provider not found');
    }

    await db.delete(llmProvidersTable).where(eq(llmProvidersTable.providerId, providerId));

    return { message: 'Provider deleted successfully' };
  }

  // ============ TOGGLE PROVIDER AVAILABILITY ============
  async toggleProviderAvailability(providerId: number) {
    const provider = await db
      .select()
      .from(llmProvidersTable)
      .where(eq(llmProvidersTable.providerId, providerId))
      .limit(1);

    if (!provider[0]) {
      throw new NotFoundError('LLM provider not found');
    }

    const [updatedProvider] = await db
      .update(llmProvidersTable)
      .set({ isAvailable: !provider[0].isAvailable })
      .where(eq(llmProvidersTable.providerId, providerId))
      .returning();

    return updatedProvider;
  }
}

export const adminLlmProviderService = new AdminLlmProviderService();

