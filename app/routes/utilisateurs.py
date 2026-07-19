from flask import Blueprint, jsonify, request
from db import get_db_connection

utilisateurs_bp = Blueprint('utilisateurs', __name__)

# ================= GET ALL =================
@utilisateurs_bp.route('/api/utilisateurs', methods=['GET'])
def get_utilisateurs():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT id_user, nom, prenom, telephone, email, role
        FROM utilisateurs
        ORDER BY id_user DESC
    """)

    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(data)


# ================= GET BY ID =================
@utilisateurs_bp.route('/api/utilisateurs/<int:id>', methods=['GET'])
def get_utilisateur(id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT id_user, nom, prenom, telephone, email, role
        FROM utilisateurs
        WHERE id_user = %s
    """, (id,))

    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if not user:
        return jsonify({"message": "Utilisateur introuvable"}), 404

    return jsonify(user)


# ================= POST =================
@utilisateurs_bp.route('/api/utilisateurs', methods=['POST'])
def add_utilisateur():
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO utilisateurs (nom, prenom, telephone, email, mot_de_passe, role)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        data['nom'],
        data['prenom'],
        data['telephone'],
        data['email'],
        data['mot_de_passe'],
        data['role']
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Utilisateur ajouté"}), 201


# ================= PUT =================
@utilisateurs_bp.route('/api/utilisateurs/<int:id>', methods=['PUT'])
def update_utilisateur(id):
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE utilisateurs
        SET nom=%s,
            prenom=%s,
            telephone=%s,
            email=%s,
            mot_de_passe=%s,
            role=%s
        WHERE id_user=%s
    """, (
        data['nom'],
        data['prenom'],
        data['telephone'],
        data['email'],
        data['mot_de_passe'],
        data['role'],
        id
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Utilisateur modifié"})


# ================= DELETE =================
@utilisateurs_bp.route('/api/utilisateurs/<int:id>', methods=['DELETE'])
def delete_utilisateur(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM utilisateurs WHERE id_user=%s", (id,))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Utilisateur supprimé"})