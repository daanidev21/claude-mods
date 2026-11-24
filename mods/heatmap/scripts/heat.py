"""Active minutes and tokens per day and project, from the session logs.

Reads message times, the project folder and each reply's token counts. No
prices: a gateway or custom model has none we could trust, so only tokens.
The result is kept in a local ledger so old days survive log cleanup.
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

# a Windows pipe defaults to the console code page, which mangles accents
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

root = os.path.expanduser(os.environ.get("CLAUDE_CONFIG_DIR") or "~/.claude")
projects = os.path.join(root, "projects")
ledger_path = os.path.join(root, "heatmap", "ledger.json")

TS = re.compile(r'"timestamp":"([^"]+)"')
CWD = re.compile(r'"cwd":"([^"]+)"')


def folder_of(raw):
    """Last path segment of a JSON-escaped cwd, from either OS."""
    try:
        path = json.loads(f'"{raw}"')
    except ValueError:
        path = raw
    return re.split(r"[\\/]", path.rstrip("\\/"))[-1] or None


def parse(ts):
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def day_of(epoch):
    return datetime.fromtimestamp(epoch).strftime("%Y-%m-%d")


def usage_of(line):
    """(id, new input, cached input, output) of a reply line, or None."""
    try:
        msg = json.loads(line).get("message") or {}
        use = msg.get("usage")
        if not isinstance(use, dict) or not msg.get("id"):
            return None
        return (
            msg["id"],
            int(use.get("input_tokens") or 0) + int(use.get("cache_creation_input_tokens") or 0),
            int(use.get("cache_read_input_tokens") or 0),
            int(use.get("output_tokens") or 0),
        )
    except (ValueError, TypeError, AttributeError):
        return None


def read_log(path):
    times, name = [], None
    replies = {}  # message id -> (time, new, cached, out); a streamed reply repeats
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
                        name = folder_of(c.group(1))
                if t is not None and '"usage"' in line and '"type":"assistant"' in line:
                    u = usage_of(line)
                    if u:
                        prev = replies.get(u[0])
                        # the last copy of a reply carries the final counts
                        if prev is None or u[3] >= prev[3]:
                            replies[u[0]] = (t, u[1], u[2], u[3])
    except OSError:
        pass
    return times, name, replies


today = datetime.now().date()
from_day = (today - timedelta(days=REFRESH_DAYS)).isoformat()
cutoff = datetime.combine(today - timedelta(days=REFRESH_DAYS), datetime.min.time()).timestamp()

acc = {}  # (day, project) -> [minutes, sessions, name, new, cached, out]


def row_of(d, pkey, label):
    return acc.setdefault((d, pkey), [0.0, 0, label, 0, 0, 0])


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
        times, name, replies = read_log(f)
        if times:
            logs.append((min(times), len(times), times, name, replies))
    logs.sort(key=lambda x: (x[0], x[1]))
    seen = set()  # a resumed session copies earlier messages: count each once
    seen_replies = set()
    for _, _, times, name, replies in logs:
        own = sorted({round(t, 3) for t in times} - seen)
        seen.update(own)
        label = name or pkey
        for mid, (t, new, cached, out) in replies.items():
            if mid in seen_replies:
                continue
            seen_replies.add(mid)
            d = day_of(t)
            if d >= from_day:
                row = row_of(d, pkey, label)
                row[3] += new
                row[4] += cached
                row[5] += out
        if not own:
            continue
        days_here = set()
        for t in own:
            days_here.add(day_of(t))
        for d in days_here:
            if d >= from_day:
                row = row_of(d, pkey, label)
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
                    row = row_of(d, pkey, label)
                    row[0] += end - cur
                cur = end

fresh = {
    (d, p): {
        "d": d,
        "p": p,
        "n": v[2],
        "min": int(round(v[0] / 60)),
        "s": v[1],
        "ti": v[3],  # new input: uncached + cache writes
        "tc": v[4],  # cache reads
        "to": v[5],  # output
    }
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
