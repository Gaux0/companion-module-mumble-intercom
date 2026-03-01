import {
	InstanceBase,
	InstanceStatus,
	SomeCompanionConfigField,
	CompanionVariableValues,
	runEntrypoint,
} from '@companion-module/base'
import { getActions } from './actions.js'
import { getFeedbacks } from './feedbacks.js'
import { getPresets } from './presets.js'
import { MumbleConfig, getConfigFields } from './config.js'
import { MumbleConnection } from './mumble.js'
import { UserState } from './state.js'

export class MumbleIntercomInstance extends InstanceBase<MumbleConfig> {
	config: MumbleConfig = {
		host: '',
		port: 64738,
		username: 'Director',
		password: '',
		userSlots: 16,
	}

	mumble: MumbleConnection | null = null
	users: Map<string, UserState> = new Map()
	userSlotMap: Map<number, string> = new Map()

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: MumbleConfig): Promise<void> {
		this.config = config
		this.updateStatus(InstanceStatus.Disconnected)
		this.initUserSlots()
		this.setupActions()
		this.setupFeedbacks()
		this.setupPresets()
		this.setupVariables()

		if (this.config.host) {
			this.connectMumble()
		} else {
			this.log('warn', 'No host configured.')
		}
	}

	async destroy(): Promise<void> {
		this.disconnectMumble()
	}

	async configUpdated(config: MumbleConfig): Promise<void> {
		const needsReconnect =
			this.config.host !== config.host ||
			this.config.port !== config.port ||
			this.config.username !== config.username ||
			this.config.password !== config.password

		this.config = config
		this.initUserSlots()
		this.setupActions()
		this.setupFeedbacks()
		this.setupPresets()
		this.setupVariables()

		if (needsReconnect) {
			this.disconnectMumble()
			if (this.config.host) this.connectMumble()
		}
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return getConfigFields()
	}

	// =========================================================================
	// USER SLOTS
	// =========================================================================

	initUserSlots(): void {
		this.userSlotMap.clear()
		for (let i = 1; i <= this.config.userSlots; i++) {
			const username = this.config[`user_slot_${i}`] as string | undefined
			if (username) this.userSlotMap.set(i, username)
		}
	}

	getUserBySlot(slot: number): UserState | undefined {
		const username = this.userSlotMap.get(slot)
		if (!username) return undefined
		return this.users.get(username.toLowerCase())
	}

	getSlotByUsername(username: string): number | undefined {
		const lower = username.toLowerCase()
		for (const [slot, uname] of this.userSlotMap.entries()) {
			if (uname.toLowerCase() === lower) return slot
		}
		return undefined
	}

	// =========================================================================
	// MUMBLE CONNECTION
	// =========================================================================

	connectMumble(): void {
		this.log('info', `Connecting to ${this.config.host}:${this.config.port}...`)
		this.updateStatus(InstanceStatus.Connecting)
		this.mumble = new MumbleConnection(this.config, this)
		this.mumble.connect()
	}

	disconnectMumble(): void {
		if (this.mumble) {
			this.mumble.disconnect()
			this.mumble = null
		}
		this.users.clear()
	}

	onConnected(): void {
		this.updateStatus(InstanceStatus.Ok)
		this.log('info', 'Connected to Mumble server')
	}

	onDisconnected(): void {
		this.updateStatus(InstanceStatus.Disconnected)
		this.users.clear()
		this.updateAllVariables()
		this.checkFeedbacks('user_status', 'user_talking')
	}

	onError(message: string): void {
		this.updateStatus(InstanceStatus.ConnectionFailure, message)
		this.log('error', `Mumble: ${message}`)
	}

	onUserJoined(username: string, session: number): void {
		const lower = username.toLowerCase()
		if (!this.users.has(lower)) {
			this.users.set(lower, {
				username,
				session,
				online: true,
				talking: false,
				muted: false,
				serverMuted: false,
				serverDeafened: false,
				lastTalkTime: 0,
			})
		} else {
			const user = this.users.get(lower)!
			user.online = true
			user.session = session
		}
		this.log('info', `User joined: ${username}`)
		this.updateAllVariables()
		this.checkFeedbacks('user_status', 'user_talking')
	}

	onUserLeft(username: string): void {
		const lower = username.toLowerCase()
		const user = this.users.get(lower)
		if (user) {
			user.online = false
			user.talking = false
		}
		this.log('info', `User left: ${username}`)
		this.updateAllVariables()
		this.checkFeedbacks('user_status', 'user_talking')
	}

	onUserTalkingChanged(username: string, talking: boolean): void {
		const lower = username.toLowerCase()
		const user = this.users.get(lower)
		if (user) {
			user.talking = talking
			if (talking) user.lastTalkTime = Date.now()
		}
		this.updateVariablesForUser(username)
		this.checkFeedbacks('user_status', 'user_talking')
	}

	onUserStateChanged(username: string, state: Partial<UserState>): void {
		const lower = username.toLowerCase()
		const user = this.users.get(lower)
		if (user) {
			Object.assign(user, state)
			// Sync muted state from server
			if ('serverMuted' in state) {
				user.muted = !!state.serverMuted
			}
		}
		this.updateVariablesForUser(username)
		this.checkFeedbacks('user_status', 'user_talking')
	}

	// =========================================================================
	// SETUP
	// =========================================================================

	setupActions(): void { this.setActionDefinitions(getActions(this)) }
	setupFeedbacks(): void { this.setFeedbackDefinitions(getFeedbacks(this)) }
	setupPresets(): void { this.setPresetDefinitions(getPresets(this)) }

	setupVariables(): void {
		const variables = [
			{ variableId: 'connected', name: 'Connected to Mumble' },
			{ variableId: 'server_host', name: 'Server Host' },
			{ variableId: 'users_online', name: 'Users Online Count' },
			{ variableId: 'users_open', name: 'Users Open Count' },
		]
		for (let i = 1; i <= this.config.userSlots; i++) {
			variables.push(
				{ variableId: `slot_${i}_name`, name: `Slot ${i} Username` },
				{ variableId: `slot_${i}_online`, name: `Slot ${i} Online` },
				{ variableId: `slot_${i}_talking`, name: `Slot ${i} Talking` },
				{ variableId: `slot_${i}_muted`, name: `Slot ${i} Muted` },
				{ variableId: `slot_${i}_status`, name: `Slot ${i} Status` },
			)
		}
		this.setVariableDefinitions(variables)
		this.updateAllVariables()
	}

	updateAllVariables(): void {
		const values: CompanionVariableValues = {}
		values['connected'] = this.mumble?.isConnected ? 'Yes' : 'No'
		values['server_host'] = this.config.host
		values['users_online'] = Array.from(this.users.values()).filter((u) => u.online).length
		values['users_open'] = Array.from(this.users.values()).filter((u) => u.online && !u.muted).length

		for (let i = 1; i <= this.config.userSlots; i++) {
			const user = this.getUserBySlot(i)
			values[`slot_${i}_name`] = this.userSlotMap.get(i) || `(Slot ${i})`
			values[`slot_${i}_online`] = user?.online ? 'Yes' : 'No'
			values[`slot_${i}_talking`] = user?.talking ? 'Yes' : 'No'
			values[`slot_${i}_muted`] = user?.muted !== false ? 'Yes' : 'No'
			values[`slot_${i}_status`] = this.getSlotStatusText(i)
		}
		this.setVariableValues(values)
	}

	updateVariablesForUser(username: string): void {
		const slot = this.getSlotByUsername(username)
		if (slot === undefined) return

		const user = this.getUserBySlot(slot)
		const values: CompanionVariableValues = {}
		values[`slot_${slot}_online`] = user?.online ? 'Yes' : 'No'
		values[`slot_${slot}_talking`] = user?.talking ? 'Yes' : 'No'
		values[`slot_${slot}_muted`] = user?.muted !== false ? 'Yes' : 'No'
		values[`slot_${slot}_status`] = this.getSlotStatusText(slot)
		values['users_online'] = Array.from(this.users.values()).filter((u) => u.online).length
		values['users_open'] = Array.from(this.users.values()).filter((u) => u.online && !u.muted).length
		this.setVariableValues(values)
	}

	getSlotStatusText(slot: number): string {
		const user = this.getUserBySlot(slot)
		if (!user || !user.online) return 'OFFLINE'
		if (user.muted && user.talking) return 'WANTS TALK'
		if (user.muted) return 'MUTED'
		if (user.talking) return 'TALKING'
		return 'OPEN'
	}
}

runEntrypoint(MumbleIntercomInstance, [])
