#!/usr/bin/env python3
import email
import email.utils
import imaplib
import os
import re
import time
from datetime import datetime, timedelta, timezone
from email import policy
from pathlib import Path

HOST = os.environ.get("TARS_OTP_IMAP_HOST", "mail.rma.network")
USER = os.environ.get("TARS_OTP_IMAP_USER", "ruslan@rma.network")
PASSWORD = os.environ.get("TARS_OTP_IMAP_PASSWORD", "")
OTP_FILE = Path(os.environ.get("TARS_OTP_FILE", "/tmp/tars-otp.txt"))
POLL_INTERVAL = 3
MAX_WAIT_SECONDS = int(os.environ.get("TARS_OTP_TIMEOUT_SECONDS", "600"))
OTP_RE = re.compile(r"Authentication\s+Code\s*\(OTP\).*?\bis\s+(\d{4,8})\b", re.IGNORECASE | re.DOTALL)


def extract_code(message) -> str | None:
    sender = (message.get("From") or "").lower()
    if "rta.ae" not in sender and "tars" not in sender:
        return None

    parts = [message] if not message.is_multipart() else message.walk()
    body = ""
    for part in parts:
        if part.get_content_type() not in {"text/plain", "text/html"}:
            continue
        try:
            body += part.get_content()
        except Exception:
            payload = part.get_payload(decode=True)
            if payload:
                body += payload.decode("utf-8", "ignore")

    text = re.sub(r"<[^>]*>", " ", body)
    match = OTP_RE.search(message.get("Subject", "") + "\n" + text)
    return match.group(1) if match else None


def parse_date(raw) -> datetime | None:
    try:
        value = email.utils.parsedate_to_datetime(raw)
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    except Exception:
        return None


def main() -> int:
    if not PASSWORD:
        raise SystemExit("Set TARS_OTP_IMAP_PASSWORD in the environment; never commit it.")

    try:
        OTP_FILE.unlink()
    except FileNotFoundError:
        pass

    started = datetime.now(timezone.utc)
    deadline = time.time() + MAX_WAIT_SECONDS
    seen_uids: set[bytes] = set()
    print(f"[otp-poller] watching {USER} INBOX; output {OTP_FILE}", flush=True)

    while time.time() < deadline:
        try:
            mailbox = imaplib.IMAP4_SSL(HOST, 993, timeout=15)
            mailbox.login(USER, PASSWORD)
            mailbox.select("INBOX", readonly=True)
            since = started.strftime("%d-%b-%Y")
            status, data = mailbox.search(None, f'(SINCE "{since}")')
            uids = data[0].split() if status == "OK" and data and data[0] else []

            for uid in reversed(uids[-20:]):
                if uid in seen_uids:
                    continue
                seen_uids.add(uid)
                status, message_data = mailbox.fetch(uid, "(BODY.PEEK[])")
                if status != "OK" or not message_data or not message_data[0]:
                    continue
                message = email.message_from_bytes(message_data[0][1], policy=policy.default)
                arrived = parse_date(message.get("Date"))
                if arrived and arrived < started - timedelta(seconds=30):
                    continue
                code = extract_code(message)
                if code:
                    descriptor = os.open(OTP_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                    with os.fdopen(descriptor, "w") as output:
                        output.write(code)
                    print(f"[otp-poller] new RTA OTP written to {OTP_FILE}", flush=True)
                    mailbox.logout()
                    return 0
            mailbox.logout()
        except Exception as error:
            print(f"[otp-poller] IMAP error: {error}", flush=True)
        time.sleep(POLL_INTERVAL)

    print(f"[otp-poller] no new OTP after {MAX_WAIT_SECONDS}s", flush=True)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
