import { index } from 'drizzle-orm/gel-core';
import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  uniqueIndex,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';
import { request } from 'http';

// Define ENUMs
export const keyTypeEnum = pgEnum('key_type', ['free', 'paid']);
export const keyStatusEnum = pgEnum('key_status', [
  'active',
  'inactive',
  'expired',
  'rate_limited',
]);

// LLM Providers table
export const llmProvidersTable = pgTable('llm_providers', {
  providerId: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  isDefault: boolean('is_default').notNull().default(false),
  isAvailable: boolean('is_available').notNull().default(true),
  index: integer('index').notNull(),
  description: text('description'),
  baseUrl: text('base_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// LLM Models table
export const llmModelsTable = pgTable(
  'llm_models',
  {
    modelId: serial('id').primaryKey(),
    providerId: integer('provider_id')
      .notNull()
      .references(() => llmProvidersTable.providerId),
    name: varchar('name', { length: 100 }).notNull(),
    priority: integer('priority').notNull().default(0),
    isAvailable: boolean('is_available').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  table => {
    return {
      providerModelUnique: uniqueIndex('provider_model_unique').on(table.providerId, table.name),
    };
  }
);

// Provider API Keys table
export const providerLlmApiKeysTable = pgTable('provider_llm_api_keys', {
  keyId: serial('id').primaryKey(),
  providerId: integer('provider_id')
    .notNull()
    .references(() => llmProvidersTable.providerId),
  isDefault: boolean('is_default').notNull().default(false),
  priority: integer('priority').notNull().default(0),
  index: integer('index').notNull(),
  keyValue: text('key_value').notNull(),
  keyType: keyTypeEnum('key_type').notNull(),
  status: keyStatusEnum('status').notNull().default('active'),
  usageLimitPerDay: integer('usage_limit_per_day'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// LLM API Key-Model relation table
export const llmApiKeyModelTable = pgTable(
  'llm_api_key_model',
  {
    id: serial('id').primaryKey(),
    apiKeyId: integer('api_key_id')
      .notNull()
      .references(() => providerLlmApiKeysTable.keyId),
    modelId: integer('model_id')
      .notNull()
      .references(() => llmModelsTable.modelId),
    requestPerMinute: integer('request_per_minute').notNull(),
    requestPerDay: integer('request_per_day').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  table => {
    return {
      apiKeyModelUnique: uniqueIndex('api_key_model_unique').on(table.apiKeyId, table.modelId),
    };
  }
);
