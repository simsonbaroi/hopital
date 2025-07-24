
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import logging
from datetime import datetime
from dotenv import load_dotenv
from postgresql_database import db

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure Flask app
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', os.urandom(24))
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

# Configure CORS
cors_origins = os.getenv('CORS_ORIGINS', '*')
if cors_origins == '*':
    CORS(app)
else:
    CORS(app, origins=cors_origins.split(','))

# Configure static files
app.static_folder = '.'
app.template_folder = '.'

def startup_info():
    """Log startup information"""
    logger.info("🏥 Hospital Billing System Flask Server Starting")
    db_info = db.get_connection_info()
    logger.info(f"📊 Database Type: {db_info['database_type']}")
    logger.info(f"🔗 Connected: {db_info['connected']}")

# Call startup info immediately
startup_info()

@app.route('/')
def index():
    """Redirect to landing page"""
    return render_template('landing.html')

@app.route('/landing')
@app.route('/landing.html')
def landing():
    """Main landing page"""
    return render_template('landing.html')

@app.route('/outpatient')
@app.route('/index')
@app.route('/index.html')
def outpatient():
    """Outpatient billing system"""
    return render_template('index.html')

@app.route('/inpatient')
@app.route('/inpatient.html')
def inpatient():
    """Inpatient billing system"""
    return render_template('inpatient.html')

@app.route('/edit')
@app.route('/edit.html')
def edit():
    """Edit database interface"""
    return render_template('edit.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    db_info = db.get_connection_info()
    return jsonify({
        'status': 'healthy' if db_info['connected'] else 'degraded',
        'timestamp': datetime.now().isoformat(),
        'message': 'Hospital Billing System Flask is running properly',
        'database': {
            'connected': db_info['connected'],
            'database_type': db_info['database_type']
        },
        'version': '3.0-postgresql'
    })

@app.route('/api/status')
def api_status():
    """API status endpoint"""
    db_info = db.get_connection_info()
    return jsonify({
        'server': 'online',
        'database': 'mysql' if db_info['connected'] else 'offline',
        'version': '3.0-postgresql-professional',
        'timestamp': datetime.now().isoformat(),
        'message': 'Professional Flask-PostgreSQL Hospital Billing System',
        'connection_info': {
            'database_type': db_info['database_type'],
            'connected': db_info['connected']
        }
    })

# API Endpoints for data management

@app.route('/api/items', methods=['GET'])
def get_all_items():
    """Get all items"""
    try:
        items = db.get_all_items()
        return jsonify({
            'success': True,
            'items': items,
            'count': len(items),
            'message': 'Items retrieved successfully'
        })
    except Exception as e:
        logger.error(f"Error in get_all_items: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to retrieve items'
        }), 500

@app.route('/api/items/category/<category>', methods=['GET'])
def get_items_by_category(category):
    """Get items by category"""
    try:
        items = db.get_items_by_category(category)
        return jsonify({
            'success': True,
            'category': category,
            'items': items,
            'count': len(items),
            'message': f'Items in category "{category}" retrieved successfully'
        })
    except Exception as e:
        logger.error(f"Error in get_items_by_category: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Failed to retrieve items for category "{category}"'
        }), 500

@app.route('/api/items', methods=['POST'])
def add_item():
    """Add new item"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'message': 'Request body is required'
            }), 400
        
        required_fields = ['category', 'name', 'price']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'message': 'Please provide all required fields'
            }), 400
        
        # Validate price
        try:
            data['price'] = float(data['price'])
            if data['price'] < 0:
                raise ValueError("Price cannot be negative")
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': 'Invalid price value',
                'message': 'Price must be a valid positive number'
            }), 400
        
        item_id = db.add_item(data)
        logger.info(f"Added new item: {data['name']} (ID: {item_id})")
        
        return jsonify({
            'success': True,
            'item_id': item_id,
            'message': f'Item "{data["name"]}" added successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Error in add_item: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to add item'
        }), 500

@app.route('/api/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    """Update existing item"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'message': 'Request body is required'
            }), 400
        
        # Validate price if provided
        if 'price' in data:
            try:
                data['price'] = float(data['price'])
                if data['price'] < 0:
                    raise ValueError("Price cannot be negative")
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'error': 'Invalid price value',
                    'message': 'Price must be a valid positive number'
                }), 400
        
        success = db.update_item(item_id, data)
        if not success:
            return jsonify({
                'success': False,
                'error': 'Item not found',
                'message': f'Item with ID {item_id} does not exist'
            }), 404
        
        logger.info(f"Updated item ID: {item_id}")
        
        return jsonify({
            'success': True,
            'message': f'Item updated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error in update_item: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to update item'
        }), 500

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete item"""
    try:
        success = db.delete_item(item_id)
        if not success:
            return jsonify({
                'success': False,
                'error': 'Item not found',
                'message': f'Item with ID {item_id} does not exist'
            }), 404
        
        logger.info(f"Deleted item ID: {item_id}")
        
        return jsonify({
            'success': True,
            'message': f'Item deleted successfully'
        })
        
    except Exception as e:
        logger.error(f"Error in delete_item: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to delete item'
        }), 500

@app.route('/api/bills', methods=['POST'])
def save_bill():
    """Save bill"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'message': 'Request body is required'
            }), 400
        
        required_fields = ['bill_number', 'total_amount', 'items']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'message': 'Please provide all required fields'
            }), 400
        
        # Validate total_amount
        try:
            data['total_amount'] = float(data['total_amount'])
            if data['total_amount'] < 0:
                raise ValueError("Total amount cannot be negative")
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': 'Invalid total amount',
                'message': 'Total amount must be a valid positive number'
            }), 400
        
        bill_id = db.save_bill(data)
        logger.info(f"Saved bill: {data['bill_number']} (ID: {bill_id})")
        
        return jsonify({
            'success': True,
            'bill_id': bill_id,
            'message': f'Bill "{data["bill_number"]}" saved successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Error in save_bill: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to save bill'
        }), 500

