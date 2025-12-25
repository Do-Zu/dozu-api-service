import { questionHealthRepo } from '@/repositories/question/questionHealth.repo';
import { QuestionHealthDTO, HealthLevel } from '@/dtos/question/questionHealth.dto';

type SRStatus = 'untracked' | 'new' | 'learning' | 'review' | 'relearning';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toNumberEF(ef: unknown): number | null {
  if (ef === null || ef === undefined) return null;
  const n = typeof ef === 'string' ? Number(ef) : (ef as number);
  return Number.isFinite(n) ? n : null;
}

function calcOverdueDays(nextReview?: string | null): number | null {
  if (!nextReview) return null;
  const nr = new Date(nextReview).getTime();
  if (Number.isNaN(nr)) return null;

  const now = Date.now();
  if (nr > now) return 0;

  const diffMs = now - nr;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function levelFromScore(score: number): HealthLevel {
  if (score <= 30) return 'critical';
  if (score <= 50) return 'weak';
  if (score <= 70) return 'fair';
  if (score <= 85) return 'healthy';
  return 'mastered';
}

function computeHealth(input: {
  status: SRStatus;
  easinessFactor: number | null;
  repetitionNumber: number | null;
  reviewInterval: number | null;
  nextReview: string | null;
}): { healthScore: number; healthLevel: HealthLevel; reasons: string[]; overdueDays: number | null } {
  const reasons: string[] = [];

  let score = 60; // base

  // status impact
  if (input.status === 'untracked') {
    score -= 10;
    reasons.push('No spaced-repetition record yet (untracked).');
  } else if (input.status === 'relearning') {
    score -= 30;
    reasons.push('Currently in relearning (previous mistakes need fixing).');
  } else if (input.status === 'learning') {
    score -= 10;
    reasons.push('Still in learning phase (memory not stable yet).');
  } else if (input.status === 'review') {
    score += 10;
    reasons.push('In review phase (building long-term retention).');
  } else if (input.status === 'new') {
    score -= 5;
    reasons.push('New item (needs first repetitions).');
  }

  // EF impact
  const ef = input.easinessFactor;
  if (ef !== null) {
    if (ef < 2.0) {
      score -= 25;
      reasons.push('Low easiness factor (EF < 2.0) → difficult item.');
    } else if (ef < 2.5) {
      reasons.push('Moderate easiness factor (EF 2.0–2.5).');
    } else {
      score += 15;
      reasons.push('High easiness factor (EF > 2.5) → easier / stable.');
    }
  }

  // repetition impact
  const rep = input.repetitionNumber ?? null;
  if (rep !== null) {
    if (rep >= 5) {
      score += 10;
      reasons.push('Repeated 5+ times → better stability.');
    } else if (rep <= 1) {
      score -= 5;
      reasons.push('Very few repetitions so far.');
    }
  }

  // overdue impact (ONLY meaningful if nextReview exists)
  const overdueDays = calcOverdueDays(input.nextReview);
  if (overdueDays !== null && overdueDays > 0) {
    score -= 20;
    reasons.push(`Overdue for review by ${overdueDays} day(s).`);
  }

  score = clamp(score, 0, 100);
  return { healthScore: score, healthLevel: levelFromScore(score), reasons, overdueDays };
}

class QuestionHealthService {
  async handleGetQuestionsHealthForTopic(topicId: number, userId: number): Promise<QuestionHealthDTO[]> {
    const rows = await questionHealthRepo.getQuestionsWithTrackingForHealth(topicId, userId);

    return rows.map((r) => {
      const q = r.question;
      const t = r.tracking;

      const status: SRStatus = t?.status ?? 'untracked';
      const ef = toNumberEF(t?.easinessFactor);
      const rep = t?.repetitionNumber ?? null;
      const interval = t?.reviewInterval ?? null;
      const lastReviewed = t?.lastReviewed ?? null;
      const nextReview = t?.nextReview ?? null;

      const { healthScore, healthLevel, reasons, overdueDays } = computeHealth({
        status,
        easinessFactor: ef,
        repetitionNumber: rep,
        reviewInterval: interval,
        nextReview,
      });

      return {
        questionId: q.questionId,
        topicId: q.topicId,
        questionText: q.questionText ?? '',
        choices: q.choices ?? [],
        correctIndex: q.correctIndex ?? 0,
        questionType: q.questionType ?? null,
        explain: q.explain ?? null,
        hint: q.hint ?? null,
        createdAt: q.createdAt ? q.createdAt.toISOString() : null,

        status,
        healthScore,
        healthLevel,

        metrics: {
          easinessFactor: ef,
          repetitionNumber: rep,
          reviewInterval: interval,
          lastReviewed,
          nextReview,
          overdueDays,
        },

        reasons,
      };
    });
  }
}

export const questionHealthService = new QuestionHealthService();
