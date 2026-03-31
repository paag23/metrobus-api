const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const app = express();
const { obtenerMetrobus } = require("./scraper");
//  IMPORTANTE para Render
const PORT = process.env.PORT || 3000;

const URL = "https://incidentesmovilidad.cdmx.gob.mx/public/bandejaEstadoServicio.xhtml?idMedioTransporte=mb";

//  CACHE
let cache = null;
let lastUpdate = 0;
const CACHE_TIME = 60 * 1000; // 1 minuto

// limpiar acentos (FUERA del loop)
function limpiarTexto(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}



// ENDPOINT
app.get("/metrobus", async (req, res) => {
    try {
        const now = Date.now();

        if (!cache || now - lastUpdate > CACHE_TIME) {
            console.log("🔄 Actualizando datos...");
            cache = (await obtenerMetrobus()).filter(x => x.e === 0);
            lastUpdate = now;
        } else {
            console.log("⚡ Usando cache");
        }

        res.json(cache);

    } catch (error) {
		console.error("ERROR REAL:", error);
		res.status(500).json({ error: error.message });
	}
});

// test
app.get("/", (req, res) => {
    res.send("API Metrobus funcionando 🚀");
});

// START
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});