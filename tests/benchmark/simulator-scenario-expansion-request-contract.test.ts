import { describe, expect, it } from 'vitest';

import {
  buildForesightSimulatorScenarioExpansionRequests,
  type BuildForesightSimulatorScenarioExpansionRequestsInput,
  type ForesightSimulatorScenarioExpansionRequest,
} from '../../lib/foresightSimulatorScenarioExpansionRequestContract';

function buildInput(
  overrides: Partial<BuildForesightSimulatorScenarioExpansionRequestsInput> = {},
): BuildForesightSimulatorScenarioExpansionRequestsInput {
  return {
    industries: ['교육'],
    genders: [],
    ageRanges: [],
    objectives: ['OUTCOME_TRAFFIC'],
    placements: [],
    creativeTypes: [],
    monthlyBudget: 5_000_000,
    ...overrides,
  };
}

function expectAggregateOnlyBody(request: ForesightSimulatorScenarioExpansionRequest) {
  expect(Object.keys(request.body).sort()).toEqual([
    'ageRanges',
    'budget',
    'creativeTypes',
    'genders',
    'industries',
    'objectives',
    'placements',
  ]);
}

function expectNoSensitiveCopy(value: unknown) {
  const json = JSON.stringify(value);

  expect(json).not.toMatch(/https:\/\/ads\.example\.test/i);
  expect(json).not.toMatch(/access_token=secret-token/i);
  expect(json).not.toMatch(/Bearer secret-token/i);
  expect(json).not.toMatch(/session=abc123/i);
  expect(json).not.toMatch(/private-secret/i);
  expect(json).not.toMatch(/raw-source-row/i);
  expect(json).not.toMatch(/source-row/i);
  expect(json).not.toMatch(/account-123/i);
  expect(json).not.toMatch(/campaign-123/i);
  expect(json).not.toMatch(/ad-123/i);
  expect(json).not.toMatch(/provider-secret-token/i);
}

