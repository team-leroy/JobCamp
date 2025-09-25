import { PrismaClient } from "@prisma/client";
import { FirebaseScrypt } from "firebase-scrypt";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const firebaseHashingParams = {
  memCost: 14,
  rounds: 8,
  saltSeparator: "Bw==",
  signerKey:
    "gdShl9G7k68tQK/PsKz6bExGdaQ2l0/w6LXWoEjpWxAjn/bYGoSZXz2byS9hTi57iMwX65iLUaHdySmIhwOB4w==",
};

const scrypt = new FirebaseScrypt(firebaseHashingParams);

// Helper function to create a user with hashed password
async function createUser(email, password, lastLogin = new Date()) {
  const passwordSalt = crypto.randomBytes(16).toString("base64");
  const passwordHash = await scrypt.hash(password, passwordSalt);

  return await prisma.user.upsert({
    where: { email },
    update: { lastLogin },
    create: {
      email,
      passwordHash,
      passwordSalt,
      emailVerified: true,
      lastLogin,
    },
  });
}

// Helper function to create student
async function createStudent(userData, schoolId) {
  const user = await createUser(userData.email, userData.password);

  return await prisma.student.create({
    data: {
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      grade: userData.grade,
      parentEmail: userData.parentEmail,
      permissionSlipCompleted: userData.permissionSlipCompleted || false,
      schoolId: schoolId,
      userId: user.id,
    },
  });
}

// Helper function to create company host
async function createCompanyHost(hostData, companyData, schoolId) {
  const user = await createUser(
    hostData.email,
    hostData.password,
    hostData.lastLogin
  );

  const host = await prisma.host.create({
    data: {
      name: hostData.name,
      userId: user.id,
    },
  });

  const company = await prisma.company.upsert({
    where: { companyName: companyData.companyName },
    update: {
      hosts: { connect: { id: host.id } },
    },
    create: {
      companyName: companyData.companyName,
      companyDescription: companyData.companyDescription,
      companyUrl: companyData.companyUrl,
      schoolId: schoolId,
      hosts: { connect: { id: host.id } },
    },
  });

  return { host, company };
}

// Helper function to create position
async function createPosition(positionData, eventId, hostId) {
  return await prisma.position.create({
    data: {
      title: positionData.title,
      career: positionData.career,
      slots: positionData.slots,
      summary: positionData.summary,
      contact_name: positionData.contact_name,
      contact_email: positionData.contact_email,
      address: positionData.address,
      instructions: positionData.instructions,
      attire: positionData.attire,
      arrival: positionData.arrival,
      start: positionData.start,
      end: positionData.end,
      eventId: eventId,
      hostId: hostId,
    },
  });
}

// Helper function to create student position selections
async function createStudentSelections(studentId, positionIds, ranks) {
  const selections = [];
  for (let i = 0; i < positionIds.length && i < ranks.length; i++) {
    selections.push({
      studentId: studentId,
      positionId: positionIds[i],
      rank: ranks[i],
    });
  }

  if (selections.length > 0) {
    await prisma.positionsOnStudents.createMany({
      data: selections,
    });
  }
}

