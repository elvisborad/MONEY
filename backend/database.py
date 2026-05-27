import sqlite3
import os
import json
from datetime import datetime

db_dir = os.environ.get('PERSISTENT_DB_DIR', os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(db_dir, 'database.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create scans history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            total_amount INTEGER NOT NULL,
            predictions_json TEXT NOT NULL,
            counts_json TEXT NOT NULL,
            screenshot_base64 TEXT
        )
    ''')
    
    # Create settings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()

def save_scan(total_amount, predictions, counts, screenshot_base64=None):
    conn = get_db()
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    
    cursor.execute('''
        INSERT INTO scans (timestamp, total_amount, predictions_json, counts_json, screenshot_base64)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        timestamp,
        total_amount,
        json.dumps(predictions),
        json.dumps(counts),
        screenshot_base64
    ))
    
    conn.commit()
    scan_id = cursor.lastrowid
    conn.close()
    return scan_id

def get_scans(limit=100):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM scans ORDER BY id DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    
    scans = []
    for r in rows:
        scans.append({
            'id': r['id'],
            'timestamp': r['timestamp'],
            'total_amount': r['total_amount'],
            'predictions': json.loads(r['predictions_json']),
            'counts': json.loads(r['counts_json']),
            'screenshot_base64': r['screenshot_base64']
        })
        
    conn.close()
    return scans

def delete_scan(scan_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM scans WHERE id = ?', (scan_id,))
    conn.commit()
    conn.close()

def clear_scans():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM scans')
    conn.commit()
    conn.close()

def get_setting(key, default=None):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row['value']
    return default

def set_setting(key, value):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    ''', (key, str(value)))
    conn.commit()
    conn.close()
