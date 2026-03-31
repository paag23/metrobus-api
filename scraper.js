const puppeteer = require("puppeteer-core");
const fs = require('fs');

const URL = "https://incidentesmovilidad.cdmx.gob.mx/public/bandejaEstadoServicio.xhtml?idMedioTransporte=mb";

async function obtenerMetrobus() {
    let browser;

    try {
        console.log("🔍 Buscando Chromium...");
        
        // Ubicación donde se instalará Chromium durante el build
        const navegadorPath = '/usr/bin/chromium';
        
        if (!fs.existsSync(navegadorPath)) {
            console.error(`❌ Chromium no encontrado en: ${navegadorPath}`);
            return [];
        }
        
        console.log(`✅ Chromium encontrado en: ${navegadorPath}`);
        console.log("🚀 Iniciando navegador...");
        
        browser = await puppeteer.launch({
            executablePath: navegadorPath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            headless: true
        });
        
        const page = await browser.newPage();
        
        console.log("📄 Cargando página del Metrobús...");
        await page.goto(URL, {
            waitUntil: "networkidle2",
            timeout: 30000
        });

        await page.waitForTimeout(5000);
        
        const resultados = await page.evaluate(() => {
            const datos = [];
            const filas = document.querySelectorAll("tr");
            
            filas.forEach(fila => {
                const columnas = fila.querySelectorAll("td");
                
                if (columnas.length >= 2) {
                    let lineaNum = 0;
                    const imagenes = fila.querySelectorAll("img");
                    
                    imagenes.forEach(img => {
                        const src = img.src || "";
                        const match = src.match(/MB(\d+)/);
                        if (match) {
                            lineaNum = parseInt(match[1]);
                        }
                    });
                    
                    if (lineaNum > 0) {
                        let estado = columnas[1]?.innerText?.trim() || "";
                        
                        datos.push({
                            l: lineaNum,
                            e: estado.includes("Regular") ? 1 : 0,
                            s: "",
                            i: ""
                        });
                    }
                }
            });
            
            return datos;
        });

        console.log(`✅ Encontrados ${resultados.length} registros`);
        return resultados;

    } catch (error) {
        console.error("❌ Error en scraper:", error.message);
        return [];

    } finally {
        if (browser) {
            await browser.close();
            console.log("🔒 Navegador cerrado");
        }
    }
}

module.exports = { obtenerMetrobus };