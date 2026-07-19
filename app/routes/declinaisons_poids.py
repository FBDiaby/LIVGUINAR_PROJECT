from flask import Blueprint, jsonify, request
from db import get_db_connection

declinaisons_bp = Blueprint('declinaisons_poids', __name__)

# ================= GET ALL =================
@declinaisons_bp.route('/api/declinaisons', methods=['GET'])
def get_declinaisons():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            dp.id_poids,
            p.nom_produit,
            dp.id_produit,
            dp.valeur_poids,
            dp.prix,
            dp.stock_disponible
        FROM declinaisons_poids dp
        JOIN produits p
            ON dp.id_produit = p.id_produit
        ORDER BY p.nom_produit, dp.prix
    """)

    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(data)


# ================= GET BY ID =================
@declinaisons_bp.route('/api/declinaisons/<int:id>', methods=['GET'])
def get_declinaison(id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            dp.id_poids,
            p.nom_produit,
            dp.id_produit,
            dp.valeur_poids,
            dp.prix,
            dp.stock_disponible
        FROM declinaisons_poids dp
        JOIN produits p
            ON dp.id_produit = p.id_produit
        WHERE dp.id_poids = %s
    """, (id,))

    data = cursor.fetchone()

    cursor.close()
    conn.close()

    if not data:
        return jsonify({"message": "Déclinaison introuvable"}), 404

    return jsonify(data)


# ================= POST =================
@declinaisons_bp.route('/api/declinaisons', methods=['POST'])
def add_declinaison():
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO declinaisons_poids
        (id_produit, valeur_poids, prix, stock_disponible)
        VALUES (%s, %s, %s, %s)
    """, (
        data["id_produit"],
        data["valeur_poids"],
        data["prix"],
        data["stock_disponible"]
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Déclinaison ajoutée"}), 201


# ================= PUT =================
@declinaisons_bp.route('/api/declinaisons/<int:id>', methods=['PUT'])
def update_declinaison(id):
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE declinaisons_poids
        SET
            id_produit=%s,
            valeur_poids=%s,
            prix=%s,
            stock_disponible=%s
        WHERE id_poids=%s
    """, (
        data["id_produit"],
        data["valeur_poids"],
        data["prix"],
        data["stock_disponible"],
        id
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Déclinaison modifiée"})


# ================= DELETE =================
@declinaisons_bp.route('/api/declinaisons/<int:id>', methods=['DELETE'])
def delete_declinaison(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM declinaisons_poids WHERE id_poids = %s",
        (id,)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Déclinaison supprimée"})