const axios = require("axios");
const https = require("https");
const cheerio = require("cheerio");

const URL = "https://incidentesmovilidad.cdmx.gob.mx/public/bandejaEstadoServicio.xhtml?idMedioTransporte=mb";

const agent = new https.Agent({
    keepAlive: true,
    timeout: 20000
});

async function obtenerMetrobus() {
    try {
        const { data } = await axios.get(URL, {
            httpsAgent: agent,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "es-MX,es;q=0.9",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Connection": "keep-alive"
            },
            timeout: 20000,
            maxRedirects: 5
        });

        console.log("HTML recibido:");
        console.log(data.substring(0, 300));

        const $ = cheerio.load(data);

        let resultados = [];

        $("tr").each((i, el) => {
            const columnas = $(el).find("td");

            if (columnas.length >= 3) {

                const imgSrc = $(columnas[0]).find("img").attr("src");

                let linea = "";

                if (imgSrc) {
                    const match = imgSrc.match(/MB(\d+)/);
                    if (match) {
                        linea = "Linea " + match[1];
                    }
                }

                const estado = $(columnas[1]).text().trim();
                const estaciones = $(columnas[2]).text().trim();
                const info = $(columnas[3]).text().trim();

                resultados.push({
                    linea,
                    estado,
                    estaciones,
                    info
                });
            }
        });

        console.log("\n===== JSON =====");
        console.log(JSON.stringify(resultados, null, 2));

        return resultados;

    } catch (error) {
        console.error("❌ Error scraping:", error.message);
        return [];
    }
}

// Ejecutar
obtenerMetrobus();