let meta = #{
    name: "crm-admin-qa-5",
    description: "5-agent CRM /admin QA: shell, brands/talents, campaigns, tasks, finance — findings for root fixes",
    phases: [
        #{ title: "Audit", detail: "5 parallel domain audits of CRM /admin" },
        #{ title: "Synthesize", detail: "merge findings into prioritised report" },
    ],
    when_to_use: "CRM /admin QA pass with exactly 5 agents; surface fixable input/flow bugs",
};

let findings_schema = #{
    "type": "object",
    "required": ["area", "findings", "improvements", "severity_max", "inputs_checked"],
    "properties": #{
        "area": #{ "type": "string" },
        "findings": #{
            "type": "array",
            "maxItems": 12,
            "items": #{
                "type": "object",
                "required": ["severity", "title", "evidence", "path", "root_cause_hint", "fixable"],
                "properties": #{
                    "severity": #{ "type": "string" },
                    "title": #{ "type": "string" },
                    "evidence": #{ "type": "string" },
                    "path": #{ "type": "string" },
                    "root_cause_hint": #{ "type": "string" },
                    "fixable": #{ "type": "boolean" },
                    "input_or_action": #{ "type": "string" },
                },
            },
        },
        "improvements": #{
            "type": "array",
            "maxItems": 8,
            "items": #{ "type": "string" },
        },
        "severity_max": #{ "type": "string" },
        "inputs_checked": #{
            "type": "array",
            "maxItems": 20,
            "items": #{ "type": "string" },
        },
        "notes": #{ "type": "string" },
    },
};

// ── Phase 1: exactly 5 parallel CRM domain audits ───────────────────────
phase("Audit");

let audit_jobs = [];

