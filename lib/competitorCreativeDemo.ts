export interface CompetitorCreativeDemoAd {
  id: string;
  advertiser: string;
  category: string;
  message: string;
  cta: string;
  format: string;
  sourceLabel: string;
  observedWindow: string;
  flowSignal: string;
  evidenceLevel: string;
}

export interface CompetitorCreativeDemoResult {
  ads: CompetitorCreativeDemoAd[];
  searchTerm: string;
  searchLabel: string;
  mode: 'industry_demo' | 'keyword_demo' | 'broadened_demo';
  total: number;
}

const SENSITIVE_LOOKUP_PATTERN =
  /(access[_-]?token|sessionid|cookie=|bearer\s+|secret|api[_-]?key|x-admate-internal-key|[A-Za-z0-9._~+/=-]{32,})/i;

const DEMO_ADS: CompetitorCreativeDemoAd[] = [
  {
    id: 'demo-beauty-routine-01',
    advertiser: '익명 뷰티 브랜드 A',
    category: '뷰티',
    message: '피부 고민을 한 문장으로 좁히고 사용 루틴을 짧은 영상으로 반복 노출합니다.',
    cta: '루틴 확인',
    format: 'Short-form video',
    sourceLabel: 'Demo fallback: Meta Ad Library style',
    observedWindow: '최근 30일 흐름 예시',
    flowSignal: '성분보다 사용 장면과 전후 루틴을 먼저 보여줌',
    evidenceLevel: 'Anonymized demo',
  },
  {
    id: 'demo-food-launch-01',
    advertiser: '익명 식음료 브랜드 B',
    category: '식음료',
    message: '신제품의 맛 표현을 전면에 두고 한정 기간 혜택을 보조 메시지로 붙입니다.',
    cta: '신제품 보기',
    format: 'Carousel',
    sourceLabel: 'Demo fallback: Meta Ad Library style',
    observedWindow: '최근 30일 흐름 예시',
    flowSignal: '제품 클로즈업, 맛 키워드, 기간성 혜택이 함께 반복됨',
    evidenceLevel: 'Anonymized demo',
  },
  {
    id: 'demo-finance-trust-01',
    advertiser: '익명 금융 서비스 C',
    category: '금융',
    message: '수수료와 편의성을 직접 비교하기보다 신뢰 장치와 상담 흐름을 강조합니다.',
    cta: '상담 신청',
    format: 'Static image',
    sourceLabel: 'Demo fallback: Meta Ad Library style',
    observedWindow: '최근 60일 흐름 예시',
    flowSignal: '혜택 단정 표현보다 검토, 상담, 기준 확인 문구를 사용',
    evidenceLevel: 'Anonymized demo',
  },
  {
    id: 'demo-travel-season-01',
    advertiser: '익명 여행 플랫폼 D',
    category: '관광/레저',
    message: '여행지를 크게 보여준 뒤 시즌 키워드와 예약 편의성을 짧게 연결합니다.',
    cta: '일정 둘러보기',
    format: 'Collection',
    sourceLabel: 'Demo fallback: Meta Ad Library style',
    observedWindow: '성수기 전환 흐름 예시',
    flowSignal: '장소 이미지, 시즌성, 예약 행동 유도가 한 화면에 묶임',
    evidenceLevel: 'Anonymized demo',
  },
  {
    id: 'demo-retail-promo-01',
    advertiser: '익명 유통 브랜드 E',
    category: '유통',
    message: '카테고리 할인보다 오늘의 추천 상품과 장바구니 행동을 먼저 제안합니다.',
    cta: '상품 확인',
    format: 'Product grid',
    sourceLabel: 'Demo fallback: Meta Ad Library style',
    observedWindow: '프로모션 주간 흐름 예시',
    flowSignal: '가격 단정 대신 큐레이션, 추천, 기간성 메시지를 조합',
    evidenceLevel: 'Anonymized demo',
  },
  {
    id: 'demo-education-lead-01',
    advertiser: '익명 교육 서비스 F',
    category: '교육',
    message: '결과 보장을 말하지 않고 학습 진단, 커리큘럼, 상담 신청 흐름으로 설득합니다.',
    cta: '진단 받기',
    format: 'Lead form',
    sourceLabel: 'Demo fallback: Meta Ad Library style',
    observedWindow: '상담 캠페인 흐름 예시',
    flowSignal: '무료 진단과 상담 CTA가 반복되며 성과 보장 표현은 배제',
    evidenceLevel: 'Anonymized demo',
  },
  {
    id: 'demo-electronics-feature-01',
    advertiser: '익명 전자 브랜드 G',
    category: '전자',
    message: '스펙 전체보다 사용 상황별 핵심 기능을 하나씩 분리해 보여줍니다.',
    cta: '기능 보기',
    format: 'Reels cutdown',
    sourceLabel: 'Demo fallback: Meta Ad Library style',
    observedWindow: '제품 출시 흐름 예시',
    flowSignal: '기능별 짧은 소재를 여러 개로 쪼개 테스트하는 패턴',
    evidenceLevel: 'Anonymized demo',
  },
  {
    id: 'demo-game-prelaunch-01',
    advertiser: '익명 게임 브랜드 H',
    category: '게임',
    message: '캐릭터와 보상보다 사전예약 마감 시점과 플레이 장면을 빠르게 교차합니다.',
    cta: '사전예약',
    format: 'Video',
    sourceLabel: 'Demo fallback: Meta Ad Library style',
    observedWindow: '출시 전 흐름 예시',
    flowSignal: '마감 임박, 플레이 컷, 예약 CTA가 반복됨',
    evidenceLevel: 'Anonymized demo',
  },
];

function isSafeLookupText(value: string): boolean {
  return Boolean(value.trim()) && !SENSITIVE_LOOKUP_PATTERN.test(value);
}

function normalizeIndustry(industry: string): string {
  return industry === '전체업종' || industry === '전체' ? '' : industry.trim();
}

export function toSafeCompetitorLookupText(value: string, fallback = ''): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return isSafeLookupText(trimmed) ? trimmed.slice(0, 40) : fallback;
}

export function resolveCompetitorCreativeDemo(input: {
  industry?: string;
  keyword?: string;
  limit?: number;
} = {}): CompetitorCreativeDemoResult {
  const limit = Math.min(Math.max(input.limit ?? 9, 1), 12);
  const industry = normalizeIndustry(input.industry ?? '');
  const keyword = toSafeCompetitorLookupText(input.keyword ?? '');
  const lookup = keyword || industry;

  const matched = lookup
    ? DEMO_ADS.filter((ad) => {
        const haystack = [
          ad.advertiser,
          ad.category,
          ad.message,
          ad.cta,
          ad.format,
          ad.flowSignal,
        ].join(' ');
        return haystack.toLowerCase().includes(lookup.toLowerCase());
      })
    : DEMO_ADS;

  const ads = (matched.length > 0 ? matched : DEMO_ADS).slice(0, limit);
  const mode = keyword
    ? matched.length > 0
      ? 'keyword_demo'
      : 'broadened_demo'
    : industry
      ? matched.length > 0
        ? 'industry_demo'
        : 'broadened_demo'
      : 'industry_demo';

  return {
    ads,
    searchTerm: keyword || industry || '전체업종',
    searchLabel: keyword
      ? '직접 입력 검색어'
      : industry || '전체업종',
    mode,
    total: ads.length,
  };
}
