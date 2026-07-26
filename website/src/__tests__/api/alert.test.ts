import { describe, it, expect } from 'vitest'
import {
  buildAlertRequest,
  decideAlert,
  detectAlertFormat,
  type AlertSeverity,
} from '@/app/api/position/alert'

const severityFor = (condition: string): AlertSeverity =>
  condition === 'no-contact' ? 'critical' : 'warning'

const DAY = 24 * 60 * 60_000
const NOW = new Date('2026-07-26T12:00:00Z').getTime()
const hoursAgo = (n: number) => new Date(NOW - n * 3600_000).toISOString()

describe('detectAlertFormat', () => {
  it('recognises Slack, Discord and ntfy by host', () => {
    expect(detectAlertFormat('https://hooks.slack.com/services/T/B/x')).toBe('slack')
    expect(detectAlertFormat('https://discord.com/api/webhooks/1/abc')).toBe('discord')
    expect(detectAlertFormat('https://discordapp.com/api/webhooks/1/abc')).toBe('discord')
    expect(detectAlertFormat('https://ntfy.sh/my-topic')).toBe('ntfy')
  })

  it('falls back to generic JSON for an unknown host', () => {
    expect(detectAlertFormat('https://example.com/hook')).toBe('json')
  })

  it('falls back to generic JSON for an unparseable URL', () => {
    expect(detectAlertFormat('not a url')).toBe('json')
  })

  // A self-hosted ntfy has an unrecognisable hostname, so the override matters.
  it('honours an explicit override', () => {
    expect(detectAlertFormat('https://push.example.com/topic', 'ntfy')).toBe('ntfy')
    expect(detectAlertFormat('https://ntfy.sh/topic', 'json')).toBe('json')
  })

  it('ignores a meaningless override', () => {
    expect(detectAlertFormat('https://ntfy.sh/topic', 'carrier-pigeon')).toBe('ntfy')
  })
})

describe('buildAlertRequest', () => {
  const base = { title: 'Matariki III: no GPS fix', message: 'No fix for 66 days', severity: 'warning' as const }

  // ntfy treats the body as the message, so JSON would appear literally on the
  // device's lock screen.
  it('sends ntfy a plain-text body with presentation in headers', () => {
    const req = buildAlertRequest({ ...base, format: 'ntfy' })

    expect(req.body).toBe('No fix for 66 days')
    expect(req.body.startsWith('{')).toBe(false)
    expect(req.headers['Content-Type']).toMatch(/text\/plain/)
    expect(req.headers.Title).toBe('Matariki III: no GPS fix')
    expect(req.headers.Tags).toBe('warning')
  })

  it('escalates ntfy priority for critical alerts', () => {
    expect(buildAlertRequest({ ...base, format: 'ntfy', severity: 'critical' }).headers.Priority)
      .toBe('high')
    expect(buildAlertRequest({ ...base, format: 'ntfy', severity: 'recovery' }).headers.Priority)
      .toBe('low')
  })

  // HTTP header values are not a reliable place for non-ASCII bytes.
  it('keeps ntfy headers free of emoji', () => {
    const req = buildAlertRequest({ ...base, format: 'ntfy', severity: 'critical' })
    for (const value of Object.values(req.headers)) {
      // eslint-disable-next-line no-control-regex
      expect(/^[\x00-\x7F]*$/.test(value)).toBe(true)
    }
  })

  it('sends Slack a text field', () => {
    const parsed = JSON.parse(buildAlertRequest({ ...base, format: 'slack' }).body)
    expect(parsed.text).toContain('no GPS fix')
    expect(parsed.content).toBeUndefined()
  })

  it('sends Discord a content field', () => {
    const parsed = JSON.parse(buildAlertRequest({ ...base, format: 'discord' }).body)
    expect(parsed.content).toContain('no GPS fix')
    expect(parsed.text).toBeUndefined()
  })

  it('sends an unknown service every common field name', () => {
    const parsed = JSON.parse(buildAlertRequest({ ...base, format: 'json' }).body)
    expect(parsed.text).toBeTruthy()
    expect(parsed.content).toBeTruthy()
    expect(parsed.message).toBeTruthy()
  })
})

describe('decideAlert', () => {
  const opts = { now: NOW, reminderIntervalMs: DAY, severityFor }

  it('says nothing when healthy and nothing was reported', () => {
    const d = decideAlert({ ...opts, condition: 'ok', isDegraded: false, previous: null })
    expect(d.send).toBe(false)
  })

  it('reports a newly detected fault', () => {
    const d = decideAlert({ ...opts, condition: 'no-gps-fix', isDegraded: true, previous: null })
    expect(d).toMatchObject({ send: true, reason: 'new', severity: 'warning' })
  })

  // The behaviour that stops 24 messages a day about one GPS outage.
  it('stays quiet about a fault it already reported', () => {
    const d = decideAlert({
      ...opts,
      condition: 'no-gps-fix',
      isDegraded: true,
      previous: { condition: 'no-gps-fix', notifiedAt: hoursAgo(3) },
    })
    expect(d).toMatchObject({ send: false, reason: 'already-notified' })
  })

  it('repeats once the reminder interval has passed', () => {
    const d = decideAlert({
      ...opts,
      condition: 'no-gps-fix',
      isDegraded: true,
      previous: { condition: 'no-gps-fix', notifiedAt: hoursAgo(25) },
    })
    expect(d).toMatchObject({ send: true, reason: 'reminder' })
  })

  // Escalating from no-fix to no-contact is new information, not a repeat.
  it('reports a change of condition immediately', () => {
    const d = decideAlert({
      ...opts,
      condition: 'no-contact',
      isDegraded: true,
      previous: { condition: 'no-gps-fix', notifiedAt: hoursAgo(1) },
    })
    expect(d).toMatchObject({ send: true, reason: 'changed', severity: 'critical' })
  })

  it('reports recovery once a fault was notified', () => {
    const d = decideAlert({
      ...opts,
      condition: 'ok',
      isDegraded: false,
      previous: { condition: 'no-gps-fix', notifiedAt: hoursAgo(2) },
    })
    expect(d).toMatchObject({ send: true, reason: 'recovered', severity: 'recovery' })
  })

  // A corrupt or unparseable timestamp must not mute alerting indefinitely.
  it('sends rather than stays silent when the last-notified time is unusable', () => {
    const d = decideAlert({
      ...opts,
      condition: 'no-gps-fix',
      isDegraded: true,
      previous: { condition: 'no-gps-fix', notifiedAt: 'not-a-date' },
    })
    expect(d).toMatchObject({ send: true, reason: 'reminder' })
  })
})
