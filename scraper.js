const axios = require("axios");
const cheerio = require("cheerio");

const URL = "https://incidentesmovilidad.cdmx.gob.mx/public/bandejaEstadoServicio.xhtml?idMedioTransporte=mb";

async function scrapeMetrobus() {
    try {
        const { data } = await axios.get(URL, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const $ = cheerio.load(data);

        let resultados = [];

        $("tr").each((i, el) => {
            const columnas = $(el).find("td");

            if (columnas.length >= 3) {

                // 🟢 EXTRAER LINEA DESDE IMG
                const imgSrc = $(columnas[0]).find("img").attr("src");

                let linea = "";

                if (imgSrc) {
                    const match = imgSrc.match(/MB(\d+)/);
                    if (match) {
                        linea = "Línea " + match[1];
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

        console.log("\n===== JSON LIMPIO =====");
        console.log(JSON.stringify(resultados, null, 2));

    } catch (error) {
        console.error("Error:", error.message);
    }
}

scrapeMetrobus();