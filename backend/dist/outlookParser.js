import { randomUUID } from 'node:crypto';
function parseIsoDates(input) {
    const matches = input.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?\b/g);
    if (!matches) {
        return [];
    }
    return matches
        .map((token) => {
        const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(token) ? token : `${token}Z`;
        const parsed = new Date(normalized);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    })
        .filter((value) => Boolean(value));
}
function parseUsDates(input) {
    const matches = input.match(/\b\d{1,2}\/\d{1,2}\/\d{4},?\s+\d{1,2}:\d{2}\s*(?:AM|PM)\b/gi);
    if (!matches) {
        return [];
    }
    return matches
        .map((token) => {
        const parsed = new Date(token);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    })
        .filter((value) => Boolean(value));
}
function toBusyBlocks(dateCandidates, userId, sourceUpdatedAt, minDate, maxDate, maxDurationMs = 12 * 60 * 60 * 1000) {
    const sorted = [...dateCandidates].sort((a, b) => a.getTime() - b.getTime());
    const seen = new Set();
    const blocks = [];
    for (let i = 0; i < sorted.length - 1; i += 1) {
        const start = sorted[i];
        const end = sorted[i + 1];
        const durationMs = end.getTime() - start.getTime();
        if (durationMs <= 0 || durationMs > maxDurationMs) {
            continue;
        }
        if (end < minDate || start > maxDate) {
            continue;
        }
        const key = `${start.toISOString()}|${end.toISOString()}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        blocks.push({
            id: randomUUID(),
            userId,
            startAt: start.toISOString(),
            endAt: end.toISOString(),
            status: 'busy',
            sourceUpdatedAt,
        });
    }
    return blocks;
}
export function parseOutlookPublishedHtml(html, userId, horizonDays) {
    const sourceUpdatedAt = new Date().toISOString();
    const minDate = new Date();
    const maxDate = new Date(minDate);
    maxDate.setUTCDate(maxDate.getUTCDate() + horizonDays);
    const isoDates = parseIsoDates(html);
    const usDates = parseUsDates(html);
    const blocks = toBusyBlocks([...isoDates, ...usDates], userId, sourceUpdatedAt, minDate, maxDate);
    if (blocks.length === 0) {
        throw new Error('Could not parse events from this Outlook published HTML page. Try another published link or use seeded demo users.');
    }
    return blocks;
}
function parseIcsDateToken(token) {
    const value = token.trim();
    // All-day event date.
    if (/^\d{8}$/.test(value)) {
        const year = Number(value.slice(0, 4));
        const month = Number(value.slice(4, 6));
        const day = Number(value.slice(6, 8));
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    }
    // UTC timestamp.
    if (/^\d{8}T\d{6}Z$/.test(value)) {
        const year = Number(value.slice(0, 4));
        const month = Number(value.slice(4, 6));
        const day = Number(value.slice(6, 8));
        const hour = Number(value.slice(9, 11));
        const minute = Number(value.slice(11, 13));
        const second = Number(value.slice(13, 15));
        return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    }
    // Floating/local timestamp. For demo, normalize as UTC if no explicit timezone.
    if (/^\d{8}T\d{6}$/.test(value)) {
        const year = Number(value.slice(0, 4));
        const month = Number(value.slice(4, 6));
        const day = Number(value.slice(6, 8));
        const hour = Number(value.slice(9, 11));
        const minute = Number(value.slice(11, 13));
        const second = Number(value.slice(13, 15));
        return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    }
    return null;
}
function getIcsValue(line) {
    const idx = line.indexOf(':');
    if (idx < 0 || idx === line.length - 1) {
        return null;
    }
    return line.slice(idx + 1);
}
function parseIcsEvents(ics, userId, sourceUpdatedAt, minDate, maxDate) {
    const unfolded = ics.replace(/\r?\n[ \t]/g, '');
    const lines = unfolded.split(/\r?\n/);
    const blocks = [];
    const seen = new Set();
    let inEvent = false;
    let eventStart = null;
    let eventEnd = null;
    for (const rawLine of lines) {
        const line = rawLine.trim();
        const upper = line.toUpperCase();
        if (upper === 'BEGIN:VEVENT') {
            inEvent = true;
            eventStart = null;
            eventEnd = null;
            continue;
        }
        if (upper === 'END:VEVENT') {
            if (inEvent && eventStart && eventEnd) {
                const durationMs = eventEnd.getTime() - eventStart.getTime();
                if (durationMs > 0 && durationMs <= 24 * 60 * 60 * 1000) {
                    if (!(eventEnd < minDate || eventStart > maxDate)) {
                        const key = `${eventStart.toISOString()}|${eventEnd.toISOString()}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            blocks.push({
                                id: randomUUID(),
                                userId,
                                startAt: eventStart.toISOString(),
                                endAt: eventEnd.toISOString(),
                                status: 'busy',
                                sourceUpdatedAt,
                            });
                        }
                    }
                }
            }
            inEvent = false;
            eventStart = null;
            eventEnd = null;
            continue;
        }
        if (!inEvent) {
            continue;
        }
        if (upper.startsWith('DTSTART')) {
            const value = getIcsValue(line);
            if (value) {
                eventStart = parseIcsDateToken(value);
            }
            continue;
        }
        if (upper.startsWith('DTEND')) {
            const value = getIcsValue(line);
            if (value) {
                eventEnd = parseIcsDateToken(value);
            }
        }
    }
    return blocks;
}
function isLikelyIcs(raw, sourceUrl, contentType) {
    const normalizedContentType = (contentType ?? '').toLowerCase();
    if (normalizedContentType.includes('text/calendar') || normalizedContentType.includes('application/ics')) {
        return true;
    }
    const normalizedUrl = (sourceUrl ?? '').toLowerCase();
    if (normalizedUrl.endsWith('.ics') || normalizedUrl.includes('format=ics')) {
        return true;
    }
    const upperRaw = raw.toUpperCase();
    return upperRaw.includes('BEGIN:VCALENDAR') && upperRaw.includes('BEGIN:VEVENT');
}
export function parsePublishedCalendar(raw, userId, horizonDays, options) {
    const sourceUpdatedAt = new Date().toISOString();
    const minDate = new Date();
    const maxDate = new Date(minDate);
    maxDate.setUTCDate(maxDate.getUTCDate() + horizonDays);
    if (isLikelyIcs(raw, options?.sourceUrl, options?.contentType)) {
        const blocks = parseIcsEvents(raw, userId, sourceUpdatedAt, minDate, maxDate);
        if (blocks.length === 0) {
            throw new Error('Could not parse events from ICS calendar feed. Check the ICS URL and try again.');
        }
        return blocks;
    }
    return parseOutlookPublishedHtml(raw, userId, horizonDays);
}
