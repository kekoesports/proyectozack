let meta = #{
    name: "crm-admin-qa",
    description: "10-agent CRM /admin QA: module audits + stress concurrent reads/API, findings for fixes",
    phases: [
        #{ title: "Audit", detail: "8 parallel read-only module audits" },
        #{ title: "Stress", detail: "2 stress agents: concurrent reads + API concurrency" },
        #{ title: "Synthesize", detail: "merge findings for prioritization" },
    ],
    when_to_use: "CRM /admin QA pass, stress local admin routes, surface fixable improvements",
};

let findings_schema = #{
    "type": "object",
    "required": ["area", "findings", "improvements", "severity_max"],
    "properties": #{
        "area": #{ "type": "string" },
        "findings": #{
            "type": "array",
            "maxItems": 10,
            "items": #{
                "type": "object",
                "required": ["severity", "title", "evidence", "path"],
                "properties": #{
                    "severity": #{ "type": "string" },
                    "title": #{ "type": "string" },
                    "evidence": #{ "type": "string" },
                    "path": #{ "type": "string" },
                    "fixable": #{ "type": "boolean" },
                },
            },
        },
        "improvements": #{
            "type": "array",
            "maxItems": 8,
            "items": #{ "type": "string" },
        },
        "severity_max": #{ "type": "string" },
        "notes": #{ "type": "string" },
    },
};

let stress_schema = #{
    "type": "object",
    "required": ["area", "ran", "summary", "observations", "errors", "p95_ms_estimate"],
    "properties": #{
        "area": #{ "type": "string" },
        "ran": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
        "observations": #{
            "type": "array",
            "maxItems": 12,
            "items": #{ "type": "string" },
        },
        "errors": #{ "type": "integer" },
        "p95_ms_estimate": #{ "type": "integer" },
        "rps_estimate": #{ "type": "number" },
        "tool_gap": #{ "type": "string" },
        "findings": #{
            "type": "array",
            "maxItems": 8,
            "items": #{
                "type": "object",
                "required": ["severity", "title", "evidence", "path"],
                "properties": #{
                    "severity": #{ "type": "string" },
                    "title": #{ "type": "string" },
                    "evidence": #{ "type": "string" },
                    "path": #{ "type": "string" },
                    "fixable": #{ "type": "boolean" },
                },
            },
        },
    },
};

// ── Phase 1: 8 parallel audits ──────────────────────────────────────────
phase("Audit");

let audit_jobs = [];

