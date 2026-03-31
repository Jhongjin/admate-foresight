import { NextResponse } from 'next/server';
import { getIndustries, getAgeRanges } from '@/lib/csvLoader';
import { getObjectives, getXlsxIndustries } from '@/lib/xlsxLoader';

export async function GET() {
  try {
    const csvIndustries = getIndustries();
    const xlsxIndustries = getXlsxIndustries();
    // 두 소스의 업종 합치기 (중복 제거)
    const allIndustries = [...new Set([...csvIndustries, ...xlsxIndustries])].sort();
    const ageRanges = getAgeRanges();
    const genders = ['male', 'female'];
    const objectives = getObjectives();

    return NextResponse.json({ industries: allIndustries, ageRanges, genders, objectives });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load filters' }, { status: 500 });
  }
}
