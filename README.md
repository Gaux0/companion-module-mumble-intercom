# companion-module-mumble-intercom

A [Bitfocus Companion](https://bitfocus.io/companion) module to control a [Mumble](https://www.mumble.info/) VoIP server as a broadcast intercom system using Elgato Stream Deck.

<p align="center">
  <img src="docs/architecture.svg" alt="Architecture overview" width="800"/>
</p>

Designed for **live production directors** who need to manage crew communications from a physical control surface — mute/unmute camera operators, see who's talking, and manage the intercom bus in real time.

> **Why Mumble?** Free, open-source, low-latency, runs on everything (phones, laptops, desktops), works over 4G/WiFi, and now you can control it from your Stream Deck.

## Features

- 🎙️ **Server-side mute/unmute** — Mute and unmute users directly on the Mumble server
- 🟢 **Real-time voice activity detection** — See who's talking with color-coded buttons
- 🎛️ **Up to 16 user slots** — Map each button to a camera operator or crew member
- ⚡ **Instant feedback** — Sub-second visual response to voice activity
- 🔌 **Zero native dependencies** — Pure JavaScript implementation, works on Windows/macOS/Linux without build tools
- 📦 **Drag-and-drop presets** — Pre-configured buttons ready to use

## Button Color Scheme

| Color | State | Meaning |
|-------|-------|---------|
| ⬛ Dark Grey | OFFLINE | User not connected to Mumble |
| 🔘 Grey | MUTED | User online, muted by director |
| 🟡 Yellow | WANTS TALK | User is speaking but muted — wants attention |
| 🔴 Red | OPEN | User is unmuted (mic open), not speaking |
| 🟢 Green | TALKING | User is unmuted and actively speaking |

## Requirements

- [Bitfocus Companion](https://bitfocus.io/companion) v4.x
- A running [Murmur](https://www.mumble.info/) (Mumble server)
- The bot user must have **admin permissions** on the Mumble server to mute/unmute other users

## Installation

### As a Developer Module

1. Download or clone this repository
2. Install dependencies and build:

```bash
cd companion-module-mumble-intercom
npm install
npx tsc -p tsconfig.json
```

3. Open the Companion Launcher → ⚙ Settings:
   - Enable **"Developer Modules"**
   - Set the developer modules path to the **parent folder** containing this module
4. Restart Companion
5. The module appears in Connections as **"Mumble: Mumble Server"**

## Configuration

### Connection Settings

| Setting | Description |
|---------|-------------|
| **Server Host** | Hostname or IP address of your Murmur server |
| **Port** | Mumble server port (default: `64738`) |
| **Bot Username** | Unique name for the bot (e.g. `Director_Bot`) |
| **Server Password** | Server password, if required |

### User Slots

Configure up to 16 slots, each mapped to a Mumble username. The username must match **exactly** (case-sensitive).

| Setting | Example |
|---------|---------|
| Slot 1 - Mumble Username | `Camera1` |
| Slot 2 - Mumble Username | `Camera2` |
| Slot 3 - Mumble Username | `Audio_Op` |
| ... | ... |

## Granting Bot Admin Permissions

The bot needs admin rights to mute/unmute users on the server:

1. Connect to Mumble as a user with admin privileges (or as `SuperUser`)
2. Right-click the **Root** channel → **Edit...**
3. Go to the **Groups** tab
4. Select the **admin** group
5. Add the bot username (e.g. `Director_Bot`) to the Members list
6. Click **OK**

If you need to set the SuperUser password on your Murmur server:

```bash
murmurd -supw <your-password>
```

## Actions

| Action | Description |
|--------|-------------|
| **Toggle Slot Mute** | Toggle server mute/unmute for a user slot |
| **Mute Slot** | Server mute a specific user slot |
| **Unmute Slot (Open)** | Server unmute a specific user slot |
| **Open All Slots** | Unmute all configured user slots |
| **Mute All Slots** | Mute all configured user slots |

## Feedbacks

| Feedback | Type | Description |
|----------|------|-------------|
| **User Slot Status** | Advanced | Changes button color based on user state |
| **User Is Talking** | Boolean | True when user is actively speaking |

## Variables

All variables use your connection label as prefix (default: `mumble`).

| Variable | Description |
|----------|-------------|
| `$(mumble:slot_N_status)` | Status text: OFFLINE / MUTED / WANTS TALK / OPEN / TALKING |
| `$(mumble:slot_N_name)` | Configured username for slot N |
| `$(mumble:slot_N_online)` | Whether user is connected (Yes/No) |
| `$(mumble:slot_N_talking)` | Whether user is speaking (Yes/No) |
| `$(mumble:slot_N_muted)` | Whether user is muted (Yes/No) |
| `$(mumble:users_online)` | Count of online users |
| `$(mumble:users_open)` | Count of unmuted users |
| `$(mumble:connected)` | Whether module is connected (Yes/No) |

## Typical Setup: Multi-Camera Broadcast

```
Stream Deck XL Layout (example):
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Camera1  │ Camera2  │ Camera3  │ Camera4  │ Camera5  │ Camera6  │ Camera7  │ Camera8  │
│ MUTED    │ TALKING  │ OFFLINE  │ OPEN     │ MUTED    │ MUTED    │ OFFLINE  │ MUTED    │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Audio_Op │ Graphics │ Replay   │ Floor    │         │         │ MUTE ALL │ OPEN ALL │
│ OPEN     │ MUTED    │ OFFLINE  │ TALKING  │         │         │          │          │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

The director can:
- **See at a glance** who's online, talking, or trying to talk
- **Tap once** to toggle any crew member's mic
- **Mute/Open All** for scene transitions
- **Spot the yellow** — someone muted wants to speak!

## Technical Details

This module implements the Mumble protocol directly using:
- **Node.js `tls` module** for encrypted connection to Murmur
- **protobufjs** for Mumble protocol message encoding/decoding
- **UDPTunnel over TCP** for voice activity detection (audio packets are tunneled through the TLS connection)

No native dependencies — no `node-gyp`, no C++ compilation needed.

### Mumble Protocol Messages Used

| Message | Type ID | Purpose |
|---------|---------|---------|
| Version | 0 | Protocol handshake |
| UDPTunnel | 1 | Voice data (activity detection) |
| Authenticate | 2 | Login with username/password |
| Ping | 3 | Keep connection alive |
| Reject | 4 | Authentication rejection |
| ServerSync | 7 | Connection established |
| UserState | 9 | User join/leave/mute state |
| UserRemove | 11 | User disconnected |
| CryptSetup | 15 | Encryption setup for voice tunnel |

## Contributing

Contributions are welcome! This module was created for the broadcast community.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License — see [LICENSE](LICENSE) for details.
