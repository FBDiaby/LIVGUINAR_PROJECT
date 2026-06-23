FROM python:3.11-slim

WORKDIR /app

# Installation des dépendances système légères nécessaires pour compiler certains modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copie et installation des packages Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie de tout le code de l'application
COPY . .

# Exposition du port d'écoute interne de Flask
EXPOSE 5000

# Commande de lancement réseau asynchrone
CMD ["python", "main.py"]