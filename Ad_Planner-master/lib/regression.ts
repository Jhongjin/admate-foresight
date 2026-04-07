/**
 * lib/regression.ts
 *
 * Ridge OLS 회귀 모델 (CPM / CPC / VTR)
 *
 * 설계:
 *  - 더미 변수: 업종, 성별, 연령, 월(YYYY-MM), 시즌(설명절±14d, 밸런타인±14d)
 *  - 종속변수: log(CPM), log(CPC), log(VTR%)  → exp() 로 역변환
 *  - 가중치: sqrt(지출금액)  (큰 캠페인에 더 많은 영향력)
 *  - Ridge 패널티: λ = 0.5 (다중공선성 완화, 절편 제외)
 *
 * 예측:
 *  선택된 업종·성별·연령 각각의 더미를 평균하여 "혼합 조건" 특성 벡터를 구성
 *  → log 예측값 → exp → 실제 단위
 */

import { loadXlsxData, XlsxRecord } from './xlsxLoader';

// ─── 시즌 이벤트 창 ────────────────────────────────────
interface SeasonWindow {
  id: string;
  start: string; // YYYY-MM-DD (이벤트 중심 - 14일)
  end: string;   // YYYY-MM-DD (이벤트 중심 + 14일)
}

const SEASON_WINDOWS: SeasonWindow[] = [
  // 설명절 2026-02-14~18: 창 2026-01-31 ~ 2026-03-04
  { id: 'seollal',    start: '2026-01-31', end: '2026-03-04' },
  // 밸런타인 2026-02-14: 창 2026-01-31 ~ 2026-02-28
  { id: 'valentine',  start: '2026-01-31', end: '2026-02-28' },
];

// ─── 순수 TS 행렬 연산 ────────────────────────────────
// Ridge WLS: (X'WX + λΛ) β = X'Wy
// W = diag(weights), Λ = diag([0,1,1,...]) (절편 미패널티)
function fitRidgeWLS(
  X: number[][],   // [n × p]
  y: number[],     // [n]
  w: number[],     // [n] ≥ 0 가중치
  lambda: number,
): number[] {
  const n = X.length;
  const p = X[0].length;

  // X'WX [p×p], X'Wy [p]
  const XtWX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const XtWy: number[] = new Array(p).fill(0);

  for (let i = 0; i < n; i++) {
    const wi = w[i];
    if (wi === 0) continue;
    for (let j = 0; j < p; j++) {
      const xij = X[i][j];
      if (xij === 0) continue;
      XtWy[j] += wi * xij * y[i];
      for (let k = j; k < p; k++) {
        const val = wi * xij * X[i][k];
        XtWX[j][k] += val;
        if (k !== j) XtWX[k][j] += val;
      }
    }
  }

  // Ridge 패널티 (절편=0번 인덱스는 제외)
  for (let j = 1; j < p; j++) XtWX[j][j] += lambda;

  return solveGaussian(XtWX, XtWy);
}

// Gauss-Jordan 소거법 (부분 피벗)
function solveGaussian(A: number[][], b: number[]): number[] {
  const n = A.length;
  // 증강행렬 [A | b]
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // 최대 피벗 행 탐색
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) continue; // 열이 완전히 0이면 스킵

    // 전체 행에 대해 소거 (Gauss-Jordan: 위·아래 모두)
    for (let row = 0; row < n; row++) {
      if (row === col || M[row][col] === 0) continue;
      const factor = M[row][col] / pivot;
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
    }
  }

  return M.map((row, i) => (row[n] / (row[i] || 1)));
}

// R² (가중치 적용)
function weightedR2(y: number[], yHat: number[], w: number[]): number {
  const wSum = w.reduce((s, wi) => s + wi, 0);
  if (wSum === 0) return 0;
  const yBar = y.reduce((s, yi, i) => s + w[i] * yi, 0) / wSum;
  const ssTot = y.reduce((s, yi, i) => s + w[i] * (yi - yBar) ** 2, 0);
  const ssRes = y.reduce((s, yi, i) => s + w[i] * (yi - yHat[i]) ** 2, 0);
  return ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
}

// ─── 카테고리 & 피처 구조 ─────────────────────────────
export interface ModelCategories {
  industries: string[]; // 정렬됨, [0] = 참조 카테고리
  genders: string[];
  ageRanges: string[];
  months: string[];     // YYYY-MM 정렬, [0] = 참조(최초 월)
}

export interface FittedModel {
  beta: number[];        // 회귀계수 벡터 (intercept 포함)
  featureNames: string[];
  r2: number;
  nObs: number;
  lambda: number;
}

export interface RegressionBundle {
  cpm: FittedModel;
  cpc: FittedModel;
  vtr: FittedModel;
  cpcLink: FittedModel;
  cats: ModelCategories;
}

let cachedBundle: RegressionBundle | null = null;