// 1 shell-nav-auth
let p1 = "";
p1 += "You are agent 1/5 (shell-nav-auth) for SocialPro CRM QA under /admin ONLY.\n";
p1 += "Repo root is the current workspace (proyectozack). Use read_file, list_dir, grep. Do NOT invent files.\n";
p1 += "Scope: admin layout/nav, auth-guard, permissions, homeForRole, global search, e2e admin-smoke/admin-navigation.\n";
p1 += "Inspect at minimum:\n";
p1 += "- src/lib/auth-guard.ts, src/lib/permissions.ts\n";
p1 += "- src/app/admin/(dashboard)/layout.tsx and sidebar/nav under src/features/admin/\n";
p1 += "- src/lib/queries/dashboard.ts (homeForRole if present)\n";
p1 += "- e2e/admin-smoke.spec.ts, e2e/admin-navigation.spec.ts, e2e/helpers.ts\n";
p1 += "- /api/admin/search and src/lib/queries/search.ts if present\n";
p1 += "Find: missing requireRole, role routing bugs (admin vs staff vs admin_limited_tasks), orphan nav links,\n";
p1 += "pl vs finanzas/pl inconsistency, search visibility bugs, broken redirects after login.\n";
p1 += "List inputs_checked as concrete paths/actions you opened. findings: P0|P1|P2 with path+evidence+root_cause_hint.\n";
p1 += "area=shell-nav-auth. Empty findings only after real inspection of the files above.\n";
audit_jobs.push(#{
    prompt: p1,
    label: "shell-nav-auth",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

// 2 brands-talents
let p2 = "";
p2 += "You are agent 2/5 (brands-talents) for SocialPro CRM /admin brands and talents.\n";
p2 += "Use read_file/grep/list_dir only. Inspect forms, Zod schemas, Server Actions, queries.\n";
p2 += "Paths: src/app/admin/(dashboard)/brands/**, talents/**, src/features/admin/brands/**, talents/**,\n";
p2 += "src/lib/queries for brands/crmBrands/talents, related actions under app/admin.\n";
p2 += "Check EVERY user-facing input you can find: create/edit brand, talent edit/negocio/seo, import, files upload.\n";
p2 += "Look for: Zod parse vs safeParse, missing validation, platform key mismatch (yt/tw vs youtube/twitch),\n";
p2 += "parseFollowers edge cases, private blob URLs exposed, unbounded list queries, role checks on mutations.\n";
p2 += "area=brands-talents. inputs_checked must list form fields or action names inspected.\n";
p2 += "Concrete bugs only — not style. severity P0 money/auth data loss, P1 broken CRUD, P2 polish.\n";
audit_jobs.push(#{
    prompt: p2,
    label: "brands-talents",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

// 3 campaigns-deals-contracts
let p3 = "";
p3 += "You are agent 3/5 (campaigns-deals-contracts) for CRM campaigns, contracts, deliverables.\n";
p3 += "Use read_file/grep. Inspect:\n";
p3 += "- src/app/admin/(dashboard)/campanas/**, contratos/**, entregables/**\n";
p3 += "- src/lib/queries/campaigns.ts and related campaign/contract/tracker queries\n";
p3 += "- Server Actions and form schemas for campaign create/edit, deal fields, contract templates\n";
p3 += "Gotchas from project docs: amountBrand/amountTalent are NOT real payments; payments come from invoices.\n";
p3 += "SETTLED income/expense statuses include cobrada AND pagada. Flag wrong filters that under-count settled.\n";
p3 += "Also: N+1 queries, missing error handling, unsafe any on money fields, broken private blob file links,\n";
p3 += "tracking sheet fields, creator notes, plantillas.\n";
p3 += "area=campaigns-deals-contracts. inputs_checked=forms/actions. findings with root_cause_hint.\n";
audit_jobs.push(#{
    prompt: p3,
    label: "campaigns-deals-contracts",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

// 4 tasks-semana
let p4 = "";
p4 += "You are agent 4/5 (tasks-semana) for CRM tasks and Mi Semana.\n";
p4 += "Use read_file/grep. Inspect:\n";
p4 += "- src/app/admin/(dashboard)/tareas/**, mi-semana/**, tareas/plantillas\n";
p4 += "- src/features/admin/tasks/**, src/lib/queries/crmTasks.ts (and similar)\n";
p4 += "- cron /api/cron/rollover-tasks if present, task template unique index behavior\n";
p4 += "Find: ownership guards for admin_limited_tasks, race on rollover, create/edit/status transitions,\n";
p4 += "missing validation on due dates/assignees, UI accepting invalid states, silent failures in actions.\n";
p4 += "area=tasks-semana. List inputs_checked. Concrete path+evidence findings only.\n";
audit_jobs.push(#{
    prompt: p4,
    label: "tasks-semana",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

// 5 finance-invoices-pnl
let p5 = "";
p5 += "You are agent 5/5 (finance-invoices-pnl) for CRM finance surfaces.\n";
p5 += "Use read_file/grep. Inspect:\n";
p5 += "- src/app/admin/(dashboard)/finanzas/**, facturacion/**, pl/**, gastos/** if linked\n";
p5 += "- src/features/admin/invoices/**, pnl/**, finance-dashboard/**, finance-payroll/**\n";
p5 += "- src/lib/queries/invoices.ts, pnl.ts, financeDashboard/**, related extract/import actions\n";
p5 += "Prioritize correctness: double-counting, wrong status filters (must treat cobrada+pagada as settled),\n";
p5 += "missing requireRole on money mutations, private blob invoice links, import parsers, bank recon,\n";
p5 += "P&L filters that drop rows, hub routing finanzas vs pl vs facturacion inconsistency.\n";
p5 += "Check form inputs: invoice create/edit, status changes, extract-action, imports, filters.\n";
p5 += "area=finance-invoices-pnl. inputs_checked required. root_cause_hint on every finding.\n";
audit_jobs.push(#{
    prompt: p5,
    label: "finance-invoices-pnl",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

log("Launching exactly 5 parallel CRM /admin audit agents");
let audit_results = parallel(audit_jobs);

// ── Phase 2: synthesize (no extra agents — keep count at 5) ─────────────
phase("Synthesize");

let report = "# CRM Admin QA — 5-Agent Workflow Report\n\n";
report += "Generated by crm-admin-qa-5 (exactly 5 domain audit agents).\n\n";
report += "## Agent roles\n\n";
report += "1. shell-nav-auth\n";
report += "2. brands-talents\n";
report += "3. campaigns-deals-contracts\n";
report += "4. tasks-semana\n";
report += "5. finance-invoices-pnl\n\n";

let all_findings_text = "";
let p0_count = 0;
let p1_count = 0;
let p2_count = 0;
let i = 0;
for r in audit_results {
    i += 1;
    if r == () || !r.success || r.output == () {
        report += "### Agent slot " + i.to_string() + ": FAILED or empty\n\n";
    } else {
        let o = r.output;
        let area = o.area;
        if area == () { area = "unknown"; }
        report += "### " + area + "\n";
        report += "- severity_max: " + o.severity_max + "\n";
        if o.notes != () {
            report += "- notes: " + o.notes + "\n";
        }
        report += "\n**Inputs checked:**\n";
        if o.inputs_checked != () {
            for inp in o.inputs_checked {
                report += "- " + inp + "\n";
            }
        }
        report += "\n**Findings:**\n";
        if o.findings != () {
            for f in o.findings {
                let sev = f.severity;
                let title = f.title;
                let path = f.path;
                let evidence = f.evidence;
                let root = f.root_cause_hint;
                if root == () { root = ""; }
                report += "- [" + sev + "] " + title + " (`" + path + "`)\n";
                report += "  - evidence: " + evidence + "\n";
                report += "  - root_cause_hint: " + root + "\n";
                all_findings_text += "[" + sev + "] " + area + ": " + title + " | " + path + "\n";
                if sev == "P0" { p0_count += 1; }
                if sev == "P1" { p1_count += 1; }
                if sev == "P2" { p2_count += 1; }
            }
        }
        report += "\n**Improvements:**\n";
        if o.improvements != () {
            for imp in o.improvements {
                report += "- " + imp + "\n";
            }
        }
        report += "\n";
    }
}

report += "## Severity counts\n\n";
report += "- P0: " + p0_count.to_string() + "\n";
report += "- P1: " + p1_count.to_string() + "\n";
report += "- P2: " + p2_count.to_string() + "\n\n";
report += "## Flat finding index\n\n";
report += all_findings_text;
report += "\n## Agent count\n\nExactly 5 agents (domain audits only; synthesis is script-side).\n";

let path = write_scratch_file("crm-admin-qa-5-report.md", report);
log("CRM QA 5-agent workflow complete; report written");
complete(#{ path: path, report: report, agent_count: 5, p0: p0_count, p1: p1_count, p2: p2_count });
