import mysql.connector
import os

def get_db_connection():
    return mysql.connector.connect(
        host=os.environ.get('MYSQL_HOST', 'db'),
        user=os.environ.get('MYSQL_USER', 'root'),
        password=os.environ.get('MYSQL_PASSWORD', 'Eternel@Fall76'),
        database=os.environ.get('MYSQL_DATABASE', 'livguinar_db'),
        port=3306
    )
    