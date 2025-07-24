
#!/usr/bin/env python3
"""
Professional Database Migration and Management Script
Hospital Billing System - MySQL Edition
"""

import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv
from mysql_database import db, Base, Item, Bill, Setting
from sqlalchemy import text

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.db = db
    
    def check_connection(self):
        """Check database connection"""
        try:
            db_info = self.db.get_connection_info()
            if db_info['connected']:
                logger.info("✅ Database connection is active")
                logger.info(f"📊 Host: {db_info['host']}:{db_info['port']}")
                logger.info(f"💾 Database: {db_info['database']}")
                return True
            else:
                logger.error("❌ Database connection failed")
                return False
        except Exception as e:
            logger.error(f"Error checking connection: {e}")
            return False
    
    def create_backup(self, backup_path=None):
        """Create database backup"""
        try:
            if not backup_path:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = f"backup_hospital_billing_{timestamp}.sql"
            
            # This is a simple backup - in production, use mysqldump
            logger.info(f"Creating backup: {backup_path}")
            
            with self.db.get_session() as session:
                # Get all items
                items = session.query(Item).all()
                bills = session.query(Bill).all()
                
                with open(backup_path, 'w') as f:
                    f.write(f"-- Hospital Billing System Backup\n")
                    f.write(f"-- Created: {datetime.now()}\n\n")
                    
                    # Backup items
                    f.write("-- Items Backup\n")
                    for item in items:
                        f.write(f"INSERT INTO items (category, name, type, strength, price, description) VALUES ")
                        f.write(f"('{item.category}', '{item.name}', '{item.type}', '{item.strength}', {item.price}, '{item.description}');\n")
                    
                    # Backup bills
                    f.write("\n-- Bills Backup\n")
                    for bill in bills:
                        f.write(f"INSERT INTO bills (bill_number, patient_name, opd_number, total_amount, items_json) VALUES ")
                        f.write(f"('{bill.bill_number}', '{bill.patient_name}', '{bill.opd_number}', {bill.total_amount}, '{bill.items_json}');\n")
            
            logger.info(f"✅ Backup created successfully: {backup_path}")
            return backup_path
            
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            return None
    
    def get_statistics(self):
        """Display database statistics"""
        try:
            stats = self.db.get_statistics()
            logger.info("📊 Database Statistics:")
            logger.info(f"   Total Items: {stats['total_items']}")
            logger.info(f"   Total Bills: {stats['total_bills']}")
            logger.info(f"   Total Revenue: ${stats['total_revenue']:.2f}")
            logger.info("   Items by Category:")
            for category, count in stats['items_by_category'].items():
                logger.info(f"     {category}: {count}")
            return stats
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return None
    
    def reset_database(self):
        """Reset database (DANGEROUS - use with caution)"""
        try:
            logger.warning("⚠️ RESETTING DATABASE - This will delete all data!")
            confirm = input("Type 'YES' to confirm: ")
            if confirm != 'YES':
                logger.info("Reset cancelled")
                return False
            
            # Drop all tables
            Base.metadata.drop_all(self.db.engine)
            
            # Recreate tables
            Base.metadata.create_all(self.db.engine)
            
            # Reseed sample data
            self.db._seed_sample_data()
            
            logger.info("✅ Database reset and reseeded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting database: {e}")
            return False
    
    def optimize_database(self):
        """Optimize database performance"""
        try:
            logger.info("🔧 Optimizing database...")
            
            with self.db.get_session() as session:
                # Add indexes if they don't exist
                try:
                    session.execute(text("CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)"))
                    session.execute(text("CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)"))
                    session.execute(text("CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON bills(bill_number)"))
                    session.execute(text("CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at)"))
                    logger.info("✅ Database indexes optimized")
                except Exception as e:
                    logger.warning(f"Index optimization note: {e}")
                
                # Analyze tables for better query performance
                try:
                    session.execute(text("ANALYZE TABLE items"))
                    session.execute(text("ANALYZE TABLE bills"))
                    logger.info("✅ Database tables analyzed")
                except Exception as e:
                    logger.warning(f"Table analysis note: {e}")
            
            logger.info("✅ Database optimization completed")
            return True
            
        except Exception as e:
            logger.error(f"Error optimizing database: {e}")
            return False

def main():
    """Main function for database management"""
    manager = DatabaseManager()
    
    if len(sys.argv) < 2:
        print("Usage: python migrate_database.py <command>")
        print("Commands:")
        print("  check      - Check database connection")
        print("  backup     - Create database backup")
        print("  stats      - Show database statistics")
        print("  reset      - Reset database (DANGEROUS)")
        print("  optimize   - Optimize database performance")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'check':
        if manager.check_connection():
            sys.exit(0)
        else:
            sys.exit(1)
    
    elif command == 'backup':
        backup_path = manager.create_backup()
        if backup_path:
            print(f"Backup created: {backup_path}")
            sys.exit(0)
        else:
            sys.exit(1)
    
    elif command == 'stats':
        if manager.get_statistics():
            sys.exit(0)
        else:
            sys.exit(1)
    
    elif command == 'reset':
        if manager.reset_database():
            sys.exit(0)
        else:
            sys.exit(1)
    
    elif command == 'optimize':
        if manager.optimize_database():
            sys.exit(0)
        else:
            sys.exit(1)
    
    else:
        logger.error(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == '__main__':
    main()
