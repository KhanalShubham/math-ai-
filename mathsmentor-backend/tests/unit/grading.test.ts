import { evaluateAnswer } from '../../src/domain/grading/grading';

describe('domain/grading — evaluateAnswer', () => {
  it('grades an mcq answer correctly', () => {
    const answerKey = { correctOptionId: 'b' };
    expect(evaluateAnswer('mcq', answerKey, 'b')).toBe(true);
    expect(evaluateAnswer('mcq', answerKey, 'a')).toBe(false);
  });

  it('rejects a non-string mcq answer', () => {
    expect(evaluateAnswer('mcq', { correctOptionId: 'b' }, 42)).toBe(false);
  });

  it('grades a numeric answer within tolerance', () => {
    const answerKey = { value: 0.75, tolerance: 0.01 };
    expect(evaluateAnswer('numeric', answerKey, 0.751)).toBe(true);
    expect(evaluateAnswer('numeric', answerKey, 0.9)).toBe(false);
  });

  it('rejects a non-finite numeric answer', () => {
    const answerKey = { value: 0.75, tolerance: 0.01 };
    expect(evaluateAnswer('numeric', answerKey, Number.NaN)).toBe(false);
    expect(evaluateAnswer('numeric', answerKey, 'not-a-number')).toBe(false);
  });

  it('grades an algebraic answer against accepted forms, ignoring whitespace/case', () => {
    const answerKey = { acceptedForms: ['2x+4', 'x+2'], equivalenceRule: 'symbolic' as const };
    expect(evaluateAnswer('algebraic', answerKey, ' 2X + 4 ')).toBe(true);
    expect(evaluateAnswer('algebraic', answerKey, '4+2x')).toBe(false); // known limitation, see grading.ts
    expect(evaluateAnswer('algebraic', answerKey, '3x')).toBe(false);
  });

  it('grades a multi-step answer only when every step matches in order', () => {
    const answerKey = { steps: [{ stepAnswerKey: 4 }, { stepAnswerKey: 'x=2' }] };
    expect(evaluateAnswer('multi-step', answerKey, [4, 'x=2'])).toBe(true);
    expect(evaluateAnswer('multi-step', answerKey, [4, 'x=3'])).toBe(false);
    expect(evaluateAnswer('multi-step', answerKey, [4])).toBe(false);
  });

  it('returns false rather than throwing on a mismatched answerKey shape', () => {
    const wrongShapeForMcq = { value: 1, tolerance: 0.1 };
    expect(evaluateAnswer('mcq', wrongShapeForMcq, 'anything')).toBe(false);
  });
});
