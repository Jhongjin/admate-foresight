"""
Supabase 데이터 업로드 스크립트
JSON 캐시 파일을 Supabase ad_data 테이블에 insert (REST API 직접 호출)

실행 방법:
  pip install requests
  python scripts/upload_to_supabase.py
"""
import json
import os
import sys
from pathlib import Path

import requests

# .env.local 에서 환경변수 로드
env_file = Path(__file__).parent.parent / '.env.local'
if env_file.exists():
    for line in env_file.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print('❌ .env.local에 SUPABASE_URL / SUPABASE_ANON_KEY 없음')
    sys.exit(1)

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}

cache_path = Path(__file__).parent.parent / 'data' / 'ad_data_cache.json'
if not cache_path.exists():
    print('❌ data/ad_data_cache.json 없음')
    sys.exit(1)

print('JSON 캐시 읽는 중...')
records = json.loads(cache_path.read_text(encoding='utf-8'))
print(f'총 {len(records):,}행')

# Supabase 컬럼명으로 변환
def transform(r):
    return {
        '업종':        r.get('업종', ''),
        '캠페인이름':  r.get('캠페인이름', ''),
        '목표':        r.get('목표', ''),
        '최적화목표':  r.get('최적화목표', ''),
        '노출위치':    r.get('노출위치', ''),
        '소재형태':    r.get('소재형태', ''),
        '성별':        r.get('성별', ''),
        '연령':        r.get('연령', ''),
        '도달':        r.get('도달', 0),
        '노출':        r.get('노출', 0),
        '지출금액':    r.get('지출금액', 0),
        '빈도':        r.get('빈도', 0),
        'cpm':         r.get('CPM', 0),
        'cpc':         r.get('CPC', 0),
        'cpc_link':    r.get('CPC링크', 0),
        '영상조회수':  r.get('영상조회수', 0),
        '영상조회비용':r.get('영상조회비용', 0),
        '날짜':        r.get('날짜', ''),
    }

rows = [transform(r) for r in records]

# 배치 업로드 (500행씩)
BATCH = 500
total = len(rows)
print(f'Supabase 업로드 시작 (배치 {BATCH}행)...')

endpoint = f'{SUPABASE_URL}/rest/v1/ad_data'

for i in range(0, total, BATCH):
    batch = rows[i:i+BATCH]
    resp = requests.post(endpoint, headers=HEADERS, json=batch, timeout=30, verify=False)
    if resp.status_code not in (200, 201):
        print(f'❌ 오류 (배치 {i}~): {resp.status_code} {resp.text[:200]}')
        sys.exit(1)
    done = min(i + BATCH, total)
    print(f'  {done:,}/{total:,}행 완료')

print('✅ 업로드 완료!')
