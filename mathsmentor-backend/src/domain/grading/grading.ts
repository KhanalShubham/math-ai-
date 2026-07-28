import type { AnswerKey, QuestionType } from '../../modules/curriculum/curriculum.types';

/**
 * Pure correctness engine (ARCHITECTURE.md §0 constraint #1, §14). Zero I/O,
 * zero imports from infrastructure/ai — grading is architecturally incapable
 * of calling an AI provider. diagnostic.service and practice.service are the
 * only callers; both persist the returned boolean and never recompute it
 * later from answerKey (DOMAIN_MODEL.md §2.7 business rule).
 *
 * A shape mismatch between `type` and `answerKey` (which curriculum.validation
 * does not currently cross-check) is treated as an incorrect answer rather
 * than thrown — a malformed stored question must never crash a student's
 * grading request.
 */
export function evaluateAnswer(
  type: QuestionType,
  answerKey: AnswerKey,
  studentAnswer: unknown,
): boolean {
  switch (type) {
    case 'mcq':
      return evaluateMcq(answerKey, studentAnswer);
    case 'numeric':
      return evaluateNumeric(answerKey, studentAnswer);
    case 'algebraic':
      return evaluateAlgebraic(answerKey, studentAnswer);
    case 'multi-step':
      return evaluateMultiStep(answerKey, studentAnswer);
  }
}

function evaluateMcq(answerKey: AnswerKey, studentAnswer: unknown): boolean {
  if (!('correctOptionId' in answerKey) || typeof studentAnswer !== 'string') {
    return false;
  }
  return studentAnswer === answerKey.correctOptionId;
}

function evaluateNumeric(answerKey: AnswerKey, studentAnswer: unknown): boolean {
  if (!('value' in answerKey) || typeof studentAnswer !== 'number' || !Number.isFinite(studentAnswer)) {
    return false;
  }
  return Math.abs(studentAnswer - answerKey.value) <= answerKey.tolerance;
}

/**
 * Simplified equivalence: whitespace/case-normalized string match against
 * acceptedForms. Not a true symbolic-equivalence check (e.g. "2x+4" vs
 * "4+2x" would need a CAS) — flagged as tech debt in PROGRESS.md.
 */
function evaluateAlgebraic(answerKey: AnswerKey, studentAnswer: unknown): boolean {
  if (!('acceptedForms' in answerKey) || typeof studentAnswer !== 'string') {
    return false;
  }
  const normalize = (value: string) => value.replace(/\s+/g, '').toLowerCase();
  const normalizedAnswer = normalize(studentAnswer);
  return answerKey.acceptedForms.some((form) => normalize(form) === normalizedAnswer);
}

/**
 * Each step's studentAnswer must deep-equal that step's stepAnswerKey, in
 * order. Deep equality via JSON comparison — sufficient for primitive/plain
 * object step answers, not a general structural-equivalence engine.
 */
function evaluateMultiStep(answerKey: AnswerKey, studentAnswer: unknown): boolean {
  if (!('steps' in answerKey) || !Array.isArray(studentAnswer)) {
    return false;
  }
  if (studentAnswer.length !== answerKey.steps.length) {
    return false;
  }
  return answerKey.steps.every(
    (step, i) => JSON.stringify(step.stepAnswerKey) === JSON.stringify(studentAnswer[i]),
  );
}
