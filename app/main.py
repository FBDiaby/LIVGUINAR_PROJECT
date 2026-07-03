from flask import Flask, jsonify
from flask_socketio import SocketIO
import os

from routes.produits import produits_bp

app = Flask(__name__)
app.register_blueprint(produits_bp)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'test')

socketio = SocketIO(app, cors_allowed_origins="*")


@app.route('/')
def home():
    return jsonify({"status": "OK API LIVGUINAR"})


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)