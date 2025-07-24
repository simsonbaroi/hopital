
#!/usr/bin/env python3
"""
WSGI Entry Point for Production Deployment
Hospital Billing System - MySQL Edition
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Import the Flask application
from main import app

# Configure for production
if os.getenv('FLASK_ENV') == 'production':
    app.config['DEBUG'] = False
    app.config['TESTING'] = False

application = app

if __name__ == "__main__":
    application.run()
