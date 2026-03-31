const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

const URL = "https://incidentesmovilidad.cdmx.gob.mx/public/bandejaEstadoServicio.xhtml?idMedioTransporte=mb";

async function obtenerMetrobus() {
    let browser;

    try {
        console.log("🚀 Iniciando navegador...");
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ],
            headless: "new",
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
        });

        const page = await browser.newPage();
        
        // Configurar timeout
        page.setDefaultTimeout(60000);
        
        // User agent realista
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log("📄 Navegando a:", URL);
        await page.goto(URL, {
            waitUntil: "networkidle2",
            timeout: 60000
        });

        // Esperar carga de la tabla
        await page.waitForTimeout(3000);
        
        // Intentar esperar por la tabla
        try {
            await page.waitForSelector("table", { timeout: 10000 });
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log("⚠️ Timeout esperando tabla, continuando...");
        }

        // Extraer datos
        const resultados = await page.evaluate(() => {
            const datos = [];
            
            // Buscar todas las filas de la tabla
            const filas = document.querySelectorAll("tr");
            
            filas.forEach(fila => {
                const columnas = fila.querySelectorAll("td");
                
                if (columnas.length >= 2) {
                    // Buscar número de línea
                    let lineaNum = 0;
                    const imagenes = fila.querySelectorAll("img");
                    
                    imagenes.forEach(img => {
                        const src = img.src || "";
                        const match = src.match(/MB(\d+)/);
                        if (match) {
                            lineaNum = parseInt(match[1]);
                        }
                    });
                    
                    // Si no hay imagen, buscar texto
                    if (lineaNum === 0) {
                        const textoCompleto = fila.innerText;
                        const matchTexto = textoCompleto.match(/Línea\s*(\d+)/i);
                        if (matchTexto) {
                            lineaNum = parseInt(matchTexto[1]);
                        }
                    }
                    
                    if (lineaNum > 0) {
                        // Extraer estado (segunda columna o primera según estructura)
                        let estado = "";
                        let estaciones = "";
                        let info = "";
                        
                        if (columnas.length >= 2) {
                            estado = columnas[1]?.innerText?.trim() || "";
                            if (columnas.length >= 3) {
                                estaciones = columnas[2]?.innerText?.trim() || "";
                            }
                            if (columnas.length >= 4) {
                                info = columnas[3]?.innerText?.trim() || "";
                            }
                        } else if (columnas.length >= 1) {
                            estado = columnas[0]?.innerText?.trim() || "";
                        }
                        
                        datos.push({
                            l: lineaNum,
                            e: estado.includes("Regular") || estado.includes("Servicio Regular") ? 1 : 0,
                            s: (estaciones && estaciones !== "Ninguna") ? estaciones : "",
                            i: info || ""
                        });
                    }
                }
            });
            
            return datos;
        });

        console.log(`✅ Encontrados ${resultados.length} registros`);
        
        if (resultados.length === 0) {
            // Log para depuración
            const titulo = await page.title();
            console.log(`📄 Título de la página: ${titulo}`);
            
            // Tomar screenshot para debug
            const screenshot = await page.screenshot({ encoding: 'base64' });
            console.log(`📸 Screenshot tomado (${screenshot.length} bytes)`);
        }
        
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