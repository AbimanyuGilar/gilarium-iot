import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PRODUCTS: Array<{
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
}> = [
  { name: "Arduino Uno R3", category: "Arduino", price: 250000, stock: 30, description: "Board mikrokontroler ATmega328P, port USB, standar untuk pemula hingga proyek kompleks." },
  { name: "Arduino Nano", category: "Arduino", price: 95000, stock: 45, description: "Versi mini Arduino, kompatibel dengan breadboard, cocok untuk proyek ringkas." },
  { name: "Arduino Mega 2560", category: "Arduino", price: 385000, stock: 18, description: "54 pin I/O digital dan 256KB flash memory untuk proyek besar." },
  { name: "ESP32 DevKit V1", category: "ESP32", price: 110000, stock: 60, description: "Dual-core 240MHz, WiFi + Bluetooth, 38 pin, sangat populer untuk IoT." },
  { name: "ESP32-C3 Super Mini", category: "ESP32", price: 65000, stock: 80, description: "Board ESP32-C3 RISC-V ukuran super mini, WiFi + BLE, hemat daya." },
  { name: "ESP32-CAM", category: "ESP32", price: 135000, stock: 40, description: "ESP32 dengan kamera OV2640, ideal untuk proyek kamera WiFi." },
  { name: "ESP8266 NodeMCU V3", category: "ESP8266", price: 55000, stock: 70, description: "Board WiFi murah berbasis ESP8266, USB-to-serial onboard." },
  { name: "ESP8266 D1 Mini", category: "ESP8266", price: 45000, stock: 90, description: "Board mini WiFi yang kompatibel dengan shield Arduino." },
  { name: "Raspberry Pi 5 8GB", category: "Raspberry Pi", price: 1650000, stock: 10, description: "Komputer papan tunggal terbaru, CPU cepat, cocok untuk server lokal." },
  { name: "Raspberry Pi Pico W", category: "Raspberry Pi", price: 95000, stock: 50, description: "Mikrokontroler RP2040 dengan WiFi, MicroPython dan C/C++." },
  { name: "Sensor DHT11", category: "Sensor", price: 15000, stock: 120, description: "Sensor suhu dan kelembaban digital, pin tunggal." },
  { name: "Sensor DHT22 / AM2302", category: "Sensor", price: 35000, stock: 75, description: "Sensor suhu dan kelembaban presisi tinggi." },
  { name: "Sensor HC-SR04 Ultrasonic", category: "Sensor", price: 12000, stock: 100, description: "Sensor jarak ultrasonik 2-400cm, untuk pengukur jarak dan robot." },
  { name: "Sensor PIR HC-SR501", category: "Sensor", price: 10000, stock: 110, description: "Sensor gerak inframerah pasif untuk deteksi manusia." },
  { name: "Sensor LDR / Photocell", category: "Sensor", price: 3000, stock: 200, description: "Resistor peka cahaya untuk proyek pendeteksi intensitas cahaya." },
  { name: "Modul Relay 2 Channel 5V", category: "Modul IoT", price: 18000, stock: 85, description: "Modul relay optokopler untuk mengontrol perangkat AC/DC." },
  { name: "Modul OLED 0.96 inch SSD1306", category: "Modul IoT", price: 28000, stock: 65, description: "Layar OLED 128x64 untuk menampilkan data secara real-time." },
  { name: "Modul GSM SIM800L", category: "Modul IoT", price: 85000, stock: 35, description: "Modul GSM/GPRS untuk kirim SMS dan data via seluler." },
  { name: "Modul GPS NEO-6M", category: "Modul IoT", price: 65000, stock: 40, description: "Modul GPS dengan antena aktif untuk pelacakan lokasi." },
  { name: "Modul RFID RC522", category: "Modul IoT", price: 22000, stock: 55, description: "Pembaca kartu RFID 13.56MHz untuk absensi dan akses kontrol." },
  { name: "Breadboard 830 Point", category: "Komponen", price: 15000, stock: 150, description: "Breadboard solderless 830 titik untuk perakitan prototipe." },
  { name: "Jumper Wire M-M (40 pcs)", category: "Kabel & Konektor", price: 12000, stock: 180, description: "Kabel jumper male-to-male, berbagai warna untuk wiring cepat." },
  { name: "Jumper Wire F-M (40 pcs)", category: "Kabel & Konektor", price: 16000, stock: 160, description: "Kabel jumper female-to-male untuk menghubungkan sensor ke board." },
  { name: "Power Supply 5V 3A", category: "Catu Daya", price: 45000, stock: 45, description: "Adapter 5V 3A untuk memberi daya board dan modul." },
];

async function main() {
  const adminEmail = "admin@gilarium.id";
  const adminPassword = "admin123";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const adminId = randomUUID();
    const hashed = await hashPassword(adminPassword);

    await prisma.$transaction([
      prisma.user.create({
        data: {
          id: adminId,
          name: "Admin Gilarium",
          email: adminEmail,
          emailVerified: true,
        },
      }),
      prisma.account.create({
        data: {
          id: randomUUID(),
          userId: adminId,
          providerId: "credential",
          accountId: adminId,
          password: hashed,
        },
      }),
    ]);
    console.log(`✓ User admin dibuat  → ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`• User ${adminEmail} sudah ada, dilewati.`);
  }

  for (const p of PRODUCTS) {
    const exists = await prisma.product.findFirst({ where: { name: p.name } });
    if (!exists) {
      await prisma.product.create({ data: p });
      console.log(`✓ Produk ditambahkan → ${p.name}`);
    } else {
      console.log(`• Produk ${p.name} sudah ada, dilewati.`);
    }
  }

  console.log("\nSeeding selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });