from flask import Blueprint, jsonify, request
from db import get_db_connection

clients_bp = Blueprint('clients', __name__)

# ================= GET ALL =================
@clients_bp.route('/api/clients', methods=['GET'])
def get_clients():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            u.id_user,
            u.nom,
            u.prenom,
            u.telephone,
            u.email,
            c.adresse_defaut
        FROM utilisateurs u
        INNER JOIN clients c
            ON u.id_user = c.id_client
        WHERE u.role = 'client'
        ORDER BY u.id_user DESC
    """)

    clients = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(clients)


# ================= GET BY ID =================
@clients_bp.route('/api/clients/<int:id>', methods=['GET'])
def get_client(id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            u.id_user,
            u.nom,
            u.prenom,
            u.telephone,
            u.email,
            c.adresse_defaut
        FROM utilisateurs u
        INNER JOIN clients c
            ON u.id_user = c.id_client
        WHERE u.id_user = %s
          AND u.role = 'client'
    """, (id,))

    client = cursor.fetchone()

    cursor.close()
    conn.close()

    if not client:
        return jsonify({"message": "Client introuvable"}), 404

    return jsonify(client)


# ================= POST =================
@clients_bp.route('/api/clients', methods=['POST'])
def add_client():
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Création utilisateur
    cursor.execute("""
        INSERT INTO utilisateurs
        (nom, prenom, telephone, email, mot_de_passe, role)
        VALUES (%s,%s,%s,%s,%s,'client')
    """, (
        data["nom"],
        data["prenom"],
        data["telephone"],
        data["email"],
        data["mot_de_passe"]
    ))

    id_user = cursor.lastrowid

    # Création client
    cursor.execute("""
        INSERT INTO clients
        (id_client, adresse_defaut)
        VALUES (%s,%s)
    """, (
        id_user,
        data.get("adresse_defaut", "")
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Client ajouté",
        "id_client": id_user
    }), 201


# ================= PUT =================
@clients_bp.route('/api/clients/<int:id>', methods=['PUT'])
def update_client(id):
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE utilisateurs
        SET
            nom=%s,
            prenom=%s,
            telephone=%s,
            email=%s
        WHERE id_user=%s
          AND role='client'
    """, (
        data["nom"],
        data["prenom"],
        data["telephone"],
        data["email"],
        id
    ))

    cursor.execute("""
        UPDATE clients
        SET adresse_defaut=%s
        WHERE id_client=%s
    """, (
        data.get("adresse_defaut", ""),
        id
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Client modifié"})


# ================= DELETE =================
@clients_bp.route('/api/clients/<int:id>', methods=['DELETE'])
def delete_client(id):

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Vérifie si le client possède des commandes
    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM commandes
        WHERE id_client=%s
    """, (id,))

    total = cursor.fetchone()["total"]

    if total > 0:
        cursor.close()
        conn.close()

        return jsonify({
            "message": "Impossible de supprimer ce client car il possède des commandes."
        }), 400

    # Suppression client
    cursor.execute("""
        DELETE FROM clients
        WHERE id_client=%s
    """, (id,))

    # Suppression utilisateur
    cursor.execute("""
        DELETE FROM utilisateurs
        WHERE id_user=%s
          AND role='client'
    """, (id,))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Client supprimé"})