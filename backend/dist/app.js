import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { parsePublishedCalendar } from './outlookParser.js';
import { computeSuggestions, findProposalConflict } from './scheduler.js';
import { seedDemoDataIfEmpty } from './seeds.js';
import { loadDb, updateDb } from './store.js';
const HORIZON_DAYS = 14;
export async function buildApp() {
    const app = Fastify({ logger: true });
    await app.register(cors, { origin: true });
    const db = await loadDb();
    seedDemoDataIfEmpty(db);
    await updateDb(() => {
        // Persist seed if it was newly applied.
    });
    app.get('/health', async () => ({ ok: true }));
    app.post('/admin/reset', async () => {
        let reseededUsers = 0;
        await updateDb((dbToUpdate) => {
            dbToUpdate.users = [];
            dbToUpdate.availabilityBlocks = [];
            dbToUpdate.sharedSpaces = [];
            dbToUpdate.sharedSpaceMembers = [];
            dbToUpdate.proposals = [];
            dbToUpdate.importLogs = [];
            seedDemoDataIfEmpty(dbToUpdate);
            reseededUsers = dbToUpdate.users.length;
        });
        return { ok: true, reseededUsers };
    });
    app.get('/users', async () => {
        const current = await loadDb();
        return { users: current.users };
    });
    app.post('/users', async (request, reply) => {
        const body = request.body;
        const name = body.name?.trim();
        const email = body.email?.trim().toLowerCase();
        const timezone = body.timezone?.trim() || 'America/New_York';
        const outlookHtmlUrl = body.outlookHtmlUrl?.trim() ?? '';
        const calendarFileName = body.calendarFileName?.trim();
        const calendarFileContent = body.calendarFileContent?.trim();
        if (!name || !email) {
            reply.code(400);
            return { error: 'name and email are required' };
        }
        const hasUrl = outlookHtmlUrl.length > 0;
        const hasFile = Boolean(calendarFileContent);
        if (!hasUrl && !hasFile) {
            reply.code(400);
            return { error: 'Provide either a published calendar URL or an uploaded calendar file' };
        }
        if (hasUrl && !/^https?:\/\//i.test(outlookHtmlUrl)) {
            reply.code(400);
            return { error: 'outlookHtmlUrl must be a valid http/https URL' };
        }
        const createdAt = new Date().toISOString();
        const user = {
            id: randomUUID(),
            name,
            email,
            timezone,
            outlookHtmlUrl,
            calendarFileName,
            calendarFileContent,
            createdAt,
        };
        await updateDb((current) => {
            current.users.push(user);
        });
        return { user };
    });
    app.post('/users/:id/import', async (request, reply) => {
        const { id } = request.params;
        const current = await loadDb();
        const user = current.users.find((item) => item.id === id);
        if (!user) {
            reply.code(404);
            return { error: 'User not found' };
        }
        try {
            let feed = '';
            let sourceUrl = user.outlookHtmlUrl;
            let contentType;
            if (user.calendarFileContent) {
                feed = user.calendarFileContent;
                sourceUrl = user.calendarFileName ?? 'uploaded-calendar';
                contentType = user.calendarFileName?.toLowerCase().endsWith('.ics') ? 'text/calendar' : undefined;
            }
            else if (user.outlookHtmlUrl) {
                const response = await fetch(user.outlookHtmlUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch published calendar: HTTP ${response.status}`);
                }
                feed = await response.text();
                contentType = response.headers.get('content-type') ?? undefined;
            }
            else {
                throw new Error('No calendar source configured for this user');
            }
            const blocks = parsePublishedCalendar(feed, user.id, HORIZON_DAYS, {
                sourceUrl,
                contentType,
            });
            const importedAt = new Date().toISOString();
            await updateDb((dbToUpdate) => {
                dbToUpdate.availabilityBlocks = dbToUpdate.availabilityBlocks.filter((block) => block.userId !== user.id);
                dbToUpdate.availabilityBlocks.push(...blocks);
                const target = dbToUpdate.users.find((entry) => entry.id === user.id);
                if (target) {
                    target.lastImportAt = importedAt;
                }
                dbToUpdate.importLogs.push({
                    id: randomUUID(),
                    userId: user.id,
                    runAt: importedAt,
                    status: 'success',
                    message: `Imported ${blocks.length} blocks`,
                });
            });
            const refreshed = (await loadDb()).users.find((entry) => entry.id === user.id);
            return {
                user: refreshed,
                importedCount: blocks.length,
                blocks,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown import error';
            await updateDb((dbToUpdate) => {
                dbToUpdate.importLogs.push({
                    id: randomUUID(),
                    userId: user.id,
                    runAt: new Date().toISOString(),
                    status: 'error',
                    message,
                });
            });
            reply.code(422);
            return { error: message };
        }
    });
    app.get('/users/:id/availability', async (request, reply) => {
        const { id } = request.params;
        const days = Number(request.query.days ?? HORIZON_DAYS);
        const current = await loadDb();
        const user = current.users.find((item) => item.id === id);
        if (!user) {
            reply.code(404);
            return { error: 'User not found' };
        }
        const now = new Date();
        const horizon = new Date(now);
        horizon.setUTCDate(horizon.getUTCDate() + Math.max(1, Math.min(days, 31)));
        const blocks = current.availabilityBlocks
            .filter((block) => block.userId === id)
            .filter((block) => new Date(block.endAt) >= now && new Date(block.startAt) <= horizon)
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        return {
            user,
            blocks,
        };
    });
    app.get('/spaces', async () => {
        const current = await loadDb();
        return {
            spaces: current.sharedSpaces.map((space) => {
                const memberIds = current.sharedSpaceMembers
                    .filter((member) => member.spaceId === space.id)
                    .map((member) => member.userId);
                return {
                    ...space,
                    memberIds,
                };
            }),
        };
    });
    app.post('/spaces', async (request, reply) => {
        const body = request.body;
        const name = body.name?.trim();
        const ownerUserId = body.ownerUserId;
        const memberUserIds = body.memberUserIds ?? [];
        if (!name || !ownerUserId) {
            reply.code(400);
            return { error: 'name and ownerUserId are required' };
        }
        const current = await loadDb();
        const owner = current.users.find((user) => user.id === ownerUserId);
        if (!owner) {
            reply.code(400);
            return { error: 'ownerUserId does not exist' };
        }
        const dedupedMemberIds = Array.from(new Set([ownerUserId, ...memberUserIds]));
        const missingUserId = dedupedMemberIds.find((userId) => !current.users.some((user) => user.id === userId));
        if (missingUserId) {
            reply.code(400);
            return { error: `member user not found: ${missingUserId}` };
        }
        const createdAt = new Date().toISOString();
        const space = {
            id: randomUUID(),
            name,
            ownerUserId,
            createdAt,
        };
        const members = dedupedMemberIds.map((userId) => ({
            id: randomUUID(),
            spaceId: space.id,
            userId,
        }));
        await updateDb((dbToUpdate) => {
            dbToUpdate.sharedSpaces.push(space);
            dbToUpdate.sharedSpaceMembers.push(...members);
        });
        return {
            space,
            members,
        };
    });
    app.get('/spaces/:id/overlap', async (request, reply) => {
        const { id } = request.params;
        const query = request.query;
        const durationMin = Math.max(30, Math.min(Number(query.durationMin ?? 60), 120));
        const days = Math.max(1, Math.min(Number(query.days ?? HORIZON_DAYS), 31));
        const current = await loadDb();
        const space = current.sharedSpaces.find((entry) => entry.id === id);
        if (!space) {
            reply.code(404);
            return { error: 'Space not found' };
        }
        const memberIds = current.sharedSpaceMembers.filter((m) => m.spaceId === id).map((m) => m.userId);
        const members = current.users.filter((user) => memberIds.includes(user.id));
        const windowStart = new Date();
        const windowEnd = new Date(windowStart);
        windowEnd.setUTCDate(windowEnd.getUTCDate() + days);
        const suggestions = computeSuggestions({
            users: members,
            availabilityBlocks: current.availabilityBlocks,
            durationMin,
            window: { start: windowStart, end: windowEnd },
            limit: 3,
        });
        return {
            space,
            members,
            durationMin,
            suggestions,
        };
    });
    app.post('/spaces/:id/proposals', async (request, reply) => {
        const { id } = request.params;
        const body = request.body;
        if (!body.proposerUserId || !body.startAt) {
            reply.code(400);
            return { error: 'proposerUserId and startAt are required' };
        }
        let endAt = body.endAt;
        if (!endAt) {
            const durationMin = body.durationMin ?? 60;
            const end = new Date(body.startAt);
            end.setUTCMinutes(end.getUTCMinutes() + durationMin);
            endAt = end.toISOString();
        }
        const current = await loadDb();
        const space = current.sharedSpaces.find((entry) => entry.id === id);
        if (!space) {
            reply.code(404);
            return { error: 'Space not found' };
        }
        const memberIds = current.sharedSpaceMembers.filter((m) => m.spaceId === id).map((m) => m.userId);
        const members = current.users.filter((user) => memberIds.includes(user.id));
        const conflict = findProposalConflict({
            users: members,
            availabilityBlocks: current.availabilityBlocks,
            startAt: body.startAt,
            endAt,
        });
        const alternatives = computeSuggestions({
            users: members,
            availabilityBlocks: current.availabilityBlocks,
            durationMin: Math.round((new Date(endAt).getTime() - new Date(body.startAt).getTime()) / (60 * 1000)),
            window: {
                start: new Date(),
                end: (() => {
                    const d = new Date();
                    d.setUTCDate(d.getUTCDate() + HORIZON_DAYS);
                    return d;
                })(),
            },
            limit: 3,
        })
            .filter((slot) => slot.startAt !== body.startAt)
            .slice(0, 2)
            .map((slot) => slot.startAt);
        const proposal = {
            id: randomUUID(),
            spaceId: id,
            proposerUserId: body.proposerUserId,
            startAt: body.startAt,
            endAt,
            status: conflict.status,
            conflictingUserIds: conflict.conflictingUserIds,
            alternativeSlots: alternatives,
            createdAt: new Date().toISOString(),
        };
        await updateDb((dbToUpdate) => {
            dbToUpdate.proposals.push(proposal);
        });
        return { proposal };
    });
    return app;
}