describe('foresight simulator scenario expansion request contract', () => {
  it('builds the gender expansion request with safe display labels', () => {
    const requests = buildForesightSimulatorScenarioExpansionRequests(buildInput({
      genders: ['male', 'female', 'nonbinary'],
    }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual({
      label: '성별 전체 확장',
      description: '남성/여성/nonbinary → 전체',
      body: {
        industries: ['교육'],
        genders: [],
        ageRanges: [],
        objectives: ['OUTCOME_TRAFFIC'],
        placements: [],
        creativeTypes: [],
        budget: 5_000_000,
      },
    });
    expectAggregateOnlyBody(requests[0]);
  });

  it('builds the age expansion request and keeps regular filter values in the body', () => {
    const requests = buildForesightSimulatorScenarioExpansionRequests(buildInput({
      ageRanges: ['25-34', '35-44'],
    }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual({
      label: '연령 전체 확장',
      description: '25-34, 35-44 → 전체',
      body: {
        industries: ['교육'],
        genders: [],
        ageRanges: [],
        objectives: ['OUTCOME_TRAFFIC'],
        placements: [],
        creativeTypes: [],
        budget: 5_000_000,
      },
    });
    expectAggregateOnlyBody(requests[0]);
  });

  it('builds gender and age expansions together in the page fetch order', () => {
    const requests = buildForesightSimulatorScenarioExpansionRequests(buildInput({
      genders: ['female'],
      ageRanges: ['25-34'],
      monthlyBudget: 7_000_000,
    }));

    expect(requests).toEqual([
      {
        label: '성별 전체 확장',
        description: '여성 → 전체',
        body: {
          industries: ['교육'],
          genders: [],
          ageRanges: ['25-34'],
          objectives: ['OUTCOME_TRAFFIC'],
          placements: [],
          creativeTypes: [],
          budget: 7_000_000,
        },
      },
      {
        label: '연령 전체 확장',
        description: '25-34 → 전체',
        body: {
          industries: ['교육'],
          genders: ['female'],
          ageRanges: [],
          objectives: ['OUTCOME_TRAFFIC'],
          placements: [],
          creativeTypes: [],
          budget: 7_000_000,
        },
      },
    ]);
    requests.forEach(expectAggregateOnlyBody);
  });

  it('builds placement and creative type expansions after demographic expansions', () => {
    const requests = buildForesightSimulatorScenarioExpansionRequests(buildInput({
      genders: ['female'],
      ageRanges: ['25-34'],
      placements: ['Instagram 피드'],
      creativeTypes: ['이미지'],
    }));

    expect(requests.map((request) => request.label)).toEqual([
      '성별 전체 확장',
      '연령 전체 확장',
      '노출 위치 전체 확장',
      '소재 형태 전체 확장',
    ]);
    expect(requests[2]).toEqual({
      label: '노출 위치 전체 확장',
      description: 'Instagram 피드 → 전체',
      body: {
        industries: ['교육'],
        genders: ['female'],
        ageRanges: ['25-34'],
        objectives: ['OUTCOME_TRAFFIC'],
        placements: [],
        creativeTypes: ['이미지'],
        budget: 5_000_000,
      },
    });
    expect(requests[3]).toEqual({
      label: '소재 형태 전체 확장',
      description: '이미지 → 전체',
      body: {
        industries: ['교육'],
        genders: ['female'],
        ageRanges: ['25-34'],
        objectives: ['OUTCOME_TRAFFIC'],
        placements: ['Instagram 피드'],
        creativeTypes: [],
        budget: 5_000_000,
      },
    });
    requests.forEach(expectAggregateOnlyBody);
  });

  it('does not create an industry-only expansion', () => {
    const requests = buildForesightSimulatorScenarioExpansionRequests(buildInput({
      industries: ['교육', '금융'],
      genders: [],
      ageRanges: [],
    }));

    expect(requests).toEqual([]);
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negative', -1],
    ['string', '5000000'],
    ['null', null],
  ])('fails closed for invalid monthly budget: %s', (_label, monthlyBudget) => {
    const requests = buildForesightSimulatorScenarioExpansionRequests(buildInput({
      genders: ['female'],
      monthlyBudget: monthlyBudget as number,
    }));

    expect(requests).toEqual([]);
  });

  it('copies arrays so request bodies cannot mutate the original selections', () => {
    const industries = ['교육'];
    const genders = ['female'];
    const ageRanges = ['25-34'];
    const objectives = ['OUTCOME_TRAFFIC'];
    const placements = ['Instagram 피드'];
    const creativeTypes = ['이미지'];
    const requests = buildForesightSimulatorScenarioExpansionRequests(buildInput({
      industries,
      genders,
      ageRanges,
      objectives,
      placements,
      creativeTypes,
    }));

    expect(requests[0].body.industries).not.toBe(industries);
    expect(requests[0].body.ageRanges).not.toBe(ageRanges);
    expect(requests[0].body.objectives).not.toBe(objectives);
    expect(requests[0].body.placements).not.toBe(placements);
    expect(requests[0].body.creativeTypes).not.toBe(creativeTypes);
    expect(requests[1].body.industries).not.toBe(industries);
    expect(requests[1].body.genders).not.toBe(genders);
    expect(requests[1].body.objectives).not.toBe(objectives);
    expect(requests[1].body.placements).not.toBe(placements);
    expect(requests[1].body.creativeTypes).not.toBe(creativeTypes);

    requests[0].body.industries.push('게임');
    requests[0].body.placements.push('Facebook 스토리');
    requests[1].body.genders.push('nonbinary');
    requests[1].body.creativeTypes.push('동영상');
    industries.push('금융');
    genders.push('male');
    placements.push('Audience Network');
    creativeTypes.push('컬렉션');

    expect(industries).toEqual(['교육', '금융']);
    expect(genders).toEqual(['female', 'male']);
    expect(placements).toEqual(['Instagram 피드', 'Audience Network']);
    expect(creativeTypes).toEqual(['이미지', '컬렉션']);
    expect(requests[0].body.industries).toEqual(['교육', '게임']);
    expect(requests[0].body.placements).toEqual(['Instagram 피드', 'Facebook 스토리']);
    expect(requests[1].body.genders).toEqual(['female', 'nonbinary']);
    expect(requests[1].body.creativeTypes).toEqual(['이미지', '동영상']);
    expect(requests[0].body.industries).not.toContain('금융');
    expect(requests[0].body.placements).not.toContain('Audience Network');
    expect(requests[1].body.genders).not.toContain('male');
    expect(requests[1].body.creativeTypes).not.toContain('컬렉션');
  });

  it('omits secret-like display and body values while preserving regular filter values', () => {
    const requests = buildForesightSimulatorScenarioExpansionRequests(buildInput({
      industries: [
        '교육',
        'https://ads.example.test/account/123?access_token=secret-token',
        'source-row',
      ],
      genders: ['female', 'Bearer secret-token'],
      ageRanges: ['25-34', 'session=abc123', 'ad-123'],
      objectives: ['OUTCOME_TRAFFIC', 'provider-secret-token', 'raw-source-row'],
      placements: ['Instagram 피드', 'https://ads.example.test/placement'],
      creativeTypes: ['이미지', 'creative-123'],
      monthlyBudget: 7_000_000,
    }));

    expect(requests).toHaveLength(4);
    expect(requests[0]).toEqual({
      label: '성별 전체 확장',
      description: '여성 → 전체',
      body: {
        industries: ['교육'],
        genders: [],
        ageRanges: ['25-34'],
        objectives: ['OUTCOME_TRAFFIC'],
        placements: ['Instagram 피드'],
        creativeTypes: ['이미지'],
        budget: 7_000_000,
      },
    });
    expect(requests[1]).toEqual({
      label: '연령 전체 확장',
      description: '25-34 → 전체',
      body: {
        industries: ['교육'],
        genders: ['female'],
        ageRanges: [],
        objectives: ['OUTCOME_TRAFFIC'],
        placements: ['Instagram 피드'],
        creativeTypes: ['이미지'],
        budget: 7_000_000,
      },
    });
    expect(requests[2]).toEqual({
      label: '노출 위치 전체 확장',
      description: 'Instagram 피드 → 전체',
      body: {
        industries: ['교육'],
        genders: ['female'],
        ageRanges: ['25-34'],
        objectives: ['OUTCOME_TRAFFIC'],
        placements: [],
        creativeTypes: ['이미지'],
        budget: 7_000_000,
      },
    });
    expect(requests[3]).toEqual({
      label: '소재 형태 전체 확장',
      description: '이미지 → 전체',
      body: {
        industries: ['교육'],
        genders: ['female'],
        ageRanges: ['25-34'],
        objectives: ['OUTCOME_TRAFFIC'],
        placements: ['Instagram 피드'],
        creativeTypes: [],
        budget: 7_000_000,
      },
    });
    expectNoSensitiveCopy(requests);
    requests.forEach(expectAggregateOnlyBody);
  });
});
