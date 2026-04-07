# Messaging Gateway

Connect your Vadgr agents to messaging platforms. Chat with agents, run them, and get results -- all from Discord.

## Quick Start

### 1. Create a Discord Bot

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application**, name it (e.g., "Vadgr"), accept ToS, click **Create** (you may need to solve a CAPTCHA)
3. Go to **Bot** tab in the sidebar
4. Click **Reset Token**, confirm with your password, and **copy the token** (you will only see it once)
5. Scroll down to **Privileged Gateway Intents** and enable **Message Content Intent**
6. Click **Save Changes**

### 2. Add the Bot to Your Server

1. Go to **Installation** tab in the sidebar
2. Under **Guild Install > Scopes**, add: `applications.commands`, `bot`
3. Under **Guild Install > Permissions**, add: `View Channels`, `Send Messages`, `Read Message History`
4. Click **Save Changes**
5. Copy the **Install Link** at the top of the page
6. Open the link in your browser
7. Select **Add to Server**, choose your server, click **Continue**
8. Review the permissions and click **Authorize**

### 3. Connect via Vadgr Settings

1. Open the Vadgr frontend at `http://localhost:3000/settings`
2. Scroll to **Messaging Gateway**
3. Click the **Discord toggle** -- a token input will appear
4. Paste your bot token and click **Connect**
5. Status should change to **Connected** (green dot)

### Alternative: Connect via CLI

```bash
# Set the token and start the gateway
export DISCORD_BOT_TOKEN="your-token-here"
vadgr gateway start

# Check status
vadgr gateway status

# Stop
vadgr gateway stop
```

### Alternative: Connect via Environment Variable

```bash
# Add to your shell profile or .env
export DISCORD_BOT_TOKEN="your-token-here"

# The gateway reads it on startup
cd gateway && npx tsx src/index.ts
```

## Usage

Once connected, interact with the bot in Discord:

| Command | What it does |
|---------|-------------|
| `@Vadgr hey` | List your agents |
| `@Vadgr status` | Show recent runs |
| `@Vadgr help` | Show all commands |
| `@Vadgr run <agent>` | Run an agent by name |
| `@Vadgr cancel <id>` | Cancel a running agent |
| `@Vadgr resume <id>` | Resume a failed run |
| `@Vadgr logs <id>` | Show recent logs for a run |

After the first `@Vadgr` mention, follow-up messages don't need the mention -- the bot tracks your conversation session.

### Example Flow

```
You:    @Vadgr hey
Bot:    Hey santiago_md11! You have 3 agents ready:
          1. security-engineer (5 steps)
          2. software-engineer (6 steps)
          3. qa-engineer (6 steps)
        What do you want to do?

You:    2
Bot:    Task Description?
        (The bug fix, feature request, or refactor to perform.)

You:    Fix the login page redirect bug
Bot:    Repository Path?
        (Absolute or relative path to the repository.)

You:    /home/user/my-app
Bot:    Starting software-engineer...
        Run ID: aa91f1ec
        I'll message you when it's done.

Bot:    software-engineer finished!
        pull_request_url: https://github.com/org/repo/pull/42
        test_results: 24/25 tests pass. No regressions.
```

## Architecture

```
Discord message
    |
    v
Discord Adapter (discord.js)
    |  - Parses DMs and @mentions
    |  - Session-aware: tracks active conversations
    v
Security Guard
    |  - Sender allowlist (optional)
    |  - Input sanitization (shell + XSS chars)
    v
Message Router
    |  - Conversational state machine
    |  - Agent selection, input collection, confirmation
    v
Vadgr API Client
    |  - Retry with exponential backoff
    |  - ID validation (path traversal prevention)
    v
Vadgr API (http://localhost:8000)
    |  - Starts agent run
    |  - Returns results
    v
Discord Adapter
    - Sends response back to user
    - Polls for async run completion
    - Splits long messages (2000 char Discord limit)
```

## Security

- **Token storage**: Server-side only (`~/.forge/gateway.json`, file mode 0600). Never stored in browser localStorage/sessionStorage. Frontend only sees a masked version (`MTQ5****3r1U`).
- **Input sanitization**: All user inputs are stripped of shell metacharacters (`;`, `&`, `|`, `` ` ``, `$`, `()`, `{}`, `<>`, `\`) before being passed to the API.
- **API ID validation**: Agent and run IDs are validated against `[a-zA-Z0-9-]` before constructing API URLs, preventing path traversal.
- **Sender allowlist**: Optional. When configured, only listed Discord user IDs can interact with the bot.
- **Bot message filtering**: Bot messages (including its own) are always ignored.
- **Audit logging**: Optional file-based audit log of all incoming messages.

## Development

```bash
cd gateway

# Install dependencies
npm install

# Run in development mode
DISCORD_BOT_TOKEN="your-token" npx tsx src/index.ts

# Run tests
npx vitest run

# Type check
npx tsc --noEmit

# Build for production
npx tsc
node dist/index.js
```

## Tests

70 tests across 5 files:

- `tests/security.test.ts` -- allowlist, sanitization, audit
- `tests/router.test.ts` -- conversational flow, agent selection, session management
- `tests/api-client.test.ts` -- ID validation, retry logic
- `tests/discord-adapter.test.ts` -- message parsing, session-aware filtering
- `tests/server.test.ts` -- security pipeline, error handling, run polling
