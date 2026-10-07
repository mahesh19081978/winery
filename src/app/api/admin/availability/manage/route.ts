import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireApiPermission } from '@/lib/auth/permissions';

const createRuleSchema = z.object({
  experienceId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  capacity: z.number().int().min(1),
  isActive: z.boolean().optional().default(true),
});

const updateRuleSchema = z.object({
  id: z.string().uuid(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  capacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

const generateRulesSchema = z.object({
  experienceId: z.string().uuid(),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
  intervalMinutes: z.number().int().min(15),
  capacity: z.number().int().min(1),
  isActive: z.boolean().optional().default(true),
});

const createOverrideSchema = z.object({
  experienceId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  capacity: z.number().int().min(0),
  isBlocked: z.boolean().optional().default(false),
  reason: z.string().optional().nullable(),
});

const updateOverrideSchema = z.object({
  id: z.string().uuid(),
  capacity: z.number().int().min(0).optional(),
  isBlocked: z.boolean().optional(),
  reason: z.string().optional().nullable(),
});

const createClosureSchema = z.object({
  experienceId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  reason: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('availability.manage');
    if (!guard.ok) return guard.response;
    const session = guard.session;

    // Get the winery context from the authenticated user's session
    let wineryId = session.wineryId;
    if (!wineryId) {
      // Fallback for SUPER_ADMIN without a specific assigned winery
      const defaultWinery = await prisma.winery.findFirst();
      if (!defaultWinery) {
        return NextResponse.json({ success: false, error: 'No winery found in system' }, { status: 500 });
      }
      wineryId = defaultWinery.id;
    }

    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      case 'CREATE_RULE': {
        const parsed = createRuleSchema.parse(payload);
        
        // Verify experience belongs to winery
        const exp = await prisma.experience.findUnique({ where: { id: parsed.experienceId } });
        if (!exp || exp.wineryId !== wineryId) {
          return NextResponse.json({ success: false, error: 'Experience not found or unauthorized' }, { status: 403 });
        }

        // Check if rule already exists for this day and time
        const exists = await prisma.availabilityRule.findUnique({
          where: { experienceId_dayOfWeek_time: { experienceId: parsed.experienceId, dayOfWeek: parsed.dayOfWeek, time: parsed.time } }
        });
        if (exists) {
          return NextResponse.json({ success: false, error: 'Rule already exists for this time' }, { status: 400 });
        }
        try {
          const rule = await prisma.availabilityRule.create({
            data: { wineryId, experienceId: parsed.experienceId, dayOfWeek: parsed.dayOfWeek, time: parsed.time, capacity: parsed.capacity, isActive: parsed.isActive }
          });
          return NextResponse.json({ success: true, data: rule });
        } catch (createErr: unknown) {
          if (typeof createErr === 'object' && createErr !== null && 'code' in createErr && (createErr as { code: string }).code === 'P2002') {
            return NextResponse.json({ success: false, error: 'Rule already exists for this time' }, { status: 400 });
          }
          throw createErr;
        }
      }

      case 'UPDATE_RULE': {
        const parsed = updateRuleSchema.parse(payload);
        const existing = await prisma.availabilityRule.findUnique({ where: { id: parsed.id } });
        
        if (!existing || existing.wineryId !== wineryId) {
          return NextResponse.json({ success: false, error: 'Rule not found or unauthorized' }, { status: 403 });
        }

        // Check duplicates if changing time
        if (parsed.time && existing.time !== parsed.time) {
          const conflict = await prisma.availabilityRule.findUnique({
            where: { experienceId_dayOfWeek_time: { experienceId: existing.experienceId, dayOfWeek: existing.dayOfWeek, time: parsed.time } }
          });
          if (conflict) {
            return NextResponse.json({ success: false, error: 'Rule already exists for this time' }, { status: 400 });
          }
        }
        try {
          const rule = await prisma.availabilityRule.update({
            where: { id: parsed.id },
            data: { 
              ...(parsed.time !== undefined && { time: parsed.time }),
              ...(parsed.capacity !== undefined && { capacity: parsed.capacity }),
              ...(parsed.isActive !== undefined && { isActive: parsed.isActive })
            }
          });
          return NextResponse.json({ success: true, data: rule });
        } catch (updateErr: unknown) {
          if (typeof updateErr === 'object' && updateErr !== null && 'code' in updateErr && (updateErr as { code: string }).code === 'P2002') {
            return NextResponse.json({ success: false, error: 'Rule already exists for this time' }, { status: 400 });
          }
          throw updateErr;
        }
      }

      case 'DELETE_RULE': {
        const { id } = z.object({ id: z.string().uuid() }).parse(payload);
        const existing = await prisma.availabilityRule.findUnique({ where: { id } });
        if (!existing || existing.wineryId !== wineryId) {
          return NextResponse.json({ success: false, error: 'Rule not found or unauthorized' }, { status: 403 });
        }
        await prisma.availabilityRule.delete({ where: { id } });
        return NextResponse.json({ success: true });
      }

      case 'GENERATE_RULES': {
        const parsed = generateRulesSchema.parse(payload);
        
        const exp = await prisma.experience.findUnique({ where: { id: parsed.experienceId } });
        if (!exp || exp.wineryId !== wineryId) {
          return NextResponse.json({ success: false, error: 'Experience not found or unauthorized' }, { status: 403 });
        }

        let count = 0;
        for (let day = 0; day <= 6; day++) {
          let currentMins = parsed.startHour * 60;
          const endMins = parsed.endHour * 60;
          while (currentMins <= endMins) {
            const h = Math.floor(currentMins / 60).toString().padStart(2, '0');
            const m = (currentMins % 60).toString().padStart(2, '0');
            const timeStr = `${h}:${m}`;

            // Upsert rule: if rule already exists for this day/time, leave its capacity/isActive untouched,
            // preserving existing customization while creating missing slots safely.
            await prisma.availabilityRule.upsert({
              where: {
                experienceId_dayOfWeek_time: {
                  experienceId: parsed.experienceId,
                  dayOfWeek: day,
                  time: timeStr,
                },
              },
              create: {
                wineryId,
                experienceId: parsed.experienceId,
                dayOfWeek: day,
                time: timeStr,
                capacity: parsed.capacity,
                isActive: parsed.isActive,
              },
              update: {},
            });
            count++;

            currentMins += parsed.intervalMinutes;
          }
        }
        return NextResponse.json({ success: true, count });
      }

      case 'CREATE_OVERRIDE': {
        const parsed = createOverrideSchema.parse(payload);
        
        const exp = await prisma.experience.findUnique({ where: { id: parsed.experienceId } });
        if (!exp || exp.wineryId !== wineryId) {
          return NextResponse.json({ success: false, error: 'Experience not found or unauthorized' }, { status: 403 });
        }

        const dateObj = new Date(parsed.date);
        const exists = await prisma.timeSlotOverride.findUnique({
          where: { experienceId_date_time: { experienceId: parsed.experienceId, date: dateObj, time: parsed.time } }
        });
        if (exists) {
          return NextResponse.json({ success: false, error: 'Override already exists for this time' }, { status: 400 });
        }
        const override = await prisma.timeSlotOverride.create({
          data: { experienceId: parsed.experienceId, date: dateObj, time: parsed.time, capacity: parsed.capacity, isBlocked: parsed.isBlocked, reason: parsed.reason }
        });
        return NextResponse.json({ success: true, data: override });
      }

      case 'UPDATE_OVERRIDE': {
        const parsed = updateOverrideSchema.parse(payload);
        const existing = await prisma.timeSlotOverride.findUnique({ 
          where: { id: parsed.id },
          include: { experience: true }
        });
        
        if (!existing || existing.experience.wineryId !== wineryId) {
          return NextResponse.json({ success: false, error: 'Override not found or unauthorized' }, { status: 403 });
        }

        const override = await prisma.timeSlotOverride.update({
          where: { id: parsed.id },
          data: { 
            ...(parsed.capacity !== undefined && { capacity: parsed.capacity }),
            ...(parsed.isBlocked !== undefined && { isBlocked: parsed.isBlocked }),
            ...(parsed.reason !== undefined && { reason: parsed.reason })
          }
        });
        return NextResponse.json({ success: true, data: override });
      }

      case 'DELETE_OVERRIDE': {
        const { id } = z.object({ id: z.string().uuid() }).parse(payload);
        const existing = await prisma.timeSlotOverride.findUnique({ 
          where: { id },
          include: { experience: true } 
        });
        if (!existing || existing.experience.wineryId !== wineryId) {
          return NextResponse.json({ success: false, error: 'Override not found or unauthorized' }, { status: 403 });
        }
        await prisma.timeSlotOverride.delete({ where: { id } });
        return NextResponse.json({ success: true });
      }

      case 'CREATE_CLOSURE': {
        const parsed = createClosureSchema.parse(payload);
        const exp = await prisma.experience.findUnique({ where: { id: parsed.experienceId } });
        if (!exp || exp.wineryId !== wineryId) {
          return NextResponse.json({ success: false, error: 'Experience not found or unauthorized' }, { status: 403 });
        }

        const dateObj = new Date(parsed.date);
        const exists = await prisma.experienceClosure.findUnique({
          where: { experienceId_date: { experienceId: parsed.experienceId, date: dateObj } }
        });
        if (exists) {
          return NextResponse.json({ success: false, error: 'Closure already exists for this date' }, { status: 400 });
        }
        const closure = await prisma.experienceClosure.create({
          data: { experienceId: parsed.experienceId, date: dateObj, reason: parsed.reason }
        });
        return NextResponse.json({ success: true, data: closure });
      }

      case 'DELETE_CLOSURE': {
        const { id } = z.object({ id: z.string().uuid() }).parse(payload);
        const existing = await prisma.experienceClosure.findUnique({ 
          where: { id },
          include: { experience: true }
        });
        if (!existing || existing.experience.wineryId !== wineryId) {
          return NextResponse.json({ success: false, error: 'Closure not found or unauthorized' }, { status: 403 });
        }
        await prisma.experienceClosure.delete({ where: { id } });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: (error as z.ZodError).flatten().fieldErrors }, { status: 400 });
    }
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
