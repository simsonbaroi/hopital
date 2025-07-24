
import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
from contextlib import contextmanager
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, JSON, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError
import mysql.connector
from mysql.connector import Error as MySQLError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()

class Item(Base):
    __tablename__ = 'items'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(100), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(100))
    strength = Column(String(100))
    price = Column(Float, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'name': self.name,
            'type': self.type,
            'strength': self.strength,
            'price': self.price,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Bill(Base):
    __tablename__ = 'bills'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    bill_number = Column(String(100), unique=True, nullable=False, index=True)
    patient_name = Column(String(255))
    opd_number = Column(String(100))
    total_amount = Column(Float, nullable=False)
    items_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'bill_number': self.bill_number,
            'patient_name': self.patient_name,
            'opd_number': self.opd_number,
            'total_amount': self.total_amount,
            'items': self.items_json,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Setting(Base):
    __tablename__ = 'settings'
    
    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MySQLHospitalDB:
    def __init__(self):
        self.engine = None
        self.SessionLocal = None
        self.connected = False
        self._initialize_connection()
    
    def _get_database_config(self):
        """Get database configuration from environment variables with fallbacks"""
        return {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', 3306)),
            'user': os.getenv('DB_USER', 'hospital_user'),
            'password': os.getenv('DB_PASSWORD', 'hospital_password'),
            'database': os.getenv('DB_NAME', 'hospital_billing'),
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_unicode_ci'
        }
    
    def _create_database_if_not_exists(self):
        """Create database if it doesn't exist"""
        config = self._get_database_config()
        try:
            # Connect without specifying database
            temp_config = config.copy()
            del temp_config['database']
            
            connection = mysql.connector.connect(**temp_config)
            cursor = connection.cursor()
            
            # Create database if not exists
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {config['database']} "
                         f"CHARACTER SET {config['charset']} "
                         f"COLLATE {config['collation']}")
            
            # Create user if not exists and grant privileges
            cursor.execute(f"CREATE USER IF NOT EXISTS '{config['user']}'@'%' "
                         f"IDENTIFIED BY '{config['password']}'")
            cursor.execute(f"GRANT ALL PRIVILEGES ON {config['database']}.* "
                         f"TO '{config['user']}'@'%'")
            cursor.execute("FLUSH PRIVILEGES")
            
            connection.commit()
            cursor.close()
            connection.close()
            
            logger.info(f"✅ Database '{config['database']}' ready")
            return True
            
        except MySQLError as e:
            logger.error(f"❌ Database setup error: {e}")
            return False
    
    def _initialize_connection(self):
        """Initialize database connection with proper error handling"""
        try:
            # First ensure database exists
            if not self._create_database_if_not_exists():
                logger.warning("⚠️ Could not set up database, falling back to SQLite")
                return self._fallback_to_sqlite()
            
            config = self._get_database_config()
            
            # Create SQLAlchemy engine with connection pooling
            connection_string = (
                f"mysql+pymysql://{config['user']}:{config['password']}@"
                f"{config['host']}:{config['port']}/{config['database']}"
                f"?charset={config['charset']}"
            )
            
            self.engine = create_engine(
                connection_string,
                poolclass=QueuePool,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=False
            )
            
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            self.SessionLocal = sessionmaker(bind=self.engine)
            
            # Create tables
            Base.metadata.create_all(self.engine)
            
            self.connected = True
            logger.info("✅ MySQL connection established successfully")
            
            # Seed with sample data if needed
            self._seed_sample_data()
            
        except Exception as e:
            logger.error(f"❌ MySQL connection failed: {e}")
            logger.info("🔄 Falling back to SQLite...")
            return self._fallback_to_sqlite()
    
    def _fallback_to_sqlite(self):
        """Fallback to SQLite if MySQL is not available"""
        try:
            sqlite_path = os.path.join(os.getcwd(), 'hospital_billing_fallback.db')
            connection_string = f"sqlite:///{sqlite_path}"
            
            self.engine = create_engine(connection_string, echo=False)
            self.SessionLocal = sessionmaker(bind=self.engine)
            
            # Create tables
            Base.metadata.create_all(self.engine)
            
            self.connected = True
            logger.info("✅ SQLite fallback connection established")
            
            # Seed with sample data if needed
            self._seed_sample_data()
            
        except Exception as e:
            logger.error(f"❌ Even SQLite fallback failed: {e}")
            self.connected = False
    
    @contextmanager
    def get_session(self) -> Session:
        """Get database session with proper error handling"""
        if not self.connected:
            raise Exception("Database not connected")
        
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database transaction error: {e}")
            raise
        finally:
            session.close()
    
    def _seed_sample_data(self):
        """Seed database with sample medical data if empty"""
        try:
            with self.get_session() as session:
                # Check if data exists
                if session.query(Item).count() > 0:
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
                    item = Item(**item_data)
                    session.add(item)
                
                session.commit()
                logger.info(f"✅ Seeded database with {len(sample_items)} sample items")
                
        except Exception as e:
            logger.error(f"Error seeding sample data: {e}")
    
    def get_all_items(self) -> List[Dict]:
        """Get all items from database"""
        try:
            with self.get_session() as session:
                items = session.query(Item).order_by(Item.category, Item.name).all()
                return [item.to_dict() for item in items]
        except Exception as e:
            logger.error(f"Error getting all items: {e}")
            raise
    
    def get_items_by_category(self, category: str) -> List[Dict]:
        """Get items by category"""
        try:
            with self.get_session() as session:
                items = session.query(Item).filter(Item.category == category).order_by(Item.name).all()
                return [item.to_dict() for item in items]
        except Exception as e:
            logger.error(f"Error getting items by category: {e}")
            raise
    
    def add_item(self, item_data: Dict) -> int:
        """Add new item to database"""
        try:
            with self.get_session() as session:
                item = Item(
                    category=item_data['category'],
                    name=item_data['name'],
                    type=item_data.get('type', ''),
                    strength=item_data.get('strength', ''),
                    price=item_data['price'],
                    description=item_data.get('description', '')
                )
                session.add(item)
                session.flush()  # Get the ID
                return item.id
        except Exception as e:
            logger.error(f"Error adding item: {e}")
            raise
    
    def update_item(self, item_id: int, item_data: Dict) -> bool:
        """Update existing item"""
        try:
            with self.get_session() as session:
                item = session.query(Item).filter(Item.id == item_id).first()
                if not item:
                    return False
                
                item.category = item_data['category']
                item.name = item_data['name']
                item.type = item_data.get('type', '')
                item.strength = item_data.get('strength', '')
                item.price = item_data['price']
                item.description = item_data.get('description', '')
                item.updated_at = datetime.utcnow()
                
                return True
        except Exception as e:
            logger.error(f"Error updating item: {e}")
            raise
    
    def delete_item(self, item_id: int) -> bool:
        """Delete item from database"""
        try:
            with self.get_session() as session:
                item = session.query(Item).filter(Item.id == item_id).first()
                if not item:
                    return False
                
                session.delete(item)
                return True
        except Exception as e:
            logger.error(f"Error deleting item: {e}")
            raise
    
    def save_bill(self, bill_data: Dict) -> int:
        """Save bill to database"""
        try:
            with self.get_session() as session:
                bill = Bill(
                    bill_number=bill_data['bill_number'],
                    patient_name=bill_data.get('patient_name', ''),
                    opd_number=bill_data.get('opd_number', ''),
                    total_amount=bill_data['total_amount'],
                    items_json=bill_data['items']
                )
                session.add(bill)
                session.flush()
                return bill.id
        except Exception as e:
            logger.error(f"Error saving bill: {e}")
            raise
    
    def get_bills(self, limit: int = 50) -> List[Dict]:
        """Get recent bills"""
        try:
            with self.get_session() as session:
                bills = session.query(Bill).order_by(Bill.created_at.desc()).limit(limit).all()
                return [bill.to_dict() for bill in bills]
        except Exception as e:
            logger.error(f"Error getting bills: {e}")
            raise
    
    def get_statistics(self) -> Dict:
        """Get database statistics"""
        try:
            with self.get_session() as session:
                stats = {}
                
                # Total items by category
                category_counts = session.execute(
                    text("SELECT category, COUNT(*) as count FROM items GROUP BY category")
                ).fetchall()
                stats['items_by_category'] = {row[0]: row[1] for row in category_counts}
                
                # Total items
                total_items = session.query(Item).count()
                stats['total_items'] = total_items
                
                # Total bills
                total_bills = session.query(Bill).count()
                stats['total_bills'] = total_bills
                
                # Revenue statistics
                revenue_result = session.execute(
                    text("SELECT COALESCE(SUM(total_amount), 0) as total FROM bills")
                ).fetchone()
                stats['total_revenue'] = revenue_result[0] if revenue_result else 0
                
                return stats
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            raise
    
    def get_connection_info(self) -> Dict:
        """Get database connection information"""
        config = self._get_database_config()
        return {
            'connected': self.connected,
            'host': config['host'],
            'port': config['port'],
            'database': config['database'],
            'user': config['user'],
            'engine_url': str(self.engine.url).replace(config['password'], '***') if self.engine else None
        }

# Global database instance
db = MySQLHospitalDB()
