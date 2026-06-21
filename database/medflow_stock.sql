-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : dim. 21 juin 2026 à 19:09
-- Version du serveur : 8.4.7
-- Version de PHP : 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `medflow_stock`
--

-- --------------------------------------------------------

--
-- Structure de la table `alert`
--

DROP TABLE IF EXISTS `alert`;
CREATE TABLE IF NOT EXISTS `alert` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `is_read` bit(1) NOT NULL,
  `message` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stock_id` bigint DEFAULT NULL,
  `pharmacist_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `alert`
--

INSERT INTO `alert` (`id`, `created_at`, `is_read`, `message`, `stock_id`, `pharmacist_id`) VALUES
(5, '2026-04-12 09:41:33.514910', b'0', '🔵 INFO: Aspirin expire dans moins d’un mois', 24, 0xcefef67325d44f8da268a7581397ee78),
(6, '2026-04-12 10:52:31.699545', b'0', '🟡 ATTENTION: Ibuprofen expire dans moins de 7 jours', 16, 0xcefef67325d44f8da268a7581397ee78),
(7, '2026-04-14 21:39:42.574064', b'0', '🟡 ATTENTION: Tamiflu will expire in less than 7 days', 31, 0xcefef67325d44f8da268a7581397ee78),
(8, '2026-04-14 21:39:42.817927', b'0', '🟡 ATTENTION: Bepanthen will expire in less than 7 days', 33, 0x30786365666566363733323564343466),
(9, '2026-04-21 16:28:43.724011', b'0', '🔵 INFO: Amoxil will expire in less than one month', 28, NULL),
(10, '2026-05-15 10:13:21.809235', b'0', '🔵 INFO: Augmentin will expire in less than one month', 27, 0xcefef67325d44f8da268a7581397ee78);

-- --------------------------------------------------------

--
-- Structure de la table `delivery`
--

DROP TABLE IF EXISTS `delivery`;
CREATE TABLE IF NOT EXISTS `delivery` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `delivery_agent_id` binary(16) DEFAULT NULL,
  `delivery_date` datetime(6) DEFAULT NULL,
  `delivery_status` enum('DELIVERED','IN_PROGRESS','PENDING') COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` bigint DEFAULT NULL,
  `tracking_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_id` bigint DEFAULT NULL,
  `delivery_agent_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK3mj49kc0akme6a7t1ya6xf0a2` (`request_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `delivery`
--

INSERT INTO `delivery` (`id`, `delivery_agent_id`, `delivery_date`, `delivery_status`, `supplier_id`, `tracking_number`, `request_id`, `delivery_agent_name`, `vehicle_type`) VALUES
(2, 0x31000000000000000000000000000000, '2026-03-28 09:00:00.000000', 'PENDING', 2, 'TRK123456', NULL, NULL, NULL),
(5, 0xb29bd49b56ab42a09e81c913dbc7553c, '2026-04-14 12:15:51.008711', 'IN_PROGRESS', NULL, 'TRK-13', 13, 'Hela Rahrah', 'BIKE'),
(6, 0xb29bd49b56ab42a09e81c913dbc7553c, '2026-04-14 12:25:46.469425', 'PENDING', NULL, 'TRK-14', 14, 'Hela Rahrah', 'BIKE'),
(7, 0xb29bd49b56ab42a09e81c913dbc7553c, '2026-04-14 15:23:21.513116', 'DELIVERED', NULL, 'TRK-22', 22, 'Hela Rahrah', 'BIKE'),
(8, 0xb29bd49b56ab42a09e81c913dbc7553c, '2026-04-15 10:59:05.918305', 'PENDING', NULL, 'TRK-24', 24, 'Hela Rahrah', 'BIKE'),
(9, 0xb29bd49b56ab42a09e81c913dbc7553c, '2026-04-21 20:43:43.895953', 'PENDING', NULL, 'TRK-26', 26, 'Hela Rahrah', 'BIKE'),
(11, 0x19e1297bdc704d1bb312d89509c59cfc, '2026-04-26 16:40:39.432977', 'PENDING', NULL, 'TRK-31', 31, 'Yassine Rahrah', 'CAR'),
(12, 0xb29bd49b56ab42a09e81c913dbc7553c, '2026-04-26 17:57:21.591103', 'PENDING', NULL, 'TRK-34', 34, 'Hela Rahrah', 'BIKE'),
(13, 0x19e1297bdc704d1bb312d89509c59cfc, '2026-04-27 17:15:23.358774', 'PENDING', NULL, 'TRK-30', 30, 'Yassine Rahrah', 'CAR');

-- --------------------------------------------------------

