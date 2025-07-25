
import sqlite3
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HospitalDB:
    def __init__(self, db_path='hospital_billing_flask.db'):
        self.db_path = db_path
        self.connected = False
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize the SQLite database and create tables"""
        try:
            # Create database and tables
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create items table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT,
                    strength TEXT,
                    price REAL NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create bills table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS bills (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bill_number TEXT UNIQUE NOT NULL,
                    patient_name TEXT,
                    opd_number TEXT,
                    total_amount REAL NOT NULL,
                    items_json TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create settings table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create indexes for better performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number)')
            
            conn.commit()
            conn.close()
            
            self.connected = True
            logger.info("✅ SQLite database initialized successfully")
            
            # Seed with sample data if needed
            self._seed_sample_data()
            
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {e}")
            self.connected = False
    
    def _seed_sample_data(self):
        """Seed database with sample medical data if empty"""
        try:
            # Check if data exists
            if self.get_item_count() > 0:
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
            
            for item_data in sample_items:
                self.add_item(item_data)
            
            logger.info(f"✅ Seeded database with {len(sample_items)} sample items")
            
        except Exception as e:
            logger.error(f"Error seeding sample data: {e}")
    
    def get_item_count(self) -> int:
        """Get total number of items"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM items')
            count = cursor.fetchone()[0]
            conn.close()
            return count
        except Exception as e:
            logger.error(f"Error getting item count: {e}")
            return 0
    
    def get_all_items(self) -> List[Dict]:
        """Get all items from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, category, name, type, strength, price, description, created_at, updated_at
                FROM items ORDER BY category, name
            ''')
            
            items = []
            for row in cursor.fetchall():
                items.append({
                    'id': row[0],
                    'category': row[1],
                    'name': row[2],
                    'type': row[3] or '',
                    'strength': row[4] or '',
                    'price': row[5],
                    'description': row[6] or '',
                    'created_at': row[7],
                    'updated_at': row[8]
                })
            
            conn.close()
            return items
        except Exception as e:
            logger.error(f"Error getting all items: {e}")
            raise
    
    def get_items_by_category(self, category: str) -> List[Dict]:
        """Get items by category"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, category, name, type, strength, price, description, created_at, updated_at
                FROM items WHERE category = ? ORDER BY name
            ''', (category,))
            
            items = []
            for row in cursor.fetchall():
                items.append({
                    'id': row[0],
                    'category': row[1],
                    'name': row[2],
                    'type': row[3] or '',
                    'strength': row[4] or '',
                    'price': row[5],
                    'description': row[6] or '',
                    'created_at': row[7],
                    'updated_at': row[8]
                })
            
            conn.close()
            return items
        except Exception as e:
            logger.error(f"Error getting items by category: {e}")
            raise
    
    def add_item(self, item_data: Dict) -> int:
        """Add new item to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
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
            
            item_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return item_id
        except Exception as e:
            logger.error(f"Error adding item: {e}")
            raise
    
    def update_item(self, item_id: int, item_data: Dict) -> bool:
        """Update existing item"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
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
            
            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            logger.error(f"Error updating item: {e}")
            raise
    
    def delete_item(self, item_id: int) -> bool:
        """Delete item from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM items WHERE id = ?', (item_id,))
            
            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            logger.error(f"Error deleting item: {e}")
            raise
    
    def save_bill(self, bill_data: Dict) -> int:
        """Save bill to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO bills (bill_number, patient_name, opd_number, total_amount, items_json)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                bill_data['bill_number'],
                bill_data.get('patient_name', ''),
                bill_data.get('opd_number', ''),
                bill_data['total_amount'],
                json.dumps(bill_data['items'])
            ))
            
            bill_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return bill_id
        except Exception as e:
            logger.error(f"Error saving bill: {e}")
            raise
    
    def get_bills(self, limit: int = 50) -> List[Dict]:
        """Get recent bills"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, bill_number, patient_name, opd_number, total_amount, items_json, created_at
                FROM bills ORDER BY created_at DESC LIMIT ?
            ''', (limit,))
            
            bills = []
            for row in cursor.fetchall():
                bills.append({
                    'id': row[0],
                    'bill_number': row[1],
                    'patient_name': row[2],
                    'opd_number': row[3],
                    'total_amount': row[4],
                    'items': json.loads(row[5]) if row[5] else [],
                    'created_at': row[6]
                })
            
            conn.close()
            return bills
        except Exception as e:
            logger.error(f"Error getting bills: {e}")
            raise
    
    def get_statistics(self) -> Dict:
        """Get database statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            stats = {}
            
            # Total items by category
            cursor.execute('SELECT category, COUNT(*) FROM items GROUP BY category')
            stats['items_by_category'] = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Total items
            cursor.execute('SELECT COUNT(*) FROM items')
            stats['total_items'] = cursor.fetchone()[0]
            
            # Total bills
            cursor.execute('SELECT COUNT(*) FROM bills')
            stats['total_bills'] = cursor.fetchone()[0]
            
            # Revenue statistics
            cursor.execute('SELECT COALESCE(SUM(total_amount), 0) FROM bills')
            stats['total_revenue'] = cursor.fetchone()[0]
            
            conn.close()
            return stats
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            raise
    
    def get_connection_info(self) -> Dict:
        """Get database connection information"""
        return {
            'connected': self.connected,
            'database_type': 'SQLite',
            'database_path': self.db_path
        }

# Global database instance
db = HospitalDB()
