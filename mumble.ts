import * as tls from 'node:tls'
import { createRequire } from 'node:module'
import { MumbleConfig } from './config.js'
import type { MumbleIntercomInstance } from './main.js'

const require = createRequire(import.meta.url)
const protobuf = require('protobufjs') as typeof import('protobufjs')

// Mumble protocol message types
const MSG_VERSION = 0
const MSG_UDPTUNNEL = 1
const MSG_AUTHENTICATE = 2
const MSG_PING = 3
const MSG_REJECT = 4
const MSG_SERVERSYNC = 7
const MSG_USERSTATE = 9
const MSG_USERREMOVE = 11
const MSG_CRYPTSETUP = 15

export class MumbleConnection {
	private config: MumbleConfig
	private instance: MumbleIntercomInstance
	private socket: tls.TLSSocket | null = null
	private protoTypes: Map<number, protobuf.Type> = new Map()

	// State
	private mySession = -1
	private sessions: Map<number, string> = new Map()
	private _isConnected = false

	// Timers
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null
	private pingTimer: ReturnType<typeof setInterval> | null = null

	// Voice activity
	private voiceTimers: Map<number, ReturnType<typeof setTimeout>> = new Map()
	private readonly VOICE_TIMEOUT_MS = 600

	// Receive buffer for TCP framing
	private recvBuffer: Buffer = Buffer.alloc(0)

	get isConnected(): boolean { return this._isConnected }

	constructor(config: MumbleConfig, instance: MumbleIntercomInstance) {
		this.config = config
		this.instance = instance
		this.buildProtoSchema()
	}

	connect(): void {
		try {
			this.doConnect()
		} catch (err: any) {
			this.instance.onError(`Init error: ${err.message}`)
		}
	}