--
-- Structure de la table `pharmacy_product`
--

DROP TABLE IF EXISTS `pharmacy_product`;
CREATE TABLE IF NOT EXISTS `pharmacy_product` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `dosage` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `form` enum('CAPSULE','CREAM','DROPS','INJECTION','SYRUP','TABLET') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manufacturer` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prescription_type` enum('OVER_THE_COUNTER','PRESCRIPTION_REQUIRED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('ANALGESIC','ANTIBIOTIC','ANTISEPTIC','ANTIVIRAL','ANTI_INFLAMMATORY','VITAMIN') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qr_code_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warnings` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usage_instructions` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `pharmacy_product`
--

INSERT INTO `pharmacy_product` (`id`, `dosage`, `form`, `manufacturer`, `prescription_type`, `product_name`, `type`, `description`, `qr_code_url`, `warnings`, `usage_instructions`) VALUES
(3, '100mg', 'TABLET', 'Pfizer', 'OVER_THE_COUNTER', 'Paracetamol', 'ANALGESIC', NULL, NULL, NULL, NULL),
(8, '250mg', 'CAPSULE', 'Novartis', 'PRESCRIPTION_REQUIRED', 'Amoxicillin', 'ANTIBIOTIC', NULL, NULL, NULL, NULL),
(9, '400mg', 'TABLET', 'Sanofi', 'OVER_THE_COUNTER', 'Ibuprofen', 'ANTI_INFLAMMATORY', NULL, NULL, NULL, NULL),
(10, '50g', 'CREAM', 'Johnson', 'OVER_THE_COUNTER', 'Antiseptic Cream', 'ANTISEPTIC', NULL, NULL, NULL, NULL),
(12, '500mg', 'TABLET', 'Bayer', 'OVER_THE_COUNTER', 'Aspirin', 'ANALGESIC', NULL, NULL, NULL, NULL),
(13, '500mg', 'TABLET', 'Bayer', 'OVER_THE_COUNTER', 'Aspirin', 'ANALGESIC', NULL, NULL, NULL, NULL),
(14, '500mg', 'TABLET', 'Sanofi', 'OVER_THE_COUNTER', 'Doliprane', 'ANALGESIC', NULL, NULL, NULL, NULL),
(15, '200mg', 'TABLET', 'Pfizer', 'OVER_THE_COUNTER', 'Brufen', 'ANTI_INFLAMMATORY', NULL, NULL, NULL, NULL),
(16, '400mg', 'TABLET', 'Abbott', 'OVER_THE_COUNTER', 'Advil', 'ANTI_INFLAMMATORY', NULL, NULL, NULL, NULL),
(17, '250mg', 'CAPSULE', 'Novartis', 'PRESCRIPTION_REQUIRED', 'Augmentin', 'ANTIBIOTIC', NULL, NULL, NULL, NULL),
(18, '500mg', 'CAPSULE', 'GlaxoSmithKline', 'PRESCRIPTION_REQUIRED', 'Amoxil', 'ANTIBIOTIC', NULL, NULL, NULL, NULL),
(19, '5ml', 'SYRUP', 'Sanofi', 'OVER_THE_COUNTER', 'Doliprane Syrup', 'ANALGESIC', NULL, NULL, NULL, NULL),
(20, '10ml', 'SYRUP', 'Bayer', 'OVER_THE_COUNTER', 'Actifed', 'ANTIVIRAL', NULL, NULL, NULL, NULL),
(21, '100mg', 'TABLET', 'Roche', 'PRESCRIPTION_REQUIRED', 'Tamiflu', 'ANTIVIRAL', NULL, NULL, NULL, NULL),
(22, '500mg', 'TABLET', 'Bayer', 'OVER_THE_COUNTER', 'Vitamin C', 'VITAMIN', NULL, NULL, NULL, NULL),
(23, '5%', 'CREAM', 'Johnson', 'OVER_THE_COUNTER', 'Bepanthen', 'ANTISEPTIC', NULL, NULL, NULL, NULL),
(24, '10%', 'CREAM', 'Pierre Fabre', 'OVER_THE_COUNTER', 'Cicalfate', 'ANTISEPTIC', NULL, NULL, NULL, NULL),
(25, '2ml', 'DROPS', 'Alcon', 'PRESCRIPTION_REQUIRED', 'Tobrex Drops', 'ANTIBIOTIC', NULL, NULL, NULL, NULL),
(26, '1ml', 'INJECTION', 'Pfizer', 'PRESCRIPTION_REQUIRED', 'Penicillin Injection', 'ANTIBIOTIC', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `pharmacy_stock`
--

DROP TABLE IF EXISTS `pharmacy_stock`;
CREATE TABLE IF NOT EXISTS `pharmacy_stock` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `available_quantity` int DEFAULT NULL,
  `expiration_date` datetime(6) DEFAULT NULL,
  `last_updated` datetime(6) DEFAULT NULL,
  `min_threshold` int DEFAULT NULL,
  `product_id` bigint DEFAULT NULL,
  `pharmacist_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKexl6h361ilefyae11qy7qy8is` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `pharmacy_stock`
--

INSERT INTO `pharmacy_stock` (`id`, `available_quantity`, `expiration_date`, `last_updated`, `min_threshold`, `product_id`, `pharmacist_id`) VALUES
(4, 10, '2026-12-29 23:00:00.000000', '2026-04-22 09:10:54.658351', 20, 3, NULL),
(15, 100, '2026-12-30 00:00:00.000000', '2026-04-01 00:04:42.000000', 20, 8, NULL),
(16, 50, '2026-05-08 23:00:00.000000', '2026-04-22 09:11:34.465249', 10, 9, 0xcefef67325d44f8da268a7581397ee78),
(17, 10, '2026-12-30 00:00:00.000000', '2026-04-01 01:04:10.000000', 20, 10, NULL),
(24, 5, '2026-05-02 10:35:02.000000', '2026-04-07 22:50:52.000000', 10, 13, 0xcefef67325d44f8da268a7581397ee78),
(25, 150, '2026-12-01 00:00:00.000000', '2026-04-14 22:38:48.000000', 20, 14, NULL),
(26, 200, '2027-01-15 00:00:00.000000', '2026-04-14 22:38:48.000000', 30, 15, NULL),
(27, 80, '2026-06-10 00:00:00.000000', '2026-04-14 22:38:48.000000', 15, 17, 0xcefef67325d44f8da268a7581397ee78),
(28, 60, '2026-05-20 00:00:00.000000', '2026-04-14 22:38:48.000000', 10, 18, NULL),
(29, 120, '2027-03-01 00:00:00.000000', '2026-04-14 22:38:48.000000', 25, 19, NULL),
(30, 90, '2026-08-15 00:00:00.000000', '2026-04-14 22:38:48.000000', 20, 20, 0xcefef67325d44f8da268a7581397ee78),
(31, 40, '2026-05-30 00:00:00.000000', '2026-04-14 22:38:48.000000', 10, 21, 0xcefef67325d44f8da268a7581397ee78),
(32, 70, '2026-09-10 00:00:00.000000', '2026-04-14 22:38:48.000000', 15, 22, NULL),
(33, 10, '2026-04-27 23:00:00.000000', '2026-04-27 21:07:28.406048', 10, 23, 0xcefef67325d44f8da268a7581397ee78),
(34, 60, '2027-02-01 00:00:00.000000', '2026-04-27 21:03:05.928780', 20, 24, NULL),
(35, 9, '2027-02-26 00:00:00.000000', '2026-04-27 21:03:23.780252', 10, 25, NULL),
(36, 15, '2026-12-01 00:00:00.000000', '2026-04-27 17:37:57.162154', 15, 26, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `request_item`
--

DROP TABLE IF EXISTS `request_item`;
CREATE TABLE IF NOT EXISTS `request_item` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `item_note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_quantity` int DEFAULT NULL,
  `product_id` bigint DEFAULT NULL,
  `request_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKegp2p323rs0quy6rs1b089qwu` (`product_id`),
  KEY `FKeeapctq7ta586gsrjdnyqq9v` (`request_id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `request_item`
--

INSERT INTO `request_item` (`id`, `item_note`, `requested_quantity`, `product_id`, `request_id`) VALUES
(3, 'For emergency cases', 30, 3, NULL),
(16, 'UI item', 20, 3, 14),
(17, 'UI item', 20, 8, 15),
(18, NULL, 40, 10, 16),
(24, NULL, 20, 13, 22),
(25, NULL, 20, 12, 23),
(26, 'UI item', 40, 25, 24),
(27, NULL, 40, 3, 25),
(28, 'UI item', 50, 24, 26),
(29, NULL, 40, 3, 27),
(31, 'UI item', 40, 26, 29),
(32, 'UI item', 20, 23, 30),
(33, 'UI item', 50, 21, 31),
(34, 'UI item', 30, 15, 32),
(35, 'UI item', 40, 10, 33),
(36, 'UI item', 60, 13, 34),
(37, NULL, 20, 25, 35),
(38, 'UI item', 40, 23, 36),
(39, NULL, 30, 26, 37),
(40, 'UI item', 20, 23, 38),
(41, NULL, 40, 24, 39),
(42, NULL, 20, 23, 40),
(43, 'UI item', 50, 3, 41),
(44, 'UI item', 50, 3, 42),
(45, 'UI item', 80, 25, 43);

-- --------------------------------------------------------

--
-- Structure de la table `stock_request`
--

DROP TABLE IF EXISTS `stock_request`;
CREATE TABLE IF NOT EXISTS `stock_request` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `pharmacist_id` binary(16) DEFAULT NULL,
  `request_comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_date` datetime(6) DEFAULT NULL,
  `request_priority` enum('HIGH','LOW','MEDIUM') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_status` enum('APPROVED','DELIVERED','PENDING','REJECTED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region` enum('GAFSA','KEF','MEDENINE','SFAX','SOUSSE','TUNIS') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stock_id` bigint DEFAULT NULL,
  `hospital_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `stock_request`
--

INSERT INTO `stock_request` (`id`, `pharmacist_id`, `request_comment`, `request_date`, `request_priority`, `request_status`, `region`, `stock_id`, `hospital_name`, `latitude`, `longitude`) VALUES
(2, 0x31000000000000000000000000000000, 'Urgent restock', '2026-03-27 21:58:57.755080', 'MEDIUM', 'REJECTED', NULL, NULL, 'Hôpital Mongi Slim', 36.8672, 10.2918),
(3, 0x31000000000000000000000000000000, 'Created from UI', '2026-03-28 17:56:14.424090', 'MEDIUM', 'REJECTED', NULL, NULL, 'Hôpital Mongi Slim', 36.8672, 10.2918),
(4, 0x31000000000000000000000000000000, 'Created from UI', '2026-03-29 19:19:22.581458', 'MEDIUM', 'PENDING', NULL, NULL, 'Hôpital Charles Nicolle', 36.81897, 10.16579),
(9, 0x31000000000000000000000000000000, 'Created from UI', '2026-04-01 08:52:00.137982', 'HIGH', 'PENDING', NULL, NULL, 'Hôpital Charles Nicolle', 36.81897, 10.16579),
(10, 0x31000000000000000000000000000000, 'Created from UI', '2026-04-01 10:46:25.257745', 'HIGH', 'PENDING', NULL, NULL, 'Hôpital Charles Nicolle', NULL, NULL),
(11, 0xcefef67325d44f8da268a7581397ee78, 'Created from UI', '2026-04-06 20:25:19.796084', 'MEDIUM', 'APPROVED', 'TUNIS', NULL, NULL, NULL, NULL),
(13, 0xcefef67325d44f8da268a7581397ee78, 'hiojiuhh', '2026-04-06 20:54:13.883422', 'MEDIUM', 'APPROVED', 'TUNIS', NULL, NULL, NULL, NULL),
(14, 0xcefef67325d44f8da268a7581397ee78, 'test', '2026-04-06 23:02:14.744550', 'MEDIUM', 'APPROVED', 'TUNIS', NULL, 'Hôpital Mongi Slim', 36.8672, 10.2918),
(15, 0xcefef67325d44f8da268a7581397ee78, 'test2', '2026-04-06 23:17:33.167587', 'HIGH', 'APPROVED', 'TUNIS', NULL, 'Hôpital Charles Nicolle', 36.81897, 10.16579),
(16, 0x1dc67851338e429a8172821ab50ef306, 'AUTO: Low stock', '2026-04-07 21:24:35.168310', 'HIGH', 'APPROVED', 'TUNIS', 17, NULL, NULL, NULL),
(22, 0xcefef67325d44f8da268a7581397ee78, 'AUTO: Low stock', '2026-04-07 21:53:04.637981', 'HIGH', 'APPROVED', 'TUNIS', 24, 'Hôpital Charles Nicolle', 36.8022, 10.1611),
(23, 0x30786365666566363733323564343466, 'AUTO: Low stock', '2026-04-07 21:59:04.624916', 'HIGH', 'PENDING', 'TUNIS', 22, NULL, NULL, NULL),
(24, 0xcefef67325d44f8da268a7581397ee78, 'urgent', '2026-04-15 10:36:26.577379', 'MEDIUM', 'APPROVED', 'TUNIS', NULL, NULL, NULL, NULL),
(25, NULL, 'AUTO: Low stock', '2026-04-21 18:17:45.856820', 'HIGH', 'REJECTED', 'TUNIS', 4, NULL, NULL, NULL),
(26, 0xcefef67325d44f8da268a7581397ee78, 'no hurry', '2026-04-21 20:16:31.052587', 'LOW', 'APPROVED', 'TUNIS', NULL, NULL, NULL, NULL),
(27, NULL, 'AUTO: Low stock', '2026-04-22 09:06:46.151748', 'HIGH', 'PENDING', 'TUNIS', 4, NULL, NULL, NULL),
(29, 0xcefef67325d44f8da268a7581397ee78, 'immediate', '2026-04-26 15:16:35.101237', 'HIGH', 'APPROVED', 'TUNIS', NULL, 'Hôpital Charles Nicolle', 36.81897, 10.16579),
(30, 0xcefef67325d44f8da268a7581397ee78, 'needed', '2026-04-26 16:17:31.745665', 'MEDIUM', 'APPROVED', 'TUNIS', NULL, 'Hôpital Charles Nicolle', 36.81897, 10.16579),
(31, 0xcefef67325d44f8da268a7581397ee78, 'much much needed', '2026-04-26 16:17:57.901493', 'HIGH', 'APPROVED', 'TUNIS', NULL, 'Hôpital Mongi Slim', 36.8672, 10.2918),
(32, 0xcefef67325d44f8da268a7581397ee78, 'urgent', '2026-04-26 16:27:40.246202', 'HIGH', 'REJECTED', 'TUNIS', NULL, NULL, NULL, NULL),
(33, 0xcefef67325d44f8da268a7581397ee78, 'no hurry', '2026-04-26 16:28:13.705964', 'LOW', 'PENDING', 'TUNIS', NULL, NULL, NULL, NULL),
(34, 0xcefef67325d44f8da268a7581397ee78, 'noww!!', '2026-04-26 17:56:24.926810', 'HIGH', 'APPROVED', 'TUNIS', NULL, 'Hôpital Mongi Slim', 36.8672, 10.2918),
(35, NULL, 'AUTO: Low stock', '2026-04-26 19:53:20.177147', 'HIGH', 'PENDING', 'TUNIS', 35, NULL, NULL, NULL),
(36, 0xcefef67325d44f8da268a7581397ee78, 'urgeeeeeent', '2026-04-27 16:45:43.984530', 'HIGH', 'APPROVED', 'TUNIS', NULL, NULL, NULL, NULL),
(37, NULL, 'AUTO: Low stock', '2026-04-27 17:38:04.247688', 'HIGH', 'PENDING', 'TUNIS', 36, NULL, NULL, NULL),
(38, 0xcefef67325d44f8da268a7581397ee78, 'not urgent', '2026-04-27 20:08:00.479177', 'MEDIUM', 'PENDING', 'TUNIS', NULL, NULL, NULL, NULL),
(39, NULL, 'AUTO: Low stock', '2026-04-27 20:56:52.735252', 'HIGH', 'PENDING', 'TUNIS', 34, NULL, NULL, NULL),
(40, 0xcefef67325d44f8da268a7581397ee78, 'AUTO: Low stock', '2026-04-27 21:07:52.732164', 'HIGH', 'PENDING', 'TUNIS', 33, NULL, NULL, NULL),
(41, 0xcefef67325d44f8da268a7581397ee78, 'urgent restock', '2026-05-22 12:55:33.000179', 'HIGH', 'PENDING', 'TUNIS', NULL, NULL, NULL, NULL),
(42, 0xcefef67325d44f8da268a7581397ee78, 'urgent restock ', '2026-05-22 12:58:27.345367', 'HIGH', 'PENDING', 'TUNIS', NULL, NULL, NULL, NULL),
(43, 0xcefef67325d44f8da268a7581397ee78, 'HIHIHIIH', '2026-06-18 14:17:05.926645', 'HIGH', 'PENDING', 'TUNIS', NULL, NULL, NULL, NULL);

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `delivery`
--
ALTER TABLE `delivery`
  ADD CONSTRAINT `FKst2vi7r1qktcoclt319wjvdlb` FOREIGN KEY (`request_id`) REFERENCES `stock_request` (`id`);

--
-- Contraintes pour la table `pharmacy_stock`
--
ALTER TABLE `pharmacy_stock`
  ADD CONSTRAINT `FK9601e6olcghq51sq62nvaji7j` FOREIGN KEY (`product_id`) REFERENCES `pharmacy_product` (`id`);

--
-- Contraintes pour la table `request_item`
--
ALTER TABLE `request_item`
  ADD CONSTRAINT `FKeeapctq7ta586gsrjdnyqq9v` FOREIGN KEY (`request_id`) REFERENCES `stock_request` (`id`),
  ADD CONSTRAINT `FKegp2p323rs0quy6rs1b089qwu` FOREIGN KEY (`product_id`) REFERENCES `pharmacy_product` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
