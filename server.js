const express = require("express");
const app = express();
const { obtenerMetrobus } = require("./scraper");
const PORT = process.env.PORT || 3000;

// CACHE
let cache = null;
let lastUpdate = 0;
const CACHE_TIME = 60 * 1000; // 1 minuto

// Endpoint principal
app.get("/metrobus", async (req, res) => {
    try {
        const now = Date.now();

        if (!cache || now - lastUpdate > CACHE_TIME) {
            console.log("🔄 Actualizando datos...");
            const data = await obtenerMetrobus();
            
            // Limpiar datos para enviar al ESP8266
            const cleanedData = data.map(item => ({
                l: item.l,
                e: item.e,
                s: item.s,
                i: item.i
            }));
            
            cache = cleanedData;
            lastUpdate = now;
            console.log(`✅ Datos actualizados: ${cache.length} registros`);
        } else {
            console.log("📦 Sirviendo desde caché");
        }

        res.json(cache);

    } catch (error) {
        console.error("❌ Error en endpoint:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint de prueba con más detalles
app.get("/debug", async (req, res) => {
    try {
        const data = await obtenerMetrobus();
        res.json({
            total: data.length,
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/", (req, res) => {
    res.send("API Metrobus funcionando 🚀<br/>Usa /metrobus para obtener datos");
});

// START
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 Endpoint: http://localhost:${PORT}/metrobus`);
});