async function main() {
  console.log("🗄️  Starting test data population...");

  // ===== 1. SETUP SCHOOL AND ADMINS =====
  console.log("\n📚 Setting up school and admin users...");

  // Create admin users
  const admin1 = await createUser("hleroy73+admin@gmail.com", "Luthje33");
  const admin2 = await createUser("leroy.dave+admin@gmail.com", "chestnw3gard");

  // Find or create school
  let school = await prisma.school.findFirst({
    where: { name: "Los Gatos High School" },
  });

  if (!school) {
    school = await prisma.school.create({
      data: {
        name: "Los Gatos High School",
        emailDomain: "lghs.net",
        webAddr: "lghs",
      },
    });
  }

  // Connect admins to school
  await prisma.school.update({
    where: { id: school.id },
    data: {
      admins: {
        connect: [{ id: admin1.id }, { id: admin2.id }],
      },
    },
  });

  // ===== 2. ARCHIVED EVENT #1 (FALL 2023) =====
  console.log("\n🍂 Creating Archived Event #1: Fall 2023 Job Shadow...");

  const event1 = await prisma.event.create({
    data: {
      name: "Fall 2023 Job Shadow Day",
      date: new Date("2023-11-15"),
      schoolId: school.id,
      isActive: false, // Archived event, not active
      isArchived: true,
      displayLotteryResults: true,
    },
  });

  // Companies for Event 1 (Base set)
  const companies1 = [
    {
      host: {
        name: "Sarah Johnson",
        email: "sarah@techstart.com",
        password: "test123",
        lastLogin: new Date("2023-10-15"),
      },
      company: {
        companyName: "TechStart Solutions",
        companyDescription: "Innovative software development company",
        companyUrl: "https://techstart.com",
      },
    },
    {
      host: {
        name: "Mike Chen",
        email: "mike@greenhealth.com",
        password: "test123",
        lastLogin: new Date("2023-10-20"),
      },
      company: {
        companyName: "GreenHealth Medical",
        companyDescription: "Healthcare technology and services",
        companyUrl: "https://greenhealth.com",
      },
    },
    {
      host: {
        name: "Lisa Rodriguez",
        email: "lisa@creativedesign.com",
        password: "test123",
        lastLogin: new Date("2023-10-25"),
      },
      company: {
        companyName: "Creative Design Studio",
        companyDescription: "Digital marketing and design agency",
        companyUrl: "https://creativedesign.com",
      },
    },
    {
      host: {
        name: "David Kim",
        email: "david@financefirst.com",
        password: "test123",
        lastLogin: new Date("2023-11-01"),
      },
      company: {
        companyName: "Finance First Advisors",
        companyDescription: "Financial planning and investment services",
        companyUrl: "https://financefirst.com",
      },
    },
  ];

  const event1Companies = [];
  for (const companyData of companies1) {
    const { host, company } = await createCompanyHost(
      companyData.host,
      companyData.company,
      school.id
    );
    event1Companies.push({ host, company });
  }

  // Positions for Event 1
  const positions1 = [
    {
      title: "Software Developer Intern",
      career: "Technology",
      slots: 3,
      contact_name: "Sarah Johnson",
      contact_email: "sarah@techstart.com",
      address: "123 Tech Ave, San Jose, CA",
      summary: "Learn software development in a startup environment",
      instructions: "Bring laptop and enthusiasm",
      attire: "Casual",
      arrival: "9:00 AM",
      start: "9:15 AM",
      end: "3:00 PM",
    },
    {
      title: "UX Designer Shadow",
      career: "Technology",
      slots: 2,
      contact_name: "Sarah Johnson",
      contact_email: "sarah@techstart.com",
      address: "123 Tech Ave, San Jose, CA",
      summary: "Shadow our UX team designing user interfaces",
      instructions: "Interest in design helpful",
      attire: "Casual",
      arrival: "9:00 AM",
      start: "9:15 AM",
      end: "3:00 PM",
    },
    {
      title: "Medical Assistant",
      career: "Healthcare",
      slots: 4,
      contact_name: "Mike Chen",
      contact_email: "mike@greenhealth.com",
      address: "456 Health Blvd, Los Gatos, CA",
      summary: "Experience healthcare operations",
      instructions: "Must have completed health form",
      attire: "Business casual",
      arrival: "8:30 AM",
      start: "9:00 AM",
      end: "2:30 PM",
    },
    {
      title: "Graphic Designer",
      career: "Arts & Media",
      slots: 2,
      contact_name: "Lisa Rodriguez",
      contact_email: "lisa@creativedesign.com",
      address: "789 Creative St, Campbell, CA",
      summary: "Work on real client projects",
      instructions: "Portfolio review session included",
      attire: "Creative casual",
      arrival: "10:00 AM",
      start: "10:15 AM",
      end: "4:00 PM",
    },
    {
      title: "Financial Analyst",
      career: "Business & Finance",
      slots: 3,
      contact_name: "David Kim",
      contact_email: "david@financefirst.com",
      address: "321 Money Ln, Saratoga, CA",
      summary: "Learn financial planning and analysis",
      instructions: "Math skills helpful",
      attire: "Business professional",
      arrival: "8:00 AM",
      start: "8:30 AM",
      end: "2:00 PM",
    },
  ];

  const event1Positions = [];
  for (let i = 0; i < positions1.length; i++) {
    const position = await createPosition(
      positions1[i],
      event1.id,
      event1Companies[i % event1Companies.length].host.id
    );
    event1Positions.push(position);
  }

  // Students for Event 1 (Base set)
  const students1 = [
    {
      firstName: "Emma",
      lastName: "Wilson",
      email: "emma.wilson@student.lghs.net",
      phone: "555-0101",
      grade: 12,
      parentEmail: "parent.wilson@email.com",
      password: "student123",
      permissionSlipCompleted: true,
    },
    {
      firstName: "Liam",
      lastName: "Brown",
      email: "liam.brown@student.lghs.net",
      phone: "555-0102",
      grade: 11,
      parentEmail: "parent.brown@email.com",
      password: "student123",
      permissionSlipCompleted: true,
    },
    {
      firstName: "Sophia",
      lastName: "Davis",
      email: "sophia.davis@student.lghs.net",
      phone: "555-0103",
      grade: 10,
      parentEmail: "parent.davis@email.com",
      password: "student123",
      permissionSlipCompleted: true,
    },
    {
      firstName: "Noah",
      lastName: "Miller",
      email: "noah.miller@student.lghs.net",
      phone: "555-0104",
      grade: 9,
      parentEmail: "parent.miller@email.com",
      password: "student123",
      permissionSlipCompleted: false,
    },
    {
      firstName: "Olivia",
      lastName: "Garcia",
      email: "olivia.garcia@student.lghs.net",
      phone: "555-0105",
      grade: 12,
      parentEmail: "parent.garcia@email.com",
      password: "student123",
      permissionSlipCompleted: true,
    },
    {
      firstName: "James",
      lastName: "Martinez",
      email: "james.martinez@student.lghs.net",
      phone: "555-0106",
      grade: 11,
      parentEmail: "parent.martinez@email.com",
      password: "student123",
      permissionSlipCompleted: true,
    },
    {
      firstName: "Ava",
      lastName: "Anderson",
      email: "ava.anderson@student.lghs.net",
      phone: "555-0107",
      grade: 10,
      parentEmail: "parent.anderson@email.com",
      password: "student123",
      permissionSlipCompleted: true,
    },
    {
      firstName: "Lucas",
      lastName: "Taylor",
      email: "lucas.taylor@student.lghs.net",
      phone: "555-0108",
      grade: 9,
      parentEmail: "parent.taylor@email.com",
      password: "student123",
      permissionSlipCompleted: false,
    },
  ];

  const event1Students = [];
  for (const studentData of students1) {
    const student = await createStudent(studentData, school.id);
    event1Students.push(student);
  }

  // Create student position selections for Event 1
  await createStudentSelections(
    event1Students[0].id,
    [event1Positions[0].id, event1Positions[3].id, event1Positions[1].id],
    [1, 2, 3]
  );
  await createStudentSelections(
    event1Students[1].id,
    [event1Positions[1].id, event1Positions[4].id],
    [1, 2]
  );
  await createStudentSelections(
    event1Students[2].id,
    [event1Positions[2].id, event1Positions[3].id, event1Positions[0].id],
    [1, 2, 3]
  );
  await createStudentSelections(
    event1Students[4].id,
    [event1Positions[4].id, event1Positions[2].id],
    [1, 2]
  );
  await createStudentSelections(
    event1Students[5].id,
    [event1Positions[0].id, event1Positions[1].id, event1Positions[3].id],
    [1, 2, 3]
  );
  await createStudentSelections(
    event1Students[6].id,
    [event1Positions[3].id, event1Positions[2].id],
    [1, 2]
  );

  // Simulate lottery results for Event 1
  await prisma.student.update({
    where: { id: event1Students[0].id },
    data: { lotteryPositionId: event1Positions[0].id },
  });
  await prisma.student.update({
    where: { id: event1Students[1].id },
    data: { lotteryPositionId: event1Positions[1].id },
  });
  await prisma.student.update({
    where: { id: event1Students[2].id },
    data: { lotteryPositionId: event1Positions[2].id },
  });
  await prisma.student.update({
    where: { id: event1Students[4].id },
    data: { lotteryPositionId: event1Positions[4].id },
  });
  await prisma.student.update({
    where: { id: event1Students[5].id },
    data: { lotteryPositionId: event1Positions[0].id },
  });

  // ===== 3. ARCHIVED EVENT #2 (SPRING 2024) =====
  console.log("\n🌸 Creating Archived Event #2: Spring 2024 Job Shadow...");

  const event2 = await prisma.event.create({
    data: {
      name: "Spring 2024 Career Exploration",
      date: new Date("2024-04-20"),
      schoolId: school.id,
      isActive: false, // Archived event, not active
      isArchived: true,
      displayLotteryResults: true,
    },
  });

  // Additional companies for Event 2 (mix of old and new)
  const companies2 = [
    // Returning companies (will reuse existing)
    ...event1Companies.slice(0, 2), // TechStart and GreenHealth return
    // New companies
    {
      host: {
        name: "Jennifer Walsh",
        email: "jennifer@edunova.com",
        password: "test123",
        lastLogin: new Date("2024-03-15"),
      },
      company: {
        companyName: "EduNova Learning",
        companyDescription: "Educational technology and curriculum development",
        companyUrl: "https://edunova.com",
      },
    },
    {
      host: {
        name: "Robert Chen",
        email: "robert@buildright.com",
        password: "test123",
        lastLogin: new Date("2024-03-20"),
      },
      company: {
        companyName: "BuildRight Construction",
        companyDescription: "Sustainable construction and architecture",
        companyUrl: "https://buildright.com",
      },
    },
    {
      host: {
        name: "Amanda Foster",
        email: "amanda@lawpartners.com",
        password: "test123",
        lastLogin: new Date("2024-04-01"),
      },
      company: {
        companyName: "Foster & Associates Law",
        companyDescription: "Corporate and family law practice",
        companyUrl: "https://lawpartners.com",
      },
    },
  ];

  const event2Companies = [...event1Companies.slice(0, 2)]; // Reuse first 2
  for (let i = 2; i < companies2.length; i++) {
    const { host, company } = await createCompanyHost(
      companies2[i].host,
      companies2[i].company,
      school.id
    );
    event2Companies.push({ host, company });
  }

  // Positions for Event 2 (mix of carried forward and new)
  const positions2 = [
    // Carried forward positions (modified)
    {
      title: "Software Developer Intern",
      career: "Technology",
      slots: 4,
      contact_name: "Sarah Johnson",
      contact_email: "sarah@techstart.com",
      address: "123 Tech Ave, San Jose, CA",
      summary: "Advanced software development internship",
      instructions: "Bring laptop and enthusiasm",
      attire: "Casual",
      arrival: "9:00 AM",
      start: "9:15 AM",
      end: "3:00 PM",
    },
    {
      title: "Nurse Assistant",
      career: "Healthcare",
      slots: 3,
      contact_name: "Mike Chen",
      contact_email: "mike@greenhealth.com",
      address: "456 Health Blvd, Los Gatos, CA",
      summary: "Clinical healthcare experience",
      instructions: "Health clearance required",
      attire: "Scrubs provided",
      arrival: "8:30 AM",
      start: "9:00 AM",
      end: "2:30 PM",
    },
    // New positions
    {
      title: "Curriculum Designer",
      career: "Education",
      slots: 2,
      contact_name: "Jennifer Walsh",
      contact_email: "jennifer@edunova.com",
      address: "654 Education Way, San Jose, CA",
      summary: "Design engaging educational content",
      instructions: "Teaching interest helpful",
      attire: "Business casual",
      arrival: "9:00 AM",
      start: "9:15 AM",
      end: "3:30 PM",
    },
    {
      title: "Architect Assistant",
      career: "Engineering",
      slots: 3,
      contact_name: "Robert Chen",
      contact_email: "robert@buildright.com",
      address: "987 Builder Rd, Campbell, CA",
      summary: "Learn sustainable building design",
      instructions: "Hard hat provided",
      attire: "Work clothes",
      arrival: "7:30 AM",
      start: "8:00 AM",
      end: "2:00 PM",
    },
    {
      title: "Paralegal Shadow",
      career: "Government & Law",
      slots: 2,
      contact_name: "Amanda Foster",
      contact_email: "amanda@lawpartners.com",
      address: "555 Justice Ave, Los Gatos, CA",
      summary: "Experience legal research and case work",
      instructions: "Confidentiality agreement required",
      attire: "Business professional",
      arrival: "8:30 AM",
      start: "9:00 AM",
      end: "3:00 PM",
    },
  ];

  const event2Positions = [];
  for (let i = 0; i < positions2.length; i++) {
    const position = await createPosition(
      positions2[i],
      event2.id,
      event2Companies[i].host.id
    );
    event2Positions.push(position);
  }

  // Additional students for Event 2 (mix of returning and new)
  const students2New = [
    {
      firstName: "Ethan",
      lastName: "Johnson",
      email: "ethan.johnson@student.lghs.net",
      phone: "555-0201",
      grade: 11,
      parentEmail: "parent.johnson@email.com",
      password: "student123",
      permissionSlipCompleted: true,
    },
    {
      firstName: "Isabella",
      lastName: "Williams",
      email: "isabella.williams@student.lghs.net",
      phone: "555-0202",
      grade: 10,
      parentEmail: "parent.williams@email.com",
      password: "student123",
      permissionSlipCompleted: true,
    },
    {
      firstName: "Mason",
      lastName: "Jones",
      email: "mason.jones@student.lghs.net",
      phone: "555-0203",
      grade: 9,
      parentEmail: "parent.jones@email.com",
      password: "student123",
      permissionSlipCompleted: false,
    },
    {
      firstName: "Mia",
      lastName: "Smith",
      email: "mia.smith@student.lghs.net",
      phone: "555-0204",
      grade: 12,
      parentEmail: "parent.smith@email.com",
      password: "student123",
      permissionSlipCompleted: true,
    },
  ];

  const event2StudentsNew = [];
  for (const studentData of students2New) {
    const student = await createStudent(studentData, school.id);
    event2StudentsNew.push(student);
  }

  // Combine returning students (subset) with new students
  const event2Students = [...event1Students.slice(0, 5), ...event2StudentsNew]; // 5 returning + 4 new

  // Create student position selections for Event 2
  await createStudentSelections(
    event2Students[0].id,
    [event2Positions[0].id, event2Positions[2].id],
    [1, 2]
  ); // Emma - returning
  await createStudentSelections(
    event2Students[1].id,
    [event2Positions[1].id, event2Positions[4].id, event2Positions[0].id],
    [1, 2, 3]
  ); // Liam - returning
  await createStudentSelections(
    event2Students[5].id,
    [event2Positions[2].id, event2Positions[3].id],
    [1, 2]
  ); // Ethan - new
  await createStudentSelections(
    event2Students[6].id,
    [event2Positions[3].id, event2Positions[1].id, event2Positions[4].id],
    [1, 2, 3]
  ); // Isabella - new
  await createStudentSelections(
    event2Students[8].id,
    [event2Positions[4].id, event2Positions[2].id],
    [1, 2]
  ); // Mia - new

  // Simulate lottery results for Event 2
  await prisma.student.update({
    where: { id: event2Students[0].id },
    data: { lotteryPositionId: event2Positions[0].id },
  });
  await prisma.student.update({
    where: { id: event2Students[1].id },
    data: { lotteryPositionId: event2Positions[1].id },
  });
  await prisma.student.update({
    where: { id: event2Students[5].id },
    data: { lotteryPositionId: event2Positions[2].id },
  });
  await prisma.student.update({
    where: { id: event2Students[6].id },
    data: { lotteryPositionId: event2Positions[3].id },
  });
  await prisma.student.update({
    where: { id: event2Students[8].id },
    data: { lotteryPositionId: event2Positions[4].id },
  });

  // ===== 4. ACTIVE EVENT (FALL 2024) =====
  console.log("\n🍂 Creating Active Event: Fall 2024 Job Shadow...");

  const activeEvent = await prisma.event.create({
    data: {
      name: "Fall 2024 Career Day",
      date: new Date("2024-11-18"),
      schoolId: school.id,
      isActive: true, // This is the only active event
      isArchived: false,
      displayLotteryResults: false,
    },
  });

  // Active event companies (mix of returning and new)
  const activeCompanies = [
    ...event2Companies.slice(0, 3), // Reuse TechStart, GreenHealth, EduNova
    // New company for active event
    {
      host: {
        name: "Maria Gonzalez",
        email: "maria@dataviz.com",
        password: "test123",
        lastLogin: new Date(),
      },
      company: {
        companyName: "DataViz Analytics",
        companyDescription: "Data science and business intelligence",
        companyUrl: "https://dataviz.com",
      },
    },
  ];

  const activeEventCompanies = [...event2Companies.slice(0, 3)];
  const { host: newHost, company: newCompany } = await createCompanyHost(
    activeCompanies[3].host,
    activeCompanies[3].company,
    school.id
  );
  activeEventCompanies.push({ host: newHost, company: newCompany });

  // Positions for Active Event
  const activePositions = [
    {
      title: "Full Stack Developer",
      career: "Technology",
      slots: 3,
      contact_name: "Sarah Johnson",
      contact_email: "sarah@techstart.com",
      address: "123 Tech Ave, San Jose, CA",
      summary: "Experience full stack development",
      instructions: "Coding experience helpful",
      attire: "Casual",
      arrival: "9:00 AM",
      start: "9:15 AM",
      end: "3:00 PM",
    },
    {
      title: "Medical Technician",
      career: "Healthcare",
      slots: 2,
      contact_name: "Mike Chen",
      contact_email: "mike@greenhealth.com",
      address: "456 Health Blvd, Los Gatos, CA",
      summary: "Learn medical technology operations",
      instructions: "Health clearance required",
      attire: "Business casual",
      arrival: "8:30 AM",
      start: "9:00 AM",
      end: "2:30 PM",
    },
    {
      title: "Learning Specialist",
      career: "Education",
      slots: 4,
      contact_name: "Jennifer Walsh",
      contact_email: "jennifer@edunova.com",
      address: "654 Education Way, San Jose, CA",
      summary: "Support special needs learning programs",
      instructions: "Psychology background helpful",
      attire: "Comfortable casual",
      arrival: "9:00 AM",
      start: "9:15 AM",
      end: "3:30 PM",
    },
    {
      title: "Data Analyst",
      career: "Technology",
      slots: 3,
      contact_name: "Maria Gonzalez",
      contact_email: "maria@dataviz.com",
      address: "111 Data Dr, Mountain View, CA",
      summary: "Analyze business data and create visualizations",
      instructions: "Math and statistics interest helpful",
      attire: "Business casual",
      arrival: "9:30 AM",
      start: "10:00 AM",
      end: "4:00 PM",
    },
  ];

  const activeEventPositions = [];
  for (let i = 0; i < activePositions.length; i++) {
    const position = await createPosition(
      activePositions[i],
      activeEvent.id,
      activeEventCompanies[i].host.id
    );
    activeEventPositions.push(position);
  }

  // Current students (mix of continuing and new)
  const currentStudentsNew = [
    {
      firstName: "Alexander",
      lastName: "Lee",
      email: "alexander.lee@student.lghs.net",
      phone: "555-0301",
      grade: 12,
      parentEmail: "parent.lee@email.com",
      password: "student123",
      permissionSlipCompleted: true,
    },
    {
      firstName: "Charlotte",
      lastName: "White",
      email: "charlotte.white@student.lghs.net",
      phone: "555-0302",
      grade: 11,
      parentEmail: "parent.white@email.com",
      password: "student123",
      permissionSlipCompleted: true,
    },
    {
      firstName: "Benjamin",
      lastName: "Clark",
      email: "benjamin.clark@student.lghs.net",
      phone: "555-0303",
      grade: 10,
      parentEmail: "parent.clark@email.com",
      password: "student123",
      permissionSlipCompleted: false,
    },
  ];

  const currentStudentsNewCreated = [];
  for (const studentData of currentStudentsNew) {
    const student = await createStudent(studentData, school.id);
    currentStudentsNewCreated.push(student);
  }

  // Combine some returning students with new ones for current event
  const currentStudents = [
    ...event2Students.slice(2, 6),
    ...currentStudentsNewCreated,
  ]; // 4 returning + 3 new

  // Create student position selections for Active Event (some students have already made choices)
  await createStudentSelections(
    currentStudents[0].id,
    [
      activeEventPositions[0].id,
      activeEventPositions[3].id,
      activeEventPositions[1].id,
    ],
    [1, 2, 3]
  ); // Sophia - returning
  await createStudentSelections(
    currentStudents[1].id,
    [activeEventPositions[1].id, activeEventPositions[2].id],
    [1, 2]
  ); // Olivia - returning
  await createStudentSelections(
    currentStudents[4].id,
    [activeEventPositions[3].id, activeEventPositions[0].id],
    [1, 2]
  ); // Alexander - new
  await createStudentSelections(
    currentStudents[5].id,
    [
      activeEventPositions[2].id,
      activeEventPositions[1].id,
      activeEventPositions[3].id,
    ],
    [1, 2, 3]
  ); // Charlotte - new
  // Benjamin (currentStudents[6]) has no selections yet

  // ===== 5. CREATE LOTTERY CONFIGURATION =====
  console.log("\n🎲 Setting up lottery configuration...");

  await prisma.lotteryConfiguration.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      gradeOrder: "NONE",
    },
  });

  console.log("\n✅ Test data population completed!");
  console.log("\n📊 Summary:");
  console.log(`   🏫 School: ${school.name}`);
  console.log(`   👥 Admin Users: 2`);
  console.log(`   📅 Events Created: 3 (2 archived, 1 active)`);
  console.log(`   🏢 Companies: ${(await prisma.company.count()).toString()}`);
  console.log(`   🎓 Students: ${(await prisma.student.count()).toString()}`);
  console.log(`   💼 Positions: ${(await prisma.position.count()).toString()}`);
  console.log(
    `   🎯 Student Selections: ${(
      await prisma.positionsOnStudents.count()
    ).toString()}`
  );
  console.log("\n🔐 Admin Login Credentials:");
  console.log(`   📧 hleroy73+admin@gmail.com / Luthje33`);
  console.log(`   📧 leroy.dave+admin@gmail.com / chestnw3gard`);
  console.log("\n📋 Test Scenarios Available:");
  console.log(`   ✅ Event comparison (Fall 2023 vs Spring 2024)`);
  console.log(`   ✅ Student progression across events`);
  console.log(`   ✅ Company participation tracking`);
  console.log(`   ✅ Active event management`);
  console.log(`   ✅ Position carry-forward testing`);
  console.log(`   ✅ Lottery result analysis`);
}

main()
  .catch((e) => {
    console.error("❌ Error during test data population:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
