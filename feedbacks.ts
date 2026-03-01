import { CompanionFeedbackDefinitions, combineRgb } from '@companion-module/base'
import type { MumbleIntercomInstance } from './main.js'

// Color palette
const COLOR_BG_OFFLINE = combineRgb(30, 30, 30)       // Dark grey
const COLOR_BG_MUTED = combineRgb(80, 80, 80)         // Grey
const COLOR_BG_WANTS_TALK = combineRgb(204, 170, 0)   // Yellow
const COLOR_BG_OPEN = combineRgb(180, 40, 40)         // Red
const COLOR_BG_TALKING = combineRgb(0, 180, 0)        // Green

const COLOR_FG_DEFAULT = combineRgb(255, 255, 255)    // White
const COLOR_FG_OFFLINE = combineRgb(100, 100, 100)    // Dim grey
const COLOR_FG_DARK = combineRgb(0, 0, 0)             // Black

export function getFeedbacks(instance: MumbleIntercomInstance): CompanionFeedbackDefinitions {
	const slotChoices = []
	for (let i = 1; i <= instance.config.userSlots; i++) {
		const username = instance.userSlotMap.get(i) || `Slot ${i}`
		slotChoices.push({ id: String(i), label: `${i}: ${username}` })
	}

	return {
		user_status: {
			type: 'advanced',
			name: 'User Slot Status',
			description: 'Changes button color based on user state: offline/muted/wants-talk/open/talking',
			options: [
				{
					type: 'dropdown',
					id: 'slot',
					label: 'User Slot',
					default: '1',
					choices: slotChoices,
				},
			],
			callback: (feedback: any) => {
				const slot = parseInt(feedback.options.slot as string)
				const user = instance.getUserBySlot(slot)

				if (!user || !user.online) {
					return { bgcolor: COLOR_BG_OFFLINE, color: COLOR_FG_OFFLINE }
				}
				if (user.muted && user.talking) {
					return { bgcolor: COLOR_BG_WANTS_TALK, color: COLOR_FG_DARK }
				}
				if (user.muted) {
					return { bgcolor: COLOR_BG_MUTED, color: COLOR_FG_DEFAULT }
				}
				if (user.talking) {
					return { bgcolor: COLOR_BG_TALKING, color: COLOR_FG_DARK }
				}
				return { bgcolor: COLOR_BG_OPEN, color: COLOR_FG_DEFAULT }
			},
		},

		user_talking: {
			type: 'boolean',
			name: 'User Is Talking',
			description: 'True when the user in the specified slot is actively speaking',
			options: [
				{
					type: 'dropdown',
					id: 'slot',
					label: 'User Slot',
					default: '1',
					choices: slotChoices,
				},
			],
			defaultStyle: {
				bgcolor: COLOR_BG_TALKING,
				color: COLOR_FG_DARK,
			},
			callback: (feedback: any) => {
				const slot = parseInt(feedback.options.slot as string)
				const user = instance.getUserBySlot(slot)
				return !!user?.talking
			},
		},
	}
}
