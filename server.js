const express = require("express");
const app = express();
const { obtenerMetrobus } = require("./scraper");

const PORT = process.env.PORT || 3000;

// Cache en memoria
let cache = {
    data: null,
    timestamp: 0,
    lastError: null
};

const CACHE_TIME = 60 * 1000; // 1 minuto

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Endpoint principal
app.get("/metrobus", async (req, res) => {
    try {
        const ahora = Date.now();
        
        // Verificar si el cache es válido
        if (!cache.data || (ahora - cache.timestamp) > CACHE_TIME) {
            console.log("🔄 Actualizando caché...");
            
            const data = await obtenerMetrobus();
            
            if (data && data.length > 0) {
                cache = {
                    data: data,
                    timestamp: ahora,
                    lastError: null
                };
                console.log(`✅ Caché actualizado: ${data.length} líneas`);
            } else {
                // Si no hay datos pero había caché previo, mantenerlo
                if (cache.data) {
                    console.log(`⚠️ No se obtuvieron datos nuevos, usando caché anterior (${cache.data.length} líneas)`);
                } else {
                    cache.lastError = "No se pudieron obtener datos";
                    console.log("❌ No se obtuvieron datos del scraper");
                }
            }
        } else {
            console.log(`📦 Sirviendo desde caché (${cache.data?.length || 0} líneas)`);
        }
        
        if (cache.data) {
            res.json(cache.data);
        } else {
            res.status(503).json({ 
                error: "Servicio no disponible temporalmente",
                details: cache.lastError
            });
        }
        
    } catch (error) {
        console.error("❌ Error en endpoint:", error);
        res.status(500).json({ 
            error: "Error interno del servidor",
            message: error.message 
        });
    }
});

// Endpoint de salud
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        cache: {
            hasData: !!cache.data,
            records: cache.data?.length || 0,
            age: cache.timestamp ? Math.floor((Date.now() - cache.timestamp) / 1000) + " segundos" : "sin datos",
            lastError: cache.lastError
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Endpoint raíz
app.get("/", (req, res) => {
    res.json({
        name: "Metrobús CDMX API",
        version: "1.0.0",
        endpoints: {
            metrobus: "/metrobus - Obtener estado del servicio",
            health: "/health - Estado del servicio"
        },
        docs: "https://github.com/tu-usuario/metrobus-api"
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error("Error no manejado:", err);
    res.status(500).json({ error: "Error interno del servidor" });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 Endpoints disponibles:`);
    console.log(`   - http://localhost:${PORT}/`);
    console.log(`   - http://localhost:${PORT}/metrobus`);
    console.log(`   - http://localhost:${PORT}/health`);
});