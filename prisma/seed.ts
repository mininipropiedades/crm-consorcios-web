import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "mininipropiedades@gmail.com";
  const password = process.env.ADMIN_PASSWORD ?? "cambiar-ya";

  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      nombre: "Franco Mauri",
      passwordHash: hash,
      rol: "admin",
    },
  });

  console.log(`[seed] admin creado o ya existente: ${email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
