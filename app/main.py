from flask import Flask, jsonify, request, render_template, session
from flask_socketio import SocketIO, emit
import mysql.connector
import bcrypt
import os
import uuid

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'srt_secret_key_livguinar_2026')
app.config['SESSION_COOKIE_HTTPONLY'] = True

def get_db_connection():
    """Connexion lazy — se connecte uniquement quand nécessaire."""
    return mysql.connector.connect(
        host=os.environ.get('MYSQL_HOST', 'db'),
        user=os.environ.get('MYSQL_USER', 'root'),
        password=os.environ.get('MYSQL_PASSWORD', 'Eternel@Fall76'),
        database=os.environ.get('MYSQL_DATABASE', 'livguinar_db'),
        port=3306,
        connection_timeout=10
    )

# ── PAGE PRINCIPALE ──────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/assistant')
def assistant_view():
    return render_template('assistant.html')

# ── API PRODUITS ─────────────────────────────────────────────────────────
@app.route('/api/produits', methods=['GET'])
def get_produits():
    try:
        categorie = request.args.get('categorie', None)
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        if categorie and categorie != 'tout':
            cursor.execute("""
                SELECT p.id_produit, p.nom_produit, p.description, p.image_url,
                       p.badge, p.note,
                       p.nb_avis AS avis,
                       c.nom_categorie
                FROM produits p
                JOIN categories c ON p.id_categorie = c.id_categorie
                WHERE c.nom_categorie = %s
                ORDER BY p.id_produit
            """, (categorie,))
        else:
            cursor.execute("""
                SELECT p.id_produit, p.nom_produit, p.description, p.image_url,
                       p.badge, p.note,
                       p.nb_avis AS avis,
                       c.nom_categorie
                FROM produits p
                JOIN categories c ON p.id_categorie = c.id_categorie
                ORDER BY p.id_produit
            """)

        produits = cursor.fetchall()

        for produit in produits:
            cursor.execute("""
                SELECT id_poids, label_poids AS label, valeur_poids AS valeur, prix, stock_disponible
                FROM declinaisons_poids
                WHERE id_produit = %s
                ORDER BY prix ASC
            """, (produit['id_produit'],))

            produit['poids'] = [
                {
                    'id_poids': d['id_poids'],
                    'label':    d['label'],
                    'valeur':   d['valeur'],
                    'prix':     float(d['prix']),
                    'stock':    d['stock_disponible']
                }
                for d in cursor.fetchall()
            ]
            produit['note'] = float(produit['note'] or 4.5)

        cursor.close()
        conn.close()
        return jsonify({'success': True, 'produits': produits}), 200

    except Exception as e:
        print(f"[ERREUR PRODUITS] {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/produits/<int:id_produit>', methods=['GET'])
def get_produit(id_produit):
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT p.id_produit, p.nom_produit, p.description, p.image_url,
                   p.badge, p.note,
                   p.nb_avis AS avis,
                   c.nom_categorie
            FROM produits p
            JOIN categories c ON p.id_categorie = c.id_categorie
            WHERE p.id_produit = %s
        """, (id_produit,))
        produit = cursor.fetchone()

        if not produit:
            cursor.close(); conn.close()
            return jsonify({'success': False, 'error': 'Produit introuvable'}), 404

        cursor.execute("""
            SELECT id_poids, label_poids AS label, valeur_poids AS valeur, prix, stock_disponible
            FROM declinaisons_poids WHERE id_produit = %s ORDER BY prix ASC
        """, (id_produit,))

        produit['poids'] = [
            {'id_poids': d['id_poids'], 'label': d['label'],
             'valeur': d['valeur'], 'prix': float(d['prix']), 'stock': d['stock_disponible']}
            for d in cursor.fetchall()
        ]
        produit['note'] = float(produit['note'] or 4.5)

        cursor.close(); conn.close()
        return jsonify({'success': True, 'produit': produit}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ── AUTH ──────────────────────────────────────────────────────────────────
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data      = request.get_json()
        nom       = data.get('nom', '').strip()
        telephone = data.get('telephone', '').strip()
        email     = data.get('email', '').strip() or f"{telephone}@livguinar.sn"
        password  = data.get('mot_de_passe', '').strip()
        adresse   = data.get('adresse', '').strip()

        if not all([nom, telephone, password]):
            return jsonify({'success': False, 'error': 'Champs obligatoires manquants'}), 400

        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id_user FROM utilisateurs WHERE telephone=%s OR email=%s", (telephone, email))
        if cursor.fetchone():
            cursor.close(); conn.close()
            return jsonify({'success': False, 'error': 'Téléphone ou email déjà utilisé'}), 409

        cursor.execute("""
            INSERT INTO utilisateurs (nom_complet, telephone, email, mot_de_passe, adresse)
            VALUES (%s, %s, %s, %s, %s)
        """, (nom, telephone, email, hashed, adresse))
        id_user = cursor.lastrowid
        conn.commit(); cursor.close(); conn.close()

        session.update({'user_id': id_user, 'nom': nom, 'telephone': telephone, 'role': 'client'})
        return jsonify({'success': True, 'user': {'id': id_user, 'nom': nom, 'telephone': telephone}}), 201

    except Exception as e:
        print(f"[ERREUR REGISTER] {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data        = request.get_json()
        identifiant = data.get('identifiant', '').strip()
        password    = data.get('mot_de_passe', '').strip()

        if not identifiant or not password:
            return jsonify({'success': False, 'error': 'Identifiant et mot de passe requis'}), 400

        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id_user, nom_complet, telephone, email, mot_de_passe, role
            FROM utilisateurs WHERE telephone=%s OR email=%s
        """, (identifiant, identifiant))
        user = cursor.fetchone(); cursor.close(); conn.close()

        if not user:
            return jsonify({'success': False, 'error': 'Compte introuvable'}), 404
        if not bcrypt.checkpw(password.encode(), user['mot_de_passe'].encode()):
            return jsonify({'success': False, 'error': 'Mot de passe incorrect'}), 401

        session.update({'user_id': user['id_user'], 'nom': user['nom_complet'], 'telephone': user['telephone'], 'role': user['role']})
        return jsonify({'success': True, 'user': {'id': user['id_user'], 'nom': user['nom_complet'], 'telephone': user['telephone'], 'role': user['role']}}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True}), 200


