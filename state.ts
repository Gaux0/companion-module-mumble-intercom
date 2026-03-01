export interface UserState {
	username: string
	session: number
	online: boolean
	talking: boolean
	muted: boolean
	serverMuted: boolean
	serverDeafened: boolean
	lastTalkTime: number
}
