const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Store for feedback (in production, use a database)
const feedbackFile = path.join(__dirname, 'feedback.txt');

// Endpoint to get PGP public key
app.get('/api/public-key', (req, res) => {
  const publicKeyPath = path.join(__dirname, 'public-key.asc');
  
  if (!fs.existsSync(publicKeyPath)) {
    return res.status(404).json({ error: 'Public key not found. Please add your PGP public key as public-key.asc' });
  }
  
  const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  res.json({ publicKey });
});

// Endpoint to receive encrypted feedback
app.post('/api/feedback', (req, res) => {
  const { encryptedMessage } = req.body;
  
  if (!encryptedMessage) {
    return res.status(400).json({ error: 'Encrypted message is required' });
  }
  
  // Append encrypted feedback to file
  const timestamp = new Date().toISOString();
  const entry = `\n--- Feedback received at ${timestamp} ---\n${encryptedMessage}\n`;
  
  fs.appendFileSync(feedbackFile, entry, 'utf8');
  
  res.json({ success: true, message: 'Feedback received and saved' });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure to add your PGP public key as public-key.asc in the project root');
});

