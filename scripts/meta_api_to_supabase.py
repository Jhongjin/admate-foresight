"""
Meta Ads API → Supabase 직접 업로드 스크립트
Excel 저장 없이 Meta API 데이터를 바로 Supabase ad_data 테이블에 적재

실행 방법:
  pip install requests
  python scripts/meta_api_to_supabase.py

설정:
  - ACCESS_TOKEN, BUSINESS_ID 수정
  - TIME_RANGE 수정 (수집 기간)
  - DELETE_BEFORE_INSERT = True 로 설정하면 해당 기간 기존 데이터 삭제 후 재적재
"""

import json
import os
import re
import sys
import time
from pathlib import Path

import requests

# ════════════════════════════════════════════════════════════
# ★ 여기를 수정하세요
# ════════════════════════════════════════════════════════════
ACCESS_TOKEN  = 'EAHvbDWH3HGcBROnDMC7KxmZCP7DpDe9vrUErSnHUSPE3a5uKTDuocEGSoZA1Y6eInAnHywNtPUaZBL0fokYH0ZCjAOxCDZAyD8D1wMrgYFxoPLFTJTp1ToWql16zUGQBoxZAqcdxD3TYcvUBCe7ahoFnTlr1BRM3l1h4VO8k3gKvJgvnPQyZCMHiMvim7sB7jhy'
BUSINESS_ID   = '793587697339145'
TIME_RANGE    = {'since': '2025-03-01', 'until': '2026-03-31'}  # 수집 기간

# True: 해당 기간 Supabase 기존 데이터 삭제 후 재적재 (중복 방지)
# False: 기존 데이터 유지하고 추가만
DELETE_BEFORE_INSERT = True
# ════════════════════════════════════════════════════════════

META_VERSION = 'v25.0'

# ── Supabase 설정 (.env.local 자동 로드) ─────────────────────
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
    print('❌ .env.local에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 없음')
    sys.exit(1)

SB_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}

# ── 업종 추출 로직 (xlsxLoader.ts와 동일) ────────────────────
INDUSTRY_NORMALIZE = {
    '기관.ver2': '기관/단체', '생활잡화': '생활/잡화', '생활잡화 공구': '생활/잡화',
    '식음료(에너지바)': '식음료', '의약': '의약/건기식', '의료/건강': '의약/건기식',
    '의료/건강(건강기능식품)': '의약/건기식', '의약품': '의약/건기식',
    '건강뷰티': '뷰티', '화장품': '뷰티', '기타기관': '기관/단체', '단체': '기관/단체',
    '기관': '기관/단체', '문화예술': '엔터테인먼트', '문화/예술': '엔터테인먼트',
    '앱서비스': '앱/사이트', '금융서비스': '금융', '건설/분양': '건설', '건설분양': '건설',
    '가전': '전자', '가전제품': '전자',
    '패션': '패션', '패션/의류': '패션', '패션/잡화': '패션', '의류': '패션',
    '의료기기': '병의원', '영화': '엔터테인먼트',
    '에너지': '기타', '기타(에너지)': '기타',
    '공공기관 (신규)': '공공기관', '교육 (신규)': '교육', '말레이시아': '기타',
    '태국': '기타', '모마2': '기타', '모마': '기타', '광고쿠폰': '기타',
    '생화잡화': '생활/잡화', '생활잡화/안마의자': '생활/잡화', '주택가구': '주택/가구',
    '화장품(스킨케어)': '뷰티', '화장품/생활': '뷰티',
    '정부기관': '공공기관', '정부광고': '공공기관', '부동산/건설': '건설',
    '기타(국방업)': '기타', '쇼핑': '기타',
    '컴퓨터/기술': '전자', '박람회': '엔터테인먼트', '언론': '방송통신', '제조': '전자',
}

