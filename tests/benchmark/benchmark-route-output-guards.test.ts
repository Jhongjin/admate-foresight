import { describe, expect, it } from 'vitest';

import {
  buildForesightBenchmarkUiStateFixtures,
  type BenchmarkTrustState,
} from '../../lib/benchmark/uiStateFixtures.mts';
import {
  BENCHMARK_ROUTE_SAFE_OUTPUT_KEYS,
  buildBenchmarkRouteOutputGuardResults,
} from '../../lib/benchmark/routeOutputGuards';

const REQUIRED_BLOCKED_OUTPUTS: Record<BenchmarkTrustState, string[]> = {
  'benchmark-ready': [
    '벤치마크 가져오기',
    '데이터베이스 반영',
    '외부 생성 요청',
  ],
  'low-confidence': [
    '성과 단정 표현',
    '검토 근거 사유 없는 보고서 내보내기',
  ],
  'long-term-trend-only': [
    '기본 벤치마크 적용',
    '최근 기준과 오래된 기준을 섞은 카드',
  ],
  'validation-error': [
    '저장',
    '벤치마크 반영',
    '모델 사용',
    '보고서 표시',
  ],
  'security-review-required': [
    '정규화 미리보기',
    '벤치마크 반영',
    '보고서 내보내기',
    '외부 생성 요청',
  ],
  'raw-identifier-risk': [
    '원본 식별자 표시',
    '식별자를 포함한 외부 생성 요청',
  ],
  'no-benchmark-data': [
    '예측 임의 생성',
    '빈 소스를 근거처럼 표시',
  ],
};

const FORBIDDEN_RENDERED_OUTPUTS = [
  /acct_mock/i,
  /campaign_mock/i,
  /adset_mock/i,
  /ad_mock/i,
  /advertiser_mock/i,
  /credential_marker/i,
  /access[_-]?token/i,
  /sessionid/i,
  /cookie=/i,
  /https?:\/\//i,
  /[A-Z]:\\/,
  /\/home\//i,
  /\/users\//i,
];

const FORBIDDEN_SAFE_OUTPUT_KEY_PATTERNS = [
  /source[_-]?case/i,
  /reviewer[_-]?actions/i,
  /primary[_-]?surface/i,
  /(?:raw|source)[_-]?(?:rows?|records?|data)/i,
  /url/i,
  /provider/i,
  /token/i,
  /session/i,
  /cookie/i,
  /secret/i,
  /credential/i,
];

const FORBIDDEN_USER_FACING_ROUTE_COPY = /confidence|신뢰도|확신|확정|보장|promise|certainty/i;

function collectKeyPaths(output: unknown, path = 'safeOutput'): string[] {
  if (output === null || typeof output !== 'object') {
    return [];
  }

  if (Array.isArray(output)) {
    return output.flatMap((item, index) =>
      collectKeyPaths(item, `${path}[${index}]`),
    );
  }

  return Object.entries(output as Record<string, unknown>).flatMap(
    ([key, value]) => {
      const keyPath = `${path}.${key}`;

      return [
        keyPath,
        ...collectKeyPaths(value, keyPath),
      ];
    },
  );
}

function collectStringValues(output: unknown): string[] {
  if (typeof output === 'string') {
    return [output];
  }

  if (Array.isArray(output)) {
    return output.flatMap(collectStringValues);
  }

  if (output !== null && typeof output === 'object') {
    return Object.values(output as Record<string, unknown>).flatMap(
      collectStringValues,
    );
  }

  return [];
}

describe('benchmark route output guards', () => {
  it('keeps every route-facing fixture output aggregate-only and local', () => {
    const results = buildBenchmarkRouteOutputGuardResults(
      buildForesightBenchmarkUiStateFixtures(),
    );

    for (const result of results) {
      const serialized = JSON.stringify(result.safeOutput);
      const keyPaths = collectKeyPaths(result.safeOutput);
      const forbiddenKeyPaths = keyPaths.filter((keyPath) =>
        FORBIDDEN_SAFE_OUTPUT_KEY_PATTERNS.some((pattern) =>
          pattern.test(keyPath),
        ),
      );

      expect(result.reportReady).toBe(false);
      expect(result.promotionReady).toBe(false);
      expect(result.unsafeFindings).toEqual([]);
      expect(Object.keys(result.safeOutput)).toEqual(
        BENCHMARK_ROUTE_SAFE_OUTPUT_KEYS,
      );
      expect(forbiddenKeyPaths).toEqual([]);
      expect(result.safeOutput.syntheticContextLabel).toBe(
        '로컬 검증용 예시 데이터',
      );
      expect(collectStringValues(result.safeOutput).join(' ')).not.toMatch(
        FORBIDDEN_USER_FACING_ROUTE_COPY,
      );

      for (const pattern of FORBIDDEN_RENDERED_OUTPUTS) {
        expect(serialized).not.toMatch(pattern);
      }
    }
  });

  it('preserves the approved blocked-output concepts for each trust state', () => {
    const results = buildBenchmarkRouteOutputGuardResults(
      buildForesightBenchmarkUiStateFixtures(),
    );

    for (const result of results) {
      expect(result.safeOutput.blockedOutputs).toEqual(
        expect.arrayContaining(REQUIRED_BLOCKED_OUTPUTS[result.state]),
      );
    }
  });

  it('keeps high-risk states explicitly blocked from preview, LLM, or fabrication paths', () => {
    const results = new Map(
      buildBenchmarkRouteOutputGuardResults(
        buildForesightBenchmarkUiStateFixtures(),
      ).map((result) => [result.state, result]),
    );

    expect(results.get('security-review-required')?.safeOutput.blockedOutputs)
      .toEqual(expect.arrayContaining(['정규화 미리보기', '외부 생성 요청']));
    expect(results.get('raw-identifier-risk')?.safeOutput.blockedOutputs)
      .toEqual(expect.arrayContaining(['원본 식별자 표시']));
    expect(results.get('no-benchmark-data')?.safeOutput.blockedOutputs)
      .toEqual(expect.arrayContaining(['예측 임의 생성']));
  });
});
