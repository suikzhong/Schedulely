import { buildApp } from './app.js';
import { parsePublishedCalendar } from './outlookParser.js';
function toIcsTimestamp(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
const app = await buildApp();
const health = await app.inject({ method: 'GET', path: '/health' });
if (health.statusCode !== 200) {
    throw new Error('Health check failed');
}
const usersRes = await app.inject({ method: 'GET', path: '/users' });
if (usersRes.statusCode !== 200) {
    throw new Error('Users endpoint failed');
}
const users = usersRes.json().users;
if (users.length < 2) {
    throw new Error('Expected seeded users for demo');
}
const ownerId = users[0].id;
const memberUserIds = users.slice(1, 3).map((u) => u.id);
const firstEventStart = new Date();
firstEventStart.setUTCDate(firstEventStart.getUTCDate() + 1);
firstEventStart.setUTCHours(16, 0, 0, 0);
const firstEventEnd = new Date(firstEventStart);
firstEventEnd.setUTCMinutes(firstEventEnd.getUTCMinutes() + 60);
const secondEventStart = new Date();
secondEventStart.setUTCDate(secondEventStart.getUTCDate() + 2);
secondEventStart.setUTCHours(18, 0, 0, 0);
const secondEventEnd = new Date(secondEventStart);
secondEventEnd.setUTCMinutes(secondEventEnd.getUTCMinutes() + 30);
const icsSample = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${toIcsTimestamp(firstEventStart)}
DTEND:${toIcsTimestamp(firstEventEnd)}
SUMMARY:Demo Event 1
END:VEVENT
BEGIN:VEVENT
DTSTART:${toIcsTimestamp(secondEventStart)}
DTEND:${toIcsTimestamp(secondEventEnd)}
SUMMARY:Demo Event 2
END:VEVENT
END:VCALENDAR`;
const parsedIcs = parsePublishedCalendar(icsSample, ownerId, 14, {
    sourceUrl: 'https://example.com/demo.ics',
    contentType: 'text/calendar; charset=utf-8',
});
if (parsedIcs.length !== 2) {
    throw new Error('ICS parser smoke check failed');
}
const createSpaceRes = await app.inject({
    method: 'POST',
    path: '/spaces',
    payload: {
        name: 'Smoke Space',
        ownerUserId: ownerId,
        memberUserIds,
    },
});
if (createSpaceRes.statusCode !== 200) {
    throw new Error('Create space failed');
}
const spaceId = createSpaceRes.json().space.id;
const overlapRes = await app.inject({
    method: 'GET',
    path: `/spaces/${spaceId}/overlap?durationMin=60&days=7`,
});
if (overlapRes.statusCode !== 200) {
    throw new Error('Overlap endpoint failed');
}
const overlap = overlapRes.json();
if (overlap.suggestions.length === 0) {
    throw new Error('Expected at least one overlap suggestion');
}
const firstSlot = overlap.suggestions[0];
const proposalRes = await app.inject({
    method: 'POST',
    path: `/spaces/${spaceId}/proposals`,
    payload: {
        proposerUserId: ownerId,
        startAt: firstSlot.startAt,
        endAt: firstSlot.endAt,
    },
});
if (proposalRes.statusCode !== 200) {
    throw new Error('Proposal endpoint failed');
}
const resetRes = await app.inject({
    method: 'POST',
    path: '/admin/reset',
});
if (resetRes.statusCode !== 200) {
    throw new Error('Reset endpoint failed');
}
const usersAfterReset = await app.inject({ method: 'GET', path: '/users' });
if (usersAfterReset.statusCode !== 200 || usersAfterReset.json().users.length < 3) {
    throw new Error('Reset did not reseed demo users');
}
console.log('Smoke test passed: health, users, spaces, overlap, proposals, reset');
await app.close();
