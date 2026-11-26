-- GramSetu (VGMP) DEVELOPMENT-ONLY Demo Seed Data
-- DO NOT run this file in production. It creates active demo Panchayat accounts
-- with shared default password `'admin'` strictly for local development testing.

USE `vgmp`;

INSERT IGNORE INTO `panchayaths` (`id`, `name`, `username`, `password`, `email`, `phone`, `status`, `created_at`) VALUES
(1, 'Kondapalli Panchayath', 'kondapalli', 'admin', 'kondapalli@panchayath.in', NULL, 'active', '2026-06-25 10:51:43'),
(2, 'Guntur Panchayath', 'guntur', 'admin', 'guntur@panchayath.in', NULL, 'active', '2026-06-25 10:51:43'),
(3, 'Narasaraopet Panchayath', 'narasaraopet', 'admin', 'narasaraopet@panchayath.in', NULL, 'active', '2026-06-25 10:51:43');

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