def is_valid_industry_part(s: str) -> bool:
    if not s or len(s) > 20:
        return False
    if re.match(r'^\d+$', s):
        return False
    if s in ('Total', 'total'):
        return False
    if '팀' in s or '본부' in s:
        return False
    if '협력광고' in s or 'Collaborative' in s:
        return False
    if '홍보' in s:
        return False
    if not re.search(r'[가-힣]', s):
        return False
    if re.search(r'[가-힣]+\([A-Za-z]', s):
        return False
    return True

def extract_industry(account_name: str) -> str:
    if not account_name:
        return '기타'
    parts = [p.strip() for p in account_name.strip().split('_') if p.strip()]
    for part in reversed(parts):
        if is_valid_industry_part(part):
            return INDUSTRY_NORMALIZE.get(part, part)
    return '기타'

# ── actions 배열 파싱 헬퍼 ────────────────────────────────────
def parse_actions(actions_list: list, action_type: str) -> float:
    """actions / cost_per_action_type 배열에서 특정 type 값 추출"""
    if not actions_list:
        return 0.0
    for item in actions_list:
        if isinstance(item, dict) and item.get('action_type') == action_type:
            try:
                return float(item.get('value', 0))
            except (ValueError, TypeError):
                return 0.0
    return 0.0

def flt(v, default: float = 0.0) -> float:
    try:
        return float(v)
    except (ValueError, TypeError):
        return default

# ── Meta API: 광고 계정 목록 ──────────────────────────────────
def get_ad_accounts() -> list:
    url = f'https://graph.facebook.com/{META_VERSION}/{BUSINESS_ID}/owned_ad_accounts'
    params = {'fields': 'id,name', 'access_token': ACCESS_TOKEN, 'limit': 500}
    resp = requests.get(url, params=params, timeout=30)
    data = resp.json()
    if 'error' in data:
        print(f'❌ 계정 목록 오류: {data["error"].get("message")}')
        sys.exit(1)
    return data.get('data', [])

# ── Meta API: 계정별 insights 수집 ───────────────────────────
def get_insights(acc_id: str, acc_name: str) -> list:
    url = f'https://graph.facebook.com/{META_VERSION}/{acc_id}/insights'
    params = {
        'level': 'campaign',
        'fields': (
            'campaign_name,account_id,account_name,objective,optimization_goal,'
            'spend,impressions,clicks,reach,frequency,cpc,cpm,'
            'actions,cost_per_action_type'
        ),
        'breakdowns': 'gender,age',
        'time_increment': '1',
        'time_range': json.dumps(TIME_RANGE),
        'access_token': ACCESS_TOKEN,
        'limit': 1000,
    }

    resp = requests.get(url, params=params, timeout=60)
    result = resp.json()

    if 'error' in result:
        print(f'  ⚠️  insights 오류 ({acc_name}): {result["error"].get("message")}')
        return []

    rows = result.get('data', [])

    # 페이지네이션
    while 'paging' in result and 'next' in result.get('paging', {}):
        print(f'    → 다음 페이지 수집 중... (현재 {len(rows)}행)')
        next_url = result['paging']['next']
        result = requests.get(next_url, timeout=60).json()
        rows.extend(result.get('data', []))
        time.sleep(0.3)

    return rows

# ── 행 변환: Meta API 형식 → Supabase 컬럼 ──────────────────
def transform_row(entry: dict, acc_name: str) -> dict | None:
    reach       = flt(entry.get('reach'))
    impressions = flt(entry.get('impressions'))
    cpm         = flt(entry.get('cpm'))

    # 유효하지 않은 행 제외
    if reach <= 0 or impressions <= 0 or cpm <= 0:
        return None

    actions      = entry.get('actions', [])
    cost_actions = entry.get('cost_per_action_type', [])

    return {
        '업종':        extract_industry(acc_name),
        '캠페인이름':  str(entry.get('campaign_name', '')).strip(),
        '목표':        str(entry.get('objective', '')).strip(),
        '최적화목표':  str(entry.get('optimization_goal', '')).strip(),
        '성별':        str(entry.get('gender', '')).strip(),
        '연령':        str(entry.get('age', '')).strip(),
        '도달':        reach,
        '노출':        impressions,
        '지출금액':    flt(entry.get('spend')),
        '빈도':        flt(entry.get('frequency')),
        'cpm':         cpm,
        'cpc':         flt(entry.get('cpc')),
        'cpc_link':    parse_actions(cost_actions, 'link_click'),
        '영상조회수':  parse_actions(actions, 'video_view'),
        '영상조회비용':parse_actions(cost_actions, 'video_view'),
        '날짜':        str(entry.get('date_start', '')).strip(),
    }

