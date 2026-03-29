import { NextResponse } from 'next/server';
import { getIndustries, getAgeRanges } from '@/lib/csvLoader';

export async function GET() {
  try {
    const industries = getIndustries();
    const ageRanges = getAgeRanges();
    const genders = ['male', 'female'];

    return NextResponse.json({ industries, ageRanges, genders });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load filters' }, { status: 500 });
  }
}
