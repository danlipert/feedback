# Anonymous Feedback System

A minimal Node.js-based single-page application that allows team members to send anonymous, PGP-encrypted feedback.

## Features

- 🔒 **PGP Encryption**: All feedback is encrypted client-side using your PGP public key
- 👤 **Anonymous**: No identifying information is collected or stored
- 🎨 **Modern UI**: Clean, responsive design
- ⚡ **Minimal Setup**: Simple Node.js server with Express

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Add your PGP public key:**
   - Export your PGP public key to a file named `public-key.asc` in the project root:
     ```bash
     gpg --armor --export your-email@example.com > public-key.asc
     ```
   - Or manually create `public-key.asc` and paste your public key (including the `-----BEGIN PGP PUBLIC KEY BLOCK-----` and `-----END PGP PUBLIC KEY BLOCK-----` lines)

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access the application:**
   - Open your browser and navigate to `http://localhost:3000`

## How It Works

1. When a team member visits the page, the server provides your PGP public key
2. The user types their feedback in the form
3. The feedback is encrypted client-side using OpenPGP.js before being sent
4. The encrypted message is sent to the server and saved to `feedback.txt`
5. Only you (with your private key) can decrypt and read the feedback

## Decrypting Feedback

### Using the Decryption Script (Recommended)

The easiest way to decrypt all messages:

```bash
node decrypt-feedback.js
```

This script will:
- Extract all encrypted messages from `feedback.txt`
- Decrypt each one individually
- Display them with their timestamps in a readable format

### Manual Decryption

To decrypt manually:

```bash
# Extract and decrypt a specific message block:
# (Copy the PGP message block including BEGIN/END markers to a file)
echo "PASTE_PGP_MESSAGE_HERE" | gpg --decrypt

# Or decrypt from a file:
gpg --decrypt < message.txt
```

The `feedback.txt` file contains all encrypted feedback entries, each separated by a timestamp header. Each message is a complete PGP-encrypted block that must be decrypted individually.

## Configuration

Create a `.env` file (copy from `.env.example`) to configure:

- **Port**: Change the port by setting the `PORT` environment variable:
  ```bash
  PORT=8080 npm start
  ```

- **Rate Limiting**: Adjust rate limit with `RATE_LIMIT_MAX` (default: 10 requests per 15 minutes)

## Security Features

This application has been hardened with multiple security layers:

### Client-Side Security
- ✅ **PGP Encryption**: All feedback is encrypted client-side before transmission
- ✅ **No Plaintext Transmission**: Server never sees unencrypted feedback
- ✅ **Content Security Policy**: Prevents XSS attacks
- ✅ **Frame Protection**: Prevents clickjacking attacks
- ✅ **No Console Logging**: Prevents information leakage via browser console

### Server-Side Security
- ✅ **Rate Limiting**: Prevents spam and DoS attacks (10 requests per 15 minutes)
- ✅ **Security Headers**: Helmet.js provides comprehensive security headers
  - HSTS (HTTP Strict Transport Security)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Content Security Policy
- ✅ **Input Validation**: Validates PGP message format and size limits
- ✅ **Body Size Limits**: Prevents DoS via large payloads (1MB max)
- ✅ **Async File Operations**: Non-blocking I/O prevents server freezing
- ✅ **File Permissions**: Automatically sets restrictive permissions (600) on feedback.txt
- ✅ **No IP Logging**: Express logging disabled to protect anonymity
- ✅ **Generic Error Messages**: Prevents information leakage through error responses
- ✅ **Date-Only Timestamps**: Prevents timing correlation attacks (no time, only date)

### Privacy Protections
- ✅ **No Identifying Information**: No IP addresses, User-Agents, or other metadata logged
- ✅ **Anonymous by Design**: Server cannot identify who submitted feedback
- ✅ **Secure File Storage**: feedback.txt has restrictive permissions (owner read/write only)

### Additional Security Recommendations

1. **HTTPS**: Always use HTTPS in production (Let's Encrypt is free)
2. **File Rotation**: Consider implementing log rotation for `feedback.txt` to prevent unbounded growth
3. **Backup Strategy**: Securely backup `feedback.txt` (it's already encrypted)
4. **Monitoring**: Set up monitoring/alerting for unusual activity
5. **CDN Consideration**: Consider hosting OpenPGP.js locally instead of CDN for supply chain security
6. **Regular Updates**: Keep dependencies updated (`npm audit` regularly)

### Security Audit Notes

- Rate limiting prevents abuse but may affect legitimate users during high traffic
- CDN dependency (jsdelivr.net) is a potential supply chain risk - consider hosting OpenPGP.js locally
- Browser extensions could potentially intercept plaintext before encryption (user responsibility)
- File-based storage is simple but consider database for production at scale

## License

MIT

