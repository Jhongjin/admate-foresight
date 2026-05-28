import { describe, expect, it } from 'vitest';

import {
  normalizePredictionRequest,
  PredictionRequestValidationError,
} from '../../lib/predictionRequest';

const validBody = {
  industries: ['교육'],
  genders: ['female'],
  ageRanges: ['25-34'],
  objectives: ['OUTCOME_TRAFFIC'],
  budget: 5_000_000,
  monthFrom: '2025-06',
  monthTo: '2025-07',
};

const forbiddenErrorEchoes = [
  'https://ads.example.test/account/123',
  'access_token=secret-token',
  'Bearer secret-token',
  'cookie=sessionid=abc123',
  'session=abc123',
  'sk_live_secretlookingvalue',
  'password=secret',
  'refresh_token',
];

const forbiddenErrorPatterns = [
  /https?:\/\//i,
  /access[_-]?token/i,
  /bearer\s+[a-z0-9._-]+/i,
  /cookie/i,
  /session/i,
  /sk_(?:live|test)_[a-z0-9_]+/i,
  /password/i,
  /refresh[_-]?token/i,
];

function expectValidationError(body: unknown) {
  expect(() => normalizePredictionRequest(body)).toThrow(PredictionRequestValidationError);

  try {
    normalizePredictionRequest(body);
  } catch (error) {
    expect(error).toBeInstanceOf(PredictionRequestValidationError);
    const message = (error as Error).message;

    for (const rawValue of forbiddenErrorEchoes) {
      expect(message).not.toContain(rawValue);
    }
    for (const pattern of forbiddenErrorPatterns) {
      expect(message).not.toMatch(pattern);
    }

    return message;
  }

  throw new Error('Expected validation error');
}

function withoutBudget(body: typeof validBody) {
  return {
    industries: body.industries,
    genders: body.genders,
    ageRanges: body.ageRanges,
    objectives: body.objectives,
    monthFrom: body.monthFrom,
    monthTo: body.monthTo,
  };
}

describe('prediction request contract', () => {
  it.each([
    ['null', null],
    ['array', [validBody]],
    ['string', 'https://ads.example.test/account/123?access_token=secret-token'],
    ['number', 123],
    ['boolean', true],
  ])('rejects non-object request bodies: %s', (_label, body) => {
    expect(expectValidationError(body)).toBe('request body must be an object');
  });

  it.each([
    ['industries', '교육'],
    ['genders', { value: 'female' }],
    ['ageRanges', '25-34'],
    ['objectives', 'OUTCOME_TRAFFIC'],
  ] as const)('rejects malformed %s arrays', (field, value) => {
    expect(expectValidationError({
      ...validBody,
      [field]: value,
    })).toBe(`${field} must be an array of strings`);
  });

  it.each([
    ['industries', ['교육', 123]],
    ['genders', ['female', null]],
    ['ageRanges', ['25-34', false]],
    ['objectives', ['OUTCOME_TRAFFIC', { token: 'secret-token' }]],
  ] as const)('rejects non-string %s array items', (field, value) => {
    expect(expectValidationError({
      ...validBody,
      [field]: value,
    })).toBe(`${field} must contain only strings`);
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['string', '5000000'],
    ['zero', 0],
    ['negative', -1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('rejects invalid, missing, nonpositive, or nonfinite budgets: %s', (_label, budget) => {
    const bodyWithoutBudget = withoutBudget(validBody);
    const body = budget === undefined ? bodyWithoutBudget : { ...validBody, budget };

    expect(expectValidationError(body)).toBe('budget must be a finite positive number');
  });

  it('uses the default budget when the request omits budget', () => {
    const bodyWithoutBudget = withoutBudget(validBody);

    expect(normalizePredictionRequest(bodyWithoutBudget, { defaultBudget: 3_000_000 }))
      .toEqual({
        ...bodyWithoutBudget,
        budget: 3_000_000,
      });
  });

  it.each([
    ['2025-01', '2025-12'],
    ['1999-09', '2000-10'],
    ['2025-07', '2025-06'],
  ])('accepts valid month formats, including reversed ranges: %s to %s', (monthFrom, monthTo) => {
    expect(normalizePredictionRequest({
      ...validBody,
      monthFrom,
      monthTo,
    })).toEqual({
      ...validBody,
      monthFrom,
      monthTo,
    });
  });

  it.each([
    ['monthFrom', '2025-1'],
    ['monthFrom', '2025-00'],
    ['monthFrom', '2025-13'],
    ['monthFrom', '2025/01'],
    ['monthFrom', '2025-01-01'],
    ['monthTo', '25-01'],
    ['monthTo', '2025-1'],
    ['monthTo', '2025-00'],
    ['monthTo', '2025-13'],
    ['monthTo', '2025/01'],
    ['monthTo', '2025-01-01'],
  ] as const)('rejects invalid %s month format %s', (field, value) => {
    expect(expectValidationError({
      ...validBody,
      [field]: value,
    })).toBe(`${field} must use YYYY-MM format`);
  });

  it('keeps validation errors generic when raw body contains URLs, tokens, cookies, sessions, or secrets', () => {
    const message = expectValidationError({
      industries: [forbiddenErrorEchoes[0]],
      genders: [forbiddenErrorEchoes[1], 123],
      ageRanges: [forbiddenErrorEchoes[2]],
      objectives: [forbiddenErrorEchoes[3]],
      budget: forbiddenErrorEchoes[4],
      monthFrom: forbiddenErrorEchoes[5],
      monthTo: forbiddenErrorEchoes[6],
      extra: forbiddenErrorEchoes[7],
    });

    expect(message).toBe('genders must contain only strings');
  });
});
