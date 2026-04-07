import { NextResponse } from 'next/server';
import { getIndustries, getAgeRanges } from '@/lib/csvLoader';
import { getObjectives, getXlsxIndustries, getAvailableMonths } from '@/lib/xlsxLoader';

export async function GET() {
  try {
    const csvIndustries = getIndustries();
    const xlsxIndustries = getXlsxIndustries();
    const allIndustries = [...new Set([...csvIndustries, ...xlsxIndustries])].sort();
    const ageRanges = getAgeRanges();
    const genders = ['male', 'female'];
    const objectives = getObjectives();
    const months = getAvailableMonths();

    return NextResponse.json({ industries: allIndustries, ageRanges, genders, objectives, months });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load filters' }, { status: 500 });
  }
}
