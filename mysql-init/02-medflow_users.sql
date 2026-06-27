-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : dim. 21 juin 2026 à 19:09
-- Version du serveur : 8.4.7
-- Version de PHP : 8.3.28

USE medflow_users;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `medflow_users`
--

-- --------------------------------------------------------

--
-- Structure de la table `central_pharmacy`
--

DROP TABLE IF EXISTS `central_pharmacy`;
CREATE TABLE IF NOT EXISTS `central_pharmacy` (
  `user_id` binary(16) NOT NULL,
  `headquarters` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `institution_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `central_pharmacy`
--

INSERT INTO `central_pharmacy` (`user_id`, `headquarters`, `institution_name`) VALUES
(0x7452472c1903409e80b493c634d952de, 'Cité Mahrajène, Tunis', 'Pharmacie Centrale de Tunisie'),
(0xefcbaf5d21b44ffea13277579577ef9e, 'Cité Mahrajène, Tunis', 'Pharmacie Centrale de Tunisie');

-- --------------------------------------------------------

--
-- Structure de la table `delivery_agent_profiles`
--

DROP TABLE IF EXISTS `delivery_agent_profiles`;
CREATE TABLE IF NOT EXISTS `delivery_agent_profiles` (
  `user_id` binary(16) NOT NULL,
  `delivery_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `delivery_agent_profiles`
--

INSERT INTO `delivery_agent_profiles` (`user_id`, `delivery_name`, `vehicle_type`) VALUES
(0x19e1297bdc704d1bb312d89509c59cfc, 'Yassine Rahrah', 'CAR'),
(0xb29bd49b56ab42a09e81c913dbc7553c, 'Hela Rahrah', 'BIKE');

-- --------------------------------------------------------

--
-- Structure de la table `doctor_profiles`
--

DROP TABLE IF EXISTS `doctor_profiles`;
CREATE TABLE IF NOT EXISTS `doctor_profiles` (
  `user_id` binary(16) NOT NULL,
  `availability_schedule` text COLLATE utf8mb4_unicode_ci,
  `biography` text COLLATE utf8mb4_unicode_ci,
  `consultation_fee` double DEFAULT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hospital_id` bigint DEFAULT NULL,
  `isverified_by_admin` bit(1) DEFAULT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specialization` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `years_of_experience` int DEFAULT NULL,
  `clinic_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `doctor_profiles`
--

INSERT INTO `doctor_profiles` (`user_id`, `availability_schedule`, `biography`, `consultation_fee`, `first_name`, `hospital_id`, `isverified_by_admin`, `last_name`, `license_number`, `specialization`, `years_of_experience`, `clinic_address`) VALUES
(0xfdcd651f535342d6aae1b359bddbd10c, NULL, NULL, NULL, 'Elyes', NULL, b'0', 'Rahrah', 'MD-1234', 'Cardiologie', NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `hospital_profiles`
--

DROP TABLE IF EXISTS `hospital_profiles`;
CREATE TABLE IF NOT EXISTS `hospital_profiles` (
  `user_id` binary(16) NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `isverified_by_admin` bit(1) DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registration_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('CLINIC','PRIVATE','PUBLIC','SPECIALIZED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `insurance_coverage_types`
--

DROP TABLE IF EXISTS `insurance_coverage_types`;
CREATE TABLE IF NOT EXISTS `insurance_coverage_types` (
  `user_id` binary(16) NOT NULL,
  `coverage_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  KEY `FK10n9rui2mdwr2ceuvne3twxi5` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `insurance_profiles`
--

DROP TABLE IF EXISTS `insurance_profiles`;
CREATE TABLE IF NOT EXISTS `insurance_profiles` (
  `user_id` binary(16) NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `claim_process_description` text COLLATE utf8mb4_unicode_ci,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coverage_types` text COLLATE utf8mb4_unicode_ci,
  `registration_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `laboratory_profiles`
--

DROP TABLE IF EXISTS `laboratory_profiles`;
CREATE TABLE IF NOT EXISTS `laboratory_profiles` (
  `user_id` binary(16) NOT NULL,
  `accreditation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isverified_by_admin` bit(1) DEFAULT NULL,
  `lab_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opening_hours` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registration_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `services_offered` text COLLATE utf8mb4_unicode_ci,
  `supported_tests` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `patient_access_codes`
--

DROP TABLE IF EXISTS `patient_access_codes`;
CREATE TABLE IF NOT EXISTS `patient_access_codes` (
  `id` binary(16) NOT NULL,
  `code_value` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) NOT NULL,
  `updated_by` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_id` binary(16) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKa4hqj2ntc58jsoi6nmrwhnd0x` (`code_value`),
  UNIQUE KEY `UKn12t4ggxjei5h5mx0yrf0sw3` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `patient_profiles`
--

DROP TABLE IF EXISTS `patient_profiles`;
CREATE TABLE IF NOT EXISTS `patient_profiles` (
  `user_id` binary(16) NOT NULL,
  `allergies` text COLLATE utf8mb4_unicode_ci,
  `blood_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chronic_diseases` text COLLATE utf8mb4_unicode_ci,
  `date_of_birth` date DEFAULT NULL,
  `emergency_contact_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `height` double DEFAULT NULL,
  `insurance_id` bigint DEFAULT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_doctor_id` bigint DEFAULT NULL,
  `weight` double DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `pharmacist_profiles`
--

DROP TABLE IF EXISTS `pharmacist_profiles`;
CREATE TABLE IF NOT EXISTS `pharmacist_profiles` (
  `user_id` binary(16) NOT NULL,
  `license_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pharmacy_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region` enum('GAFSA','KEF','MEDENINE','SFAX','SOUSSE','TUNIS') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `pharmacist_profiles`
--

INSERT INTO `pharmacist_profiles` (`user_id`, `license_number`, `pharmacy_name`, `region`) VALUES
(0x0c9da82a3f544c64a213aa6c4793fd05, '1478', 'mannouba', 'SOUSSE'),
(0x5843e407a71743e3bd2799436581f961, 'F-1478', 'Bardo', 'SOUSSE'),
(0xcefef67325d44f8da268a7581397ee78, 'F-1478', 'Bardo', 'TUNIS');

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_login_at` datetime(6) DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_picture_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider` enum('GOOGLE','LOCAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('ADMIN','CENTRAL_PHARMACY','DELIVERY_AGENT','DOCTOR','HOSPITAL','INSURANCE','LABO','PATIENT','PHARMACIST','USER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `setup_completed` bit(1) NOT NULL,
  `status` enum('ACTIVE','DELETED','SUSPENDED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `verified` bit(1) NOT NULL,
  `face_descriptor` longtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK6dotkott2kjsp8vw4d0m25fb7` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `created_at`, `email`, `last_login_at`, `password`, `phone_number`, `profile_picture_url`, `provider`, `role`, `setup_completed`, `status`, `updated_at`, `verified`, `face_descriptor`) VALUES
(0x0c9da82a3f544c64a213aa6c4793fd05, '2026-04-05 16:38:36.405155', 'ines@gmail.com', '2026-04-05 16:38:36.405155', '$2a$10$.IOFHfpSW18jWcpTGQbH.OQ1Vrnqge4YlNcsOrV/ZDgHYvnwO/NYy', '12346678', NULL, 'LOCAL', 'PHARMACIST', b'1', 'ACTIVE', '2026-04-14 20:15:08.084300', b'0', NULL),
(0x19e1297bdc704d1bb312d89509c59cfc, '2026-04-22 08:54:28.523987', 'yassine@gmail.com', '2026-04-22 08:54:28.523987', '$2a$10$RDKvHSuSf3mznpwFPNQoA.LS7eEeIY0zr0rnp9.IObEcTD/tGUsDC', '12346678', NULL, 'LOCAL', 'DELIVERY_AGENT', b'1', 'ACTIVE', '2026-04-22 08:54:28.523987', b'0', NULL),
(0x414a0945c5524a2da766ae95f8afc98a, '2026-04-05 18:24:46.662182', 'admin@gmail.com', '2026-04-27 20:54:57.207282', '$2a$10$KsXZkiEMQNaCPrS08ZSw6eut0skeERF1gspfeRRtTWsBn1s27fpYS', NULL, NULL, 'LOCAL', 'ADMIN', b'1', 'ACTIVE', '2026-04-27 20:54:57.207281', b'1', NULL),
(0x5843e407a71743e3bd2799436581f961, '2026-04-05 18:39:19.681714', 'nabil@gmail.com', '2026-04-05 18:39:19.681714', '$2a$10$z9LAny/7mBqUnmkDOljLvOwiR/iMngUploC.im9I7TjJgpSjuncAi', '12346678', NULL, 'LOCAL', 'PHARMACIST', b'1', 'ACTIVE', '2026-04-05 18:39:19.681714', b'0', NULL),
(0x7452472c1903409e80b493c634d952de, '2026-04-05 16:10:27.149632', 'ines.rahrah@esprit.tn', '2026-04-05 16:10:27.149632', '$2a$10$lPw4m3C9VUmrQxkk9ql5Eu3dnd2WFwDTPlQigigAk1zIhrQfiAt.W', '12346678', NULL, 'LOCAL', 'CENTRAL_PHARMACY', b'1', 'ACTIVE', '2026-04-05 16:10:27.149632', b'0', NULL),
(0xb29bd49b56ab42a09e81c913dbc7553c, '2026-04-07 18:15:33.616190', 'hela@gmail.com', '2026-06-18 14:17:28.613581', '$2a$10$TSZmWHunYG5U0E9nG2RhWuVBrXrE3Ewzj.bpYu8H5lT/o3NHv2tkG', '12346678', NULL, 'LOCAL', 'DELIVERY_AGENT', b'1', 'ACTIVE', '2026-06-18 14:17:28.629466', b'0', NULL),
(0xcefef67325d44f8da268a7581397ee78, '2026-04-05 14:47:20.622724', 'inesrahrah7@gmail.com', '2026-06-21 19:05:02.010295', '$2a$10$XViLyRwGD6Fm.TwtwwMU.ulXgpDrAYTOscNiPlT/mvCu36p9JcTWW', '12346678', NULL, 'LOCAL', 'PHARMACIST', b'1', 'ACTIVE', '2026-06-21 19:05:03.025581', b'0', NULL),
(0xefcbaf5d21b44ffea13277579577ef9e, '2026-04-05 18:40:02.631910', 'elyes2@gmail.com', '2026-05-22 13:06:16.872378', '$2a$10$bISniWuEznRPjOJh3yKsyOC61TsKbHnrWmM5v.oAZs/HtIrYJlo/W', '12346678', NULL, 'LOCAL', 'CENTRAL_PHARMACY', b'1', 'ACTIVE', '2026-05-22 13:06:16.876707', b'0', NULL),
(0xfdcd651f535342d6aae1b359bddbd10c, '2026-04-07 18:29:00.585633', 'doctor@gmail.com', '2026-04-07 18:29:00.585633', '$2a$10$PFtKTLFLzU7yiDwwc1ubIukfmvG.7QH1cgUL/NRnbRSCt0jBSTigu', '12346678', NULL, 'LOCAL', 'DOCTOR', b'1', 'ACTIVE', '2026-04-07 18:29:00.585633', b'0', NULL);

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `central_pharmacy`
--
ALTER TABLE `central_pharmacy`
  ADD CONSTRAINT `FKtifiqpeoyqc789pa3b105otr0` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `delivery_agent_profiles`
--
ALTER TABLE `delivery_agent_profiles`
  ADD CONSTRAINT `FKsjwpno61f1r52poy8wmy9uo29` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `doctor_profiles`
--
ALTER TABLE `doctor_profiles`
  ADD CONSTRAINT `FKhrpk2q09sjwf9en18301dioyr` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `hospital_profiles`
--
ALTER TABLE `hospital_profiles`
  ADD CONSTRAINT `FKjk78j2jri80g470rv26dcwki0` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `insurance_coverage_types`
--
ALTER TABLE `insurance_coverage_types`
  ADD CONSTRAINT `FK10n9rui2mdwr2ceuvne3twxi5` FOREIGN KEY (`user_id`) REFERENCES `insurance_profiles` (`user_id`);

--
-- Contraintes pour la table `insurance_profiles`
--
ALTER TABLE `insurance_profiles`
  ADD CONSTRAINT `FK7huqk3n7pysniwug9mernliht` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `laboratory_profiles`
--
ALTER TABLE `laboratory_profiles`
  ADD CONSTRAINT `FKdxwk180f15hw53yxk5g3478tl` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `patient_access_codes`
--
ALTER TABLE `patient_access_codes`
  ADD CONSTRAINT `FK28h98pjwc7ushshsajhrhqrgv` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `patient_profiles`
--
ALTER TABLE `patient_profiles`
  ADD CONSTRAINT `FK48bdvcabhgaa1bqphn9jijwn2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `pharmacist_profiles`
--
ALTER TABLE `pharmacist_profiles`
  ADD CONSTRAINT `FK3j4q0sdn34wqexhm6u7tnu4vr` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
