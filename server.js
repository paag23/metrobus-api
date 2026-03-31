const express = require("express");
const app = express();
const { obtenerMetrobus } = require("./scraper");

const PORT = process.env.PORT || 3000;

let cache = null;
let lastUpdate = 0;
let isUpdating = false; // Evitar actualizaciones simultáneas
const CACHE_TIME = 60 * 1000; // 1 minuto

app.get("/metrobus", async (req, res) => {
    try {
        const now = Date.now();
        
        // Si no hay caché o está expirado, y no hay una actualización en curso
        if ((!cache || now - lastUpdate > CACHE_TIME) && !isUpdating) {
            isUpdating = true;
            console.log("🔄 Actualizando caché...");
            
            try {
                cache = await obtenerMetrobus();
                lastUpdate = now;
                console.log(`✅ Caché actualizado: ${cache?.length || 0} registros`);
            } catch (error) {
                console.error("❌ Error actualizando caché:", error.message);
                // Mantener caché viejo si existe
                if (!cache) {
                    cache = [];
                }
            } finally {
                isUpdating = false;
            }
        }
        
        // Si no hay datos, devolver array vacío con mensaje informativo
        if (!cache || cache.length === 0) {
            return res.status(503).json({ 
                error: "Datos no disponibles temporalmente",
                message: "El servicio está intentando obtener información del Metrobús"
            });
        }
        
        res.json(cache);
        
    } catch (error) {
        console.error("❌ Error en endpoint:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para ver el estado del servicio
app.get("/status", (req, res) => {
    res.json({
        status: "ok",
        cache: {
            hasData: cache && cache.length > 0,
            records: cache?.length || 0,
            lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null,
            age: lastUpdate ? Math.floor((Date.now() - lastUpdate) / 1000) + " segundos" : null
        },
        uptime: process.uptime()
    });
});

app.get("/", (req, res) => {
    res.send(`
        <h1>API Metrobus CDMX</h1>
        <p>Servicio funcionando 🚀</p>
        <ul>
            <li><a href="/metrobus">/metrobus</a> - Estado del servicio</li>
            <li><a href="/status">/status</a> - Estado de la API</li>
        </ul>
    `);
});

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 Endpoints disponibles:`);
    console.log(`   - /metrobus  - Estado del Metrobús`);
    console.log(`   - /status    - Estado de la API`);
});