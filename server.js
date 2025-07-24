const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Clear cache headers for all HTML files
app.use('*.html', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Route handlers - Landing page ALWAYS loads first with forced redirect
app.get('/', (req, res) => {
    console.log('🏠 ROOT REQUEST: Redirecting to /landing.html');
    
    // Force redirect to landing.html instead of serving directly
    res.redirect(301, '/landing.html');
});

app.get('/landing', (req, res) => {
    console.log('📍 LANDING REQUEST: Serving landing.html');
    res.sendFile(path.join(__dirname, 'landing.html'));
});

app.get('/landing.html', (req, res) => {
    console.log('📄 LANDING.HTML REQUEST: Serving landing.html with cache-busting');
    
    // Strong cache control to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('ETag', Date.now().toString());
    res.setHeader('Last-Modified', new Date().toUTCString());
    
    res.sendFile(path.join(__dirname, 'landing.html'));
});

app.get('/outpatient', (req, res) => {
    console.log('💊 OUTPATIENT REQUEST: Serving index.html for outpatient billing');
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index', (req, res) => {
    console.log('💊 INDEX REQUEST: Serving index.html for billing system');
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
    console.log('💊 INDEX.HTML REQUEST: Serving index.html for billing system');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Explicit redirect for any cached index requests to root
app.get('/index*', (req, res) => {
    console.log('🔄 REDIRECTING index request to landing page');
    res.redirect(301, '/');
});

app.get('/billing', (req, res) => {
    console.log('💊 BILLING REQUEST: Serving index.html for billing system');
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/inpatient', (req, res) => {
    console.log('🏥 INPATIENT REQUEST: Serving inpatient.html');
    res.sendFile(path.join(__dirname, 'inpatient.html'));
});

app.get('/inpatient.html', (req, res) => {
    console.log('🏥 INPATIENT.HTML REQUEST: Serving inpatient.html');
    res.sendFile(path.join(__dirname, 'inpatient.html'));
});

app.get('/edit', (req, res) => {
    console.log('⚙️ EDIT REQUEST: Serving edit.html');
    res.sendFile(path.join(__dirname, 'edit.html'));
});

app.get('/edit.html', (req, res) => {
    console.log('⚙️ EDIT.HTML REQUEST: Serving edit.html');
    res.sendFile(path.join(__dirname, 'edit.html'));
});



// Health check endpoint
app.get('/health', (req, res) => {
    console.log('💓 HEALTH CHECK: System operational');
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Hospital Billing System is running properly'
    });
});

// API status endpoint
app.get('/api/status', (req, res) => {
    console.log('📊 API STATUS CHECK');
    res.json({
        server: 'online',
        database: 'local-indexeddb',
        version: '2.0-local',
        timestamp: new Date().toISOString(),
        message: 'Pure client-side system - no server database required. Data stored locally in browser.'
    });
});

// Generic API endpoint for potential future use
app.get('/api/*', (req, res) => {
    console.log('🚫 API ENDPOINT NOT IMPLEMENTED:', req.url);
    res.status(501).json({
        error: 'API endpoint not implemented',
        message: 'This is a pure client-side application. All data processing happens in the browser.',
        endpoint: req.url,
        suggestion: 'Use the web interface to manage your hospital billing data.',
        timestamp: new Date().toISOString()
    });
});

// Serve static files AFTER all route handlers (so routes take priority)
app.use(express.static('.', {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Catch-all for any other requests - redirect to landing
app.get('*', (req, res) => {
    console.log('🔄 CATCH-ALL: Redirecting to landing page from:', req.url);
    if (req.url.includes('.') && !req.url.includes('.html')) {
        // Likely a static file request that failed
        res.status(404).json({
            error: 'File not found',
            requested: req.url,
            message: 'The requested file was not found. Redirecting to main application.',
            redirect: '/'
        });
    } else {
        // Redirect HTML requests to landing page
        res.redirect('/landing.html');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('💥 SERVER ERROR:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong!'
    });
});

// 404 handler - redirect to landing page
app.use((req, res) => {
    console.log('404 - Redirecting to landing page:', req.url);
    res.redirect('/');
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏥 Hospital Billing System Server Started`);
    console.log(`📍 Server running on: http://0.0.0.0:${PORT}`);
    console.log(`🌐 Access URLs:`);
    console.log(`   - Main Portal (Landing): http://0.0.0.0:${PORT}/`);
    console.log(`   - Outpatient Billing: http://0.0.0.0:${PORT}/index`);
    console.log(`   - Inpatient: http://0.0.0.0:${PORT}/inpatient`);
    console.log(`   - Price Editor: http://0.0.0.0:${PORT}/edit`);
    console.log(`   - Health Check: http://0.0.0.0:${PORT}/api/health`);
    console.log(`⚡ Server ready for connections!`);
    console.log(`💾 Using IndexedDB for local storage only`);
    console.log(`🚀 LANDING PAGE IS DEFAULT - ROOT SERVES LANDING.HTML`);
    console.log(`🔗 Click the webview button or visit the URL above to access your application`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please wait a moment and try again.`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', err);
        process.exit(1);
    }
});



// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});