// ─── 설계 행렬 구성 ────────────────────────────────────
function buildRow(
  r: XlsxRecord,
  cats: ModelCategories,
): number[] {
  const { industries, genders, ageRanges, months } = cats;
  const feat: number[] = [1]; // 절편

  // 업종 더미 (참조: industries[0])
  for (let i = 1; i < industries.length; i++) {
    feat.push(r.업종 === industries[i] ? 1 : 0);
  }
  // 성별 더미 (참조: genders[0])
  for (let i = 1; i < genders.length; i++) {
    feat.push(r.성별 === genders[i] ? 1 : 0);
  }
  // 연령 더미 (참조: ageRanges[0])
  for (let i = 1; i < ageRanges.length; i++) {
    feat.push(r.연령 === ageRanges[i] ? 1 : 0);
  }
  // 월 더미 (참조: months[0])
  const rowMonth = r.날짜.slice(0, 7);
  for (let i = 1; i < months.length; i++) {
    feat.push(rowMonth === months[i] ? 1 : 0);
  }
  // 시즌 더미
  for (const sw of SEASON_WINDOWS) {
    feat.push(r.날짜 >= sw.start && r.날짜 <= sw.end ? 1 : 0);
  }

  return feat;
}

function featureNames(cats: ModelCategories): string[] {
  const { industries, genders, ageRanges, months } = cats;
  return [
    'intercept',
    ...industries.slice(1).map(v => `ind_${v}`),
    ...genders.slice(1).map(v => `gen_${v}`),
    ...ageRanges.slice(1).map(v => `age_${v}`),
    ...months.slice(1).map(v => `mon_${v}`),
    ...SEASON_WINDOWS.map(sw => `season_${sw.id}`),
  ];
}

// ─── 모델 피팅 (서버 시작 시 1회) ────────────────────
export function fitRegressionModels(): RegressionBundle {
  if (cachedBundle) return cachedBundle;

  const data = loadXlsxData();

  // 카테고리 추출
  const AGE_ORDER = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const cats: ModelCategories = {
    industries: [...new Set(data.map(r => r.업종).filter(Boolean))].sort(),
    genders:    [...new Set(data.map(r => r.성별).filter(Boolean))].sort(),
    ageRanges:  AGE_ORDER.filter(a => data.some(r => r.연령 === a)),
    months:     [...new Set(
      data.map(r => r.날짜.slice(0, 7)).filter(m => /^\d{4}-\d{2}$/.test(m))
    )].sort(),
  };

  const fn = featureNames(cats);
  const LAMBDA = 0.5;

  function fitOne(
    records: XlsxRecord[],
    yFn: (r: XlsxRecord) => number,
    wFn: (r: XlsxRecord) => number,
  ): FittedModel {
    const X = records.map(r => buildRow(r, cats));
    const y = records.map(yFn);
    const w = records.map(wFn);
    const beta = fitRidgeWLS(X, y, w, LAMBDA);
    const yHat = X.map(row => row.reduce((s, x, j) => s + x * beta[j], 0));
    const r2 = weightedR2(y, yHat, w);
    return { beta, featureNames: fn, r2, nObs: records.length, lambda: LAMBDA };
  }

  const sqrtSpend = (r: XlsxRecord) => Math.sqrt(Math.max(r.지출금액, 1));

  // CPM 모델: CPM > 0인 모든 행
  const cpmRecs = data.filter(r => r.CPM > 0);
  const cpmModel = fitOne(cpmRecs, r => Math.log(r.CPM), sqrtSpend);

  // CPC(전체) 모델: CPC > 0인 행
  const cpcRecs = data.filter(r => r.CPC > 0);
  const cpcModel = fitOne(cpcRecs, r => Math.log(r.CPC), sqrtSpend);

  // CPC(링크) 모델: CPC링크 > 0인 행
  const cpcLinkRecs = data.filter(r => r.CPC링크 > 0);
  const cpcLinkModel = fitOne(cpcLinkRecs, r => Math.log(r.CPC링크), sqrtSpend);

  // VTR 모델: 영상 노출 > 0인 행
  const vtrRecs = data.filter(r => r.영상조회수 > 0 && r.노출 > 0);
  const vtrModel = fitOne(
    vtrRecs,
    r => Math.log(r.영상조회수 / r.노출),
    sqrtSpend,
  );

  cachedBundle = { cpm: cpmModel, cpc: cpcModel, cpcLink: cpcLinkModel, vtr: vtrModel, cats };

  // 서버 로그로 R² 출력
  console.log(
    `[Regression] CPM R²=${cpmModel.r2.toFixed(3)} (n=${cpmModel.nObs}),`,
    `CPC R²=${cpcModel.r2.toFixed(3)} (n=${cpcModel.nObs}),`,
    `VTR R²=${vtrModel.r2.toFixed(3)} (n=${vtrModel.nObs})`,
  );

  return cachedBundle;
}

