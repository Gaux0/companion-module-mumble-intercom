# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-01

### Added

- Initial release
- Connect to Mumble server via TLS (pure JavaScript, no native dependencies)
- Server-side mute/unmute users from Stream Deck buttons
- Real-time voice activity detection via UDPTunnel packets
- Up to 16 configurable user slots mapped to Mumble usernames
- Color-coded button feedback: offline (dark grey), muted (grey), wants-talk (yellow), open (red), talking (green)
- Actions: Toggle Mute, Mute Slot, Unmute Slot, Mute All, Open All
- Feedbacks: User Status (advanced color), User Talking (boolean)
- Variables for each slot: name, online, talking, muted, status
- Auto-reconnect on connection loss (5s delay)
- Drag-and-drop presets for quick Stream Deck setup
- Compatible with Companion v4.x
