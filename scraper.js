const puppeteer = require("puppeteer-core");
const { execSync } = require('child_process');
const fs = require('fs');

const URL = "https://incidentesmovilidad.cdmx.gob.mx/public/bandejaEstadoServicio.xhtml?idMedioTransporte=mb";

async function obtenerMetrobus() {
    let browser;

    try {
        console.log("🔍 Buscando navegador...");
        
        // Lista de posibles ubicaciones de Chromium/Chrome en Render
        const posiblesUbicaciones = [
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/snap/bin/chromium'
        ];
        
        let navegadorPath = null;
        
        // Buscar en ubicaciones comunes
        for (const path of posiblesUbicaciones) {
            if (fs.existsSync(path)) {
                navegadorPath = path;
                console.log(`✅ Navegador encontrado en: ${path}`);
                break;
            }
        }
        
        // Si no se encuentra, intentar con el comando 'which'
        if (!navegadorPath) {
            try {
                const whichResult = execSync('which chromium-browser || which chromium || which google-chrome || true', { encoding: 'utf8' }).trim();
                if (whichResult) {
                    navegadorPath = whichResult;
                    console.log(`✅ Navegador encontrado via 'which': ${navegadorPath}`);
                }
            } catch (e) {
                console.log("⚠️ No se pudo ejecutar 'which'");
            }
        }
        
        // Si aún no hay navegador, intentar instalar Chromium
        if (!navegadorPath) {
            console.log("⚠️ No se encontró navegador, intentando instalar Chromium...");
            try {
                execSync('apt-get update && apt-get install -y chromium', { stdio: 'inherit' });
                navegadorPath = '/usr/bin/chromium';
                console.log(`✅ Chromium instalado en: ${navegadorPath}`);
            } catch (e) {
                console.log("❌ No se pudo instalar Chromium");
            }
        }
        
        if (!navegadorPath) {
            throw new Error("No se pudo encontrar o instalar un navegador");
        }
        
        console.log("🚀 Iniciando navegador...");
        browser = await puppeteer.launch({
            executablePath: navegadorPath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
            headless: true
        });
        
        const page = await browser.newPage();
        
        console.log("📄 Cargando página del Metrobús...");
        await page.goto(URL, {
            waitUntil: "networkidle2",
            timeout: 60000
        });

        await page.waitForTimeout(5000);
        
        // Extraer datos de la tabla
        const resultados = await page.evaluate(() => {
            const datos = [];
            const filas = document.querySelectorAll("tr");
            
            filas.forEach(fila => {
                const columnas = fila.querySelectorAll("td");
                
                if (columnas.length >= 2) {
                    // Buscar número de línea en imágenes
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