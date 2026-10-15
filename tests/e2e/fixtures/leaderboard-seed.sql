-- Browser-test seed for the leaderboard: 12 players, one username, verified rounds over 10 days.
-- Load it into an empty, migrated database before `pnpm test:e2e` (see .github/workflows/ci.yml).
TRUNCATE rounds, round_entries, best_all_time, credentials, players, handles, rate_limits CASCADE;

CREATE TEMP TABLE seed (n int, en text, ar text, hours numeric, t10 int, t50 int, t100 int);
INSERT INTO seed VALUES
 (1,'Swift Falcon','صقر سريع',0.2,72400,0,0),
 (2,'Brave Lion','أسد شجاع',2,78000,0,0),
 (3,'Quick Fox','ثعلب خفيف',5,86900,0,0),
 (4,'Lucky Heron','مالك الحزين',0.25,96700,0,0),
 (5,'Calm Eagle','نسر هادئ',3,98100,0,0),
 (6,'Bold Panther','فهد جريء',20,99800,0,0),
 (7,'Gentle Owl','بومة لطيفة',30,101200,0,0),
 (8,'Mighty Bear','دب قوي',60,104000,0,0),
 (9,'Clever Wolf','ذئب ذكي',100,105500,0,0),
 (10,'Sunny Gazelle','غزال مشمس',150,108900,0,0),
 (11,'Noble Hawk','باز نبيل',200,112300,0,0),
 (12,'Proud Stallion','حصان فخور',235,118000,0,0);

INSERT INTO players (id, created_at, last_seen_at, nickname_en, nickname_ar)
SELECT ('00000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, now() - interval '12 days', now(), en, ar FROM seed;

INSERT INTO handles (id, player_id, display, skeleton, created_at)
VALUES ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Omar K.', 'omark', now());
UPDATE players SET handle_id = '10000000-0000-4000-8000-000000000001' WHERE id = '00000000-0000-4000-8000-000000000001';

INSERT INTO rounds (id, player_id, mode, lang, catalog_version, status, started_at, finished_at, elapsed_ms, score_key)
SELECT gen_random_uuid(), ('00000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 't10', 'en', 'seed', 'verified',
  now() - make_interval(secs => hours * 3600 + t10 / 1000.0), now() - make_interval(secs => hours * 3600), t10, t10
FROM seed;

-- Mode 50: a few players, mostly older, so the periods differ.
INSERT INTO rounds (id, player_id, mode, lang, catalog_version, status, started_at, finished_at, elapsed_ms, score_key)
SELECT gen_random_uuid(), ('00000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 't50', 'en', 'seed', 'verified',
  now() - make_interval(secs => hours * 3600 + 400), now() - make_interval(secs => hours * 3600), 400000 + n * 9000, 400000 + n * 9000
FROM seed WHERE n IN (1, 3, 6, 9, 11);

INSERT INTO best_all_time (mode, player_id, round_id, score_key, elapsed_ms, achieved_at)
SELECT DISTINCT ON (mode, player_id) mode, player_id, id, score_key, elapsed_ms, finished_at
FROM rounds WHERE status = 'verified' ORDER BY mode, player_id, score_key, finished_at;
-- t100 stays empty on purpose.

-- Session cookie nxc_s=lb-demo-token signs in as player 8 (Mighty Bear).
INSERT INTO credentials (token_hash, player_id, kind, created_at, expires_at)
VALUES ('cd496f7daf8e7313e1ec4807a63d8be1d8a6221a2d5324e749400e0c90abebbf', '00000000-0000-4000-8000-000000000008', 'session', now(), now() + interval '30 days');
