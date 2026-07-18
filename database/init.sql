-- =========================================================================
-- LIV'GUINAR+ — BASE DE DONNÉES (alignée sur app/main.py)
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS lignes_commande;
DROP TABLE IF EXISTS commandes;
DROP TABLE IF EXISTS declinaisons_poids;
DROP TABLE IF EXISTS produits;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS livreurs;
DROP TABLE IF EXISTS utilisateurs;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS utilisateurs (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    nom_complet VARCHAR(100) NOT NULL,
    telephone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    adresse VARCHAR(255) DEFAULT NULL,
    role ENUM('client', 'livreur', 'admin') NOT NULL DEFAULT 'client',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
    id_client INT PRIMARY KEY,
    adresse_defaut VARCHAR(255),
    FOREIGN KEY (id_client) REFERENCES utilisateurs(id_user) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS livreurs (
    id_livreur INT PRIMARY KEY,
    matricule_moto VARCHAR(50),
    statut_dispo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_livreur) REFERENCES utilisateurs(id_user) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
    id_categorie INT AUTO_INCREMENT PRIMARY KEY,
    nom_categorie VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS produits (
    id_produit INT AUTO_INCREMENT PRIMARY KEY,
    nom_produit VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    badge VARCHAR(50) DEFAULT NULL,
    note DECIMAL(2,1) DEFAULT 0.0,
    nb_avis INT DEFAULT 0,
    id_categorie INT,
    FOREIGN KEY (id_categorie) REFERENCES categories(id_categorie)
);

CREATE TABLE IF NOT EXISTS declinaisons_poids (
    id_poids INT AUTO_INCREMENT PRIMARY KEY,
    id_produit INT,
    label_poids VARCHAR(30) NOT NULL,
    valeur_poids VARCHAR(20) NOT NULL,
    prix DECIMAL(10,2) NOT NULL,
    stock_disponible INT DEFAULT 0,
    FOREIGN KEY (id_produit) REFERENCES produits(id_produit) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commandes (
    id_commande INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(20) NOT NULL UNIQUE,
    id_user INT NULL,
    nom_client VARCHAR(100) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    adresse VARCHAR(255) DEFAULT NULL,
    statut ENUM('en_attente', 'preparee', 'en_cours', 'livree', 'annulee') DEFAULT 'en_attente',
    mode_paiement ENUM('wave', 'om', 'especes') NOT NULL DEFAULT 'especes',
    sous_total DECIMAL(10,2) NOT NULL,
    frais_livraison DECIMAL(10,2) NOT NULL DEFAULT 1500.00,
    total DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user) REFERENCES utilisateurs(id_user) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lignes_commande (
    id_ligne INT AUTO_INCREMENT PRIMARY KEY,
    id_commande INT NOT NULL,
    id_produit INT NOT NULL,
    id_poids INT NOT NULL,
    nom_produit VARCHAR(100) DEFAULT NULL,
    poids_label VARCHAR(30) DEFAULT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    quantite INT NOT NULL,
    total_ligne DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_commande) REFERENCES commandes(id_commande) ON DELETE CASCADE,
    FOREIGN KEY (id_produit) REFERENCES produits(id_produit),
    FOREIGN KEY (id_poids) REFERENCES declinaisons_poids(id_poids)
);

-- =========================================================================
-- CATÉGORIES
-- =========================================================================
INSERT INTO categories (id_categorie, nom_categorie, slug) VALUES
(1, 'Volaille', 'volaille'),
(2, 'Œufs', 'oeufs'),
(3, 'Moutons', 'moutons'),
(4, 'Vaches', 'vaches'),
(5, 'Packs', 'packs');

-- =========================================================================
-- PRODUITS
-- =========================================================================
INSERT INTO produits (id_produit, nom_produit, description, image_url, badge, note, nb_avis, id_categorie) VALUES

-- VOLAILLES
(1, 'Poulet Fermier',
 'Poulet élevé en plein air, nourri aux grains naturels. Viande tendre et savoureuse, idéale pour les grands repas en famille.',
 '/static/images/poulet_fermier.jpg', 'Populaire', 4.8, 124, 1),

(2, 'Poulet de Chair',
 'Poulet de chair élevé en conditions optimales. Chair tendre et goûteuse, parfaite pour les grillades et les yassa.',
 '/static/images/poulet_chair.jpg', NULL, 4.5, 89, 1),

(3, 'Poulet Label Rouge',
 'Sélection premium élevée selon des critères stricts de qualité. Saveur incomparable, recommandée pour les occasions spéciales.',
 '/static/images/poule_labelrouge.jpg', NULL, 4.2, 47, 1),

(4, 'Poulet Pondeuse',
 'Poulet pondeuse en fin de cycle. Idéal pour les bouillons et les thiébou dieun, donnant une soupe richement aromatisée.',
 '/static/images/poule_pondeuse.jpg', NULL, 4.3, 76, 1),

-- ŒUFS
(5, 'Œufs Frais (Plateau)',
 'Œufs frais de ferme locale, ramassés quotidiennement. Riche en protéines, parfaits pour le petit-déjeuner ou la pâtisserie.',
 '/static/images/oeufs_frais.jpg', 'Frais', 4.7, 203, 2),

(6, 'Œufs Bio',
 'Œufs issus de poules élevées en plein air, nourries à 100% biologique. Label qualité supérieure, goût naturellement riche.',
 '/static/images/oeufs_bio.jpg', 'Bio', 4.9, 95, 2),

-- MOUTONS
(7, 'Mouton Ladoum',
 'Mouton Ladoum de race pure, élevé selon la tradition sénégalaise. Stature impressionnante, idéal pour l''Aïd el-Kebir et les grandes cérémonies.',
 '/static/images/ladoum.jpg', 'Sélection', 4.9, 58, 3),

(8, 'Bélier Peul',
 'Bélier de race Peul-Peul, reconnu pour sa robustesse et sa chair savoureuse. Parfait pour les fêtes et cérémonies traditionnelles.',
 '/static/images/peul.jpg', NULL, 4.6, 33, 3),

-- VACHES
(9, 'Vache Laitière',
 'Vache laitière de race sélectionnée, en bonne santé et vaccinée. Production laitière garantie, idéale pour les éleveurs et les particuliers.',
 '/static/images/vache.jpg', 'Premium', 4.8, 19, 4),

-- PACKS
(10, 'Pack Famille Volaille',
 'L''assortiment familial complet : 2 poulets fermiers (1,5 kg) + 1 plateau de 30 œufs frais. Tout le nécessaire pour la semaine.',
 '/static/images/packs_volaille.jpg', 'Pack', 4.7, 142, 5),

(11, 'Pack Tabaski Complet',
 'Le pack idéal pour la Tabaski : 1 mouton Ladoum + livraison express à domicile à Dakar. Commandez à l''avance !',
 '/static/images/ladoum.jpg', 'Promo', 5.0, 87, 5),

(12, 'Pack Braai Sénégal',
 'Pack grillades pour 6 personnes : 3 poulets Label Rouge (2 kg) + marinades traditionnelles. Livré dans les 24h à Dakar.',
 '/static/images/packs_braii.jpg', NULL, 4.5, 61, 5);

-- =========================================================================
-- DÉCLINAISONS DE POIDS / PRIX
-- =========================================================================
INSERT INTO declinaisons_poids (id_produit, label_poids, valeur_poids, prix, stock_disponible) VALUES

-- Poulet Fermier
(1, '1,2 kg', '1.2', 4200.00, 50),
(1, '1,5 kg', '1.5', 5250.00, 50),
(1, '2,0 kg', '2.0', 7000.00, 30),

-- Poulet de Chair
(2, '1,2 kg', '1.2', 3600.00, 40),
(2, '1,5 kg', '1.5', 4500.00, 40),
(2, '2,0 kg', '2.0', 6000.00, 25),

-- Poulet Label Rouge
(3, '1,2 kg', '1.2', 4800.00, 30),
(3, '1,5 kg', '1.5', 6000.00, 30),
(3, '2,0 kg', '2.0', 8000.00, 20),

-- Poulet Pondeuse
(4, '1,2 kg', '1.2', 3000.00, 35),
(4, '1,5 kg', '1.5', 3750.00, 35),
(4, '2,0 kg', '2.0', 5000.00, 20),

-- Œufs Frais
(5, '30 œufs', '30', 2500.00, 100),
(5, '60 œufs', '60', 4800.00, 80),
(5, '90 œufs', '90', 7000.00, 50),

-- Œufs Bio
(6, '30 œufs', '30', 3500.00, 60),
(6, '60 œufs', '60', 6500.00, 40),

-- Mouton Ladoum
(7, 'Moyen', 'moyen', 75000.00, 15),
(7, 'Grand', 'grand', 125000.00, 10),
(7, 'Très Grand', 'tg', 175000.00, 5),

-- Bélier Peul
(8, 'Moyen', 'moyen', 60000.00, 10),
(8, 'Grand', 'grand', 90000.00, 8),

-- Vache Laitière
(9, '200-250 kg', 'petit', 350000.00, 5),
(9, '300-350 kg', 'moyen', 500000.00, 4),
(9, '400+ kg', 'grand', 700000.00, 2),

-- Pack Famille Volaille
(10, 'Pack S', 's', 13500.00, 30),
(10, 'Pack M', 'm', 25000.00, 20),
(10, 'Pack L', 'l', 38000.00, 15),

-- Pack Tabaski Complet
(11, 'Mouton Moyen', 'm', 80000.00, 10),
(11, 'Mouton Grand', 'g', 130000.00, 8),

-- Pack Braai Sénégal
(12, 'Pack S', 's', 18000.00, 20),
(12, 'Pack M', 'm', 32000.00, 15),
(12, 'Pack L', 'l', 48000.00, 10);

-- =========================================================================
-- COMPTE ADMIN PAR DÉFAUT
-- mot de passe : Admin@2026 (à changer en prod)
-- =========================================================================
INSERT INTO utilisateurs (nom_complet, telephone, email, mot_de_passe, role) VALUES
('Admin LivGuinar', '770000000', 'admin@livguinar.sn', '$2b$12$JMVnZ2fCe1tMumV2RbrNm.BaP3GruSlhuVzmowME0hLh7xpsw.AVi', 'admin');
