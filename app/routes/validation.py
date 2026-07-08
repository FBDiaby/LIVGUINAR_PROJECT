from flask import Blueprint, request, jsonify
from db import get_db_connection
import uuid

validation_bp = Blueprint("validation", __name__)


@validation_bp.route("/api/panier/valider", methods=["POST"])
def valider_panier():

    data = request.json

    id_panier = data["id_panier"]
    id_client = data["id_client"]

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Récupérer les articles du panier
    cursor.execute("""
        SELECT 
            id_poids,
            quantite,
            prix_unitaire
        FROM panier_items
        WHERE id_panier = %s
    """, (id_panier,))

    items = cursor.fetchall()

    if not items:
        cursor.close()
        conn.close()
        return jsonify({
            "message": "Panier vide"
        }), 400


    # Calcul du total
    montant_total = sum(
        item["quantite"] * item["prix_unitaire"]
        for item in items
    )


    # Création commande
    cursor.execute("""
        INSERT INTO commandes
        (
            id_client,
            statut,
            mode_paiement,
            mode_livraison,
            montant_total,
            qr_token
        )
        VALUES (%s,'en_attente',%s,%s,%s,%s)
    """, (
        id_client,
        data["mode_paiement"],
        data["mode_livraison"],
        montant_total,
        str(uuid.uuid4())
    ))

    id_commande = cursor.lastrowid


    # Création des lignes de commande
    for item in items:

        cursor.execute("""
            INSERT INTO lignes_commande
            (
                id_commande,
                id_poids,
                quantite,
                prix_unitaire
            )
            VALUES (%s,%s,%s,%s)
        """, (
            id_commande,
            item["id_poids"],
            item["quantite"],
            item["prix_unitaire"]
        ))


    # Fermer le panier
    cursor.execute("""
        UPDATE panier
        SET statut='valide'
        WHERE id_panier=%s
    """, (id_panier,))


    conn.commit()

    cursor.close()
    conn.close()


    return jsonify({
        "message": "Commande créée",
        "id_commande": id_commande,
        "montant_total": montant_total
    }), 201