// ─── 예측용 특성 벡터 구성 ───────────────────────────
// 선택된 값이 여러 개일 때: 더미 비율 평균 (혼합 조건)
// 예) 업종=['뷰티','식음료'] → 뷰티 더미=0.5, 식음료 더미=0.5
function buildPredictRow(
  cats: ModelCategories,
  selIndustries: string[],
  selGenders: string[],
  selAgeRanges: string[],
  selMonth?: string,
): number[] {
  const { industries, genders, ageRanges, months } = cats;

  const feat: number[] = [1]; // 절편

  // 업종 더미 평균
  const indSel = selIndustries.length > 0 ? selIndustries : industries;
  for (let i = 1; i < industries.length; i++) {
    feat.push(indSel.filter(v => v === industries[i]).length / indSel.length);
  }

  // 성별 더미 평균
  const genSel = selGenders.length > 0 ? selGenders : genders;
  for (let i = 1; i < genders.length; i++) {
    feat.push(genSel.filter(v => v === genders[i]).length / genSel.length);
  }

  // 연령 더미 평균
  const ageSel = selAgeRanges.length > 0 ? selAgeRanges : ageRanges;
  for (let i = 1; i < ageRanges.length; i++) {
    feat.push(ageSel.filter(v => v === ageRanges[i]).length / ageSel.length);
  }

  // 월 더미
  for (let i = 1; i < months.length; i++) {
    feat.push(selMonth && selMonth === months[i] ? 1 : (!selMonth ? 1 / months.length : 0));
  }

  // 시즌 더미: 선택 월이 시즌 창과 겹치는 비율
  for (const sw of SEASON_WINDOWS) {
    let val = 0;
    if (selMonth) {
      const mStart = `${selMonth}-01`;
      const nextM = new Date(
        parseInt(selMonth.slice(0, 4)),
        parseInt(selMonth.slice(5, 7)), // month (1-indexed → JS 0-indexed + 1 = next month)
        1,
      );
      const mEnd = new Date(nextM.getTime() - 86400000); // 말일
      const mEndStr = mEnd.toISOString().slice(0, 10);
      const daysInMonth = mEnd.getDate();

      if (mStart <= sw.end && mEndStr >= sw.start) {
        const overlapStart = mStart > sw.start ? mStart : sw.start;
        const overlapEnd   = mEndStr < sw.end   ? mEndStr : sw.end;
        const overlapDays =
          (new Date(overlapEnd).getTime() - new Date(overlapStart).getTime()) / 86400000 + 1;
        val = Math.max(0, overlapDays) / daysInMonth;
      }
    }
    feat.push(val);
  }

  return feat;
}

// ─── 공개 예측 함수 ───────────────────────────────────
export interface RegPredictResult {
  cpm: number;
  cpc: number;
  cpcLink: number;
  vtr: number;      // VTR % (0~100)
  r2Cpm: number;
  r2Cpc: number;
  r2VTR: number;
  modelUsed: true;
}

export function predictByRegression(
  selIndustries: string[],
  selGenders: string[],
  selAgeRanges: string[],
  selMonth?: string,
): RegPredictResult {
  const bundle = fitRegressionModels();
  const { cats } = bundle;

  const feat = buildPredictRow(cats, selIndustries, selGenders, selAgeRanges, selMonth);

  function dotBeta(model: FittedModel): number {
    return feat.reduce((s, f, j) => s + f * (model.beta[j] ?? 0), 0);
  }

  const logCpm     = dotBeta(bundle.cpm);
  const logCpc     = dotBeta(bundle.cpc);
  const logCpcLink = dotBeta(bundle.cpcLink);
  const logVtr     = dotBeta(bundle.vtr);

  return {
    cpm:     Math.round(Math.exp(logCpm)),
    cpc:     Math.round(Math.exp(logCpc)),
    cpcLink: Math.round(Math.exp(logCpcLink)),
    vtr:     Math.round(Math.exp(logVtr) * 10000) / 100, // fraction → % (소수점 2자리)
    r2Cpm:   bundle.cpm.r2,
    r2Cpc:   bundle.cpc.r2,
    r2VTR:   bundle.vtr.r2,
    modelUsed: true,
  };
}

/** 회귀 모델 요약 (디버그·스프레드시트용) */
export function getRegressionSummary(): object {
  const bundle = fitRegressionModels();
  const fmt = (m: FittedModel) => ({
    r2: parseFloat(m.r2.toFixed(4)),
    nObs: m.nObs,
    lambda: m.lambda,
    coefficients: Object.fromEntries(
      m.featureNames.map((name, i) => [name, parseFloat(m.beta[i]?.toFixed(4) ?? '0')])
    ),
  });
  return {
    cpm:     fmt(bundle.cpm),
    cpc:     fmt(bundle.cpc),
    cpcLink: fmt(bundle.cpcLink),
    vtr:     fmt(bundle.vtr),
    categories: bundle.cats,
  };
}
