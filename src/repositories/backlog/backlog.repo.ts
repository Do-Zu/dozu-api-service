import { db } from '@/libs/drizzleClient.lib';
import { flashcardBacklogItemsTable } from '@/models/flashcardBacklog.model';
import { sql } from 'drizzle-orm';

class BacklogRepo {
  async countActiveByTopic(userId: number, topicId: number) {
    const rows = await db().execute(sql`
      SELECT COUNT(*)::int AS count
      FROM flashcard_backlog_items
      WHERE user_id = ${userId}
        AND topic_id = ${topicId}
        AND status = 'active'
    `);
    return rows.rows[0]?.count ?? 0;
  }

  async addItems(userId: number, topicId: number, items: Array<{
    flashcardId: number; source: 'first_half'|'second_half'|'manual'|'backlog_quiz';
    sessionEpoch?: number; orderIndex?: number;
  }>) {
    if (!items.length) return { added: 0, skipped: 0 };

    // onConflictDoNothing (userId, topicId, flashcardId, status)
    const values = items.map(it => ({
      userId, topicId,
      flashcardId: it.flashcardId,
      source: it.source,
      sessionEpoch: it.sessionEpoch ?? null,
      orderIndex: it.orderIndex ?? null,
      status: 'active' as const,
    }));

    const result = await db().insert(flashcardBacklogItemsTable)
      .values(values)
      .onConflictDoNothing({
        target: [
          flashcardBacklogItemsTable.userId,
          flashcardBacklogItemsTable.topicId,
          flashcardBacklogItemsTable.flashcardId,
        ]
      }).returning({ id: flashcardBacklogItemsTable.id });

     const added = result.length;
     const skipped = values.length - added;
     return { added, skipped };
  }

  async getReservedByClient(userId: number, topicId: number, clientRequestId: string) {
    const rows = await db().execute(sql`
      SELECT
        bl.id,
        bl.flashcard_id AS "flashcardId",
        bl.source,
        bl.order_index AS "orderIndex",
        f.front,
        f.back,
        f.image_url AS "imageUrl",
        t.name AS "topicName"
      FROM flashcard_backlog_items bl
      JOIN flashcards f ON f.flashcard_id = bl.flashcard_id
      LEFT JOIN topics t ON t.topic_id = f.topic_id
      WHERE bl.user_id = ${userId}
        AND bl.topic_id = ${topicId}
        AND bl.status = 'reserved'
        AND bl.client_request_id = ${clientRequestId}
      ORDER BY bl.order_index NULLS LAST, bl.reserved_at ASC, bl.id ASC
    `);
    return rows.rows as Array<{
      id: number; flashcardId: number; source: string; orderIndex: number | null;
      front: string; back: string; imageUrl: string | null; topicName: string | null;
    }>;
  }

  async reserve(userId: number, topicId: number, limit: number, clientRequestId: string) {
    const rows = await db().execute(sql`
      WITH picked AS (
        SELECT id
        FROM flashcard_backlog_items
        WHERE user_id = ${userId}
          AND topic_id = ${topicId}
          AND status = 'active'
        ORDER BY
          order_index NULLS LAST,
          created_at ASC, id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      ),
      updated AS (
        UPDATE flashcard_backlog_items bl
        SET status = 'reserved',
            reserved_at = NOW(),
            client_request_id = ${clientRequestId}
        FROM picked
        WHERE bl.id = picked.id
        RETURNING bl.id, bl.flashcard_id, bl.source, bl.order_index
      )
      SELECT
        u.id,
        u.flashcard_id AS "flashcardId",
        u.source,
        u.order_index AS "orderIndex",
        f.front,
        f.back,
        f.image_url AS "imageUrl",
        t.name AS "topicName"
      FROM updated u
      JOIN flashcards f ON f.flashcard_id = u.flashcard_id
      LEFT JOIN topics t ON t.topic_id = f.topic_id
      ORDER BY COALESCE(u.order_index, 999999), u.id;
    `);

    return rows.rows as Array<{
      id: number; flashcardId: number; source: string; orderIndex: number | null;
      front: string; back: string; imageUrl: string | null; topicName: string | null;
    }>;
  }

  async commit(userId: number, topicId: number, itemIds: number[]) {
    if (!itemIds.length) return 0;
    const result = await db().execute(sql`
      UPDATE flashcard_backlog_items
      SET status = 'consumed', consumed_at = NOW()
      WHERE id = ANY(${itemIds})
        AND user_id = ${userId}
        AND topic_id = ${topicId}
        AND status = 'reserved'
    `);
    return result.rowCount ?? 0;
  }

  async release(userId: number, topicId: number, itemIds: number[]) {
    if (!itemIds.length) return 0;
    const result = await db().execute(sql`
      UPDATE flashcard_backlog_items
      SET status = 'active', reserved_at = NULL, client_request_id = NULL
      WHERE id = ANY(${itemIds})
        AND user_id = ${userId}
        AND topic_id = ${topicId}
        AND status = 'reserved'
    `);
    return result.rowCount ?? 0;
  }

  async clear(userId: number, topicId: number, force = false) {
    if (force) {
      await db().execute(sql`
        DELETE FROM flashcard_backlog_items
        WHERE user_id = ${userId} AND topic_id = ${topicId}
      `);
    } else {
      await db().execute(sql`
        DELETE FROM flashcard_backlog_items
        WHERE user_id = ${userId} AND topic_id = ${topicId} AND status = 'active'
      `);
    }
  }
}

export const backlogRepo = new BacklogRepo();
