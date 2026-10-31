interface CalendarEventParams {
  title: string
  startTime: Date
  durationMinutes: number
  attendeeEmail: string
  meetLink: string
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) return null

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { access_token?: string }
    return data.access_token ?? null
  } catch {
    return null
  }
}

export async function createCalendarEvent(params: CalendarEventParams): Promise<string | null> {
  const token = await getAccessToken()
  if (!token) return null

  const endTime = new Date(params.startTime.getTime() + params.durationMinutes * 60 * 1000)

  const event = {
    summary: params.title,
    description: `Meeting link: ${params.meetLink}`,
    start: { dateTime: params.startTime.toISOString(), timeZone: 'UTC' },
    end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
    attendees: [{ email: params.attendeeEmail }],
    conferenceData: {
      createRequest: { requestId: `oppdate-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
    },
    sendUpdates: 'all',
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )
    if (!res.ok) return null
    const data = await res.json() as { id?: string }
    return data.id ?? null
  } catch {
    return null
  }
}
