const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const app = express();
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


async function obtenerMetrobus() {
    let browser;

    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: "new"
        });

        const page = await browser.newPage();

        await page.goto(
            "https://incidentesmovilidad.cdmx.gob.mx/public/bandejaEstadoServicio.xhtml?idMedioTransporte=mb",
            {
                waitUntil: "networkidle2",
                timeout: 30000
            }
        );

        const html = await page.content();

        console.log("HTML cargado (puppeteer)");

        const $ = cheerio.load(html);

        let resultados = [];

        $("tr").each((i, el) => {
            const columnas = $(el).find("td");

            if (columnas.length >= 3) {

                const imgSrc = $(columnas[0]).find("img").attr("src");

                let lineaNum = 0;

                if (imgSrc) {
                    const match = imgSrc.match(/MB(\d+)/);
                    if (match) {
                        lineaNum = parseInt(match[1]);
                    }
                }

                const estado = $(columnas[1]).text().trim();
                const estaciones = $(columnas[2]).text().trim();
                const info = $(columnas[3]).text().trim();

                resultados.push({
                    l: lineaNum,
                    e: estado === "Servicio Regular" ? 1 : 0,
                    s: estaciones !== "Ninguna" ? estaciones : "",
                    i: info || ""
                });
            }
        });

        return resultados;

    } catch (error) {
        console.error("❌ Error Puppeteer:", error.message);
        return [];

    } finally {
        if (browser) await browser.close();
    }
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