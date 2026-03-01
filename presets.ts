import { CompanionPresetDefinitions, combineRgb } from '@companion-module/base'
import type { MumbleIntercomInstance } from './main.js'

export function getPresets(instance: MumbleIntercomInstance): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitions = {}
	const connectionLabel = instance.label

	// Camera/user slot buttons
	for (let i = 1; i <= instance.config.userSlots; i++) {
		const slotName = instance.userSlotMap.get(i) || `Slot ${i}`
		presets[`slot_${i}`] = {
			type: 'button',
			category: 'Camera Slots',
			name: `${slotName} - Toggle Mute`,
			style: {
				text: `${slotName}\\n$(${connectionLabel}:slot_${i}_status)`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(30, 30, 30),
			},
			steps: [
				{
					down: [{ actionId: 'toggle_slot', options: { slot: String(i) } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'user_status',
					options: { slot: String(i) },
				},
			],
		}
	}

	// Open All
	presets['open_all'] = {
		type: 'button',
		category: 'Control',
		name: 'Open All Slots',
		style: {
			text: 'OPEN\\nALL',
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 100, 0),
		},
		steps: [
			{
				down: [{ actionId: 'open_all', options: {} }],
				up: [],
			},
		],
		feedbacks: [],
	}

	// Mute All
	presets['mute_all'] = {
		type: 'button',
		category: 'Control',
		name: 'Mute All Slots',
		style: {
			text: 'MUTE\\nALL',
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(150, 0, 0),
		},
		steps: [
			{
				down: [{ actionId: 'mute_all', options: {} }],
				up: [],
			},
		],
		feedbacks: [],
	}

	// Status display
	presets['status'] = {
		type: 'button',
		category: 'Info',
		name: 'Connection Status',
		style: {
			text: `Online: $(${connectionLabel}:users_online)\\nOpen: $(${connectionLabel}:users_open)`,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 80),
		},
		steps: [{ down: [], up: [] }],
		feedbacks: [],
	}

	return presets
}
