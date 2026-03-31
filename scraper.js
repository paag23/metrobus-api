const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

const URL = "https://incidentesmovilidad.cdmx.gob.mx/public/bandejaEstadoServicio.xhtml?idMedioTransporte=mb";

async function obtenerMetrobus() {
    let browser;

    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: "new"
        });

        const page = await browser.newPage();

        await page.goto(URL, {
            waitUntil: "domcontentloaded",
            timeout: 30000
        });

        // 🔥 esperar tabla real
        await page.waitForSelector(".ui-datatable-data", { timeout: 10000 });

        const html = await page.content();
        const $ = cheerio.load(html);

        let resultados = [];

        $(".ui-datatable-data tr").each((i, el) => {
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
        console.error("❌ Puppeteer error:", error.message);
        return [];

    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { obtenerMetrobus };