import bcrypt, mysql.connector

hash_pw = bcrypt.hashpw('Admin@2026'.encode(), bcrypt.gensalt()).decode()
conn = mysql.connector.connect(host='db', user='root', password='Eternel@Fall76', database='livguinar_db')
cursor = conn.cursor()
cursor.execute("UPDATE utilisateurs SET mot_de_passe=%s, role='admin' WHERE email='admin@livguinar.sn'", (hash_pw,))
conn.commit()
cursor.close()
conn.close()
print('Mot de passe admin mis à jour avec succès !')
