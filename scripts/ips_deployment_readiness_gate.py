#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))
from scripts.ips_pre_coding_gate import run_gate as pre_coding_gate
PROTECTED=["BUSINESS.md","GOALS.md"]
def utc_now(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")
def git_changed(root):
    if not (root/".git").exists(): return {"status":"not_applicable","changed_files":[]}
    cp=subprocess.run(["git","diff","--name-only","HEAD","--",*PROTECTED],cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
    changed=[x for x in cp.stdout.splitlines() if x.strip()]
    return {"status":"pass" if cp.returncode==0 and not changed else "fail","changed_files":changed,"stderr":cp.stderr[-1000:]}
def unresolved(root):
    hits=[]; rx=re.compile(r"\[(?:MISSING|UNKNOWN):[^\]]+\]")
    for p in sorted(q for d in (root/"docs").glob("[0-2][0-9]_*") for q in d.rglob("*.md")):
        if "templates" in p.relative_to(root).parts: continue
        for n,line in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines(),1):
            if rx.search(line): hits.append({"path":p.relative_to(root).as_posix(),"line":n,"text":line.strip()})
    return hits
def run_gate(root: Path):
    root=root.resolve(); pre=pre_coding_gate(root); protected=git_changed(root); markers=unresolved(root); vals=[p.relative_to(root).as_posix() for p in sorted((root/"docs"/"12_validation").glob("VAL-*.md"))]
    status="pass" if pre["status"]=="pass" and protected["status"]!="fail" and not markers and vals else "fail"
    report={"schema_version":"1.0.0","created_at":utc_now(),"gate":"deployment_readiness","root":str(root),"status":status,"pre_coding_gate":{"status":pre["status"],"report_path":pre.get("report_path")},"validation_reports":vals,"unresolved_markers":markers,"protected_files":protected,"next_step":"ready_for_deployment_review" if status=="pass" else "fix_deployment_readiness_findings"}
    out=root/"reports"/"validation"/"ips-deployment-readiness-gate.json"; out.parent.mkdir(parents=True, exist_ok=True); out.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8"); report["report_path"]=out.relative_to(root).as_posix(); return report
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--root",default="."); args=ap.parse_args(); report=run_gate(Path(args.root)); print(f"{report['status'].upper()} ips_deployment_readiness_gate report={report['report_path']}"); return 0 if report["status"]=="pass" else 1
if __name__=="__main__": raise SystemExit(main())
