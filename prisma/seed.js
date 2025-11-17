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

async function main() {
  // 1. Set your admin's email and password
  const email = "hleroy73+admin@gmail.com";
  const password = "Luthje33";

  // Second admin user
  const email2 = "leroy.dave+admin@gmail.com";
  const password2 = "chestnw3gard";

  // 2. Generate a random salt
  const passwordSalt = crypto.randomBytes(16).toString("base64");
  const passwordSalt2 = crypto.randomBytes(16).toString("base64");

  // 3. Hash the password
  const passwordHash = await scrypt.hash(password, passwordSalt);
  const passwordHash2 = await scrypt.hash(password2, passwordSalt2);

  // 4. Create or upsert the first user
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      passwordSalt,
      emailVerified: true,
      lastLogin: new Date(),
    },
  });

  // 4b. Create or upsert the second user
  const user2 = await prisma.user.upsert({
    where: { email: email2 },
    update: {},
    create: {
      email: email2,
      passwordHash: passwordHash2,
      passwordSalt: passwordSalt2,
      emailVerified: true,
      lastLogin: new Date(),
    },
  });

  // 5. Find the school you want to add the admin to
  const school = await prisma.school.findFirst({
    where: { name: "Los Gatos High School" }, // <-- Change this!
  });

  if (!school) {
    throw new Error("School not found");
  }

  // 6. Connect both users as admins to the school
  await prisma.school.update({
    where: { id: school.id },
    data: {
      admins: {
        connect: [{ id: user.id }, { id: user2.id }],
      },
    },
  });

  console.log("Seeded admin user:", user.email, "for school:", school.name);
  console.log("Password for this user:", password);
  console.log("Seeded admin user:", user2.email, "for school:", school.name);
  console.log("Password for this user:", password2);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
