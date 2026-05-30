export interface ForesightSimulatorScenarioExpansionRequestBody {
  industries: string[];
  genders: string[];
  ageRanges: string[];
  objectives: string[];
  budget: number;
}

export interface ForesightSimulatorScenarioExpansionRequest {
  label: '성별 전체 확장' | '연령 전체 확장';
  description: string;
  body: ForesightSimulatorScenarioExpansionRequestBody;
}

export interface BuildForesightSimulatorScenarioExpansionRequestsInput {
  industries: readonly string[];
  genders: readonly string[];
  ageRanges: readonly string[];
  objectives: readonly string[];
  monthlyBudget: number;
}

const FORBIDDEN_REQUEST_COPY_PATTERNS = [
  /https?:\/\//i,
  /\bwww\./i,
  /\bact_\d+\b/i,
  /\b(?:account|campaign|provider)\b/i,
  /\b(?:account|campaign|adset|provider|creative)[_-]?(?:id|token|secret|cookie|session)\b/i,
  /\bad[_-]?id\b/i,
  /\b(?:account|campaign|adset|provider|creative)[_-][a-z0-9][a-z0-9_-]{2,}\b/i,
  /\bad[_-][a-z0-9][a-z0-9_-]{2,}\b/i,
  /\b(?:access|refresh|id)?[_-]?token\b/i,
  /\bbearer\s+\S+/i,
  /\bcookie\b/i,
  /\bsession\b/i,
  /\bsecret\b/i,
  /\bcredential\b/i,
  /\b(?:raw|source)[_-]?(?:row|rows|record|records|data)?\b/i,
];

function hasSafeBudget(monthlyBudget: number): boolean {
  return typeof monthlyBudget === 'number'
    && Number.isFinite(monthlyBudget)
    && monthlyBudget >= 0;
}

function isSafeRequestValue(value: string): boolean {
  return !FORBIDDEN_REQUEST_COPY_PATTERNS.some((pattern) => pattern.test(value));
}

function copySafeRequestValues(values: readonly string[]): string[] {
  return values.filter((value) => isSafeRequestValue(value));
}

function describeGender(value: string): string | null {
  if (value === 'male') return '남성';
  if (value === 'female') return '여성';
  if (!isSafeRequestValue(value)) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function describeValues(values: readonly string[], fallback: string): string {
  const safeValues = values
    .filter((value) => isSafeRequestValue(value))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return safeValues.length > 0 ? safeValues.join(', ') : fallback;
}

function buildBody(
  params: {
    industries: readonly string[];
    genders: readonly string[];
    ageRanges: readonly string[];
    objectives: readonly string[];
    budget: number;
  },
): ForesightSimulatorScenarioExpansionRequestBody {
  return {
    industries: copySafeRequestValues(params.industries),
    genders: copySafeRequestValues(params.genders),
    ageRanges: copySafeRequestValues(params.ageRanges),
    objectives: copySafeRequestValues(params.objectives),
    budget: params.budget,
  };
}

export function buildForesightSimulatorScenarioExpansionRequests(
  input: BuildForesightSimulatorScenarioExpansionRequestsInput,
): ForesightSimulatorScenarioExpansionRequest[] {
  if (!hasSafeBudget(input.monthlyBudget)) return [];

  const requests: ForesightSimulatorScenarioExpansionRequest[] = [];

  if (input.genders.length > 0) {
    const genderDescription = input.genders
      .map(describeGender)
      .filter((value): value is string => value !== null)
      .join('/');

    requests.push({
      label: '성별 전체 확장',
      description: `${genderDescription || '선택 성별'} → 전체`,
      body: buildBody({
        industries: input.industries,
        genders: [],
        ageRanges: input.ageRanges,
        objectives: input.objectives,
        budget: input.monthlyBudget,
      }),
    });
  }

  if (input.ageRanges.length > 0) {
    requests.push({
      label: '연령 전체 확장',
      description: `${describeValues(input.ageRanges, '선택 연령')} → 전체`,
      body: buildBody({
        industries: input.industries,
        genders: input.genders,
        ageRanges: [],
        objectives: input.objectives,
        budget: input.monthlyBudget,
      }),
    });
  }

  return requests;
}
