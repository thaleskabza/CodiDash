import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ---- 5 Cape Town Kauai stores ----
  const stores = [
    {
      name: "Kauai V&A Waterfront",
      address: "Shop 6218, V&A Waterfront, Cape Town, 8001",
      latitude: -33.9024,
      longitude: 18.4186,
    },
    {
      name: "Kauai Gardens Centre",
      address: "Shop 32, Gardens Centre, Mill Street, Cape Town, 8001",
      latitude: -33.9337,
      longitude: 18.4133,
    },
    {
      name: "Kauai Cavendish Square",
      address: "Shop L28, Cavendish Square, Dreyer Street, Claremont, 7708",
      latitude: -33.9885,
      longitude: 18.4699,
    },
    {
      name: "Kauai Canal Walk",
      address: "Shop G43, Canal Walk Shopping Centre, Century City, 7441",
      latitude: -33.8875,
      longitude: 18.5113,
    },
    {
      name: "Kauai Constantia Village",
      address: "Shop 10, Constantia Village, Constantia, Cape Town, 7806",
      latitude: -34.0224,
      longitude: 18.4681,
    },
  ];

  for (const store of stores) {
    await prisma.store.upsert({
      where: { name: store.name },
      update: {},
      create: store,
    });
  }
  console.log(`Seeded ${stores.length} Kauai stores.`);

  // ---- Sample menu items ----
  const menuItems = [
    { name: "Island Boost", category: "Smoothies" },
    { name: "Green Goddess", category: "Smoothies" },
    { name: "Berry Bliss", category: "Smoothies" },
    { name: "Mango Magic", category: "Smoothies" },
    { name: "Peanut Butter Power", category: "Smoothies" },
    { name: "Tropical Sunrise", category: "Smoothies" },
    { name: "Açaí Bowl", category: "Bowls" },
    { name: "Granola Bowl", category: "Bowls" },
    { name: "Kauai Classic Wrap", category: "Wraps" },
    { name: "Falafel Wrap", category: "Wraps" },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
  }
  console.log(`Seeded ${menuItems.length} menu items.`);

  // ---- 1 admin user ----
  const adminEmail = "admin@codidash.co.za";
  const adminPasswordHash = await bcrypt.hash("Admin@CodiDash2024!", 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "CodiDash Admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: Role.admin,
    },
  });
  console.log(`Seeded admin user: ${adminEmail}`);

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
