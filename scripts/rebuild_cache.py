"""
XLSX → JSON 캐시 재생성 스크립트
extractIndustry 로직을 Python으로 동일하게 구현하여 업종 재추출
"""
import sys, json, re
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
import openpyxl

BASE = Path(__file__).parent.parent

# ── extractIndustry 로직 (xlsxLoader.ts와 동일) ──────────
INDUSTRY_NORMALIZE = {
    '기관.ver2': '기관/단체', '생활잡화': '생활/잡화', '생활잡화 공구': '생활/잡화',
    '식음료(에너지바)': '식음료', '의약': '의약/건기식', '의료/건강': '의약/건기식',
    '의료/건강(건강기능식품)': '의약/건기식', '의약품': '의약/건기식',
    '건강뷰티': '뷰티', '화장품': '뷰티', '기타기관': '기관/단체', '단체': '기관/단체',
    '기관': '기관/단체', '문화예술': '문화/예술', '앱서비스': '앱/사이트',
    '금융서비스': '금융', '건설/분양': '건설', '건설분양': '건설',
    '가전': '전자', '가전제품': '전자',
    '패션': '패션', '패션/의류': '패션', '패션/잡화': '패션', '의류': '패션',
    '의료기기': '병의원',
    '영화': '엔터테인먼트', '문화예술': '엔터테인먼트', '문화/예술': '엔터테인먼트',
    '에너지': '기타', '기타(에너지)': '기타',
    '공공기관 (신규)': '공공기관', '교육 (신규)': '교육', '말레이시아': '기타',
    '태국': '기타', '모마2': '기타', '모마': '기타', '광고쿠폰': '기타',
    '생화잡화': '생활/잡화', '생활잡화/안마의자': '생활/잡화', '주택가구': '주택/가구',
    '화장품(스킨케어)': '뷰티', '화장품/생활': '뷰티',
    '정부기관': '공공기관', '정부광고': '공공기관', '부동산/건설': '건설',
    '기타(국방업)': '기타', '쇼핑': '기타',
    '컴퓨터/기술': '전자', '박람회': '엔터테인먼트', '언론': '방송통신',
    '제조': '전자',
}

def is_valid_industry_part(s):
    if not s or len(s) > 20: return False
    if re.match(r'^\d+$', s): return False
    if s == 'Total': return False
    if '팀' in s or '본부' in s: return False
    if '협력광고' in s or 'Collaborative' in s: return False
    if '홍보' in s: return False
    if not re.search(r'[가-힣]', s): return False
    # 회사명 패턴: 한글(영문) 형태
    if re.search(r'[가-힣]+\([A-Za-z]', s): return False
    return True

def extract_industry(account_name):
    if not account_name: return ''
    parts = [p.strip() for p in account_name.strip().split('_') if p.strip()]
    for part in reversed(parts):
        if is_valid_industry_part(part):
            return INDUSTRY_NORMALIZE.get(part, part)
    return '기타'

# ── cost_per_action_type 파싱 ─────────────────────────────
def parse_action_map(raw):
    result = {}
    if not raw: return result
    for item in str(raw).split(','):
        item = item.strip()
        if ':' in item:
            k, _, v = item.partition(':')
            try: result[k.strip()] = float(v.strip())
            except: pass
    return result

# ── XLSX 읽기 ─────────────────────────────────────────────
xlsx_path = BASE / 'data' / 'Meta_Total_Accounts_Daily_Report_0330_01.xlsx'
print(f'XLSX 읽는 중: {xlsx_path.name}')
wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
ws = wb.active

headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
h = {v: i for i, v in enumerate(headers) if v}
print(f'총 컬럼: {len(headers)}, 헤더 일부: {headers[:10]}')

def col(row, name, default=''):
    i = h.get(name)
    if i is None: return default
    v = row[i]
    return v if v is not None else default

def flt(v, default=0.0):
    try: return float(v)
    except: return default

records = []
for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
    reach = flt(col(row, 'reach'))
    impressions = flt(col(row, 'impressions'))
    spend = flt(col(row, 'spend'))
    cpm = flt(col(row, 'cpm'))

    if reach <= 0 or impressions <= 0 or cpm <= 0:
        continue

    cost_map = parse_action_map(col(row, 'cost_per_action_type'))

    records.append({
        '업종':        extract_industry(str(col(row, 'ad_account_name', ''))),
        '캠페인이름':  str(col(row, 'campaign_name', '')).strip(),
        '목표':        str(col(row, 'objective', '')).strip(),
        '최적화목표':  str(col(row, 'optimization_goal', '')).strip(),
        '성별':        str(col(row, 'gender', '')).strip(),
        '연령':        str(col(row, 'age', '')).strip(),
        '도달':        reach,
        '노출':        impressions,
        '지출금액':    spend,
        '빈도':        flt(col(row, 'frequency')),
        'CPM':         cpm,
        'CPC':         flt(col(row, 'cpc')),
        'CPC링크':     cost_map.get('link_click', 0),
        '영상조회수':  flt(col(row, 'video_view', 0) if 'video_view' in h else 0),
        '영상조회비용':cost_map.get('video_view', 0),
        '날짜':        str(col(row, 'date_start', '')).strip(),
    })

    if i % 50000 == 0:
        print(f'  {i:,}행 처리 중...')

wb.close()
print(f'필터 후 총 {len(records):,}행')

# ── JSON 저장 ─────────────────────────────────────────────
out_path = BASE / 'data' / 'ad_data_cache.json'
out_path.write_text(json.dumps(records, ensure_ascii=False), encoding='utf-8')
print(f'JSON 캐시 저장 완료: {out_path}')

# ── 업종 분포 확인 ────────────────────────────────────────
from collections import Counter
ind_counter = Counter(r['업종'] for r in records)
print('\n업종 분포 (상위 30):')
for k, v in ind_counter.most_common(30):
    print(f'  {repr(k)}: {v:,}건')
