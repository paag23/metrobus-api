const puppeteer = require("puppeteer-core");
const { execSync } = require('child_process');
const fs = require('fs');

const URL = "https://incidentesmovilidad.cdmx.gob.mx/public/bandejaEstadoServicio.xhtml?idMedioTransporte=mb";

async function obtenerMetrobus() {
    let browser;

    try {
        console.log("🚀 Buscando Chrome...");
        
        // Buscar Chrome en ubicaciones comunes de Linux
        const posiblesUbicaciones = [
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/opt/google/chrome/chrome'
        ];
        
        let chromePath = null;
        for (const path of posiblesUbicaciones) {
            if (fs.existsSync(path)) {
                chromePath = path;
                console.log(`✅ Chrome encontrado en: ${path}`);
                break;
            }
        }
        
        // Si no se encuentra, intentar con which command
        if (!chromePath) {
            try {
                chromePath = execSync('which chromium-browser || which chromium || which google-chrome', { encoding: 'utf8' }).trim();
                if (chromePath) {
                    console.log(`✅ Chrome encontrado con 'which': ${chromePath}`);
                }
            } catch (e) {}
        }
        
        if (!chromePath) {
            throw new Error("No se encontró Chrome en el sistema");
        }
        
        console.log("🚀 Iniciando navegador...");
        browser = await puppeteer.launch({
            executablePath: chromePath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
            headless: true
        });
        
        const page = await browser.newPage();
        
        console.log("📄 Cargando página...");
        await page.goto(URL, {
            waitUntil: "networkidle2",
            timeout: 60000
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
        console.error("❌ Error:", error.message);
        return [];

    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = { obtenerMetrobus };