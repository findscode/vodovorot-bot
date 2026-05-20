#!/usr/bin/env python3
"""Normalize /opt/vodovorot-bot/.env (strip BOM/CRLF, drop CLOUDFLARE_*, set OPENROUTER)."""
from pathlib import Path
import sys

env_path = Path(sys.argv[1] if len(sys.argv) > 1 else '/opt/vodovorot-bot/.env')
lines = env_path.read_text(encoding='utf-8-sig').splitlines()
out: list[str] = []
openrouter: str | None = None
for line in lines:
    s = line.strip().lstrip('\ufeff')
    if not s or s.startswith('CLOUDFLARE_'):
        continue
    if s.startswith('OPENROUTER_API_KEY='):
        openrouter = s.split('=', 1)[1].strip().strip('"').strip("'")
        continue
    out.append(s)
if openrouter:
    out.append(f'OPENROUTER_API_KEY={openrouter}')
env_path.write_text('\n'.join(out) + '\n', encoding='utf-8')
print(f'wrote {len(out)} lines to {env_path}')
