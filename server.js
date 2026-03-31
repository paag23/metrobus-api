const express = require("express");
const app = express();
const { obtenerMetrobus } = require("./scraper");

const PORT = process.env.PORT || 3000;

let cache = null;
let lastUpdate = 0;
const CACHE_TIME = 60 * 1000; // 1 minuto

app.get("/metrobus", async (req, res) => {
    try {
        const now = Date.now();

        if (!cache || now - lastUpdate > CACHE_TIME) {
            console.log("🔄 Actualizando datos...");
            cache = await obtenerMetrobus();
            lastUpdate = now;
            console.log(`✅ Cache actualizado: ${cache.length} líneas`);
        }

        res.json(cache);
    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/", (req, res) => {
    res.send("API Metrobus funcionando 🚀");
});

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});