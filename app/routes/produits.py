from flask import Blueprint, jsonify, request
from db import get_db_connection

produits_bp = Blueprint('produits', __name__)

# ================= GET ALL =================
@produits_bp.route('/api/produits', methods=['GET'])
def get_produits():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            p.id_produit,
            p.nom_produit,
            p.description,
            p.image_url,
            p.id_categorie,
            c.nom_categorie
        FROM produits p
        LEFT JOIN categories c
        ON p.id_categorie = c.id_categorie
        ORDER BY p.id_produit
    """)

    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(data)


# ================= GET BY ID =================
@produits_bp.route('/api/produits/<int:id>', methods=['GET'])
def get_produit(id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            p.id_produit,
            p.nom_produit,
            p.description,
            p.image_url,
            p.id_categorie,
            c.nom_categorie
        FROM produits p
        LEFT JOIN categories c
        ON p.id_categorie = c.id_categorie
        WHERE p.id_produit = %s
    """, (id,))

    produit = cursor.fetchone()

    cursor.close()
    conn.close()

    if not produit:
        return jsonify({"message": "Produit introuvable"}), 404

    return jsonify(produit)


# ================= POST =================
@produits_bp.route('/api/produits', methods=['POST'])
def add_produit():
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO produits (nom_produit, description, image_url, id_categorie)
        VALUES (%s, %s, %s, %s)
    """, (
        data['nom_produit'],
        data.get('description', ''),
        data.get('image_url', ''),
        data['id_categorie']
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Produit ajouté"}), 201


# ================= PUT =================
@produits_bp.route('/api/produits/<int:id>', methods=['PUT'])
def update_produit(id):
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE produits
        SET
            nom_produit = %s,
            description = %s,
            image_url = %s,
            id_categorie = %s
        WHERE id_produit = %s
    """, (
        data['nom_produit'],
        data.get('description', ''),
        data.get('image_url', ''),
        data['id_categorie'],
        id
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Produit modifié"})


# ================= DELETE =================
@produits_bp.route('/api/produits/<int:id>', methods=['DELETE'])
def delete_produit(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM produits WHERE id_produit = %s", (id,))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Produit supprimé"})