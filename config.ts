import { SomeCompanionConfigField } from '@companion-module/base'

export interface MumbleConfig {
	host: string
	port: number
	username: string
	password: string
	userSlots: number
	[key: string]: any
}

export function getConfigFields(): SomeCompanionConfigField[] {
	const fields: SomeCompanionConfigField[] = [
		{
			type: 'static-text',
			id: 'info_server',
			label: 'Server Connection',
			value: 'Configure the Mumble server (Murmur) connection. The bot must have admin permissions to mute/unmute users.',
			width: 12,
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Server Host',
			width: 8,
			default: '',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			width: 4,
			default: 64738,
			min: 1,
			max: 65535,
		},
		{
			type: 'textinput',
			id: 'username',
			label: 'Bot Username',
			width: 6,
			default: 'Director',
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'Server Password',
			width: 6,
			default: '',
		},
		{
			type: 'static-text',
			id: 'info_slots',
			label: 'User/Camera Slots',
			value: 'Enter the exact Mumble username for each camera/position (case-sensitive).',
			width: 12,
		},
		{
			type: 'number',
			id: 'userSlots',
			label: 'Number of Slots',
			width: 4,
			default: 16,
			min: 1,
			max: 16,
		},
	]

	for (let i = 1; i <= 16; i++) {
		fields.push({
			type: 'textinput',
			id: `user_slot_${i}`,
			label: `Slot ${i} - Mumble Username`,
			width: 6,
			default: '',
		})
	}

	return fields
}
