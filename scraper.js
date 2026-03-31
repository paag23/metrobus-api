const puppeteer = require("puppeteer");

const URL = "https://incidentesmovilidad.cdmx.gob.mx/public/bandejaEstadoServicio.xhtml?idMedioTransporte=mb";

async function obtenerMetrobus() {
    let browser;

    try {
        console.log("🚀 Iniciando navegador...");
        
        // Buscar Chrome en posibles ubicaciones
        const possiblePaths = [
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/opt/render/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome',
        ];
        
        let executablePath = null;
        const fs = require('fs');
        const { execSync } = require('child_process');
        
        // Intentar encontrar Chrome
        for (const path of possiblePaths) {
            try {
                if (fs.existsSync(path)) {
                    executablePath = path;
                    console.log(`✅ Chrome encontrado en: ${path}`);
                    break;
                }
            } catch (e) {}
        }
        
        // Configurar opciones de Puppeteer
        const options = {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            headless: true
        };
        
        if (executablePath) {
            options.executablePath = executablePath;
        }
        
        browser = await puppeteer.launch(options);
        const page = await browser.newPage();
        
        console.log("📄 Cargando página...");
        await page.goto(URL, {
            waitUntil: "networkidle2",
            timeout: 60000
        });

        // Esperar carga
        await page.waitForTimeout(5000);
        
        // Extraer datos
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
                    
                    if (lineaNum === 0) {
                        const textoCompleto = fila.innerText;
                        const matchTexto = textoCompleto.match(/Línea\s*(\d+)/i);
                        if (matchTexto) {
                            lineaNum = parseInt(matchTexto[1]);
                        }
                    }
                    
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