from flask import Flask, jsonify, request, render_template
from flask_socketio import SocketIO, emit
import mysql.connector
import os

app = Flask(__name__)

# 🔒 RECUPERATION SECURISEE DES VARIABLES D'ENVIRONNEMENT
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'srt_secret_key_livguinar_2026')
DATABASE_URL = os.environ.get('DATABASE_URL')

def get_db_connection():
    # Découpage propre si l'URL d'environnement est présente, sinon valeurs par défaut sécurisées
    return mysql.connector.connect(
        host=os.environ.get('MYSQL_HOST', 'db'),
        user=os.environ.get('MYSQL_USER', 'root'),
        password=os.environ.get('MYSQL_PASSWORD', 'Eternel@Fall76'),
        database=os.environ.get('MYSQL_DATABASE', 'livguinar_db'),
        port=3306
    )

@app.route('/')
def index():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM produits;")
        liste_produits = cursor.fetchall()
        print("PRODUITS:", liste_produits)
        cursor.close()
        conn.close()
        return render_template('index.html', produits=liste_produits)
    except Exception as e:
        return f"Erreur de connexion a la base de donnees : {str(e)}"

# =========================================================================
# 💬 INTERFACE DE L'ASSISTANT VOCAL MULTILINGUE
# =========================================================================
@app.route('/api/produits', methods=['GET'])
def get_produits():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM produits")
        produits = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(produits)

    except Exception as e:
        return jsonify({"erreur": str(e)}), 500
@app.route('/api/produits', methods=['POST'])
def add_produit():
    try:
        data = request.get_json()

        nom = data['nom_produit']
        description = data.get('description', '')
        image_url = data.get('image_url', '')
        id_categorie = data['id_categorie']

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO produits (nom_produit, description, image_url, id_categorie)
            VALUES (%s, %s, %s, %s)
        """, (nom, description, image_url, id_categorie))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Produit ajouté avec succès"}), 201

    except Exception as e:
        return jsonify({"erreur": str(e)}), 500
@app.route('/api/produits/<int:id>', methods=['GET'])
def get_produit_by_id(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM produits WHERE id_produit = %s", (id,))
        produit = cursor.fetchone()

        cursor.close()
        conn.close()

        if produit:
            return jsonify(produit)
        else:
            return jsonify({"message": "Produit introuvable"}), 404

    except Exception as e:
        return jsonify({"erreur": str(e)}), 500
@app.route('/api/produits/<int:id>', methods=['PUT'])
def update_produit(id):
    try:
        data = request.get_json()

        nom = data['nom_produit']
        description = data.get('description', '')
        image_url = data.get('image_url', '')
        id_categorie = data['id_categorie']

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE produits
            SET nom_produit = %s,
                description = %s,
                image_url = %s,
                id_categorie = %s
            WHERE id_produit = %s
        """, (nom, description, image_url, id_categorie, id))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message": "Produit modifié avec succès"})

    except Exception as e:
        return jsonify({"erreur": str(e)}), 500
@app.route('/api/produits/<int:id>', methods=['DELETE'])
def delete_produit(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM produits WHERE id_produit = %s", (id,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Produit introuvable"}), 404

        cursor.close()
        conn.close()

        return jsonify({"message": "Produit supprimé avec succès"})

    except Exception as e:
        return jsonify({"erreur": str(e)}), 500
@app.route('/assistant')
def assistant_view():
    return render_template('assistant.html')

# =========================================================================
# 🧭 ECOUTEUR DE FLUX WEBSOCKETS (Temps réel)
# =========================================================================
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('update_delivery_location')
def handle_delivery_location(data):
    print(f"📡 [GPS] Position recue du livreur : {data}")
    socketio.emit('location_broadcast', data, broadcast=True)
# =========================================================================
# 📱 PASSERELLE SMS FALLBACK (Mode Hors-ligne)
# =========================================================================
@app.route('/api/sms-fallback', methods=['POST'])
def sms_fallback():
    incoming_data = request.get_json()
    print(f"📲 [SMS Fallback] Données cellulaires reçues : {incoming_data}")
    return jsonify({"status": "success", "message": "SMS traité."}), 200

# =========================================================================
# 🎙️ AUDIO STREAMING GATEWAY (Assistant vocal)
# =========================================================================
@app.route('/api/voice-command', methods=['POST'])
def process_voice_command():
    if 'audio' not in request.files:
        return jsonify({"error": "Aucun fichier audio"}), 400
    audio_file = request.files['audio']
    print(f"🎙️ [Audio System] Fichier {audio_file.filename} reçu.")
    return jsonify({"status": "received"}), 200


# ⚠️ LE BLOC DE LANCEMENT DOIT TOUJOURS RESTER TOUT EN BAS !
if __name__ == '__main__':
    # Mode debug désactivable dynamiquement pour la production
    is_debug = os.environ.get('FLASK_ENV') == 'development'
    socketio.run(app, host='0.0.0.0', port=5000, debug=is_debug)