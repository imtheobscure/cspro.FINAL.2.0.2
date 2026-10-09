/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import express from "express";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/streetview", async (req, res) => {
    try {
      const { lat, lng, key } = req.query;
      if (!lat || !lng || !key) {
        return res.status(400).json({ error: "Missing lat, lng, or key" });
      }
      const url = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&key=${key}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      res.json({ base64 });
    } catch (error) {
      console.error("Error fetching streetview:", error);
      res.status(500).json({ error: "Failed to fetch streetview image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving (if needed later)
    app.use(express.static(path.join(__dirname, "dist")));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
