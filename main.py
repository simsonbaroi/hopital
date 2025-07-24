
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from datetime import datetime
from flask_database import db

app = Flask(__name__)
CORS(app)

# Configure static files
app.static_folder = '.'
app.template_folder = '.'

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

@app.route('/edit-standalone')
@app.route('/edit-standalone.html')
def edit_standalone():
    """Standalone edit interface"""
    return render_template('edit-standalone.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'message': 'Hospital Billing System Flask is running properly'
    })

@app.route('/api/status')
def api_status():
    """API status endpoint"""
    return jsonify({
        'server': 'online',
        'database': 'local-indexeddb',
        'version': '3.0-flask',
        'timestamp': datetime.now().isoformat(),
        'message': 'Flask-based system with IndexedDB client storage'
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
            'count': len(items)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
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
            'count': len(items)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/items', methods=['POST'])
def add_item():
    """Add new item"""
    try:
        data = request.get_json()
        if not data or 'category' not in data or 'name' not in data or 'price' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: category, name, price'
            }), 400
        
        item_id = db.add_item(data)
        return jsonify({
            'success': True,
            'item_id': item_id,
            'message': 'Item added successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    """Update existing item"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        db.update_item(item_id, data)
        return jsonify({
            'success': True,
            'message': 'Item updated successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete item"""
    try:
        db.delete_item(item_id)
        return jsonify({
            'success': True,
            'message': 'Item deleted successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/bills', methods=['POST'])
def save_bill():
    """Save bill"""
    try:
        data = request.get_json()
        if not data or 'bill_number' not in data or 'total_amount' not in data or 'items' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: bill_number, total_amount, items'
            }), 400
        
        db.save_bill(data)
        return jsonify({
            'success': True,
            'message': 'Bill saved successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/bills', methods=['GET'])
def get_bills():
    """Get recent bills"""
    try:
        limit = request.args.get('limit', 50, type=int)
        bills = db.get_bills(limit)
        return jsonify({
            'success': True,
            'bills': bills,
            'count': len(bills)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get database statistics"""
    try:
        stats = db.get_statistics()
        return jsonify({
            'success': True,
            'statistics': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/<path:path>')
def api_fallback(path):
    """Generic API endpoint fallback"""
    return jsonify({
        'error': 'API endpoint not implemented',
        'message': 'This is a Flask-based application with server-side storage.',
        'endpoint': f'/api/{path}',
        'available_endpoints': [
            'GET /api/items',
            'GET /api/items/category/<category>',
            'POST /api/items',
            'PUT /api/items/<id>',
            'DELETE /api/items/<id>',
            'POST /api/bills',
            'GET /api/bills',
            'GET /api/statistics'
        ],
        'timestamp': datetime.now().isoformat()
    }), 404

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

@app.errorhandler(404)
def not_found(error):
    """404 error handler"""
    return render_template('landing.html')

@app.errorhandler(500)
def server_error(error):
    """500 error handler"""
    return jsonify({
        'error': 'Internal server error',
        'message': 'Something went wrong!'
    }), 500

if __name__ == '__main__':
    print('🏥 Hospital Billing System Flask Server Started')
    print('📍 Server running on: http://0.0.0.0:5000')
    print('🌐 Access URLs:')
    print('   - Main Portal (Landing): http://0.0.0.0:5000/')
    print('   - Outpatient Billing: http://0.0.0.0:5000/index')
    print('   - Inpatient: http://0.0.0.0:5000/inpatient')
    print('   - Price Editor: http://0.0.0.0:5000/edit')
    print('   - Health Check: http://0.0.0.0:5000/health')
    print('⚡ Flask server ready for connections!')
    print('💾 Using IndexedDB for local storage only')
    print('🚀 LANDING PAGE IS DEFAULT - ROOT SERVES LANDING.HTML')
    
    app.run(host='0.0.0.0', port=5000, debug=True)
