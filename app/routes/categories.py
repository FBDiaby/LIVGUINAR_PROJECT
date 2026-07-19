from flask import Blueprint, jsonify, request
from db import get_db_connection

categories_bp = Blueprint('categories', __name__)

# ================= GET ALL =================
@categories_bp.route('/api/categories', methods=['GET'])
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM categories")
    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(data)


# ================= POST =================
@categories_bp.route('/api/categories', methods=['POST'])
def add_category():
    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO categories (nom_categorie) VALUES (%s)",
        (data['nom_categorie'],)
    )

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Categorie ajoutee"}), 201