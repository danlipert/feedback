const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Generate nonce for CSP
function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

// Security headers - protect against XSS, clickjacking, etc.
app.use((req, res, next) => {
  // Generate nonce for this request
  res.locals.nonce = generateNonce();
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "https://cdn.jsdelivr.net",
        (req, res) => `'nonce-${res.locals.nonce}'` // Allow nonce for inline scripts
      ],
      styleSrc: ["'self'", "'unsafe-inline'"], // Inline styles in HTML
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true
}));

// Body size limits - prevent DoS via large payloads
app.use(express.json({ 
  limit: '1mb', // Max 1MB per request
  strict: true 
}));

// Disable Express default logging to protect anonymity
// Remove any middleware that logs IPs, User-Agents, etc.
app.use((req, res, next) => {
  // Explicitly do not log anything that could identify users
  next();
});

// Serve static files
app.use(express.static('public', {
  maxAge: '1h', // Cache static files
  etag: true,
  lastModified: true
}));

// Rate limiting - prevent spam and DoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '10', 10), // 10 requests per window
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for public key endpoint (it's public anyway)
    return req.path === '/api/public-key';
  }
});

// Apply rate limiting to API endpoints
app.use('/api/', apiLimiter);

// Store for feedback
const feedbackFile = path.join(__dirname, 'feedback.txt');
const MAX_MESSAGE_SIZE = 1000000; // 1MB max encrypted message size

// Validate PGP message format
function isValidPGPMessage(str) {
  if (typeof str !== 'string') return false;
  if (str.length > MAX_MESSAGE_SIZE) return false;
  if (str.length < 100) return false; // Too small to be valid
  
  // Must contain PGP message markers
  const hasBeginMarker = str.includes('-----BEGIN PGP MESSAGE-----');
  const hasEndMarker = str.includes('-----END PGP MESSAGE-----');
  
  if (!hasBeginMarker || !hasEndMarker) return false;
  
  // Basic sanity check - should have some base64-like content
  const content = str.split('-----BEGIN PGP MESSAGE-----')[1]?.split('-----END PGP MESSAGE-----')[0];
  if (!content || content.trim().length < 50) return false;
  
  return true;
}

// Endpoint to get PGP public key
app.get('/api/public-key', async (req, res) => {
  try {
    const publicKeyPath = path.join(__dirname, 'public-key.asc');
    
    try {
      const publicKey = await fs.readFile(publicKeyPath, 'utf8');
      
      // Validate it's actually a PGP public key
      if (!publicKey.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
        return res.status(500).json({ error: 'Invalid public key format' });
      }
      
      res.json({ publicKey });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Public key not available' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error reading public key:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint to receive encrypted feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { encryptedMessage } = req.body;
    
    // Input validation
    if (!encryptedMessage) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    if (typeof encryptedMessage !== 'string') {
      return res.status(400).json({ error: 'Invalid request format' });
    }
    
    // Validate it's actually a PGP encrypted message
    if (!isValidPGPMessage(encryptedMessage)) {
      return res.status(400).json({ error: 'Invalid message format' });
    }
    
    // Use date-only timestamp (no time) to prevent timing correlation attacks
    const dateOnly = new Date().toISOString().slice(0, 10); // YYYY-MM-DD only
    const entry = `\n--- Feedback received on ${dateOnly} ---\n${encryptedMessage}\n`;
    
    // Async file write to avoid blocking
    await fs.appendFile(feedbackFile, entry, 'utf8');
    
    // Set restrictive file permissions (owner read/write only)
    try {
      await fs.chmod(feedbackFile, 0o600);
    } catch (chmodError) {
      // Ignore chmod errors (might fail on some systems)
    }
    
    // Generic success response - don't leak information
    res.json({ success: true });
  } catch (error) {
    // Log server errors but don't expose details to client
    console.error('Error processing feedback:', error);
    
    // Generic error response
    if (error.code === 'ENOSPC') {
      res.status(507).json({ error: 'Storage full' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Serve the main page with nonce injection
app.get('/', async (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    let html = await fs.readFile(htmlPath, 'utf8');
    
    // Inject nonce into script tag
    const nonce = res.locals.nonce;
    html = html.replace(
      /<script type="module">/g,
      `<script type="module" nonce="${nonce}">`
    );
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving index page:', error);
    res.status(500).send('Server error');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Security: Rate limiting, input validation, and security headers enabled');
});
