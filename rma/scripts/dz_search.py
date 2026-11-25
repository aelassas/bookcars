#!/usr/bin/env python3
"""dz_search.py — Dubizzle UAE used-car search for the hunters' enrichment.

Usage:  dz_search.py "<keywords>" <max_price_aed>
Prints: JSON list [{title, price, year, km, url}] (top 5, cheapest first).

StealthyFetcher (Camoufox) walks through the Imperva wall; listings are read
from the __NEXT_DATA__ payload when present, falling back to ld+json cards.
"""
import json
import re
import sys
import urllib.parse

from scrapling.fetchers import StealthyFetcher

def main() -> None:
    keywords = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        max_price = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    except ValueError:
        max_price = 0

    q = urllib.parse.quote_plus(keywords)
    url = f"https://uae.dubizzle.com/motors/used-cars/?keywords={q}"
    if max_price > 0:
        url += f"&price__lte={max_price}"

    page = StealthyFetcher.fetch(url, headless=True, network_idle=True, timeout=90000)
    html = page.html_content or ""

    items = []

    m = re.search(r'__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    if m:
        try:
            data = json.loads(m.group(1))
            # Dubizzle's listing arrays move around; walk the tree for objects
            # that look like listings (have price + name/title + a details URL).
            def walk(node):
                if isinstance(node, dict):
                    keys = set(node.keys())
                    if {"price"} <= keys and ({"name"} & keys or {"title"} & keys):
                        items.append(node)
                    for v in node.values():
                        walk(v)
                elif isinstance(node, list):
                    for v in node:
                        walk(v)
            walk(data)
        except Exception:
            pass

    out = []
    seen = set()
    def loc(v):
        # Dubizzle localizes many fields as {"en": ..., "ar": ...}.
        if isinstance(v, dict):
            return v.get("en") or v.get("ar") or ""
        return v if v is not None else ""

    for it in items:
        title = loc(it.get("name") or it.get("title"))
        price = it.get("price")
        if isinstance(price, dict):
            price = price.get("value") or price.get("amount")
        try:
            price = int(float(str(price).replace(",", "")))
        except Exception:
            continue
        slug = it.get("absolute_url") or it.get("url") or it.get("details_url") or ""
        if isinstance(slug, dict):
            slug = slug.get("en") or ""
        title = str(title).strip()
        slug = str(loc(slug)).strip()
        if not title or not slug or (title, price) in seen:
            continue
        seen.add((title, price))
        if max_price and price > max_price:
            continue
        year = loc(it.get("year"))
        km = loc(it.get("kilometers") or it.get("km"))
        u = slug if str(slug).startswith("http") else "https://uae.dubizzle.com" + str(slug)
        out.append({"title": str(title)[:70], "price": price, "year": str(year), "km": str(km), "url": u})

    out.sort(key=lambda x: x["price"])
    print(json.dumps(out[:5], ensure_ascii=False))

if __name__ == "__main__":
    main()
