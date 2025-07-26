# Echo - Terminal Chat Application

Secure, terminal-based messaging with real-time communication built on Ink, React, and Convex.

## Features

- **Terminal UI** - Full-featured TUI with keyboard navigation
- **Real-time messaging** - Instant updates via Convex
- **Email/password auth** - Simple session-based authentication
- **Encrypted storage** - RSA-OAEP + AES-GCM encryption
- **Developer-friendly** - Works over SSH, fast startup, low resources

## Quick Start

```bash
# Install
git clone <repository-url>
cd echo
npm install

# Run (2 terminals required)
npm run dev:backend  # Terminal 1
npm run dev:tui      # Terminal 2
```

## Usage

**Authentication:** Enter email → password (6+ chars) → Enter
**Navigation:** TAB (focus), ↑↓ (navigate), Enter (select), Ctrl+C (quit)
**Messaging:** TAB to input → type → Enter to send

## Development

**Scripts:**
- `npm run dev:backend` - Start Convex backend (run first)
- `npm run dev:tui` - Start Echo TUI (run in separate terminal)
- `npm run build` - Build and deploy to Convex
- `npm run lint` - Type checking and linting

**Tech:** Ink (React CLI), Convex, TypeScript, RSA+AES encryption

## License

MIT