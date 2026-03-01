import { CompanionActionDefinitions } from '@companion-module/base'
import type { MumbleIntercomInstance } from './main.js'

export function getActions(instance: MumbleIntercomInstance): CompanionActionDefinitions {
	const slotChoices = []
	for (let i = 1; i <= instance.config.userSlots; i++) {
		const username = instance.userSlotMap.get(i) || `Slot ${i}`
		slotChoices.push({ id: String(i), label: `${i}: ${username}` })
	}

	return {
		toggle_slot: {
			name: 'Toggle Slot Mute',
			description: 'Toggle server mute/unmute for a user slot',
			options: [
				{
					type: 'dropdown',
					id: 'slot',
					label: 'User Slot',
					default: '1',
					choices: slotChoices,
				},
			],
			callback: (action: any) => {
				const slot = parseInt(action.options.slot as string)
				const user = instance.getUserBySlot(slot)
				if (user && instance.mumble) {
					const newMuted = !user.muted
					user.muted = newMuted
					const session = instance.mumble.getSessionByUsername(user.username)
					if (session !== undefined) {
						instance.mumble.setUserMute(session, newMuted)
					}
					instance.updateVariablesForUser(user.username)
					instance.checkFeedbacks('user_status', 'user_talking')
				}
			},
		},

		mute_slot: {
			name: 'Mute Slot',
			description: 'Server mute a user slot',
			options: [
				{
					type: 'dropdown',
					id: 'slot',
					label: 'User Slot',
					default: '1',
					choices: slotChoices,
				},
			],
			callback: (action: any) => {
				const slot = parseInt(action.options.slot as string)
				const user = instance.getUserBySlot(slot)
				if (user && instance.mumble) {
					user.muted = true
					const session = instance.mumble.getSessionByUsername(user.username)
					if (session !== undefined) {
						instance.mumble.setUserMute(session, true)
					}
					instance.updateVariablesForUser(user.username)
					instance.checkFeedbacks('user_status', 'user_talking')
				}
			},
		},

		unmute_slot: {
			name: 'Unmute Slot (Open)',
			description: 'Server unmute a user slot',
			options: [
				{
					type: 'dropdown',
					id: 'slot',
					label: 'User Slot',
					default: '1',
					choices: slotChoices,
				},
			],
			callback: (action: any) => {
				const slot = parseInt(action.options.slot as string)
				const user = instance.getUserBySlot(slot)
				if (user && instance.mumble) {
					user.muted = false
					const session = instance.mumble.getSessionByUsername(user.username)
					if (session !== undefined) {
						instance.mumble.setUserMute(session, false)
					}
					instance.updateVariablesForUser(user.username)
					instance.checkFeedbacks('user_status', 'user_talking')
				}
			},
		},

		open_all: {
			name: 'Open All Slots',
			description: 'Server unmute all configured user slots',
			options: [],
			callback: () => {
				for (const [, username] of instance.userSlotMap.entries()) {
					const user = instance.users.get(username.toLowerCase())
					if (user && user.online && instance.mumble) {
						user.muted = false
						const session = instance.mumble.getSessionByUsername(user.username)
						if (session !== undefined) {
							instance.mumble.setUserMute(session, false)
						}
					}
				}
				instance.updateAllVariables()
				instance.checkFeedbacks('user_status', 'user_talking')
				instance.log('info', 'All slots OPEN')
			},
		},

		mute_all: {
			name: 'Mute All Slots',
			description: 'Server mute all configured user slots',
			options: [],
			callback: () => {
				for (const [, username] of instance.userSlotMap.entries()) {
					const user = instance.users.get(username.toLowerCase())
					if (user && user.online && instance.mumble) {
						user.muted = true
						const session = instance.mumble.getSessionByUsername(user.username)
						if (session !== undefined) {
							instance.mumble.setUserMute(session, true)
						}
					}
				}
				instance.updateAllVariables()
				instance.checkFeedbacks('user_status', 'user_talking')
				instance.log('info', 'All slots MUTED')
			},
		},
	}
}
