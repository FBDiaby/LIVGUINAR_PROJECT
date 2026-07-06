from flask import Flask, jsonify
from flask_socketio import SocketIO
import os

from routes.produits import produits_bp
from routes.categories import categories_bp
from routes.utilisateurs import utilisateurs_bp
from routes.clients import clients_bp
from routes.commandes import commandes_bp
from routes.declinaisons_poids import declinaisons_bp
from routes.lignes_commande import lignes_bp

app = Flask(__name__)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'test')

app.register_blueprint(produits_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(utilisateurs_bp)
app.register_blueprint(clients_bp)
app.register_blueprint(commandes_bp)
app.register_blueprint(declinaisons_bp)
app.register_blueprint(lignes_bp)

socketio = SocketIO(app, cors_allowed_origins="*")


@app.route('/')
def home():
    return jsonify({"status": "OK API LIVGUINAR"})


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)