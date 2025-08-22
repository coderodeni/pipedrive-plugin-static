const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes and iframe embedding
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Allow embedding in iframe from Pipedrive domains
    res.header('X-Frame-Options', 'ALLOWALL');
    res.removeHeader('X-Frame-Options'); // Remove restrictive header
    res.header('Content-Security-Policy', "frame-ancestors 'self' *.pipedrive.com;");

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route for manifest.json
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Route for app.js (compiled bundle)
app.get('/app.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'app.js'));
});

// Route for styles
app.get('/styles/:file', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'styles', req.params.file));
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Plugin static server running on port ${PORT}`);
    console.log(`Manifest URL: http://localhost:${PORT}/manifest.json`);
    console.log(`App bundle: http://localhost:${PORT}/app.js`);
});
