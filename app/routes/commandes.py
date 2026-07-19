from flask import Blueprint, jsonify, request
from db import get_db_connection
import uuid

commandes_bp = Blueprint('commandes', __name__)

# ================= GET ALL =================
@commandes_bp.route('/api/commandes', methods=['GET'])
def get_commandes():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM commandes
        ORDER BY date_creation DESC
    """)

    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(data)


# ================= GET BY ID =================
@commandes_bp.route('/api/commandes/<int:id>', methods=['GET'])
def get_commande(id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM commandes
        WHERE id_commande=%s
    """, (id,))

    commande = cursor.fetchone()

    cursor.close()
    conn.close()

    if not commande:
        return jsonify({"message": "Commande introuvable"}), 404

    return jsonify(commande)


# ================= POST =================
@commandes_bp.route('/api/commandes', methods=['POST'])
def add_commande():
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    qr_token = str(uuid.uuid4())

    cursor.execute("""
        INSERT INTO commandes
        (id_client, id_livreur, mode_paiement, mode_livraison, montant_total, coordonnees_gps, qr_token)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
    """, (
        data.get("id_client"),
        data.get("id_livreur"),
        data["mode_paiement"],
        data["mode_livraison"],
        data["montant_total"],
        data.get("coordonnees_gps"),
        qr_token
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Commande créée",
        "qr_token": qr_token
    }), 201


# ================= UPDATE STATUS =================
@commandes_bp.route('/api/commandes/<int:id>', methods=['PUT'])
def update_commande(id):
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE commandes
        SET statut=%s,
            id_livreur=%s
        WHERE id_commande=%s
    """, (
        data.get("statut"),
        data.get("id_livreur"),
        id
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Commande mise à jour"})


# ================= DELETE =================
@commandes_bp.route('/api/commandes/<int:id>', methods=['DELETE'])
def delete_commande(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM commandes
        WHERE id_commande=%s
    """, (id,))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Commande supprimée"})