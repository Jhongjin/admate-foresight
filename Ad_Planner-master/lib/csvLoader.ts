import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export interface AdRecord {
  업종: string;
  광고이름: string;
  연령: string;
  성별: string;
  광고게재: string;
  도달: number;
  노출: number;
  클릭: number;
  CPC: number;
  지출금액: number;
  시작: string;
  종료: string;
  CTR: number;
  CPM: number;
  보고시작: string;
  보고종료: string;
}

let cachedData: AdRecord[] | null = null;

export function loadAdData(): AdRecord[] {
  if (cachedData) return cachedData;

  const filePath = path.join(process.cwd(), 'data', '뷰티_식음료.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const result = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  cachedData = result.data.map((row) => ({
    업종: row['업종']?.trim() ?? '',
    광고이름: row['광고 이름']?.trim() ?? '',
    연령: row['연령']?.trim() ?? '',
    성별: row['성']?.trim() ?? '',
    광고게재: row['광고 게재']?.trim() ?? '',
    도달: parseFloat(row['도달']) || 0,
    노출: parseFloat(row['노출']) || 0,
    클릭: parseFloat(row['클릭(전체)']) || 0,
    CPC: parseFloat(row['CPC(전체)']) || 0,
    지출금액: parseFloat(row['지출 금액 (KRW)']) || 0,
    시작: row['시작']?.trim() ?? '',
    종료: row['종료']?.trim() ?? '',
    CTR: parseFloat(row['CTR(전체)']) || 0,
    CPM: parseFloat(row['CPM(1,000회 노출당 비용)']) || 0,
    보고시작: row['보고 시작']?.trim() ?? '',
    보고종료: row['보고 종료']?.trim() ?? '',
  }));

  return cachedData;
}

export function getIndustries(): string[] {
  const data = loadAdData();
  const industries = [...new Set(data.map((r) => r.업종).filter(Boolean))];
  return industries.sort();
}

export function getAgeRanges(): string[] {
  const order = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const data = loadAdData();
  const ages = [...new Set(data.map((r) => r.연령).filter(Boolean))];
  return ages.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export function getCampaignGoals(): string[] {
  const data = loadAdData();
  const goals = [...new Set(data.map((r) => r.광고이름).filter(Boolean))];
  return goals.sort();
}
