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
		
		//  DEBUG frames
		const frames = page.frames();

		console.log("FRAMES DETECTADOS:");
		frames.forEach(f => console.log(f.url()));
		
	

		//  encontrar iframe correcto
		const frame = page.frames().find(f =>
		f.url().includes("bandejaEstadoServicio")
		);

		if (!frame) {
		console.log("❌ No se encontró el frame");
		return [];
		}

		// esperar tabla dentro del iframe
		await frame.waitForSelector("table", { timeout: 10000 });

		const html = await frame.content();



		if (!frame) {
		console.log("❌ No se encontró el frame");
		return [];
		}

		const html = await frame.content();


        const $ = cheerio.load(html);

        let resultados = [];
		
		//  selector más específico
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
		console.log("HTML parcial:");
		console.log("HTML frame:");
		console.log(html.substring(0, 300));
        return [];

    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { obtenerMetrobus };