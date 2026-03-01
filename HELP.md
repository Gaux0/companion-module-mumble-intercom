# Mumble Intercom - Director Console

Control a Mumble VoIP server from your Stream Deck. Designed for broadcast and live production intercom systems.

## Features

- **Server-side mute/unmute** users from Stream Deck buttons
- **Real-time voice activity detection** with color-coded feedback
- **Up to 16 user slots** mapped to camera operators or crew
- **Presets** for quick setup with drag-and-drop buttons

## Setup

1. **Mumble Server**: You need a running Murmur (Mumble server)
2. **Bot Username**: The module connects as a bot user (e.g. `Director_Bot`)
3. **Admin Permissions**: The bot needs admin rights on the server to mute/unmute users. Add the bot username to the `admin` group in Root channel ACL

## Configuration

- **Server Host**: Hostname or IP of your Murmur server
- **Port**: Default `64738`
- **Bot Username**: Name for the bot connection (must be unique)
- **Server Password**: Server password if required
- **Slot 1-16**: Enter the **exact** Mumble username (case-sensitive) for each position

## Button Colors

| Color | Meaning |
|-------|---------|
| Dark Grey | User offline / not connected |
| Grey | User online, **muted** by director |
| Yellow | User **wants to talk** (muted but speaking) |
| Red | User **open** (unmuted, not speaking) |
| Green | User **talking** (unmuted, actively speaking) |

## Actions

- **Toggle Slot Mute**: Toggle mute for a specific user
- **Mute Slot**: Force mute a specific user
- **Unmute Slot**: Unmute (open) a specific user
- **Open All**: Unmute all configured slots
- **Mute All**: Mute all configured slots

## Presets

Drag-and-drop button presets are available in the Presets tab:

- **Slot 1–16**: Toggle mute per user with color feedback
- **Open All / Mute All**: Bulk control buttons
- **Status**: Live display of online and open user counts

## Variables

- `$(mumble:slot_N_status)` - Status text (OFFLINE/MUTED/WANTS TALK/OPEN/TALKING)
- `$(mumble:slot_N_name)` - Username for slot N
- `$(mumble:slot_N_online)` - Yes/No
- `$(mumble:slot_N_talking)` - Yes/No
- `$(mumble:slot_N_muted)` - Yes/No
- `$(mumble:users_online)` - Count of online users
- `$(mumble:users_open)` - Count of unmuted users
- `$(mumble:connected)` - Yes/No

*Replace `mumble` with your connection label if different.*
