// Verify force delete cleanup by checking for leftover rows tied to deleted events
// Usage: node scripts/checkForceDelete.js [eventNameOptional]
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const targetName = process.argv[2]; // optional event name to check

  const summary = {};

  // 1) If targetName provided, verify event is gone
  if (targetName) {
    const events = await prisma.event.findMany({
      where: { name: targetName },
    });
    summary.eventByNameCount = events.length;
  }

  // 2) Generic integrity checks for orphaned references
  // Orphan positions (eventId that doesn't exist)
  const orphanPositions = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM Position p
    LEFT JOIN Event e ON e.id = p.eventId
    WHERE e.id IS NULL
  `);
  summary.orphanPositions = Number(orphanPositions?.[0]?.cnt ?? 0);

  // Orphan permission slips (eventId that doesn't exist)
  const orphanPermSlips = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM PermissionSlipSubmission s
    LEFT JOIN Event e ON e.id = s.eventId
    WHERE e.id IS NULL
  `);
  summary.orphanPermissionSlips = Number(orphanPermSlips?.[0]?.cnt ?? 0);

  // Orphan student participation (eventId that doesn't exist)
  const orphanParticipation = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM StudentEventParticipation sep
    LEFT JOIN Event e ON e.id = sep.eventId
    WHERE e.id IS NULL
  `);
  summary.orphanParticipation = Number(orphanParticipation?.[0]?.cnt ?? 0);

  // Orphan important dates (eventId that doesn't exist)
  const orphanDates = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM ImportantDate d
    LEFT JOIN Event e ON e.id = d.eventId
    WHERE e.id IS NULL
  `);
  summary.orphanImportantDates = Number(orphanDates?.[0]?.cnt ?? 0);

  // Lottery jobs with no event
  const orphanLotteryJobs = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM LotteryJob lj
    LEFT JOIN Event e ON e.id = lj.eventId
    WHERE e.id IS NULL
  `);
  summary.orphanLotteryJobs = Number(orphanLotteryJobs?.[0]?.cnt ?? 0);

  // PositionsOnStudents for positions that don't exist
  const orphanPosOnStudents = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM PositionsOnStudents ps
    LEFT JOIN Position p ON p.id = ps.positionId
    WHERE p.id IS NULL
  `);
  summary.orphanPositionsOnStudents = Number(
    orphanPosOnStudents?.[0]?.cnt ?? 0
  );

  // ManualAssignment for positions that don't exist
  const orphanManualAssignments = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM ManualAssignment ma
    LEFT JOIN Position p ON p.id = ma.positionId
    WHERE p.id IS NULL
  `);
  summary.orphanManualAssignments = Number(
    orphanManualAssignments?.[0]?.cnt ?? 0
  );

  // PrefillSetting for positions that don't exist
  const orphanPrefill = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM PrefillSetting pf
    LEFT JOIN Position p ON p.id = pf.positionId
    WHERE p.id IS NULL
  `);
  summary.orphanPrefillSettings = Number(orphanPrefill?.[0]?.cnt ?? 0);

  // Attachments for positions that don't exist
  const orphanAttachments = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM Attachment a
    LEFT JOIN Position p ON p.id = a.positionId
    WHERE p.id IS NULL
  `);
  summary.orphanAttachments = Number(orphanAttachments?.[0]?.cnt ?? 0);

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
