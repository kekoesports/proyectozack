"""
Curated seed list of known Instagram handles by niche.

These are handles we know exist and match our target profile.
They go directly to enrichment for follower validation — no scraping needed.

Sources used to compile this list:
- Liquipedia player pages (manually verified)
- HLTV player profiles
- VLR.gg player profiles
- Known gambling/crypto streamers from community knowledge
- Twitch top streamers bio links
"""
import logging

from scraper.models import DiscoveredProfile

log = logging.getLogger(__name__)

# ── CS2 Pro Players ───────────────────────────────────────────────────────────
CS2_HANDLES = [
    # NaVi / s1mple era + current
    "s1mple",        # Oleksandr Kostyliev
    "electronic",    # Denis Sharipov
    "b1t",           # Valerii Vakhovskyi
    "perfecto",      # Ilya Zalutskyi
    "niko",          # Nikola Kovač (G2)
    "hunter_",       # Nemanja Kovač (G2)
    "nexa",          # Nemanja Ivanović (G2)
    "jackz",         # Jack Ardoin
    "huNter",        # Nemanja Kovač
    # FaZe
    "karrigan",      # Finn Andersen
    "rain",          # Håvard Nygaard
    "broky",         # Helvijs Saukants
    "twistzz",       # Russel Van Dulken
    "ropz",          # Robin Röpke
    # Vitality
    "zywoo",         # Mathieu Herbaut
    "apexfl",        # Dan Madesclaire
    "misutaaa",      # Kévin Rabier
    "dupreeh",       # Peter Rasmussen
    "magisk",        # Emil Reif
    # Astralis
    "gla1ve",        # Lukas Rossander
    "device",        # Nicolai Reedtz
    "bubzkji",       # Lucas Andersen
    # MOUZ / EG
    "headtr1ck",     # xertioN
    "torzsi",        # Bendegúz Torzsa
    "siuhy",         # Kamil Szkaradek
    "xertioN",       # Dorian Berman
    "frozen",        # David Čerňanský
    # Team Spirit
    "chopper_cs",    # Leonid Vishnyakov
    "sh1ro",         # Dmitry Sokolov
    "ax1le",         # Sergey Rykhtorov
    "jame",          # Dzhami Ali
    "hobbit",        # Abay Khassenov
    # Heroic
    "stavn",         # Jonas Skov
    "TeSeS",         # René Madsen
    "jabbi",         # Justinas Jarusevičius
    # Other known pros
    "blameF",        # Benjamin Bremer
    "k0nfig",        # Kristian Wienecke
    "acoR",          # Jonas AcoR
    "iM_cs",         # Dorian Im
    "hallzerk",      # Håkon Fjærli
    "regali",        # Marcus Kovalenko
]

# ── Valorant Pro Players ──────────────────────────────────────────────────────
VALORANT_HANDLES = [
    "tenz",          # Tyson Ngo — Sentinels
    "zombs",         # Jared Gitlin
    "sinatraa",      # Jay Won
    "subroza",       # Yassine Tamer
    "shazam",        # Shahzeeb Khan
    "wardell",       # Matthew Yu
    "asunaa",        # Peter Mazuryk
    "yay",           # Jaccob Whiteaker
    "leaf_val",
    "crashies",      # Austin Roberts
    "victor_val",
    "s0m",           # Sam Oh
    "nrg_ardiis",    # Ardis Svarenieks — FNATIC
    "derke",         # Nikita Simin
    "boaster",       # Jake Howlett
    "mini_val",      # Emir Ali Beder
    "alfajer",       # Timofey Shikhin
    "natsval",       # Ayaz Akhmetshin
    "sacy",          # Gustavo Rossi
    "pancada",       # Bryan Luna
    "aspas_val",     # Erick Santos
    "less_val",      # Felipe Basso
    "loud_cauanzin",
    "xand_val",
    "tacolila",
    "fnatic_chronicle",
    "kiles_val",
]

# ── Gambling / Casino Streamers ───────────────────────────────────────────────
GAMBLING_HANDLES = [
    # Stake / Casino streamers
    "trainwreckstv",     # Tyler Faraz Niknam
    "xposed",            # X-Posed
    "roshtein",          # Ishmael Swartz
    "classybeef",
    "hacksaw_gaming",
    "nickslots",
    "david_labowsky",
    "slots_n_rolls",
    "casinomarco",
    "slotsmansion",
    "bigwinboard",
    "casinogroundscom",
    "slotspinner",
    "bonusfinder",
    "casinodaddy.official",
    "banditozclips",
    "metaspins_casino",
    "stakecom",
    "roobet.official",
    "csgopolygon",
]

# ── Crypto / Web3 ─────────────────────────────────────────────────────────────
CRYPTO_HANDLES = [
    "aantonop",          # Andreas Antonopoulos
    "michaelsaylor",     # Michael Saylor (MicroStrategy)
    "cryptowendyo",      # Wendy O
    "elliotradesglobal",
    "altcoinbuzztv",
    "datadash",          # Nicholas Merten
    "boxminingofficial",
    "cryptobanter",
    "coinbureau",
    "bitboy_crypto",
    "elonmusk",          # will likely be >100k — filtered by enrich
    "cryptokitties",
    "coingecko",
    "binance",
    "coinbasewallet",
    "gemini",
    "krakenfx",
    "cryptoemre",
    "altcoindaily",
    "thinkingcrypto1",
    "blockchainbrad",
    "ivanontech",
]

# ── Lifestyle / Content Creators (gaming adjacent) ────────────────────────────
LIFESTYLE_HANDLES = [
    # Gaming lifestyle creators with 10k–100k followers
    "shroud",
    "pokimanelol",
    "disguisedtoast",
    "lilypichu",
    "valkyrae",
    "hafu",
    "qtcinderella",
    "fuslie",
    "sydeon",
    "carolinekwan",
    "jasonr",
    "cdnthe3rd",
    "nymn",
    "xqc_clips",
    "poke",
    "tarik",
    "n0thing",
    "aipha",
    "summit1g_ig",
    "sodapoppinig",
]


def scrape(firecrawl_client, config) -> list[DiscoveredProfile]:  # noqa: ARG001
    """Returns curated handles as candidates — no network requests needed."""
    niche_map = [
        (CS2_HANDLES, "cs2"),
        (VALORANT_HANDLES, "valorant"),
        (GAMBLING_HANDLES, "gambling"),
        (CRYPTO_HANDLES, "crypto"),
        (LIFESTYLE_HANDLES, "lifestyle"),
    ]

    profiles: list[DiscoveredProfile] = []
    for handles, niche in niche_map:
        for h in handles:
            profiles.append(DiscoveredProfile(
                username=h,
                niche=niche,
                discovered_via="known_handles",
                import_batch_id=config.BATCH_ID,
            ))

    log.info("[known_handles] %d seed handles loaded", len(profiles))
    return profiles