@app.route('/api/bills', methods=['GET'])
def get_bills():
    """Get recent bills"""
    try:
        limit = request.args.get('limit', 50, type=int)
        if limit < 1 or limit > 1000:
            limit = 50
        
        bills = db.get_bills(limit)
        return jsonify({
            'success': True,
            'bills': bills,
            'count': len(bills),
            'limit': limit,
            'message': 'Bills retrieved successfully'
        })
    except Exception as e:
        logger.error(f"Error in get_bills: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to retrieve bills'
        }), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get database statistics"""
    try:
        stats = db.get_statistics()
        return jsonify({
            'success': True,
            'statistics': stats,
            'message': 'Statistics retrieved successfully'
        })
    except Exception as e:
        logger.error(f"Error in get_statistics: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to retrieve statistics'
        }), 500

@app.route('/api/database/info', methods=['GET'])
def get_database_info():
    """Get database connection information"""
    try:
        db_info = db.get_connection_info()
        return jsonify({
            'success': True,
            'database_info': db_info,
            'message': 'Database information retrieved successfully'
        })
    except Exception as e:
        logger.error(f"Error in get_database_info: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to retrieve database information'
        }), 500

@app.route('/api/<path:path>')
def api_fallback(path):
    """Generic API endpoint fallback"""
    return jsonify({
        'error': 'API endpoint not implemented',
        'message': 'This is a professional Flask-MySQL application.',
        'endpoint': f'/api/{path}',
        'available_endpoints': [
            'GET /api/items',
            'GET /api/items/category/<category>',
            'POST /api/items',
            'PUT /api/items/<id>',
            'DELETE /api/items/<id>',
            'POST /api/bills',
            'GET /api/bills',
            'GET /api/statistics',
            'GET /api/database/info'
        ],
        'timestamp': datetime.now().isoformat()
    }), 404

# Error handlers
@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': 'Bad Request',
        'message': 'The request could not be understood by the server.',
        'status_code': 400
    }), 400

@app.errorhandler(404)
def not_found(error):
    # For HTML requests, redirect to landing page
    if request.path.endswith('.html') or '.' not in request.path.split('/')[-1]:
        return render_template('landing.html')
    
    return jsonify({
        'error': 'Not Found',
        'message': 'The requested resource was not found.',
        'status_code': 404
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An internal server error occurred.',
        'status_code': 500
    }), 500

# Serve static files
@app.route('/<path:filename>')
def static_files(filename):
    """Serve static files"""
    try:
        return send_from_directory('.', filename)
    except FileNotFoundError:
        # If file not found, redirect to landing page for HTML requests
        if filename.endswith('.html') or '.' not in filename:
            return render_template('landing.html')
        return jsonify({
            'error': 'File not found',
            'requested': filename,
            'message': 'The requested file was not found.',
            'redirect': '/'
        }), 404

if __name__ == '__main__':
    print('🏥 Professional Hospital Billing System - PostgreSQL Edition')
    print('📍 Server running on: http://0.0.0.0:5000')
    print('🌐 Access URLs:')
    print('   - Main Portal (Landing): http://0.0.0.0:5000/')
    print('   - Outpatient Billing: http://0.0.0.0:5000/index')
    print('   - Inpatient: http://0.0.0.0:5000/inpatient')
    print('   - Price Editor: http://0.0.0.0/edit')
    print('   - Health Check: http://0.0.0.0:5000/health')
    print('   - Database Info: http://0.0.0.0:5000/api/database/info')
    print('⚡ Professional Flask-PostgreSQL server ready!')
    print('💾 Using Replit PostgreSQL with SQLite fallback')
    print('🔐 Professional error handling and logging enabled')
    print('🚀 Production-ready features active')
    
    # Display database connection info
    db_info = db.get_connection_info()
    print(f'📊 Database Type: {db_info["database_type"]}')
    print(f'🔗 Connected: {"✅" if db_info["connected"] else "❌"}')
    
    app.run(host='0.0.0.0', port=5000, debug=app.config['DEBUG'])
