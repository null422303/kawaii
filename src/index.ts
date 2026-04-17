// src/index.ts

// Import necessary modules
y import express from 'express';
import { Router } from 'express';

// Define the backend configuration interface
interface BackendConfig {
    url: string;
    apiKey: string;
}

// Define a map to hold multiple backend providers configurations
const backends: { [key: string]: BackendConfig } = {
    default: { url: 'https://default.backend.url', apiKey: 'DEFAULT_API_KEY' },
    // You can add more backends here
};

// Function to add a new backend provider
function addBackend(name: string, url: string, apiKey: string) {
    backends[name] = { url, apiKey };
}

// Create an Express app and Router
const app = express();
const router = Router();

// Middleware to handle requests to the backends
router.use((req, res, next) => {
    const backendName = req.headers['x-backend'] || 'default'; // Default to 'default' backend
    const backend = backends[backendName];

    if (!backend) {
        return res.status(404).send('Backend not found');
    }

    // Set backend URL and API key (for demonstration purposes) in the request
    req.backendUrl = backend.url;
    req.backendApiKey = backend.apiKey;

    next(); // Proceed to the next middleware or route handler
});

// Example route
router.get('/data', async (req, res) => {
    const { backendUrl, backendApiKey } = req;
    // Logic to fetch data from the backend using the backendUrl and backendApiKey
    res.json({ message: `Fetching data from ${backendUrl} with API key ${backendApiKey}` });
});

// Use the router in the app
app.use('/api', router);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Function to update backend configurations from an external source, if needed
function updateBackendConfig(externalConfig: { [key: string]: BackendConfig }) {
    Object.assign(backends, externalConfig);
}

// Exporting functions for external use
export { addBackend, updateBackendConfig };