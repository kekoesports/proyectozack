-- Normalize legacy platform shorthand keys in talent_socials to canonical names.
-- Audited 2026-05-12: yt→youtube (62 records), ig→instagram (5 records).
-- tw, tt, twitter included defensively (0 records currently).

UPDATE talent_socials SET platform = 'youtube'   WHERE platform = 'yt';
UPDATE talent_socials SET platform = 'instagram' WHERE platform = 'ig';
UPDATE talent_socials SET platform = 'twitch'    WHERE platform = 'tw';
UPDATE talent_socials SET platform = 'tiktok'    WHERE platform = 'tt';
UPDATE talent_socials SET platform = 'x'         WHERE platform = 'twitter';