@app.route('/api/auth/me', methods=['GET'])
def me():
    if 'user_id' not in session:
        return jsonify({'success': False, 'logged_in': False}), 200
    return jsonify({'success': True, 'logged_in': True, 'user': {
        'id': session['user_id'], 'nom': session['nom'],
        'telephone': session['telephone'], 'role': session['role']
    }}), 200

# ── COMMANDES ─────────────────────────────────────────────────────────────
@app.route('/api/commandes', methods=['POST'])
def passer_commande():
    try:
        data          = request.get_json()
        nom_client    = data.get('nom_client', session.get('nom', 'Client'))
        telephone     = data.get('telephone', session.get('telephone', ''))
        adresse       = data.get('adresse', '')
        mode_paiement = data.get('mode_paiement', 'especes')
        lignes        = data.get('lignes', [])

        if not lignes:
            return jsonify({'success': False, 'error': 'Panier vide'}), 400

        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sous_total = 0
        lignes_ok  = []

        for l in lignes:
            cursor.execute("SELECT prix FROM declinaisons_poids WHERE id_poids=%s", (l['id_poids'],))
            dp = cursor.fetchone()
            if not dp:
                cursor.close(); conn.close()
                return jsonify({'success': False, 'error': 'Option introuvable'}), 400

            prix_reel = float(dp['prix'])
            sous_total += prix_reel * l['quantite']
            lignes_ok.append({**l, 'prix_unitaire': prix_reel, 'total_ligne': prix_reel * l['quantite']})

        frais   = 1500
        total   = int(sous_total + frais)
        numero  = f"LG-{uuid.uuid4().hex[:6].upper()}"
        id_user = session.get('user_id', None)

        cursor.execute("""
            INSERT INTO commandes (numero, id_user, nom_client, telephone, adresse,
                                   mode_paiement, sous_total, frais_livraison, total)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (numero, id_user, nom_client, telephone, adresse, mode_paiement, int(sous_total), frais, total))
        id_commande = cursor.lastrowid

        for lv in lignes_ok:
            cursor.execute("""
                INSERT INTO lignes_commande
                    (id_commande, id_produit, id_poids, nom_produit, poids_label, prix_unitaire, quantite, total_ligne)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, (id_commande, lv['id_produit'], lv['id_poids'], lv.get('nom',''), lv.get('poids_label',''),
                  lv['prix_unitaire'], lv['quantite'], lv['total_ligne']))

        conn.commit(); cursor.close(); conn.close()
        return jsonify({'success': True, 'numero': numero, 'id_commande': id_commande, 'total': total}), 201

    except Exception as e:
        print(f"[ERREUR COMMANDE] {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/commandes/mes-commandes', methods=['GET'])
def mes_commandes():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Non connecté'}), 401
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT numero, statut, mode_paiement, total, created_at
            FROM commandes WHERE id_user=%s ORDER BY created_at DESC
        """, (session['user_id'],))
        commandes = cursor.fetchall()
        for c in commandes:
            c['created_at'] = c['created_at'].strftime('%d/%m/%Y %H:%M')
            c['total']      = float(c['total'])
        cursor.close(); conn.close()
        return jsonify({'success': True, 'commandes': commandes}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ── ASSISTANT ─────────────────────────────────────────────────────────────
@app.route('/api/assistant', methods=['POST'])
def api_assistant():
    import json, re, traceback
    from google import genai
    from google.genai import types

    SYSTEM_PROMPT = """Tu es l'assistant vocal intelligent de "Liv'Guinar+", une application d'e-commerce de bétail et volaille basée à Dakar, Sénégal.
Tu comprends et parles NATURELLEMENT le Wolof, le Sérère et le Français.
Réponds UNIQUEMENT avec un JSON brut (sans markdown) :
{"commande_systeme":[{"action":"salutation"/"achat"/"information"/"cloture"/"aucun","categorie":null,"produit":null,"option_poids":null,"quantite":null}],"reponse_utilisateur":{"langue":"wolof"/"serere"/"francais"/"mixte","type_message_recu":"texte","texte_reponse":"..."}}"""

    try:
        payload      = request.get_json()
        user_message = payload.get('message', '').strip()
        type_message = payload.get('type_message', 'texte')
        langue_hint  = payload.get('langue_hint', 'francais')

        if not user_message:
            return jsonify({'error': 'Message vide'}), 400

        client   = genai.Client(api_key=os.environ.get('GEMINI_API_KEY', ''))
        response = client.models.generate_content(
            model='gemini-2.0-flash-lite',
            contents=f"[{type_message.upper()}] Langue: {langue_hint}\nMessage: {user_message}",
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT, temperature=0.3)
        )
        raw = re.sub(r"^```json\s*", "", response.text.strip())
        raw = re.sub(r"\s*```$", "", raw).strip()
        return jsonify(json.loads(raw)), 200

    except json.JSONDecodeError:
        return jsonify({"commande_systeme":[{"action":"aucun"}],"reponse_utilisateur":{"langue":"francais","type_message_recu":"texte","texte_reponse":"Je n'ai pas bien compris, pouvez-vous reformuler ?"}}), 200
    except Exception as e:
        print(f"[ERREUR ASSISTANT] {e}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


# ── PAGE LIVREUR ──────────────────────────────────────────────────────────
@app.route('/checkout')
def checkout_view():
    return render_template('checkout.html')

@app.route('/livreur')
def livreur_view():
    return render_template('livreur.html')

# ── API SUIVI COMMANDE ─────────────────────────────────────────────────────
@app.route('/api/suivi/<string:numero>', methods=['GET'])
def get_suivi(numero):
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT c.numero, c.statut, c.created_at, c.nom_client, c.adresse,
                   c.total, c.mode_paiement
            FROM commandes c
            WHERE c.numero = %s
        """, (numero,))
        commande = cursor.fetchone()
        if not commande:
            cursor.close(); conn.close()
            return jsonify({'success': False, 'error': 'Commande introuvable'}), 404

        # Lignes de la commande
        cursor.execute("""
            SELECT nom_produit, poids_label, quantite, prix_unitaire, total_ligne
            FROM lignes_commande WHERE id_commande = (
                SELECT id_commande FROM commandes WHERE numero = %s
            )
        """, (numero,))
        lignes = cursor.fetchall()

        commande['created_at'] = commande['created_at'].strftime('%d/%m/%Y à %Hh%M')
        commande['total']      = float(commande['total'])
        for l in lignes:
            l['prix_unitaire'] = float(l['prix_unitaire'])
            l['total_ligne']   = float(l['total_ligne'])

        # QR code URL
        commande['qr_url'] = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LG_{numero}&color=0F4C3A"

        cursor.close(); conn.close()
        return jsonify({'success': True, 'commande': commande, 'lignes': lignes}), 200
    except Exception as e:
        print(f"[ERREUR SUIVI] {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ── WEBSOCKETS ────────────────────────────────────────────────────────────
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('update_delivery_location')
def handle_delivery_location(data):
    """Reçoit la position du livreur et la diffuse aux clients qui suivent cette commande."""
    numero = data.get('commande', 'unknown')
    print(f"📡 [GPS] Commande {numero} → ({data.get('latitude')}, {data.get('longitude')})")

    # Broadcaster à tous les clients (ils filtrent par numéro de commande côté JS)
    emit('location_broadcast', data, broadcast=True)

    # Room spécifique à la commande (plus efficace)
    emit('livraison_update', data, room=f'commande_{numero}', include_self=False)

@socketio.on('rejoindre_suivi')
def rejoindre_suivi(data):
    """Le client rejoint la room de sa commande pour recevoir les updates GPS."""
    numero = data.get('commande', '')
    if numero:
        from flask_socketio import join_room
        join_room(f'commande_{numero}')
        emit('suivi_rejoint', {'commande': numero, 'message': f'Connecté au suivi de {numero}'})
        print(f"👤 Client connecté au suivi de commande {numero}")

@app.route('/api/sms-fallback', methods=['POST'])
def sms_fallback():
    return jsonify({'status': 'success', 'message': 'SMS traité.'}), 200

@app.route('/api/voice-command', methods=['POST'])
def process_voice_command():
    if 'audio' not in request.files:
        return jsonify({'error': 'Aucun fichier audio'}), 400
    return jsonify({'status': 'received'}), 200

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=os.environ.get('FLASK_ENV') == 'development')