	disconnect(): void {
		this._isConnected = false
		if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
		if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null }
		for (const timer of this.voiceTimers.values()) clearTimeout(timer)
		this.voiceTimers.clear()
		if (this.socket) {
			try { this.socket.destroy() } catch { /* ignore */ }
			this.socket = null
		}
		this.sessions.clear()
	}

	// =========================================================================
	// PROTOBUF SCHEMA (inline — no external .proto files needed)
	// =========================================================================

	private buildProtoSchema(): void {
		const root = new protobuf.Root()

		const Version = new protobuf.Type('MumbleVersion')
			.add(new protobuf.Field('version_v1', 1, 'uint32'))
			.add(new protobuf.Field('release', 2, 'string'))
			.add(new protobuf.Field('os', 3, 'string'))
			.add(new protobuf.Field('os_version', 4, 'string'))
		root.add(Version)
		this.protoTypes.set(MSG_VERSION, Version)

		const Authenticate = new protobuf.Type('MumbleAuthenticate')
			.add(new protobuf.Field('username', 1, 'string'))
			.add(new protobuf.Field('password', 2, 'string'))
			.add(new protobuf.Field('tokens', 3, 'string', 'repeated'))
			.add(new protobuf.Field('opus', 5, 'bool'))
		root.add(Authenticate)
		this.protoTypes.set(MSG_AUTHENTICATE, Authenticate)

		const Ping = new protobuf.Type('MumblePing')
			.add(new protobuf.Field('timestamp', 1, 'uint64'))
		root.add(Ping)
		this.protoTypes.set(MSG_PING, Ping)

		const Reject = new protobuf.Type('MumbleReject')
			.add(new protobuf.Field('type', 1, 'uint32'))
			.add(new protobuf.Field('reason', 2, 'string'))
		root.add(Reject)
		this.protoTypes.set(MSG_REJECT, Reject)

		const ServerSync = new protobuf.Type('MumbleServerSync')
			.add(new protobuf.Field('session', 1, 'uint32'))
			.add(new protobuf.Field('max_bandwidth', 2, 'uint32'))
			.add(new protobuf.Field('welcome_text', 3, 'string'))
		root.add(ServerSync)
		this.protoTypes.set(MSG_SERVERSYNC, ServerSync)

		const UserState = new protobuf.Type('MumbleUserState')
			.add(new protobuf.Field('session', 1, 'uint32'))
			.add(new protobuf.Field('actor', 2, 'uint32'))
			.add(new protobuf.Field('name', 3, 'string'))
			.add(new protobuf.Field('channel_id', 5, 'uint32'))
			.add(new protobuf.Field('mute', 6, 'bool'))
			.add(new protobuf.Field('deaf', 7, 'bool'))
			.add(new protobuf.Field('suppress', 8, 'bool'))
			.add(new protobuf.Field('self_mute', 9, 'bool'))
			.add(new protobuf.Field('self_deaf', 10, 'bool'))
		root.add(UserState)
		this.protoTypes.set(MSG_USERSTATE, UserState)

		const UserRemove = new protobuf.Type('MumbleUserRemove')
			.add(new protobuf.Field('session', 1, 'uint32'))
		root.add(UserRemove)
		this.protoTypes.set(MSG_USERREMOVE, UserRemove)

		const CryptSetup = new protobuf.Type('MumbleCryptSetup')
			.add(new protobuf.Field('key', 1, 'bytes'))
			.add(new protobuf.Field('client_nonce', 2, 'bytes'))
			.add(new protobuf.Field('server_nonce', 3, 'bytes'))
		root.add(CryptSetup)
		this.protoTypes.set(MSG_CRYPTSETUP, CryptSetup)
	}

	// =========================================================================
	// TLS CONNECTION
	// =========================================================================

	private doConnect(): void {
		this.disconnect()
		this.recvBuffer = Buffer.alloc(0)

		this.socket = tls.connect(
			{
				host: this.config.host,
				port: this.config.port,
				rejectUnauthorized: false,
			},
			() => {
				this.instance.log('info', 'TLS connected, authenticating...')
				this.sendVersion()
				this.sendAuthenticate()
			},
		)

		this.socket.on('data', (data: Buffer) => this.onData(data))

		this.socket.on('error', (err: Error) => {
			this.instance.onError(err.message)
			this.scheduleReconnect()
		})

		this.socket.on('close', () => {
			if (this._isConnected) {
				this._isConnected = false
				this.instance.onDisconnected()
				this.scheduleReconnect()
			}
		})
	}

	private scheduleReconnect(): void {
		if (this.reconnectTimer) return
		this.instance.log('info', 'Reconnecting in 5s...')
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null
			this.doConnect()
		}, 5000)
	}

	private startPingInterval(): void {
		if (this.pingTimer) clearInterval(this.pingTimer)
		this.pingTimer = setInterval(() => {
			this.sendProto(MSG_PING, { timestamp: BigInt(Date.now()) })
		}, 15000)
	}

	// =========================================================================
	// SENDING
	// =========================================================================

	private sendMessage(type: number, payload: Uint8Array): void {
		if (!this.socket || this.socket.destroyed) return
		const header = Buffer.alloc(6)
		header.writeUInt16BE(type, 0)
		header.writeUInt32BE(payload.length, 2)
		this.socket.write(Buffer.concat([header, Buffer.from(payload)]))
	}

	private sendProto(type: number, obj: Record<string, any>): void {
		const protoType = this.protoTypes.get(type)
		if (!protoType) return
		const msg = protoType.create(obj)
		const encoded = protoType.encode(msg).finish()
		this.sendMessage(type, encoded)
	}

	/**
	 * Server-side mute/unmute a user by session ID.
	 * Requires the bot to have admin/mute permissions on the Mumble server.
	 */
	setUserMute(session: number, muted: boolean): void {
		if (!this._isConnected) return
		this.sendProto(MSG_USERSTATE, {
			session: session,
			mute: muted,
		})
		const username = this.sessions.get(session)
		this.instance.log('info', `Server mute: ${username || session} -> ${muted ? 'MUTED' : 'UNMUTED'}`)
	}

	/**
	 * Get session ID for a username.
	 */
	getSessionByUsername(username: string): number | undefined {
		for (const [session, name] of this.sessions.entries()) {
			if (name.toLowerCase() === username.toLowerCase()) return session
		}
		return undefined
	}

	private sendVersion(): void {
		this.sendProto(MSG_VERSION, {
			version_v1: (1 << 16) | (5 << 8),
			release: 'CompanionMumble 1.0',
			os: 'Companion',
			os_version: '1.0',
		})
	}

	private sendAuthenticate(): void {
		this.sendProto(MSG_AUTHENTICATE, {
			username: this.config.username,
			password: this.config.password || '',
			opus: true,
		})
	}

	// =========================================================================
	// RECEIVING
	// =========================================================================

	private onData(data: Buffer): void {
		this.recvBuffer = Buffer.concat([this.recvBuffer, data])

		while (this.recvBuffer.length >= 6) {
			const type = this.recvBuffer.readUInt16BE(0)
			const length = this.recvBuffer.readUInt32BE(2)

			if (this.recvBuffer.length < 6 + length) break

			const payload = this.recvBuffer.subarray(6, 6 + length)
			this.recvBuffer = this.recvBuffer.subarray(6 + length)

			this.handleMessage(type, payload)
		}
	}

	private handleMessage(type: number, payload: Buffer): void {
		switch (type) {
			case MSG_UDPTUNNEL:
				this.handleVoiceData(payload)
				break
			case MSG_SERVERSYNC:
				this.handleServerSync(payload)
				break
			case MSG_USERSTATE:
				this.handleUserState(payload)
				break
			case MSG_USERREMOVE:
				this.handleUserRemove(payload)
				break
			case MSG_REJECT:
				this.handleReject(payload)
				break
			case MSG_CRYPTSETUP:
				this.handleCryptSetup(payload)
				break
			default:
				break
		}
	}

	private handleServerSync(payload: Buffer): void {
		const pt = this.protoTypes.get(MSG_SERVERSYNC)
		if (!pt) return
		const msg = pt.decode(payload) as any
		const rawSession = msg.session
		this.mySession = typeof rawSession === 'object' ? Number(rawSession) : (rawSession || 0)
		this._isConnected = true
		this.instance.log('info', `Authenticated as session ${this.mySession}`)
		this.instance.onConnected()
		this.startPingInterval()
	}

	private handleReject(payload: Buffer): void {
		const pt = this.protoTypes.get(MSG_REJECT)
		if (!pt) return
		const msg = pt.decode(payload) as any
		this.instance.onError(`Rejected: ${msg.reason || 'Unknown'}`)
	}

	private handleCryptSetup(_payload: Buffer): void {
		// Respond with empty CryptSetup to signal we want voice via TCP tunnel
		this.sendMessage(MSG_CRYPTSETUP, Buffer.alloc(0))
	}

	private handleUserState(payload: Buffer): void {
		const pt = this.protoTypes.get(MSG_USERSTATE)
		if (!pt) return
		const msg = pt.decode(payload) as any
		const rawSession = msg.session
		const session: number = typeof rawSession === 'object' ? Number(rawSession) : (rawSession || 0)

		if (msg.name) {
			this.sessions.set(session, msg.name)
			if (session !== this.mySession) {
				this.instance.onUserJoined(msg.name, session)
			}
		}

		const username = this.sessions.get(session)
		if (username && session !== this.mySession) {
			this.instance.onUserStateChanged(username, {
				serverMuted: !!msg.mute || !!msg.suppress,
				serverDeafened: !!msg.deaf,
				muted: !!msg.mute || !!msg.suppress,
			})
		}
	}

	private handleUserRemove(payload: Buffer): void {
		const pt = this.protoTypes.get(MSG_USERREMOVE)
		if (!pt) return
		const msg = pt.decode(payload) as any
		const rawSession = msg.session
		const session: number = typeof rawSession === 'object' ? Number(rawSession) : (rawSession || 0)
		const username = this.sessions.get(session)
		if (username) {
			this.instance.onUserLeft(username)
			this.sessions.delete(session)
		}
	}

	// =========================================================================
	// VOICE ACTIVITY DETECTION
	// =========================================================================

	private handleVoiceData(payload: Buffer): void {
		if (payload.length < 2) return
		const audioType = (payload[0] >> 5) & 0x07
		if (audioType === 1) return // ping

		const { value: session } = this.decodeVarint(payload, 1)
		if (this.mySession >= 0 && session === this.mySession) return

		const username = this.sessions.get(session)
		if (!username) return

		this.instance.onUserTalkingChanged(username, true)

		const existing = this.voiceTimers.get(session)
		if (existing) clearTimeout(existing)

		this.voiceTimers.set(
			session,
			setTimeout(() => {
				this.voiceTimers.delete(session)
				const uname = this.sessions.get(session)
				if (uname) this.instance.onUserTalkingChanged(uname, false)
			}, this.VOICE_TIMEOUT_MS),
		)
	}

	private decodeVarint(buf: Buffer, offset: number): { value: number; bytesRead: number } {
		if (offset >= buf.length) return { value: 0, bytesRead: 0 }
		const b0 = buf[offset]
		if ((b0 & 0x80) === 0) return { value: b0 & 0x7f, bytesRead: 1 }
		if ((b0 & 0xc0) === 0x80) {
			if (offset + 1 >= buf.length) return { value: 0, bytesRead: 0 }
			return { value: ((b0 & 0x3f) << 8) | buf[offset + 1], bytesRead: 2 }
		}
		if ((b0 & 0xe0) === 0xc0) {
			if (offset + 2 >= buf.length) return { value: 0, bytesRead: 0 }
			return { value: ((b0 & 0x1f) << 16) | (buf[offset + 1] << 8) | buf[offset + 2], bytesRead: 3 }
		}
		if ((b0 & 0xf0) === 0xe0) {
			if (offset + 3 >= buf.length) return { value: 0, bytesRead: 0 }
			return {
				value: ((b0 & 0x0f) << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3],
				bytesRead: 4,
			}
		}
		return { value: 0, bytesRead: 1 }
	}
}
