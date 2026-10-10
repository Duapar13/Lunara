-- Lunara — schéma MySQL 8 / MariaDB 10.6+
-- Toutes les dates sont stockées en UTC.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role ENUM('client', 'reader', 'admin') NOT NULL DEFAULT 'client',
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  name VARCHAR(80) NOT NULL,
  avatar_url VARCHAR(255) NULL,
  country CHAR(2) NOT NULL DEFAULT 'PE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reader_profiles (
  user_id INT UNSIGNED PRIMARY KEY,
  headline VARCHAR(120) NOT NULL DEFAULT '',
  bio TEXT NULL,
  specialties JSON NULL,
  languages JSON NULL,
  years_experience TINYINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  is_available TINYINT(1) NOT NULL DEFAULT 0,
  availability JSON NULL,
  rating_avg DECIMAL(3, 2) NOT NULL DEFAULT 0,
  rating_count INT UNSIGNED NOT NULL DEFAULT 0,
  consultations_count INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_reader_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Forfaits proposés par une voyante : chat 1/3/5 questions, visio 30/60 minutes
CREATE TABLE IF NOT EXISTS reader_offers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reader_id INT UNSIGNED NOT NULL,
  type ENUM('chat', 'video') NOT NULL,
  units SMALLINT UNSIGNED NOT NULL,
  price_cents INT UNSIGNED NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_offer (reader_id, type, units),
  CONSTRAINT fk_offer_reader FOREIGN KEY (reader_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id INT UNSIGNED NOT NULL,
  reader_id INT UNSIGNED NOT NULL,
  offer_id INT UNSIGNED NULL,
  type ENUM('chat', 'video') NOT NULL,
  units SMALLINT UNSIGNED NOT NULL,
  price_cents INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'PEN',
  status ENUM('pending_payment', 'paid', 'active', 'completed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending_payment',
  topic VARCHAR(40) NULL,
  intake_question TEXT NULL,
  scheduled_at DATETIME NULL,
  started_at DATETIME NULL,
  ended_at DATETIME NULL,
  questions_used SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  daily_room VARCHAR(80) NULL,
  payment_provider ENUM('stripe', 'mercadopago') NULL,
  payment_ref VARCHAR(120) NULL,
  app_return_url VARCHAR(255) NULL,
  reading_cards JSON NULL,
  reader_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_client (client_id, created_at),
  KEY idx_reader (reader_id, status, scheduled_at),
  CONSTRAINT fk_cons_client FOREIGN KEY (client_id) REFERENCES users(id),
  CONSTRAINT fk_cons_reader FOREIGN KEY (reader_id) REFERENCES users(id),
  CONSTRAINT fk_cons_offer FOREIGN KEY (offer_id) REFERENCES reader_offers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT UNSIGNED NOT NULL,
  sender_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  is_question TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_msg_cons (consultation_id, id),
  CONSTRAINT fk_msg_cons FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Un seul avis par consultation terminée : les avis sont donc toujours vérifiés
CREATE TABLE IF NOT EXISTS reviews (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT UNSIGNED NOT NULL UNIQUE,
  client_id INT UNSIGNED NOT NULL,
  reader_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_review_reader (reader_id, created_at),
  CONSTRAINT fk_rev_cons FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_client FOREIGN KEY (client_id) REFERENCES users(id),
  CONSTRAINT fk_rev_reader FOREIGN KEY (reader_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favorites (
  user_id INT UNSIGNED NOT NULL,
  reader_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, reader_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_reader FOREIGN KEY (reader_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT UNSIGNED NOT NULL,
  provider ENUM('stripe', 'mercadopago') NOT NULL,
  provider_ref VARCHAR(120) NOT NULL,
  amount_cents INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL,
  status VARCHAR(30) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment (provider, provider_ref),
  CONSTRAINT fk_pay_cons FOREIGN KEY (consultation_id) REFERENCES consultations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_readings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  consultation_id INT UNSIGNED NULL,
  kind ENUM('daily', 'deepen') NOT NULL,
  cards JSON NULL,
  question TEXT NULL,
  response MEDIUMTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ai_user (user_id, created_at),
  CONSTRAINT fk_ai_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_cons FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
