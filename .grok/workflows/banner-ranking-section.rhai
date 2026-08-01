let meta = #{
    name: "banner-ranking-section",
    description: "Verify monthly points ranking lives under #ranking (banner nav) as a full-width leaderboard, not only inside RewardsHub",
    phases: [
        #{ title: "Structure", detail: "nav #ranking + landing section wiring" },
        #{ title: "Hub demotion", detail: "RewardsHub no longer owns ranking tab" },
        #{ title: "Summary", detail: "structured report" },
    ],
    when_to_use: "After changes to giveaway PlatformNav, PlatformCreatorLanding ranking section, or RewardsHub tabs",
};

let structure_schema = #{
    "type": "object",
    "required": ["ok", "notes"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "notes": #{ "type": "string" },
        "nav_href": #{ "type": "string" },
        "has_ranking_id": #{ "type": "boolean" },
        "monthly_in_ranking_section": #{ "type": "boolean" },
    },
};

let hub_schema = #{
    "type": "object",
    "required": ["ok", "notes"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "notes": #{ "type": "string" },
        "ranking_tab_removed": #{ "type": "boolean" },
        "hub_tabs": #{ "type": "string" },
    },
};

phase("Structure");
let structure = agent(
    "Read-only verification of giveaway banner ranking wiring. Use read_file/grep only.\n"
    + "1) Open src/features/giveaway-platform/components/PlatformNav.tsx — confirm NAV_ITEMS has Ranking with href exactly #ranking.\n"
    + "2) Open PlatformCreatorLanding.tsx — confirm a section or wrapper with id=\"ranking\" exists and renders MonthlyPointsRanking (or equivalent monthly points UI) inside it.\n"
    + "3) Confirm MonthlyPointsRanking is NOT only rendered from RewardsHub ranking tab as the sole placement.\n"
    + "Set ok=true only if all hold. Fill nav_href, has_ranking_id, monthly_in_ranking_section, and notes with evidence (file paths).",
    #{
        label: "structure-check",
        capability_mode: "read-only",
        output_schema: structure_schema,
    },
);

phase("Hub demotion");
let hub = agent(
    "Read-only: open RewardsHub.tsx. Confirm TabKey/TABS no longer include a ranking tab as primary ranking UX (shop + raffles only, or ranking clearly demoted/removed). "
    + "Confirm MonthlyPointsRanking is not the main content of a RewardsHub tab named Ranking mensual. "
    + "Set ranking_tab_removed=true if ranking is gone from hub tabs. Set ok=true only then. notes + hub_tabs summary required.",
    #{
        label: "hub-demotion",
        capability_mode: "read-only",
        output_schema: hub_schema,
    },
);

phase("Summary");
let s_ok = structure != () && structure.success && structure.output != () && structure.output.ok == true;
let h_ok = hub != () && hub.success && hub.output != () && hub.output.ok == true;
let report = "banner-ranking-section\n";
report += "structure_ok=" + s_ok.to_string() + "\n";
report += "hub_ok=" + h_ok.to_string() + "\n";
if structure != () && structure.success && structure.output != () {
    report += "structure_notes=" + structure.output.notes + "\n";
}
if hub != () && hub.success && hub.output != () {
    report += "hub_notes=" + hub.output.notes + "\n";
}
let path = write_scratch_file("banner-ranking-report.md", report);
if s_ok && h_ok {
    complete(#{ path: path, report: report, ok: true });
}
complete(#{ path: path, report: report, ok: false });
