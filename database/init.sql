CREATE TABLE utilisateurs (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    telephone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM('client', 'livreur', 'admin') NOT NULL
);

CREATE TABLE clients (
    id_client INT PRIMARY KEY,
    adresse_defaut VARCHAR(255),
    FOREIGN KEY (id_client) REFERENCES utilisateurs(id_user) ON DELETE CASCADE
);

CREATE TABLE livreurs (
    id_livreur INT PRIMARY KEY,
    matricule_moto VARCHAR(50),
    statut_dispo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_livreur) REFERENCES utilisateurs(id_user) ON DELETE CASCADE
);

CREATE TABLE categories (
    id_categorie INT AUTO_INCREMENT PRIMARY KEY,
    nom_categorie VARCHAR(50) NOT NULL
);

CREATE TABLE produits (
    id_produit INT AUTO_INCREMENT PRIMARY KEY,
    nom_produit VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    id_categorie INT,
    FOREIGN KEY (id_categorie) REFERENCES categories(id_categorie)
);

CREATE TABLE declinaisons_poids (
    id_poids INT AUTO_INCREMENT PRIMARY KEY,
    id_produit INT,
    valeur_poids VARCHAR(20) NOT NULL,
    prix DECIMAL(10,2) NOT NULL,
    stock_disponible INT DEFAULT 0,
    FOREIGN KEY (id_produit) REFERENCES produits(id_produit) ON DELETE CASCADE
);

CREATE TABLE commandes (
    id_commande INT AUTO_INCREMENT PRIMARY KEY,
    id_client INT,
    id_livreur INT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('en_attente', 'preparee', 'en_cours', 'livree') DEFAULT 'en_attente',
    mode_paiement ENUM('wave', 'om', 'especes') NOT NULL,
    mode_livraison ENUM('domicile', 'magasin') NOT NULL,
    montant_total DECIMAL(10,2) NOT NULL,
    coordonnees_gps VARCHAR(100),
    qr_token VARCHAR(255) UNIQUE NULL,
    FOREIGN KEY (id_client) REFERENCES clients(id_client),
    FOREIGN KEY (id_livreur) REFERENCES livreurs(id_livreur)
);

CREATE TABLE lignes_commande (
    id_ligne INT AUTO_INCREMENT PRIMARY KEY,
    id_commande INT,
    id_poids INT,
    quantite INT NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_commande) REFERENCES commandes(id_commande) ON DELETE CASCADE,
    FOREIGN KEY (id_poids) REFERENCES declinaisons_poids(id_poids)
);