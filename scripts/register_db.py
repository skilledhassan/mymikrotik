import sqlite3
import sys

db_path = '/www/server/panel/data/default.db'
try:
    con = sqlite3.connect(db_path)
    cur = con.cursor()

    cur.execute("SELECT id, name, username FROM databases WHERE name='mymikrotik'")
    existing = cur.fetchall()
    if existing:
        print("Database 'mymikrotik' is ALREADY registered in aaPanel:", existing)
    else:
        cur.execute(
            """INSERT INTO databases (pid, name, username, password, accept, ps, addtime, db_type, conn_config, sid, type)
               VALUES (0, 'mymikrotik', 'mymikrotik', 'Player@1187#db', '127.0.0.1', 'MikroTik Local DB', datetime('now', 'localtime'), 0, '{}', 0, 'MySQL')"""
        )
        con.commit()
        print("Successfully registered 'mymikrotik' in aaPanel SQLite database.")

    cur.execute("SELECT id, name, username, accept, ps FROM databases")
    all_dbs = cur.fetchall()
    print("Current aaPanel Registered Databases:")
    for d in all_dbs:
        print("  -", d)
except Exception as e:
    print("Error updating aaPanel database:", e)
    sys.exit(1)
