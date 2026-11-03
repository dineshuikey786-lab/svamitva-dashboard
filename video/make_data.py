"""Build src/data.json for the video from the SVAMITVA sheet.

Usage:
    python3 make_data.py                 # reads the published CSV link in ../js/config.js
    python3 make_data.py sheet.csv       # reads a local CSV export of Sheet1
    python3 make_data.py sheet.json      # reads a Google Sheets API values JSON ({"values": [...]})

Same rules as the dashboard: stage counts are per plot, % completed = completed / plots,
a village is stuck after 3 or more updates in a row with no change while not yet complete.
"""
import csv
import io
import json
import re
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
STAGES = ["initiated", "verification", "submitted", "registration", "completed"]
STUCK_AFTER = 3
TOP_N = 5


def read_rows(src: str | None) -> list[list[str]]:
    if src and src.endswith(".json"):
        return json.loads(Path(src).read_text(encoding="utf-8"))["values"]
    if src:
        text = Path(src).read_text(encoding="utf-8")
    else:
        cfg = (HERE.parent / "js" / "config.js").read_text(encoding="utf-8")
        url = re.search(r"CSV_URL:\s*'([^']+)'", cfg).group(1)
        with urllib.request.urlopen(url, timeout=60) as r:
            text = r.read().decode("utf-8")
    return list(csv.reader(io.StringIO(text)))


def num(x: str) -> float:
    try:
        return float(str(x).replace(",", "").replace("%", "").strip() or 0)
    except ValueError:
        return 0.0


def iso(s: str) -> str | None:
    m = re.match(r"^\s*(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\s*$", s or "")
    return f"{m[3]}-{int(m[2]):02d}-{int(m[1]):02d}" if m else None


def main() -> None:
    values = read_rows(sys.argv[1] if len(sys.argv) > 1 else None)
    head = [h.strip().lower() for h in values[0]]
    col = lambda name: next(i for i, h in enumerate(head) if h.startswith(name))
    c = {"village": col("village"), "lgd": col("lgd"), "patwari": col("patwari"), "plots": col("plots"),
         "initiated": col("registry"), "verification": col("patwari_verification"), "submitted": col("submitted"),
         "registration": col("registration"), "completed": col("completed"), "date": col("date")}

    rows = []
    for r in values[1:]:
        d = iso(r[c["date"]]) if len(r) > c["date"] else None
        if not d or not r[c["lgd"]].strip():
            continue
        row = {"date": d, "lgd": r[c["lgd"]].strip(), "patwari": r[c["patwari"]].strip() or "Not assigned", "plots": num(r[c["plots"]])}
        row.update({k: num(r[c[k]]) for k in STAGES})
        rows.append(row)

    dates = sorted({r["date"] for r in rows})
    # stuck villages per date
    stuck = defaultdict(int)
    by_village = defaultdict(list)
    for r in rows:
        by_village[r["lgd"]].append(r)
    for vrows in by_village.values():
        vrows.sort(key=lambda r: r["date"])
        idle = 0
        for i, r in enumerate(vrows):
            moved = i == 0 or any(r[k] != vrows[i - 1][k] for k in STAGES)
            idle = 0 if moved else idle + 1
            if idle >= STUCK_AFTER and r["completed"] < r["plots"]:
                stuck[r["date"]] += 1

    tehsil = []
    pat = defaultdict(lambda: defaultdict(lambda: [0.0, 0.0]))  # patwari -> date -> [plots, completed]
    for d in dates:
        day = [r for r in rows if r["date"] == d]
        plots = sum(r["plots"] for r in day)
        done = sum(r["completed"] for r in day)
        in_proc = sum(r[k] for r in day for k in STAGES[:-1])
        tehsil.append({"date": d, "plots": plots, "completed": done, "inProcess": in_proc,
                       "notStarted": max(0, plots - done - in_proc), "pct": done / plots if plots else 0,
                       "stuck": stuck[d]})
        for r in day:
            pat[r["patwari"]][d][0] += r["plots"]
            pat[r["patwari"]][d][1] += r["completed"]
    for i, t in enumerate(tehsil):
        t["daily"] = t["completed"] - tehsil[i - 1]["completed"] if i else 0

    last, first = dates[-1], dates[0]
    patwaris = []
    for name, series in pat.items():
        pts = [{"date": d, "pct": series[d][1] / series[d][0] if series[d][0] else 0} for d in dates if d in series]
        end = series[last]
        patwaris.append({"name": name, "plots": end[0], "completed": end[1], "pct": pts[-1]["pct"],
                         "gain": pts[-1]["pct"] - pts[0]["pct"], "series": pts})
    patwaris.sort(key=lambda p: (-p["pct"], p["name"]))
    out = {"from": first, "to": last, "tehsil": tehsil, "patwariCount": len(patwaris),
           "villageCount": len(by_village), "top": patwaris[:TOP_N], "bottom": patwaris[-TOP_N:][::-1]}
    (HERE / "src" / "data.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    t = tehsil[-1]
    print(f"{first} → {last}: {t['completed']:.0f}/{t['plots']:.0f} = {t['pct']:.1%}, top {out['top'][0]['name']}, bottom {out['bottom'][0]['name']}")


if __name__ == "__main__":
    main()
