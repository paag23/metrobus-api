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
                '--disable-gpu'
            ],
            headless: "new"
        });

        const page = await browser.newPage();
        
        // Configurar timeout más largo
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);

        console.log("📄 Navegando a:", URL);
        await page.goto(URL, {
            waitUntil: "networkidle0", // Esperar a que no haya más conexiones de red
            timeout: 60000
        });

        // Esperar un poco más para que carguen los datos dinámicos
        await page.waitForTimeout(5000);

        // Esperar por la tabla o por cualquier contenido
        try {
            await page.waitForSelector(".ui-datatable-data, table", { timeout: 15000 });
        } catch (e) {
            console.log("⚠️ No se encontró la tabla principal, intentando con selectores alternativos...");
        }

        // Tomar screenshot para depuración
        await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
        console.log("📸 Screenshot guardado como debug-screenshot.png");

        // Obtener el HTML
        const html = await page.content();
        
        // Guardar HTML para depuración
        const fs = require('fs');
        fs.writeFileSync('debug-page.html', html);
        console.log("📄 HTML guardado como debug-page.html");

        const $ = cheerio.load(html);

        // Buscar cualquier tabla que pueda contener los datos
        let resultados = [];
        
        // Intentar múltiples selectores
        const selectores = [
            ".ui-datatable-data tr",
            "table tr",
            "tbody tr",
            ".ui-datatable tbody tr"
        ];

        for (const selector of selectores) {
            const filas = $(selector);
            if (filas.length > 0) {
                console.log(`✅ Encontradas ${filas.length} filas con selector: ${selector}`);
                
                filas.each((i, el) => {
                    const columnas = $(el).find("td");
                    
                    if (columnas.length >= 2) {
                        // Extraer toda la información disponible
                        let rowData = [];
                        columnas.each((j, col) => {
                            rowData.push($(col).text().trim());
                        });
                        
                        // Intentar extraer número de línea de cualquier parte
                        let lineaNum = 0;
                        let estado = "";
                        let estaciones = "";
                        let info = "";
                        
                        // Buscar imagen con número de línea
                        const img = $(el).find("img");
                        if (img.length > 0) {
                            const imgSrc = img.attr("src");
                            if (imgSrc) {
                                const match = imgSrc.match(/MB(\d+)/);
                                if (match) {
                                    lineaNum = parseInt(match[1]);
                                }
                            }
                        }
                        
                        // Si no se encontró en la imagen, buscar en el texto
                        if (lineaNum === 0) {
                            const textoCompleto = rowData.join(" ");
                            const matchLinea = textoCompleto.match(/Línea\s*(\d+)/i);
                            if (matchLinea) {
                                lineaNum = parseInt(matchLinea[1]);
                            }
                        }
                        
                        // Asignar valores según la estructura encontrada
                        if (rowData.length >= 3) {
                            estado = rowData[1] || "";
                            estaciones = rowData[2] || "";
                            info = rowData[3] || "";
                        } else if (rowData.length === 2) {
                            estado = rowData[0] || "";
                            estaciones = rowData[1] || "";
                        }
                        
                        if (lineaNum > 0) {
                            resultados.push({
                                l: lineaNum,
                                e: estado.includes("Regular") ? 1 : 0,
                                s: estaciones !== "Ninguna" && estaciones !== "" ? estaciones : "",
                                i: info || "",
                                raw: rowData // Para depuración
                            });
                        }
                    }
                });
                
                if (resultados.length > 0) break;
            }
        }

        // Si no se encontraron resultados, intentar con otro enfoque
        if (resultados.length === 0) {
            console.log("🔍 Buscando en toda la página...");
            const textoPagina = $("body").text();
            console.log("Texto de la página:", textoPagina.substring(0, 500));
            
            // Buscar líneas en el texto
            const lineasEncontradas = textoPagina.match(/Línea\s*(\d+)/gi);
            if (lineasEncontradas) {
                console.log("Líneas encontradas en texto:", lineasEncontradas);
            }
        }

        console.log(`📊 Total de resultados: ${resultados.length}`);
        return resultados;

    } catch (error) {
        console.error("❌ Puppeteer error:", error.message);
        console.error("Stack:", error.stack);
        return [];

    } finally {
        if (browser) {
            await browser.close();
            console.log("🔒 Navegador cerrado");
        }
    }
}

module.exports = { obtenerMetrobus };