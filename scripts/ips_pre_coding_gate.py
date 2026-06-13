#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re, sys
from datetime import datetime, timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))
from scripts.ips_doc_audit import audit as doc_audit
TEXT_SUFFIXES={".md",".ts",".tsx",".js",".json",".yaml",".yml",".sh",".prisma",".example"}
EXCLUDED={".git","node_modules",".next","dist","build","coverage","reports"}
SENSITIVE={"private_key":re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),"bearer_token":re.compile(r"(?i)Authorization\\s*:\\s*Bearer\\s+(?!\\$\\{)[A-Za-z0-9_./+=:-]{24,}"),"secret_assignment":re.compile(r"(?i)\\b(api[_-]?key|access[_-]?token|client[_-]?secret|password|private[_-]?key)\\b\\s*[:=]\\s*['\"](?!process\\.env|[A-Z0-9_]+\\b)[A-Za-z0-9_./+=:-]{16,}['\"]")}
def utc_now(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")
def is_text(p): return p.name==".env.example" or p.suffix in TEXT_SUFFIXES
def scan(root):
    findings=[]
    for p in sorted(root.rglob("*")):
        if not p.is_file() or set(p.relative_to(root).parts)&EXCLUDED or not is_text(p): continue
        text=p.read_text(encoding="utf-8", errors="replace")
        for name,rx in SENSITIVE.items():
            m=rx.search(text)
            if m: findings.append({"pattern":name,"path":p.relative_to(root).as_posix(),"match":m.group(0)[:120]})
    return findings
def run_gate(root: Path):
    root=root.resolve(); audit=doc_audit(root); findings=[]
    required=["docs/intent-preservation/tasks/TASK-IPS-001-standard-adoption.md","docs/intent-preservation/execution-plans/EP-IPS-001-standard-adoption.md","docs/intent-preservation/context-packages/CP-IPS-001-standard-adoption.md","docs/intent-preservation/goal-impact/GOAL-IMPACT-IPS-001-standard-adoption.md","docs/intent-preservation/project-invariants.md",".claude/checklists/before-coding.md"]
    for rel in required:
        if not (root/rel).is_file(): findings.append({"path":rel,"message":"required pre-coding artifact missing"})
    sensitive=scan(root)
    status="pass" if audit["status"]=="PASS" and not findings and not sensitive else "fail"
    report={"schema_version":"1.0.0","created_at":utc_now(),"gate":"pre_coding","root":str(root),"status":status,"doc_audit":{"status":audit["status"],"report_path":audit.get("report_path"),"findings_count":audit["findings_count"]},"findings":findings,"sensitive_data_findings":sensitive,"next_step":"start_controlled_coding" if status=="pass" else "fix_pre_coding_gate_findings"}
    out=root/"reports"/"validation"/"ips-pre-coding-gate.json"; out.parent.mkdir(parents=True, exist_ok=True); out.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8"); report["report_path"]=out.relative_to(root).as_posix(); return report
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--root",default="."); args=ap.parse_args(); report=run_gate(Path(args.root)); print(f"{report['status'].upper()} ips_pre_coding_gate report={report['report_path']}"); return 0 if report["status"]=="pass" else 1
if __name__=="__main__": raise SystemExit(main())
