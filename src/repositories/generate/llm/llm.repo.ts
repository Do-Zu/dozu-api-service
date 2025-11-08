import { eq, and, asc } from 'drizzle-orm';
import {
    llmProvidersTable,
    llmModelsTable,
    providerLlmApiKeysTable,
    llmApiKeyModelTable,
} from '@/models/llmIntegrate.model';
import db from '@/libs/drizzleClient.lib';

/**
 * Get the default provider with its associated API key and models
 * @returns The default provider with API key and models
 */

export const getDefaultProviderWithApiKeyAndModels = async () => {
    // Get the default provider
    const defaultProvider = await db.query.llmProvidersTable.findFirst({
        where: and(eq(llmProvidersTable.isDefault, true), eq(llmProvidersTable.isAvailable, true)),
    });

    if (!defaultProvider) {
        throw new Error('No default LLM provider found');
    }

    // Get the default API key for this provider
    const defaultApiKey = await db.query.providerLlmApiKeysTable.findFirst({
        where: and(
            eq(providerLlmApiKeysTable.providerId, defaultProvider.providerId),
            eq(providerLlmApiKeysTable.isDefault, true),
            eq(providerLlmApiKeysTable.status, 'active')
        ),
    });

    if (!defaultApiKey) {
        throw new Error(`No default API key found for provider: ${defaultProvider.name}`);
    }

    // Get the default model for this provider
    const defaultModel = await db.query.llmModelsTable.findFirst({
        where: and(
            eq(llmModelsTable.providerId, defaultProvider.providerId),
            eq(llmModelsTable.isDefault, true),
            eq(llmModelsTable.isAvailable, true)
        ),
    });

    if (!defaultModel) {
        throw new Error(`No default model found for provider: ${defaultProvider.name}`);
    }

    return {
        provider: defaultProvider,
        apiKey: defaultApiKey,
        model: defaultModel,
    };
};

/**
 * Get all available models, optionally filtered by provider
 * @param providerId Optional provider ID to filter models
 * @returns List of available models
 */
export async function getAvailableModels(providerId: number, apiKeyId: number) {
    const modelsWithRateLimits = await db
        .select({
            name: llmModelsTable.name,
            modelId: llmModelsTable.modelId,
            priority: llmModelsTable.priority,
            providerId: llmModelsTable.providerId,
            requestPerMinute: llmApiKeyModelTable.requestPerMinute,
            requestPerDay: llmApiKeyModelTable.requestPerDay,
        })
        .from(llmModelsTable)
        .leftJoin(
            llmApiKeyModelTable,
            and(eq(llmApiKeyModelTable.modelId, llmModelsTable.modelId), eq(llmApiKeyModelTable.apiKeyId, apiKeyId))
        )
        .where(and(eq(llmModelsTable.providerId, providerId), eq(llmModelsTable.isAvailable, true)))
        .orderBy(asc(llmModelsTable.priority));

    return modelsWithRateLimits;
}

/**
 * Get the next available API key based on priority
 * @param providerId Provider ID to get API key for
 * @returns The next available API key with highest priority (lowest number)
 */
export async function getNextApiKey(providerId: number, index: number) {
    const apiKey = await db.query.providerLlmApiKeysTable.findFirst({
        where: and(
            eq(providerLlmApiKeysTable.providerId, providerId),
            eq(providerLlmApiKeysTable.status, 'active'),
            eq(providerLlmApiKeysTable.index, index)
        ),
        columns: {
            index: true,
            isDefault: true,
            keyId: true,
            keyValue: true,
            keyType: true,
            status: true,
        },
    });

    return apiKey;
}

export async function getRateLimitForModel(apiKeyId: number, modelId: number) {
    const apiKeyModel = await db.query.llmApiKeyModelTable.findFirst({
        where: and(eq(llmApiKeyModelTable.apiKeyId, apiKeyId), eq(llmApiKeyModelTable.modelId, modelId)),
        columns: {
            requestPerDay: true,
            requestPerMinute: true,
            id: true,
        },
    });

    return apiKeyModel;
}

export async function getAllProviderAvailable() {
    const providers = await db.query.llmProvidersTable.findMany({
        where: eq(llmProvidersTable.isAvailable, true),
        orderBy: [asc(llmProvidersTable.index)],
        columns: {
            baseUrl: true,
            index: true,
            isDefault: true,
            name: true,
            providerId: true,
        },
    });

    return providers;
}

export async function getInformationRateLimitOfModel(modelId: number, apiKeyId: number) {
    return await db.query.llmApiKeyModelTable.findFirst({
        where: and(eq(llmApiKeyModelTable.modelId, modelId), eq(llmApiKeyModelTable.apiKeyId, apiKeyId)),
        with: {
            apiKey: {
                where: eq(providerLlmApiKeysTable.status, 'active'),
            },
        },
        columns: {
            requestPerDay: true,
            requestPerMinute: true,
        },
    });
}
