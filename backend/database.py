import sqlite3
import os
import json
import secrets
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db_dir = os.environ.get('PERSISTENT_DB_DIR', os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(db_dir, 'database.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    
    # Create sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
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
    
    # Create global settings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')
    
    # Create user-specific settings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER,
            key TEXT,
            value TEXT NOT NULL,
            PRIMARY KEY (user_id, key),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Alter scans table to add user_id for association (with backwards compatibility)
    try:
        cursor.execute("ALTER TABLE scans ADD COLUMN user_id INTEGER REFERENCES users(id)")
    except sqlite3.OperationalError:
        # Column already exists, safe to ignore
        pass
        
    conn.commit()
    conn.close()

# User Management Helpers
def create_user(username, password):
    conn = get_db()
    cursor = conn.cursor()
    password_hash = generate_password_hash(password)
    try:
        cursor.execute('''
            INSERT INTO users (username, password_hash)
            VALUES (?, ?)
        ''', (username, password_hash))
        conn.commit()
        user_id = cursor.lastrowid
        
        # Copy global settings to new user settings as default starting settings
        cursor.execute('SELECT key, value FROM settings')
        global_settings = cursor.fetchall()
        for setting in global_settings:
            cursor.execute('''
                INSERT INTO user_settings (user_id, key, value)
                VALUES (?, ?, ?)
            ''', (user_id, setting['key'], setting['value']))
        conn.commit()
        
        return user_id
    except sqlite3.IntegrityError:
        return None  # Username already exists
    finally:
        conn.close()

def verify_user(username, password):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, password_hash FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    conn.close()
    if row and check_password_hash(row['password_hash'], password):
        return row['id']
    return None

def create_session(user_id):
    conn = get_db()
    cursor = conn.cursor()
    token = secrets.token_hex(32)
    timestamp = datetime.now().isoformat()
    cursor.execute('''
        INSERT INTO sessions (token, user_id, created_at)
        VALUES (?, ?, ?)
    ''', (token, user_id, timestamp))
    conn.commit()
    conn.close()
    return token

def verify_session(token):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT user_id FROM sessions WHERE token = ?', (token,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row['user_id']
    return None

def delete_session(token):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM sessions WHERE token = ?', (token,))
    conn.commit()
    conn.close()

# User-specific Scan Operations
def save_scan(user_id, total_amount, predictions, counts, screenshot_base64=None):
    conn = get_db()
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    
    cursor.execute('''
        INSERT INTO scans (timestamp, total_amount, predictions_json, counts_json, screenshot_base64, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        timestamp,
        total_amount,
        json.dumps(predictions),
        json.dumps(counts),
        screenshot_base64,
        user_id
    ))
    
    conn.commit()
    scan_id = cursor.lastrowid
    conn.close()
    return scan_id

def get_scans(user_id, limit=100):
    conn = get_db()
    cursor = conn.cursor()
    
    # Return user-specific scans. If user_id is None, return scans without user_id (guest logs)
    if user_id is None:
        cursor.execute('SELECT * FROM scans WHERE user_id IS NULL ORDER BY id DESC LIMIT ?', (limit,))
    else:
        cursor.execute('SELECT * FROM scans WHERE user_id = ? ORDER BY id DESC LIMIT ?', (user_id, limit))
        
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

def delete_scan(user_id, scan_id):
    conn = get_db()
    cursor = conn.cursor()
    if user_id is None:
        cursor.execute('DELETE FROM scans WHERE id = ? AND user_id IS NULL', (scan_id,))
    else:
        cursor.execute('DELETE FROM scans WHERE id = ? AND user_id = ?', (scan_id, user_id))
    conn.commit()
    conn.close()

def clear_scans(user_id):
    conn = get_db()
    cursor = conn.cursor()
    if user_id is None:
        cursor.execute('DELETE FROM scans WHERE user_id IS NULL')
    else:
        cursor.execute('DELETE FROM scans WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()

# User-specific Settings Operations
def get_setting(user_id, key, default=None):
    conn = get_db()
    cursor = conn.cursor()
    
    row = None
    if user_id is not None:
        cursor.execute('SELECT value FROM user_settings WHERE user_id = ? AND key = ?', (user_id, key))
        row = cursor.fetchone()
        
    # Fallback to global settings if user setting is empty/missing or user is guest
    if not row:
        cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
        row = cursor.fetchone()
        
    conn.close()
    if row:
        return row['value']
    return default

def set_setting(user_id, key, value):
    conn = get_db()
    cursor = conn.cursor()
    
    if user_id is None:
        # Set globally
        cursor.execute('''
            INSERT INTO settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        ''', (key, str(value)))
    else:
        # Set per user
        cursor.execute('''
            INSERT INTO user_settings (user_id, key, value)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
        ''', (user_id, key, str(value)))
        
    conn.commit()
    conn.close()
