from flask import Flask, jsonify
from flask_socketio import SocketIO
import os

app = Flask(__name__)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'test')

socketio = SocketIO(app, cors_allowed_origins="*")

# IMPORT DES ROUTES (APRES app)
from routes.produits import produits_bp
from routes.categories import categories_bp
from routes.utilisateurs import utilisateurs_bp
app.register_blueprint(utilisateurs_bp)
app.register_blueprint(produits_bp)
app.register_blueprint(categories_bp)

@app.route('/')
def home():
    return jsonify({"status": "OK API LIVGUINAR"})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)