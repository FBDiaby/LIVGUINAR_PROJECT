from flask import Blueprint, request, jsonify
from db import get_db_connection

panier_items_bp = Blueprint("panier_items", __name__)


@panier_items_bp.route("/api/panier/items", methods=["POST"])
def ajouter_item():

    data = request.json

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO panier_items
        (id_panier, id_poids, quantite, prix_unitaire)
        VALUES (%s,%s,%s,%s)
    """, (
        data["id_panier"],
        data["id_poids"],
        data["quantite"],
        data["prix_unitaire"]
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Article ajouté au panier"
    }), 201


@panier_items_bp.route("/api/panier/<int:id_panier>", methods=["GET"])
def voir_panier(id_panier):

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            pi.id_item,
            p.nom_produit,
            dp.valeur_poids,
            pi.quantite,
            pi.prix_unitaire,
            (pi.quantite * pi.prix_unitaire) AS sous_total
        FROM panier_items pi
        JOIN declinaisons_poids dp
            ON pi.id_poids = dp.id_poids
        JOIN produits p
            ON dp.id_produit = p.id_produit
        WHERE pi.id_panier = %s
    """, (id_panier,))

    items = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(items)