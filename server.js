const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes and iframe embedding
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    // Allow embedding in iframe from any domain (for Pipedrive proxy)
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    // Explicitly allow iframe embedding
    res.header('X-Frame-Options', 'ALLOWALL');

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

// HTTP Basic Auth middleware for JSON Panel
function basicAuth(req, res, next) {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="JSON Panel"');
        return res.status(401).send('Authentication required');
    }

    const credentials = Buffer.from(auth.slice(6), 'base64').toString().split(':');
    const username = credentials[0];
    const password = credentials[1];

    // Check credentials
    if (username === 'pipedrive-plugin' && password === 'gus-panel-2025') {
        next();
    } else {
        res.set('WWW-Authenticate', 'Basic realm="JSON Panel"');
        return res.status(401).send('Invalid credentials');
    }
}

// Protected route for JSON Panel configuration
app.get('/nip-gus-panel.json', basicAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'nip-gus-panel.json'));
});

// Protected route for JSON Panel data
app.get('/api/json-panel/data', basicAuth, (req, res) => {
    // Pobierz parametry z query
    const { resource, selectedIds, userId, companyId } = req.query;
    
    // Zwróć przykładowe dane zgodne z JSON Schema
    const responseData = {
        "data": {
            "id": 1,
            "header": "🏛️ NIP Field z GUS",
            "description": "Automatyczne pobieranie danych firmy z rejestru GUS na podstawie numeru NIP",
            "nip_field": "Wprowadź numer NIP organizacji",
            "status": "Gotowy do pobierania danych",
            "company_name": "Przykładowa firma",
            "address": "ul. Przykładowa 1, 00-000 Warszawa"
        }
    };
    
    res.json(responseData);
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
