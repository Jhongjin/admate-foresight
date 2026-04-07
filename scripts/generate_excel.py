import sys
import json
import tempfile
import os
import xlsxwriter

def generate(data: dict, output_path: str):
    result = data["result"]
    range_data = data["rangeData"]
    conditions = data["conditions"]
    date_str = data["dateStr"]

    wb = xlsxwriter.Workbook(output_path)

    # ── Formats ──────────────────────────────────────────────
    fmt_title   = wb.add_format({"bold": True, "font_size": 14, "font_name": "Arial", "font_color": "#1e1b4b"})
    fmt_header  = wb.add_format({"bold": True, "bg_color": "#6366f1", "font_color": "#ffffff",
                                  "font_name": "Arial", "border": 1, "align": "center"})
    fmt_label   = wb.add_format({"bold": True, "font_name": "Arial", "font_color": "#374151"})
    fmt_value   = wb.add_format({"font_name": "Arial", "font_color": "#111827"})
    fmt_num     = wb.add_format({"font_name": "Arial", "num_format": "#,##0"})
    fmt_won     = wb.add_format({"font_name": "Arial", "num_format": "₩#,##0"})
    fmt_pct     = wb.add_format({"font_name": "Arial", "num_format": "0.00%"})
    fmt_section = wb.add_format({"bold": True, "font_name": "Arial", "font_color": "#6366f1",
                                  "bottom": 1, "bottom_color": "#6366f1"})
    fmt_row_hl  = wb.add_format({"bg_color": "#eef2ff", "font_name": "Arial", "num_format": "#,##0", "bold": True})
    fmt_row_won_hl = wb.add_format({"bg_color": "#eef2ff", "font_name": "Arial", "num_format": "₩#,##0", "bold": True})
    fmt_meta    = wb.add_format({"font_name": "Arial", "font_color": "#9ca3af", "italic": True})

    # ══════════════════════════════════════════════════════════
    # Sheet 1: 시뮬레이션 요약
    # ══════════════════════════════════════════════════════════
    ws1 = wb.add_worksheet("시뮬레이션 요약")
    ws1.set_column("A:A", 22)
    ws1.set_column("B:B", 22)
    ws1.set_column("C:C", 18)

    ws1.write("A1", "Ad Planner AI — 시뮬레이션 결과", fmt_title)
    ws1.write("A2", f"생성일: {date_str}", fmt_meta)

    ws1.write("A4", "[ 캠페인 조건 ]", fmt_section)
    cond_rows = [
        ("타겟 업종", conditions["industry"]),
        ("성별",     conditions["gender"]),
        ("연령대",   conditions["age"]),
        ("예산",     conditions["budget"]),
    ]
    for i, (lbl, val) in enumerate(cond_rows, start=5):
        ws1.write(i - 1, 0, lbl, fmt_label)
        if lbl == "예산":
            ws1.write_number(i - 1, 1, val, fmt_won)
        else:
            ws1.write(i - 1, 1, val, fmt_value)

    ws1.write("A10", "[ 예측 결과 ]", fmt_section)
    ws1.write("A11", "지표",       fmt_header)
    ws1.write("B11", "예측값",     fmt_header)
    ws1.write("C11", "전월 대비",  fmt_header)

    kpi_rows = [
        ("예상 도달 (Reach)",  result["reach"],  result.get("reachChange")),
        ("예상 CPM (원)",      result["cpm"],    result.get("cpmChange")),
        ("예상 CPC (원)",      result["cpc"],    result.get("cpcChange")),
    ]
    for i, (lbl, val, chg) in enumerate(kpi_rows, start=12):
        ws1.write(i - 1, 0, lbl, fmt_label)
        ws1.write_number(i - 1, 1, val, fmt_won if "CPM" in lbl or "CPC" in lbl else fmt_num)
        if chg is not None:
            ws1.write_number(i - 1, 2, chg / 100, fmt_pct)
        else:
            ws1.write(i - 1, 2, "-", fmt_value)

    ws1.write("A16", "매칭 데이터 건수", fmt_label)
    ws1.write_number("B16", result["matchedCount"], fmt_num)

    # ══════════════════════════════════════════════════════════
    # Sheet 2: 예산 구간별 비교 (데이터 + 차트)
    # ══════════════════════════════════════════════════════════
    ws2 = wb.add_worksheet("예산 구간별 비교")
    ws2.set_column("A:A", 20)
    ws2.set_column("B:E", 18)

    headers = ["예산 (원)", "예상 도달 (명)", "CPM (원)", "CPC (원)", "만원당 도달 (명)"]
    for col, h in enumerate(headers):
        ws2.write(0, col, h, fmt_header)

    current_budget = conditions["budget"]
    for row_i, p in enumerate(range_data, start=1):
        eff = round(p["reach"] / (p["budget"] / 10_000)) if p["reach"] > 0 else 0
        is_selected = p["budget"] == current_budget
        nfmt = fmt_row_hl if is_selected else fmt_num
        wfmt = fmt_row_won_hl if is_selected else fmt_won
        ws2.write_number(row_i, 0, p["budget"], wfmt)
        ws2.write_number(row_i, 1, p["reach"],  nfmt)
        ws2.write_number(row_i, 2, p["cpm"],    wfmt)
        ws2.write_number(row_i, 3, p["cpc"],    wfmt)
        ws2.write_number(row_i, 4, eff,         nfmt)

    n = len(range_data)

    # 차트 1: 예산별 예상 도달 (꺾은선)
    chart_reach = wb.add_chart({"type": "line"})
    chart_reach.add_series({
        "name":       "예상 도달",
        "categories": ["예산 구간별 비교", 1, 0, n, 0],
        "values":     ["예산 구간별 비교", 1, 1, n, 1],
        "line":       {"color": "#6366f1", "width": 2.5},
        "marker":     {"type": "circle", "size": 6, "fill": {"color": "#6366f1"}, "line": {"color": "#6366f1"}},
    })
    chart_reach.set_title({"name": "예산별 예상 도달 곡선"})
    chart_reach.set_x_axis({"name": "예산 (원)", "num_format": "₩#,##0"})
    chart_reach.set_y_axis({"name": "예상 도달 (명)", "num_format": "#,##0"})
    chart_reach.set_legend({"position": "bottom"})
    chart_reach.set_size({"width": 580, "height": 320})
    chart_reach.set_chartarea({"border": {"color": "#e5e7eb"}, "fill": {"color": "#ffffff"}})
    ws2.insert_chart("G2", chart_reach)

    # 차트 2: CPM / CPC 비교 (묶음 막대)
    chart_cpm = wb.add_chart({"type": "column"})
    chart_cpm.add_series({
        "name":       "CPM",
        "categories": ["예산 구간별 비교", 1, 0, n, 0],
        "values":     ["예산 구간별 비교", 1, 2, n, 2],
        "fill":       {"color": "#6366f1"},
        "gap":        80,
    })
    chart_cpm.add_series({
        "name":       "CPC",
        "categories": ["예산 구간별 비교", 1, 0, n, 0],
        "values":     ["예산 구간별 비교", 1, 3, n, 3],
        "fill":       {"color": "#f59e0b"},
    })
    chart_cpm.set_title({"name": "예산 구간별 CPM / CPC 비교"})
    chart_cpm.set_x_axis({"name": "예산 (원)", "num_format": "₩#,##0"})
    chart_cpm.set_y_axis({"name": "단가 (원)", "num_format": "₩#,##0"})
    chart_cpm.set_legend({"position": "bottom"})
    chart_cpm.set_size({"width": 580, "height": 320})
    chart_cpm.set_chartarea({"border": {"color": "#e5e7eb"}, "fill": {"color": "#ffffff"}})
    ws2.insert_chart("G22", chart_cpm)

    wb.close()


if __name__ == "__main__":
    import io
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")
    raw = sys.stdin.read()
    data = json.loads(raw)
    out = data.get("outputPath") or tempfile.mktemp(suffix=".xlsx")
    generate(data, out)
    sys.stdout.buffer.write((out + "\n").encode("utf-8"))
