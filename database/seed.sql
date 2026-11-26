-- GramSetu (VGMP) Reference Seed Data (Production-Safe)
-- Uses INSERT IGNORE so existing records and primary keys are preserved.
-- NOTE: Panchayat accounts are seeded INACTIVE with disabled placeholder passwords.
-- Generate unique bcrypt hashes via `cd server && node scripts/generateHash.js <strong_password>`
-- before activating accounts in production. For local development demo accounts, use `seed.dev.sql`.

USE `vgmp`;

INSERT IGNORE INTO `panchayaths` (`id`, `name`, `username`, `password`, `email`, `phone`, `status`, `created_at`) VALUES
(1, 'Kondapalli Panchayath', 'kondapalli', '!DISABLED_SET_UNIQUE_BCRYPT_HASH!', 'kondapalli@panchayath.in', NULL, 'inactive', '2026-06-25 10:51:43'),
(2, 'Guntur Panchayath', 'guntur', '!DISABLED_SET_UNIQUE_BCRYPT_HASH!', 'guntur@panchayath.in', NULL, 'inactive', '2026-06-25 10:51:43'),
(3, 'Narasaraopet Panchayath', 'narasaraopet', '!DISABLED_SET_UNIQUE_BCRYPT_HASH!', 'narasaraopet@panchayath.in', NULL, 'inactive', '2026-06-25 10:51:43');

INSERT IGNORE INTO `villages` (`id`, `name`, `panchayath_id`, `status`, `created_at`) VALUES
(1, 'Kondapalli', 1, 'active', '2026-06-25 10:51:43'),
(2, 'Pedakakani', 1, 'active', '2026-06-25 10:51:43'),
(3, 'Kollipara', 1, 'active', '2026-06-25 10:51:43'),
(4, 'Guntur', 2, 'active', '2026-06-25 10:51:43'),
(5, 'Tenali', 2, 'active', '2026-06-25 10:51:43'),
(6, 'Mangalagiri', 2, 'active', '2026-06-25 10:51:43'),
(7, 'Narasaraopet', 3, 'active', '2026-06-25 10:51:43'),
(8, 'Chilakaluripet', 3, 'active', '2026-06-25 10:51:43'),
(9, 'Gurazala', 3, 'active', '2026-06-25 10:51:43');
