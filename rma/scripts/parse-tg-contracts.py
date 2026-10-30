#!/usr/bin/env python3
# Live artery: parse Telegram #opencontract/#closecontract templates from the
# group observer log into the tg_contract ledger, split by brand. Idempotent.
import json, os, re, subprocess
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB=None
for line in open(os.path.join(ROOT,".env.local")):
    if line.startswith("DATABASE_URL="): DB=line.split("=",1)[1].strip().strip('"'); break
LOG=os.path.join(ROOT,"driver-bot","observed-telegram-groups.jsonl")
BRAND_TID={"cardiwan":"41e7c430-9d4d-45d6-abe8-a44ff773178a","easyrent":"8e9975e4-aba9-4075-9ec9-10b17a7bf6a4","etm":"265396ae-340d-478f-be9e-aa077b638730","take-auto":"0db0bf76-e078-445d-a8f8-506f5edfd06d"}
LABELS=[("manager","Manager"),("client","Client Name"),("phone","Phone Number"),("location","Location"),("time","Time"),("crm","CRM"),("model","Car model"),("company","Company"),("plate","Plate number"),("delivery_date","Delivery date"),("pickup_date","Pickup date"),("rent","Rent"),("deposit","Deposit"),("salik","Salik"),("fine","Fine"),("mileage","Mileage"),("fuel","Fuel"),("payment","Payment method"),("notes","Notes")]
EMO="🧑‍💻🧍📞📍⏱️📱💰📝🔚▶️ ‍️ "
def se(l):
    for ch in EMO: l=l.lstrip(ch)
    return l.strip()
def parse(t):
    r={}
    for ln in t.splitlines():
        l=se(ln); low=l.lower()
        if "total" in low and ":" in l and not r.get("total") and (low.startswith("total") or low.startswith("💰")): r["total"]=l.split(":",1)[1].strip()
        for k,lab in LABELS:
            if (low.startswith(lab.lower()+":") or low.startswith(lab.lower()+" :")) and not r.get(k): r[k]=l.split(":",1)[1].strip(); break
    return r
def brand(s):
    s=(s or "").lower()
    return "etm" if "etm" in s else ("cardiwan" if ("cardiwan" in s or "cardo" in s) else ("easyrent" if "easy" in s else ""))
def phone(s):
    d=re.sub(r"[^\d]","",s or "")
    if d.startswith("00"): d=d[2:]
    if d.startswith("0"): d="971"+d[1:]
    return "+"+d if d else ""
def num(s):
    m=re.search(r"\d+(?:[.,]\d+)?",(s or "").replace(" ",""))
    return m.group(0).replace(",",".") if m else ""
def esc(s): return "NULL" if not s else "'"+str(s).replace("'","''")+"'"
def nn(s):
    n=num(s); return n if n else "NULL"
rows=[json.loads(l) for l in open(LOG) if l.strip()] if os.path.exists(LOG) else []
groups={}; total=0
for rr in rows:
    t=rr.get("text") or ""
    kind="switch" if ("#switchcontract" in t or "#switch " in t) else ("open" if ("#opencontract" in t or "#выдача" in t) else ("close" if ("#closecontract" in t or "#clocecontract" in t or "#возврат" in t) else None))
    if not kind: continue
    d=parse(t); tid=BRAND_TID.get(brand(d.get("company")))
    if not tid: continue
    groups.setdefault(tid,[]).append((kind,d,rr,t)); total+=1
COLS="tenant_id,kind,client_name,phone,plate,car_model,company_raw,manager,location,time_text,delivery_date,pickup_date,rent,deposit,salik,fine,total,mileage,fuel,payment_method,notes,crm_ref,source_chat,source_msg_id,source_ts,raw_text"
out=[]
for tid,items in groups.items():
    out.append("BEGIN;"); out.append(f"SET LOCAL app.tenant_id='{tid}';")
    for kind,d,rr,t in items:
        mid=str(rr.get("messageId")) if rr.get("messageId") else "NULL"
        v=[f"'{tid}'",esc(kind),esc(d.get("client")),esc(phone(d.get("phone",""))),esc(d.get("plate")),esc(d.get("model")),esc(d.get("company")),esc(d.get("manager")),esc(d.get("location")),esc(d.get("time")),esc(d.get("delivery_date")),esc(d.get("pickup_date")),nn(d.get("rent")),nn(d.get("deposit")),nn(d.get("salik")),nn(d.get("fine")),nn(d.get("total")),esc(d.get("mileage")),esc(d.get("fuel")),esc(d.get("payment")),esc(d.get("notes")),esc(d.get("crm")),esc(rr.get("chatTitle")),mid,esc(rr.get("ts")),esc(t)]
        out.append(f"INSERT INTO tg_contract ({COLS}) VALUES ({','.join(v)}) ON CONFLICT (tenant_id,source_chat,source_msg_id) DO UPDATE SET kind=EXCLUDED.kind,total=EXCLUDED.total,salik=EXCLUDED.salik,fine=EXCLUDED.fine,plate=EXCLUDED.plate,client_name=EXCLUDED.client_name;")
    out.append("COMMIT;")
if out: subprocess.run(["psql",DB,"-q"],input="\n".join(out),text=True)
print(f"[tg-artery] {total} contracts parsed/upserted across {len(groups)} brands")
