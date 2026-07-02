from flask import Blueprint, jsonify, request
import mysql.connector
import os

produits_bp = Blueprint('produits', __name__)

def get_db_connection():
    return mysql.connector.connect(
        host=os.environ.get('MYSQL_HOST', 'db'),
        user=os.environ.get('MYSQL_USER', 'root'),
        password=os.environ.get('MYSQL_PASSWORD', 'Eternel@Fall76'),
        database=os.environ.get('MYSQL_DATABASE', 'livguinar_db'),
        port=3306
    )

@produits_bp.route('/api/produits', methods=['GET'])
def get_produits():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM produits")
    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(data)