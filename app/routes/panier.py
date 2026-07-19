from flask import Blueprint, request, jsonify
from db import get_db_connection

panier_bp = Blueprint("panier", __name__)


@panier_bp.route("/api/panier", methods=["POST"])
def creer_panier():

    data = request.json

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO panier (id_client)
        VALUES (%s)
    """, (
        data["id_client"],
    ))

    conn.commit()

    id_panier = cursor.lastrowid

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Panier créé",
        "id_panier": id_panier
    }), 201