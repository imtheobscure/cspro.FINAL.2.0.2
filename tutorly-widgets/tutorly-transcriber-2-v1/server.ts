import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/translate", async (req, res) => {
    const { sl, tl, q, api = 'auto' } = req.query;
    const text = String(q);
    
    // Helper to fetch using Google direct
    const fetchDirect = async () => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Direct API failed");
      return await response.json();
    };

    // Helper to fetch using Lingva
    const fetchLingva = async () => {
      const url = `https://lingva.ml/api/v1/${sl}/${tl}/${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Lingva API failed");
      const d = await response.json();
      return { translation: d.translation };
    };

    try {
      if (api === 'direct') {
        res.json(await fetchDirect());
        return;
      } else if (api === 'lingva') {
        res.json(await fetchLingva());
        return;
      }

      // Auto mode: try Direct, then Lingva, then whatever
      try {
        res.json(await fetchDirect());
      } catch {
        try {
          res.json(await fetchLingva());
        } catch {
          res.status(500).json({ error: "All backend translation APIs failed" });
        }
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch translation" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Determine the dist path dynamically based on where the app is executed
    const possiblePaths = [
      path.join(process.cwd(), "dist"),
      __dirname,
      process.cwd()
    ];
    
    let distPath = possiblePaths[0];
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, "index.html")) && fs.existsSync(path.join(p, "assets"))) {
        distPath = p;
        break;
      }
    }
    
    console.log(`[Prod] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
