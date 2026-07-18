#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re
from datetime import datetime, timezone
from pathlib import Path
REQUIRED_FILES = ["BUSINESS.md","GOALS.md","SYSTEM.md","AGENTS.md","CLAUDE.md","TASKS.md","README.md","docs/33-openapi.yaml","docs/INTENT_PRESERVATION_README.md","docs/00_constitution/constitution.md","docs/00_constitution/project-invariants.md","docs/00_constitution/agent-rules.md","docs/23_documentation_contracts/documentation-completeness-standard.md","docs/00_constitution/sensitive-data-policy.md","docs/00_constitution/operational-gates.md","docs/23_documentation_contracts/context-packages.md","docs/11_tasks/TASK-IPS-001-standard-adoption.md","docs/21_execution_plans/EP-IPS-001-standard-adoption.md","docs/13_context_packages/CP-IPS-001-standard-adoption.md","docs/22_goal_impact/GOAL-IMPACT-IPS-001-standard-adoption.md","docs/12_validation/VAL-IPS-001-standard-adoption.md"]
REQUIRED_SECTIONS = {"docs/11_tasks/TASK-IPS-001-standard-adoption.md":["Objective","Upstream Links","Goal Impact","Project Invariant Impact","Sensitive-Data Classification","Contract/Schema Impact","Replay/Determinism Impact","Scope","Non-Goals","Acceptance Criteria","Required Context","Validation Task","Required Gates","Execution Plan Requirement"],"docs/21_execution_plans/EP-IPS-001-standard-adoption.md":["Metadata","Upstream Traceability","Goal Impact","Project Invariants","Sensitive-Data Handling","Contract Validation Plan","Replay/Determinism Plan","Scope","Non-Goals","Files to Inspect","Files to Create","Files to Modify","Files That Must Not Be Modified","Implementation Steps","Test Plan","Validation Plan","Gate Commands","Documentation Updates","Rollback Plan","Agent Handoff Prompt","Completion Checklist"],"docs/13_context_packages/CP-IPS-001-standard-adoption.md":["Target task","Upstream traceability","Included documents","Excluded documents","Constraints","Agent prompt","Validation instructions"],"docs/12_validation/VAL-IPS-001-standard-adoption.md":["Artifact validated","Validation scope","Evidence","Gate evidence","Invariant evidence","Sensitive-data scan evidence","Replay and determinism evidence","Passed criteria","Failed criteria","Deviations","Recommendation"]}
HEADING_RE = re.compile(r"^#{1,6}\s+(.+?)\s*$", re.M)
def utc_now(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")
def norm(s): return re.sub(r"[^a-z0-9]+"," ",s.lower()).strip()
def section_body(text, heading):
    matches=list(HEADING_RE.finditer(text)); target=norm(heading)
    for i,m in enumerate(matches):
        if norm(m.group(1))==target:
            end=matches[i+1].start() if i+1<len(matches) else len(text)
            return text[m.end():end].strip()
    return ""
def audit(root: Path):
    root=root.resolve(); findings=[]
    for rel in REQUIRED_FILES:
        if not (root/rel).is_file(): findings.append({"severity":"critical","path":rel,"section":None,"message":"required file missing"})
    for rel, sections in REQUIRED_SECTIONS.items():
        p=root/rel
        if not p.is_file(): continue
        text=p.read_text(encoding="utf-8", errors="replace")
        for section in sections:
            if not section_body(text, section): findings.append({"severity":"critical","path":rel,"section":section,"message":"required section missing or empty"})
    for p in sorted(q for d in (root/"docs").glob("[0-2][0-9]_*") for q in d.rglob("*.md")):
        if "templates" in p.relative_to(root).parts: continue
        for n,line in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines(),1):
            if "[MISSING:" in line or "[UNKNOWN:" in line:
                findings.append({"severity":"high","path":p.relative_to(root).as_posix(),"section":None,"message":f"unresolved marker on line {n}"})
    report={"schema_version":"1.0.0","created_at":utc_now(),"gate":"doc_audit","root":str(root),"status":"PASS" if not findings else "FAIL","files_required":REQUIRED_FILES,"findings_count":len(findings),"findings":findings,"next_step":"run_pre_coding_gate" if not findings else "fix_documentation_findings"}
    out=root/"reports"/"validation"/"ips-doc-audit.json"; out.parent.mkdir(parents=True, exist_ok=True); out.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8"); report["report_path"]=out.relative_to(root).as_posix(); return report
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--root",default="."); args=ap.parse_args(); report=audit(Path(args.root)); print(f"{report['status']} ips_doc_audit report={report['report_path']} findings={report['findings_count']}"); return 0 if report["status"]=="PASS" else 1
if __name__=="__main__": raise SystemExit(main())
