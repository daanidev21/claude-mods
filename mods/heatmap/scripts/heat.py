"""Active minutes per day and project, from the session logs.

Reads only message times and the project folder. The result is kept in a local
ledger so old days survive log cleanup.
"""
import glob
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta

GAP = 300  # pauses over 5 minutes don't count
REFRESH_DAYS = 35  # recent days are re-read; older ones stay as stored

root = os.path.expanduser(os.environ.get("CLAUDE_CONFIG_DIR") or "~/.claude")
projects = os.path.join(root, "projects")
ledger_path = os.path.join(root, "heatmap", "ledger.json")

TS = re.compile(r'"timestamp":"([^"]+)"')
CWD = re.compile(r'"cwd":"([^"]+)"')


def parse(ts):
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def day_of(epoch):
    return datetime.fromtimestamp(epoch).strftime("%Y-%m-%d")


def read_log(path):
    times, name = [], None
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if '"timestamp"' not in line:
                    continue
                if '"type":"user"' not in line and '"type":"assistant"' not in line:
                    continue
                m = TS.search(line)
                if not m:
                    continue
                t = parse(m.group(1))
                if t is not None:
                    times.append(t)
                if name is None:
                    c = CWD.search(line)
                    if c:
                        name = os.path.basename(c.group(1).rstrip("/")) or None
    except OSError:
        pass
    return times, name


today = datetime.now().date()
from_day = (today - timedelta(days=REFRESH_DAYS)).isoformat()
cutoff = datetime.combine(today - timedelta(days=REFRESH_DAYS), datetime.min.time()).timestamp()

acc = {}  # (day, project) -> [minutes, sessions, name]
for pdir in glob.glob(os.path.join(projects, "*")):
    if not os.path.isdir(pdir):
        continue
    pkey = os.path.basename(pdir)
    logs = []
    for f in glob.glob(os.path.join(pdir, "**", "*.jsonl"), recursive=True):
        try:
            if os.path.getmtime(f) < cutoff:
                continue
        except OSError:
            continue
        times, name = read_log(f)
        if times:
            logs.append((min(times), len(times), times, name))
    logs.sort(key=lambda x: (x[0], x[1]))
    seen = set()  # a resumed session copies earlier messages: count each once
    for _, _, times, name in logs:
        own = sorted({round(t, 3) for t in times} - seen)
        seen.update(own)
        if not own:
            continue
        label = name or pkey
        days_here = set()
        for t in own:
            days_here.add(day_of(t))
        for d in days_here:
            if d >= from_day:
                row = acc.setdefault((d, pkey), [0.0, 0, label])
                row[1] += 1
        for a, b in zip(own, own[1:]):
            if b - a > GAP:
                continue
            cur = a
            while cur < b:
                nxt = datetime.fromtimestamp(cur).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
                end = min(b, nxt.timestamp())
                d = day_of(cur)
                if d >= from_day:
                    row = acc.setdefault((d, pkey), [0.0, 0, label])
                    row[0] += end - cur
                cur = end

fresh = {
    (d, p): {"d": d, "p": p, "n": v[2], "min": int(round(v[0] / 60)), "s": v[1]}
    for (d, p), v in acc.items()
}

old = []
try:
    with open(ledger_path, "r", encoding="utf-8") as fh:
        loaded = json.load(fh)
        if isinstance(loaded, list):
            old = [r for r in loaded if isinstance(r, dict) and "d" in r and "p" in r]
except (OSError, ValueError):
    pass

merged = {(r["d"], r["p"]): r for r in old if r["d"] < from_day}
merged.update(fresh)
rows = sorted(merged.values(), key=lambda r: (r["d"], r["p"]))

try:
    os.makedirs(os.path.dirname(ledger_path), exist_ok=True)
    tmp = ledger_path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(rows, fh, ensure_ascii=False)
    os.replace(tmp, ledger_path)
except OSError:
    pass

json.dump(rows, sys.stdout, ensure_ascii=False)
