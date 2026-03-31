const express = require("express");
const app = express();
const { obtenerMetrobus } = require("./scraper");

const PORT = process.env.PORT || 3000;

// Cache simple
let cache = {
    data: null,
    timestamp: 0
};

const CACHE_TIME = 60 * 1000; // 1 minuto

app.get("/metrobus", async (req, res) => {
    try {
        const ahora = Date.now();
        
        // Si el cache es viejo o no existe, actualizar
        if (!cache.data || (ahora - cache.timestamp) > CACHE_TIME) {
            console.log("🔄 Actualizando datos...");
            cache.data = await obtenerMetrobus();
            cache.timestamp = ahora;
            console.log(`✅ Cache actualizado: ${cache.data.length} líneas`);
        }
        
        res.json(cache.data);
        
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