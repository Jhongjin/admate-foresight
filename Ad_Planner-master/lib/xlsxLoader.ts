import path from 'path';
import * as XLSX from 'xlsx';

export interface XlsxRecord {
  업종: string;
  캠페인이름: string;
  목표: string;
  최적화목표: string;
  성별: string;
  연령: string;
  도달: number;
  노출: number;
  지출금액: number;
  빈도: number;
  CPM: number;
  CPC: number;       // CPC(전체) = spend / clicks(all)
  CPC링크: number;   // CPC(링크) = cost_per_action_type.link_click
  영상조회수: number; // video_view (3초 조회수)
  영상조회비용: number; // cost_per_action_type.video_view (3초 조회당 비용)
  날짜: string;
}

/** Python 스타일 단따옴표 JSON 파싱 */
function parseActionMap(str: string | undefined): Record<string, number> {
  if (!str || str === 'nan') return {};
  try {
    const fixed = str.replace(/'/g, '"');
    const arr = JSON.parse(fixed) as Array<{ action_type: string; value: string }>;
    const map: Record<string, number> = {};
    for (const item of arr) map[item.action_type] = parseFloat(item.value) || 0;
    return map;
  } catch {
    return {};
  }
}

// 업종명 정규화 맵 (유사 업종 통합)
const INDUSTRY_NORMALIZE: Record<string, string> = {
  '기관.ver2':       '기관/단체',
  '생활잡화':        '생활/잡화',
  '생활잡화 공구':   '생활/잡화',
  '식음료(에너지바)': '식음료',
  '의약':            '의약/건기식',
  '의료/건강':       '의약/건기식',
};

// 의미 없는 업종값 판별 (협력광고 계정명 전체가 들어온 경우 등)
const INVALID_INDUSTRY = new Set(['CQR', 'PublickaX', 'W컨셉 VOD 홍보']);

function extractIndustry(accountName: string): string {
  if (!accountName) return '';
  const clean = accountName.trim();
  // 마지막 '_' 뒤 단어를 업종으로 추출
  const parts = clean.split('_');
  const raw = parts[parts.length - 1].trim();

  // 너무 길거나 유효하지 않은 값은 기타로 처리
  if (raw.length > 20 || INVALID_INDUSTRY.has(raw) || raw.includes('협력광고')) {
    return '기타';
  }

  // 정규화 맵 적용
  return INDUSTRY_NORMALIZE[raw] ?? raw;
}

let cachedXlsxData: XlsxRecord[] | null = null;

export function loadXlsxData(): XlsxRecord[] {
  if (cachedXlsxData) return cachedXlsxData;

  const filePath = path.join(process.cwd(), 'data', 'Meta_Total_Accounts_Daily_Report_0330_01.xlsx');
  const workbook = XLSX.readFile(filePath);
  const ws = workbook.Sheets['Sheet1'];
  const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

  cachedXlsxData = raw
    .map((row) => {
      const costMap = parseActionMap(row['cost_per_action_type']);
      return {
        업종: extractIndustry(row['ad_account_name'] ?? ''),
        캠페인이름: row['campaign_name']?.trim() ?? '',
        목표: row['objective']?.trim() ?? '',
        최적화목표: row['optimization_goal']?.trim() ?? '',
        성별: row['gender']?.trim() ?? '',
        연령: row['age']?.trim() ?? '',
        도달: parseFloat(row['reach']) || 0,
        노출: parseFloat(row['impressions']) || 0,
        지출금액: parseFloat(row['spend']) || 0,
        빈도: parseFloat(row['frequency']) || 0,
        CPM: parseFloat(row['cpm']) || 0,
        CPC: parseFloat(row['cpc']) || 0,
        CPC링크: costMap['link_click'] ?? 0,
        영상조회수: parseFloat(row['video_view']) || 0,
        영상조회비용: costMap['video_view'] ?? 0,
        날짜: row['date_start']?.trim() ?? '',
      };
    })
    .filter((r) => r.도달 > 0 && r.노출 > 0 && r.CPM > 0);

  return cachedXlsxData;
}

export function getObjectives(): string[] {
  const data = loadXlsxData();
  const objectives = [...new Set(data.map((r) => r.목표).filter(Boolean))];
  return objectives.sort();
}

export function getXlsxIndustries(): string[] {
  const data = loadXlsxData();
  const industries = [...new Set(data.map((r) => r.업종).filter(Boolean))];
  return industries.sort();
}
