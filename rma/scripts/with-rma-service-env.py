#!/usr/bin/env python3
import os
import shlex
import subprocess
import sys

if len(sys.argv) < 2:
    raise SystemExit("usage: python3 scripts/with-rma-service-env.py <command> [args...]")

raw = subprocess.check_output(
    ["systemctl", "show", "rma-crm", "-p", "Environment", "--value"],
    text=True,
).strip()
env = os.environ.copy()
for item in shlex.split(raw):
    key, separator, value = item.partition("=")
    if separator:
        env[key] = value

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.execvpe(sys.argv[1], sys.argv[1:], env)
