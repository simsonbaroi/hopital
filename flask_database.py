
import sqlite3
import json
import os
from datetime import datetime
from contextlib import contextmanager

class FlaskHospitalDB:
    def __init__(self, db_path='hospital_billing_flask.db'):
        self.db_path = db_path
        self.init_database()
    
    @contextmanager
    def get_db_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def init_database(self):
        """Initialize database with required tables"""
        with self.get_db_connection() as conn:
            # Items table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT,
                    strength TEXT,
                    price REAL NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Bills table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS bills (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bill_number TEXT UNIQUE NOT NULL,
                    patient_name TEXT,
                    opd_number TEXT,
                    total_amount REAL NOT NULL,
                    items_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Settings table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            
        # Initialize with sample data if empty
        self.seed_sample_data()
    
    def seed_sample_data(self):
        """Seed database with sample medical data"""
        with self.get_db_connection() as conn:
            # Check if data exists
            result = conn.execute('SELECT COUNT(*) FROM items').fetchone()
            if result[0] > 0:
                return
            
            # Sample data for different categories
            sample_items = [
                # Registration
                {'category': 'Registration', 'name': 'Registration Fee', 'type': 'Standard', 'strength': '', 'price': 50, 'description': 'Patient registration fee'},
                
                # Dr. Fee
                {'category': 'Dr. Fee', 'name': 'Doctor Consultation Fee', 'type': 'Consultation', 'strength': '', 'price': 300, 'description': 'General consultation fee'},
                {'category': 'Dr. Fee', 'name': 'Specialist Consultation', 'type': 'Specialist', 'strength': '', 'price': 500, 'description': 'Specialist doctor consultation'},
                
                # Lab
                {'category': 'Lab', 'name': 'CBC', 'type': 'Blood Test', 'strength': '', 'price': 250, 'description': 'Complete Blood Count'},
                {'category': 'Lab', 'name': 'Blood Sugar', 'type': 'Blood Test', 'strength': '', 'price': 150, 'description': 'Blood glucose test'},
                {'category': 'Lab', 'name': 'Urine R/E', 'type': 'Urine Test', 'strength': '', 'price': 100, 'description': 'Urine routine examination'},
                
                # Medicine
                {'category': 'Medicine', 'name': 'Paracetamol', 'type': 'Tablet', 'strength': '500mg', 'price': 2, 'description': 'Pain reliever and fever reducer'},
                {'category': 'Medicine', 'name': 'Amoxicillin', 'type': 'Capsule', 'strength': '250mg', 'price': 8, 'description': 'Antibiotic'},
                
                # X-ray
                {'category': 'X-ray', 'name': 'Chest X-ray', 'type': 'Digital X-ray', 'strength': 'PA View', 'price': 500, 'description': 'Chest X-ray PA view'},
                {'category': 'X-ray', 'name': 'Hand X-ray', 'type': 'Digital X-ray', 'strength': 'AP/LAT', 'price': 400, 'description': 'Hand X-ray both views'},
                
                # OR
                {'category': 'OR', 'name': 'Minor Surgery', 'type': 'Surgical Procedure', 'strength': '', 'price': 2000, 'description': 'Minor surgical procedure'},
                {'category': 'OR', 'name': 'Major Surgery', 'type': 'Surgical Procedure', 'strength': '', 'price': 5000, 'description': 'Major surgical procedure'},
                
                # O2, ISO
                {'category': 'O2, ISO', 'name': 'O2 Service', 'type': 'Oxygen Therapy', 'strength': 'Per L/hr', 'price': 65, 'description': 'Oxygen therapy per liter per hour'},
                {'category': 'O2, ISO', 'name': 'ISO Service', 'type': 'Isoflurane Therapy', 'strength': 'Per minute', 'price': 30, 'description': 'Isoflurane therapy per minute'},
            ]
            
            for item in sample_items:
                conn.execute('''
                    INSERT INTO items (category, name, type, strength, price, description)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (item['category'], item['name'], item['type'], item['strength'], item['price'], item['description']))
            
            conn.commit()
            print(f"✅ Seeded database with {len(sample_items)} sample items")
    
    def get_all_items(self):
        """Get all items from database"""
        with self.get_db_connection() as conn:
            items = conn.execute('SELECT * FROM items ORDER BY category, name').fetchall()
            return [dict(item) for item in items]
    
    def get_items_by_category(self, category):
        """Get items by category"""
        with self.get_db_connection() as conn:
            items = conn.execute('SELECT * FROM items WHERE category = ? ORDER BY name', (category,)).fetchall()
            return [dict(item) for item in items]
    
    def add_item(self, item_data):
        """Add new item to database"""
        with self.get_db_connection() as conn:
            cursor = conn.execute('''
                INSERT INTO items (category, name, type, strength, price, description)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                item_data['category'],
                item_data['name'],
                item_data.get('type', ''),
                item_data.get('strength', ''),
                item_data['price'],
                item_data.get('description', '')
            ))
            conn.commit()
            return cursor.lastrowid
    
    def update_item(self, item_id, item_data):
        """Update existing item"""
        with self.get_db_connection() as conn:
            conn.execute('''
                UPDATE items 
                SET category = ?, name = ?, type = ?, strength = ?, price = ?, description = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                item_data['category'],
                item_data['name'],
                item_data.get('type', ''),
                item_data.get('strength', ''),
                item_data['price'],
                item_data.get('description', ''),
                item_id
            ))
            conn.commit()
    
    def delete_item(self, item_id):
        """Delete item from database"""
        with self.get_db_connection() as conn:
            conn.execute('DELETE FROM items WHERE id = ?', (item_id,))
            conn.commit()
    
    def save_bill(self, bill_data):
        """Save bill to database"""
        with self.get_db_connection() as conn:
            conn.execute('''
                INSERT INTO bills (bill_number, patient_name, opd_number, total_amount, items_json)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                bill_data['bill_number'],
                bill_data.get('patient_name', ''),
                bill_data.get('opd_number', ''),
                bill_data['total_amount'],
                json.dumps(bill_data['items'])
            ))
            conn.commit()
    
    def get_bills(self, limit=50):
        """Get recent bills"""
        with self.get_db_connection() as conn:
            bills = conn.execute('SELECT * FROM bills ORDER BY created_at DESC LIMIT ?', (limit,)).fetchall()
            result = []
            for bill in bills:
                bill_dict = dict(bill)
                bill_dict['items'] = json.loads(bill_dict['items_json'])
                del bill_dict['items_json']
                result.append(bill_dict)
            return result
    
    def get_statistics(self):
        """Get database statistics"""
        with self.get_db_connection() as conn:
            stats = {}
            
            # Total items by category
            categories = conn.execute('SELECT category, COUNT(*) as count FROM items GROUP BY category').fetchall()
            stats['items_by_category'] = {row['category']: row['count'] for row in categories}
            
            # Total items
            total_items = conn.execute('SELECT COUNT(*) as count FROM items').fetchone()
            stats['total_items'] = total_items['count']
            
            # Total bills
            total_bills = conn.execute('SELECT COUNT(*) as count FROM bills').fetchone()
            stats['total_bills'] = total_bills['count']
            
            # Revenue statistics
            revenue = conn.execute('SELECT SUM(total_amount) as total FROM bills').fetchone()
            stats['total_revenue'] = revenue['total'] or 0
            
            return stats

# Global database instance
db = FlaskHospitalDB()
