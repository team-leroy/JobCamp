import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkEventDates() {
  try {
    console.log("=== Checking Event Dates ===");

    // Get all events
    const events = await prisma.event.findMany({
      include: {
        school: true,
        positions: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log(`Found ${events.length} events:`);

    for (const event of events) {
      console.log(`\nEvent ID: ${event.id}`);
      console.log(`School: ${event.school.name}`);
      console.log(`Event Date: ${event.date}`);
      console.log(`Display Lottery Results: ${event.displayLotteryResults}`);
      console.log(`Number of Positions: ${event.positions.length}`);

      // Count students who signed up for positions in this event
      let totalStudentChoices = 0;
      const studentSignups = new Set();

      for (const position of event.positions) {
        totalStudentChoices += position.students.length;
        for (const studentChoice of position.students) {
          studentSignups.add(studentChoice.studentId);
        }
      }

      console.log(`Total Student Choices: ${totalStudentChoices}`);
      console.log(`Unique Students with Choices: ${studentSignups.size}`);
    }

    console.log("\n=== Checking User Last Login Dates ===");

    // Get users with their last login dates
    const users = await prisma.user.findMany({
      include: {
        student: true,
        host: true,
      },
      orderBy: {
        lastLogin: "desc",
      },
    });

    console.log(`Found ${users.length} users:`);

    const studentUsers = users.filter((u) => u.student);
    const hostUsers = users.filter((u) => u.host);

    console.log(`Student Users: ${studentUsers.length}`);
    console.log(`Host Users: ${hostUsers.length}`);

    if (studentUsers.length > 0) {
      console.log("\nRecent Student Login Dates:");
      studentUsers.slice(0, 10).forEach((user) => {
        console.log(`- ${user.email}: ${user.lastLogin}`);
      });
    }

    console.log("\n=== Checking Lottery Results Creation Dates ===");

    // Get lottery results with creation dates
    const lotteryResults = await prisma.lotteryResults.findMany({
      include: {
        lotteryJob: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`Found ${lotteryResults.length} lottery results:`);

    if (lotteryResults.length > 0) {
      console.log("\nRecent Lottery Result Dates:");
      lotteryResults.slice(0, 10).forEach((result) => {
        console.log(
          `- Created: ${result.createdAt}, Job Started: ${result.lotteryJob.startedAt}`
        );
      });
    }
  } catch (error) {
    console.error("Error checking event dates:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEventDates();
