import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import fetch from "node-fetch";

// CONFIGURATION
const ARDUINO_PORT = "COM8"; // Matches your active physical Arduino port
const VERCEL_URL = "https://isatu-iot-webhook.vercel.app/api/updateSensor";
const API_KEY = "isatu_autopark_secret_2026";
const SLOT_ID = "1";

const port = new SerialPort({ path: ARDUINO_PORT, baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

console.log(
  `🚀 ParkMatic Gateway Active! Monitoring Arduino Uno on ${ARDUINO_PORT}...`,
);

parser.on("data", async (rawLines) => {
  console.log(`[Sensor Data]: ${rawLines}`);

  if (rawLines.includes("[STATE_CHANGE]")) {
    try {
      const statusValue = rawLines.match(/Status:(\d+)/);
      const distanceValue = rawLines.match(/Distance:(\d+)/);

      if (statusValue && distanceValue) {
        const parsedStatus = parseInt(statusValue[1]);
        const parsedDistance = parseInt(distanceValue[1]);

        console.log(
          `Pushing to Cloud -> Slot: ${SLOT_ID} | Status: ${parsedStatus} | Dist: ${parsedDistance}cm`,
        );

        const response = await fetch(VERCEL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
          },
          body: JSON.stringify({
            slotId: SLOT_ID,
            status: parsedStatus,
            distance: parsedDistance,
            deviceType: "Arduino Uno (via Laptop Bridge)",
          }),
        });

        const statusFeedback = await response.text();
        console.log(`[Cloud Response]: ${statusFeedback}`);
      }
    } catch (err) {
      console.error("❌ Network Broadcast Error:", err.message);
    }
  }
});