# ── Supabase: 기간 데이터 삭제 ───────────────────────────────
def delete_date_range():
    since = TIME_RANGE['since']
    until = TIME_RANGE['until']
    print(f'🗑️  Supabase 기존 데이터 삭제 중 ({since} ~ {until})...')
    url = (
        f'{SUPABASE_URL}/rest/v1/ad_data'
        f'?날짜=gte.{since}&날짜=lte.{until}'
    )
    resp = requests.delete(url, headers=SB_HEADERS, timeout=60, verify=False)
    if resp.status_code not in (200, 204):
        print(f'❌ 삭제 오류: {resp.status_code} {resp.text[:200]}')
        sys.exit(1)
    print('✅ 기존 데이터 삭제 완료')

# ── Supabase: 배치 업로드 ────────────────────────────────────
def upload_to_supabase(rows: list):
    BATCH = 500
    total = len(rows)
    endpoint = f'{SUPABASE_URL}/rest/v1/ad_data'
    print(f'📤 Supabase 업로드 시작 (총 {total:,}행, 배치 {BATCH}행)...')

    for i in range(0, total, BATCH):
        batch = rows[i:i + BATCH]
        resp = requests.post(endpoint, headers=SB_HEADERS, json=batch, timeout=30, verify=False)
        if resp.status_code not in (200, 201):
            print(f'❌ 업로드 오류 (배치 {i}~): {resp.status_code} {resp.text[:300]}')
            sys.exit(1)
        done = min(i + BATCH, total)
        print(f'  {done:,}/{total:,}행 업로드 완료')

    print(f'✅ Supabase 업로드 완료! ({total:,}행)')


# ════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print('=' * 50)
    print('Meta Ads API → Supabase 직접 업로드')
    print(f'수집 기간: {TIME_RANGE["since"]} ~ {TIME_RANGE["until"]}')
    print('=' * 50)

    # STEP 1: 광고 계정 목록
    print('\n[STEP 1] 비즈니스 광고 계정 목록 조회...')
    accounts = get_ad_accounts()
    if not accounts:
        print('❌ 광고 계정 없음')
        sys.exit(1)
    print(f'→ {len(accounts)}개 계정 발견')

    # STEP 2: 각 계정 insights 수집
    print('\n[STEP 2] 계정별 insights 수집 중...')
    all_rows: list[dict] = []
    skipped = 0

    for idx, acc in enumerate(accounts):
        acc_id   = acc['id']
        acc_name = acc.get('name', '')
        print(f'[{idx+1}/{len(accounts)}] {acc_name} ({acc_id})')

        raw_rows = get_insights(acc_id, acc_name)
        for entry in raw_rows:
            row = transform_row(entry, acc_name)
            if row:
                all_rows.append(row)
            else:
                skipped += 1

        print(f'  → {len(raw_rows)}행 수집 / 유효 {len([r for r in raw_rows if r])}행')
        time.sleep(0.2)

    print(f'\n총 수집: {len(all_rows) + skipped}행 | 유효: {len(all_rows)}행 | 제외: {skipped}행')

    if not all_rows:
        print('❌ 유효한 데이터 없음. 종료합니다.')
        sys.exit(0)

    # STEP 3: Supabase 업로드
    print('\n[STEP 3] Supabase 업로드...')
    if DELETE_BEFORE_INSERT:
        delete_date_range()

    upload_to_supabase(all_rows)

    print('\n🎉 완료! 시뮬레이터를 새로고침하면 데이터가 반영됩니다.')