// 1 route-inventory
let p1 = "";
p1 += "You are agent 1/10 (route-inventory) for SocialPro CRM QA under /admin.\n";
p1 += "Use read_file, list_dir, grep only. Do NOT invent files — inspect the repo.\n";
p1 += "1) Inventory src/app/admin/** page.tsx routes (dashboard modules).\n";
p1 += "2) Cross-check e2e/admin-smoke.spec.ts and e2e/admin-navigation.spec.ts for coverage gaps.\n";
p1 += "3) Flag orphan pages (no nav link), dead routes, inconsistent naming (pl vs finanzas/pl).\n";
p1 += "4) Check layout.tsx auth guard wiring.\n";
p1 += "Report max 10 findings {severity:P0|P1|P2, title, evidence, path, fixable}.\n";
p1 += "area=route-inventory. severity_max=highest among findings or none. Empty findings only after real inspection.\n";
audit_jobs.push(#{
    prompt: p1,
    label: "route-inventory",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

// 2 permissions-visibility
let p2 = "";
p2 += "You are agent 2/10 (permissions-visibility) for SocialPro CRM /admin.\n";
p2 += "Use read_file/grep. Read src/lib/permissions.ts, src/lib/auth-guard.ts, admin layout.\n";
p2 += "1) Map roles to module access. Note admin_limited_tasks ownership guards.\n";
p2 += "2) Find pages/actions missing requireRole or weaker checks than siblings.\n";
p2 += "3) Dev auth bypass: document if requireRole mocks session and impact on QA.\n";
p2 += "4) Search/global visibility filters for staff vs admin.\n";
p2 += "Report findings with path+evidence. area=permissions-visibility.\n";
audit_jobs.push(#{
    prompt: p2,
    label: "permissions-visibility",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

// 3 campaigns-deals
let p3 = "";
p3 += "You are agent 3/10 (campaigns-deals) for CRM campaigns module.\n";
p3 += "Inspect src/app/admin/(dashboard)/campanas/**, src/lib/queries/campaigns.ts, related Server Actions.\n";
p3 += "Also deal-trackers / entregables if linked. Look for: wrong amountBrand/amountTalent treated as real payments,\n";
p3 += "N+1 queries, missing error boundaries, unsafe any, broken private blob URLs on files.\n";
p3 += "Use grep/read_file. area=campaigns-deals. Concrete findings only.\n";
audit_jobs.push(#{
    prompt: p3,
    label: "campaigns-deals",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

// 4 tasks-semana
let p4 = "";
p4 += "You are agent 4/10 (tasks-semana) for CRM tasks and Mi Semana.\n";
p4 += "Inspect src/app/admin/(dashboard)/tareas/**, mi-semana/**, src/lib/queries/crmTasks.ts,\n";
p4 += "cron /api/cron/rollover-tasks, task templates unique index behavior.\n";
p4 += "Look for race conditions on rollover, missing ownership for admin_limited_tasks, UI states.\n";
p4 += "area=tasks-semana. Concrete path+evidence findings.\n";
audit_jobs.push(#{
    prompt: p4,
    label: "tasks-semana",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

// 5 finance-pnl-invoices
let p5 = "";
p5 += "You are agent 5/10 (finance-pnl-invoices) for CRM finance surface.\n";
p5 += "Inspect finanzas/**, facturacion/**, pl/**, src/lib/queries/invoices.ts and P&L related queries.\n";
p5 += "Gotchas: invoice_status cobrada AND pagada both settled; campaigns amounts != real payments.\n";
p5 += "Find double-counting, wrong status filters, missing requireRole on money mutations, private blob invoice links.\n";
p5 += "area=finance-pnl-invoices. Prioritize correctness bugs over style.\n";
audit_jobs.push(#{
    prompt: p5,
    label: "finance-pnl-invoices",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

// 6 brands-talents
let p6 = "";
p6 += "You are agent 6/10 (brands-talents) for CRM brands and talents modules.\n";
p6 += "Inspect admin brands/**, talents/**, queries brands/crmBrands/talents, edit/negocio/seo pages.\n";
p6 += "Check: parseFollowers edge cases, platform key mismatch (yt/tw vs youtube/twitch), private file URLs,\n";
p6 += "list/detail error handling, slow pages (unbounded queries).\n";
p6 += "area=brands-talents.\n";
audit_jobs.push(#{
    prompt: p6,
    label: "brands-talents",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

// 7 search-global-nav
let p7 = "";
p7 += "You are agent 7/10 (search-global-nav) for global search and admin navigation.\n";
p7 += "Inspect src/lib/queries/search.ts, /api/admin/search, admin sidebar/nav components, layout.\n";
p7 += "Find: missing modules in search index, visibility filter bugs, nav links to missing routes,\n";
p7 += "duplicate nav entries, poor empty states for search.\n";
p7 += "area=search-global-nav.\n";
audit_jobs.push(#{
    prompt: p7,
    label: "search-global-nav",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

// 8 error-loading-states
let p8 = "";
p8 += "You are agent 8/10 (error-loading-states) for CRM resilience UX.\n";
p8 += "Inspect src/app/admin/** for error.tsx, loading.tsx, not-found; Server Action error returns;\n";
p8 += "empty states on list pages; uncaught throws in page.tsx data fetches.\n";
p8 += "Flag modules missing error.tsx while siblings have one; silent catch that swallows errors.\n";
p8 += "area=error-loading-states.\n";
audit_jobs.push(#{
    prompt: p8,
    label: "error-loading-states",
    capability_mode: "read-only",
    output_schema: findings_schema,
});

log("Launching 8 parallel CRM audit agents");
let audit_results = parallel(audit_jobs);

// ── Phase 2: 2 stress agents (serialized to avoid thrashing local server) ─
phase("Stress");

let s9 = "";
s9 += "You are agent 9/10 (stress-concurrent-reads) — STRESS TEST for local CRM.\n";
s9 += "Local app: http://localhost:3000 (Next.js already running).\n";
s9 += "k6 is NOT available — use bash concurrent HTTP (curl/xargs or a small node script).\n";
s9 += "1) Hit these paths concurrently (20-50 parallel requests each wave, 2-3 waves):\n";
s9 += "   /admin /admin/login /admin/brands /admin/talents /admin/campanas /admin/tareas\n";
s9 += "   /admin/mi-semana /admin/finanzas /admin/facturacion /admin/cases /admin/equipo\n";
s9 += "2) Record HTTP status distribution, latency samples, connection errors, 5xx counts.\n";
s9 += "3) Write raw output summary under project .qa-evidence/ if writable, else stdout analysis.\n";
s9 += "4) Note auth redirects (307 to login) vs 200 vs errors — do NOT claim auth bypass success without evidence.\n";
s9 += "Set ran=true only if you actually executed commands. area=stress-concurrent-reads.\n";
s9 += "errors=count of failed/5xx. p95_ms_estimate from samples. observations=concrete numbers.\n";
s9 += "tool_gap note if k6 missing. findings for any fixable server issues under load.\n";

let stress_reads = agent(s9, #{
    label: "stress-concurrent-reads",
    capability_mode: "execute",
    output_schema: stress_schema,
});

let s10 = "";
s10 += "You are agent 10/10 (stress-api-concurrency) — STRESS TEST admin API/search concurrency.\n";
s10 += "Local: http://localhost:3000. k6 missing — use concurrent curl/node.\n";
s10 += "1) Concurrent GET /api/admin/search?q=test (and similar admin APIs you discover via grep of src/app/api/admin).\n";
s10 += "2) Concurrent GET public health-ish pages mixed with admin redirects — 30 parallel for 3 rounds.\n";
s10 += "3) Do NOT POST destructive mutations (no invoice deletes, no bulk DB writes).\n";
s10 += "4) Capture status codes, timeouts, rate-limit bodies, stack traces if any.\n";
s10 += "Set ran=true only after real execution. area=stress-api-concurrency.\n";
s10 += "Fill summary, observations, errors, p95_ms_estimate, optional findings.\n";

let stress_api = agent(s10, #{
    label: "stress-api-concurrency",
    capability_mode: "execute",
    output_schema: stress_schema,
});

// ── Phase 3: synthesize ─────────────────────────────────────────────────
phase("Synthesize");

let report = "# CRM Admin QA — Workflow Report\n\n";
report += "Generated by crm-admin-qa workflow (10 agents).\n\n";
report += "## Audit agents\n\n";

let all_findings_text = "";
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
        report += "\n**Findings:**\n";
        if o.findings != () {
            for f in o.findings {
                let sev = f.severity;
                let title = f.title;
                let path = f.path;
                let evidence = f.evidence;
                report += "- [" + sev + "] " + title + " (`" + path + "`) — " + evidence + "\n";
                all_findings_text += "[" + sev + "] " + area + ": " + title + " | " + path + "\n";
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

report += "## Stress agents\n\n";

if stress_reads != () && stress_reads.success && stress_reads.output != () {
    let o = stress_reads.output;
    report += "### stress-concurrent-reads\n";
    report += "- ran: " + o.ran.to_string() + "\n";
    report += "- errors: " + o.errors.to_string() + "\n";
    report += "- p95_ms_estimate: " + o.p95_ms_estimate.to_string() + "\n";
    report += "- summary: " + o.summary + "\n";
    if o.observations != () {
        report += "**Observations:**\n";
        for obs in o.observations {
            report += "- " + obs + "\n";
        }
    }
    if o.tool_gap != () {
        report += "- tool_gap: " + o.tool_gap + "\n";
    }
    report += "\n";
} else {
    report += "### stress-concurrent-reads: FAILED\n\n";
}

if stress_api != () && stress_api.success && stress_api.output != () {
    let o = stress_api.output;
    report += "### stress-api-concurrency\n";
    report += "- ran: " + o.ran.to_string() + "\n";
    report += "- errors: " + o.errors.to_string() + "\n";
    report += "- p95_ms_estimate: " + o.p95_ms_estimate.to_string() + "\n";
    report += "- summary: " + o.summary + "\n";
    if o.observations != () {
        report += "**Observations:**\n";
        for obs in o.observations {
            report += "- " + obs + "\n";
        }
    }
    report += "\n";
} else {
    report += "### stress-api-concurrency: FAILED\n\n";
}

report += "## Flat finding index\n\n";
report += all_findings_text;
report += "\n## Agent count\n\nExactly 10 agents: 8 audit + 2 stress.\n";

let path = write_scratch_file("crm-admin-qa-report.md", report);
log("CRM QA workflow complete; report written");
complete(#{ path: path, report: report, agent_count: 10 });
