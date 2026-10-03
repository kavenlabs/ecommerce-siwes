import { createUser } from "../src/lib/auth-data.ts";
import { db, one, run } from "../src/lib/db/client.ts";

const PRODUCTS = [
  {
    name: "Anker 20W USB-C charger",
    description:
      "Compact wall charger with a braided cable. Fits most USB-C phones and small tablets.",
    price: 18500,
    stock: 14,
  },
  {
    name: "Braided lightning cable 1m",
    description: "Toughened nylon cable rated for 30W. Tested to 10,000 bends.",
    price: 7500,
    stock: 30,
  },
  {
    name: "USB-C to USB-C cable 2m",
    description: "Long braided cable for charging at a desk or in bed.",
    price: 6000,
    stock: 22,
  },
  {
    name: "65W GaN dual port",
    description: "Two ports, one for the laptop and one for the phone. Small enough for a pocket.",
    price: 42000,
    stock: 6,
  },
  {
    name: "Power bank 20000mAh",
    description: "Enough for four phone charges. Has a small display for the remaining charge.",
    price: 38000,
    stock: 9,
  },
  {
    name: "Wireless charging pad",
    description: "15W fast charging. Comes with a cable in the box.",
    price: 12500,
    stock: 17,
  },
];

function main() {
  db();

  const existing = one<{ n: number }>("SELECT COUNT(*) AS n FROM products");
  if (existing && existing.n > 0) {
    console.log(`Skipped. ${existing.n} products already present.`);
    return;
  }

  for (const p of PRODUCTS) {
    run(
      "INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)",
      p.name,
      p.description,
      p.price,
      p.stock,
    );
  }
  console.log(`Inserted ${PRODUCTS.length} products.`);

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@adetunji.shop";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme123";

  if (!one("SELECT id FROM users WHERE email = ?", adminEmail)) {
    createUser(adminEmail, "Shop Owner", adminPassword, true);
    console.log(`Created admin: ${adminEmail}`);
    console.log("Change that password before going live.");
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }
}

main();
