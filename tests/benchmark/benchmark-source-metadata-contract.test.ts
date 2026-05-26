import { describe, expect, it } from 'vitest';

import {
  runBenchmarkDryRun,
  type BenchmarkDryRunInput,
  type SourceRow,
  type SourceType,
} from '../../lib/benchmark/dryRunHarness.mts';

const VALID_SOURCE_TYPES: SourceType[] = ['dashboard_export', 'meta_api_export'];
const METADATA_ACCEPTED_SOURCE_COLUMNS = ['platform', 'source_type', 'currency'];

function rows(overrides: Partial<SourceRow> = {}): SourceRow[] {
  return [
    {
      platform: 'meta',
      date_start: '2026-04-01',
      date_stop: '2026-04-07',
      objective: 'traffic',
      optimization_goal: 'link_clicks',
      spend: 120000,
      currency: 'KRW',
      impressions: 80000,
      clicks: 1600,
      reach: 52000,
      ...overrides,
    },
    {
      platform: 'meta',
      date_start: '2026-04-08',
      date_stop: '2026-04-14',
      objective: 'traffic',
      optimization_goal: 'link_clicks',
      spend: 130000,
      currency: 'KRW',
      impressions: 85000,
      clicks: 1700,
      reach: 55000,
      ...overrides,
    },
  ];
}

function inputWithSourceType(sourceType: SourceType): BenchmarkDryRunInput {
  return {
    case_name: 'source_metadata_contract',
    file_name: 'source_metadata_contract.inline',
    file_type: 'inline_mock',
    as_of_date: '2026-05-07',
    metadata: {
      platform: 'meta',
      source_type: sourceType,
      exported_at: '2026-05-07',
      timezone: 'Asia/Seoul',
      currency: 'KRW',
      net_or_gross: 'net',
      markup_policy: 'included',
      aggregation_level: 'daily',
      uploader: 'local_contract_fixture',
      approval_status: 'draft',
    },
    sheets: [{ name: 'benchmark_upload', rows: rows() }],
  };
}

describe('benchmark source metadata contract', () => {
  it('fails closed on invalid metadata source_type without echoing the raw value', () => {
    const invalidSourceType = 'raw_invalid_source_type_42';
    const report = runBenchmarkDryRun({
      ...inputWithSourceType('dashboard_export'),
      metadata: {
        ...inputWithSourceType('dashboard_export').metadata,
        source_type: invalidSourceType as unknown as SourceType,
      },
      sheets: [{
        name: 'benchmark_upload',
        rows: rows({ source_type: invalidSourceType }),
      }],
    });

    expect(report.mapping_report.validation_status).toBe('failed');
    expect(report.mapping_report.source_type).toBe('missing');
    expect(report.missing_required_fields.map((field) => field.canonical_field))
      .toContain('source_type');
    expect(report.accepted_columns.some((column) => column.canonical_field === 'source_type'))
      .toBe(false);
    expect(report.normalized_preview_sample.every((sample) => sample.source_type === 'missing'))
      .toBe(true);
    expect(JSON.stringify(report)).not.toContain(invalidSourceType);
  });

  it('accepts each allowlisted metadata source_type', () => {
    for (const sourceType of VALID_SOURCE_TYPES) {
      const report = runBenchmarkDryRun(inputWithSourceType(sourceType));

      expect(report.mapping_report.validation_status).toBe('passed');
      expect(report.mapping_report.source_type).toBe(sourceType);
      expect(report.normalized_preview_sample.every((sample) => sample.source_type === sourceType))
        .toBe(true);
    }
  });

  it('keeps metadata accepted source columns on the fixed allowlist', () => {
    const report = runBenchmarkDryRun({
      ...inputWithSourceType('meta_api_export'),
      sheets: [{
        name: 'benchmark_upload',
        rows: rows({
          account_id: 'acct_raw_should_not_echo',
          campaign_name: 'campaign_raw_should_not_echo',
          landing_url: 'https://example.invalid/raw-export',
        }),
      }],
    });

    const acceptedMetadataColumns = report.accepted_columns
      .filter((column) => column.source_sheet === 'upload_metadata')
      .map((column) => column.source_column_masked_or_label.replace('upload_metadata.', ''))
      .sort();

    expect(acceptedMetadataColumns).toEqual([...METADATA_ACCEPTED_SOURCE_COLUMNS].sort());
    expect(acceptedMetadataColumns.every((column) => METADATA_ACCEPTED_SOURCE_COLUMNS.includes(column)))
      .toBe(true);
    expect(JSON.stringify(report)).not.toContain('acct_raw_should_not_echo');
    expect(JSON.stringify(report)).not.toContain('campaign_raw_should_not_echo');
    expect(JSON.stringify(report)).not.toContain('https://example.invalid/raw-export');
  });
});
