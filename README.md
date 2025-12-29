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

To decrypt the feedback stored in `feedback.txt`:

```bash
# Decrypt all feedback from the file:
gpg --decrypt feedback.txt

# Or decrypt a specific encrypted message block from the file:
# (Each feedback entry is separated by timestamps in the file)
gpg --decrypt < feedback.txt
```

The `feedback.txt` file contains all encrypted feedback entries, each separated by a timestamp header. You can decrypt the entire file, or copy individual encrypted message blocks (between the `-----BEGIN PGP MESSAGE-----` and `-----END PGP MESSAGE-----` markers) and decrypt them separately.

## Configuration

- **Port**: Change the port by setting the `PORT` environment variable:
  ```bash
  PORT=8080 npm start
  ```

## Security Notes

- The server never sees the plaintext feedback - encryption happens entirely in the browser
- No IP addresses, timestamps, or other identifying information are logged (only a timestamp for when feedback was received)
- The encrypted feedback is stored in `feedback.txt` - make sure this file is kept secure
- In production, consider using a database instead of a text file for storing encrypted feedback

## License

MIT

