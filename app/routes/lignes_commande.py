from flask import Blueprint, request, jsonify
from db import get_db_connection

lignes_bp = Blueprint("lignes", __name__)


# ==========================
# GET toutes les lignes
# ==========================
@lignes_bp.route("/api/lignes", methods=["GET"])
def get_lignes():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            lc.id_ligne,
            lc.id_commande,
            p.nom_produit,
            dp.valeur_poids,
            lc.quantite,
            lc.prix_unitaire
        FROM lignes_commande lc
        JOIN declinaisons_poids dp
            ON lc.id_poids = dp.id_poids
        JOIN produits p
            ON dp.id_produit = p.id_produit
    """)

    lignes = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(lignes)


# ==========================
# GET une ligne
# ==========================
@lignes_bp.route("/api/lignes/<int:id_ligne>", methods=["GET"])
def get_ligne(id_ligne):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            lc.id_ligne,
            lc.id_commande,
            p.nom_produit,
            dp.valeur_poids,
            lc.quantite,
            lc.prix_unitaire
        FROM lignes_commande lc
        JOIN declinaisons_poids dp
            ON lc.id_poids = dp.id_poids
        JOIN produits p
            ON dp.id_produit = p.id_produit
        WHERE lc.id_ligne=%s
    """, (id_ligne,))

    ligne = cursor.fetchone()

    cursor.close()
    conn.close()

    if ligne:
        return jsonify(ligne)

    return jsonify({"message": "Ligne introuvable"}), 404


# ==========================
# POST
# ==========================
@lignes_bp.route("/api/lignes", methods=["POST"])
def add_ligne():

    data = request.json

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO lignes_commande
        (id_commande,id_poids,quantite,prix_unitaire)
        VALUES (%s,%s,%s,%s)
    """, (
        data["id_commande"],
        data["id_poids"],
        data["quantite"],
        data["prix_unitaire"]
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Ligne ajoutée"}), 201


# ==========================
# PUT
# ==========================
@lignes_bp.route("/api/lignes/<int:id_ligne>", methods=["PUT"])
def update_ligne(id_ligne):

    data = request.json

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE lignes_commande
        SET
            id_commande=%s,
            id_poids=%s,
            quantite=%s,
            prix_unitaire=%s
        WHERE id_ligne=%s
    """, (
        data["id_commande"],
        data["id_poids"],
        data["quantite"],
        data["prix_unitaire"],
        id_ligne
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Ligne modifiée"})


# ==========================
# DELETE
# ==========================
@lignes_bp.route("/api/lignes/<int:id_ligne>", methods=["DELETE"])
def delete_ligne(id_ligne):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM lignes_commande WHERE id_ligne=%s",
        (id_ligne,)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Ligne supprimée"})