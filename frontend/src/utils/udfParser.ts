import JSZip from 'jszip';

export interface UdfContent {
    text: string;
    title?: string;
    properties?: {
        verificationCode?: string;
        sicil?: string;
    };
}

/**
 * UDF dosyasını parse eder ve içeriğini döndürür
 * UDF dosyası ZIP formatında olup içinde content.xml ve documentproperties.xml barındırır
 */
export async function parseUdfFile(file: File): Promise<UdfContent> {
    try {
        const zip = await JSZip.loadAsync(file);

        // content.xml dosyasını oku
        const contentXmlFile = zip.file('content.xml');
        if (!contentXmlFile) {
            throw new Error('UDF dosyasında content.xml bulunamadı');
        }

        const contentXml = await contentXmlFile.async('string');

        // CDATA içeriğini çıkar
        const cdataMatch = contentXml.match(/<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/);
        if (!cdataMatch) {
            // Alternatif format kontrolü
            const simpleMatch = contentXml.match(/<content>([\s\S]*?)<\/content>/);
            if (simpleMatch) {
                return {
                    text: simpleMatch[1].trim(),
                    title: extractTitle(simpleMatch[1])
                };
            }
            throw new Error('UDF dosyasında içerik bulunamadı');
        }

        const rawText = cdataMatch[1];

        // documentproperties.xml dosyasını oku (varsa)
        let properties: UdfContent['properties'];
        const propsFile = zip.file('documentproperties.xml');
        if (propsFile) {
            const propsXml = await propsFile.async('string');
            properties = parseDocumentProperties(propsXml);
        }

        return {
            text: rawText.trim(),
            title: extractTitle(rawText),
            properties
        };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`UDF dosyası okunamadı: ${error.message}`);
        }
        throw new Error('UDF dosyası okunamadı: Bilinmeyen hata');
    }
}

/**
 * documentproperties.xml içeriğini parse eder
 */
function parseDocumentProperties(xml: string): UdfContent['properties'] {
    const properties: UdfContent['properties'] = {};

    // uyapdogrulamakodu
    const codeMatch = xml.match(/<entry key="uyapdogrulamakodu">([^<]+)<\/entry>/);
    if (codeMatch) {
        properties.verificationCode = codeMatch[1];
    }

    // uyapsicil
    const sicilMatch = xml.match(/<entry key="uyapsicil">([^<]+)<\/entry>/);
    if (sicilMatch) {
        properties.sicil = sicilMatch[1];
    }

    return properties;
}

/**
 * Metinden başlık çıkarmaya çalışır
 */
function extractTitle(text: string): string | undefined {
    const lines = text.split('\n').filter(line => line.trim());

    // İlk birkaç satırdan başlık çıkarmayı dene
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i].trim();

        // Tipik başlık kalıpları
        if (line.includes('DİLEKÇE') ||
            line.includes('RAPOR') ||
            line.includes('KARAR') ||
            line.includes('MAHKEMESİNE') ||
            line.includes('SAVCILIĞINA') ||
            line.includes('BAŞKANLIĞINA')) {
            return line;
        }
    }

    // Başlık bulunamazsa ilk satırı döndür (çok uzun değilse)
    if (lines.length > 0 && lines[0].length < 100) {
        return lines[0];
    }

    return undefined;
}

/**
 * Metin içeriğini HTML formatına dönüştürür (TipTap için)
 */
export function textToHtml(text: string): string {
    // Satırları ayır
    const lines = text.split('\n');

    let html = '';
    let inList = false;

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Boş satır
        if (!trimmedLine) {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += '<p></p>';
            continue;
        }

        // Madde işaretli liste kontrolü
        if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.startsWith('*')) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${escapeHtml(trimmedLine.substring(1).trim())}</li>`;
            continue;
        }

        // Numaralı liste kontrolü
        const numberedMatch = trimmedLine.match(/^(\d+)[.)\-]\s*(.+)/);
        if (numberedMatch) {
            if (!inList) {
                html += '<ol>';
                inList = true;
            }
            html += `<li>${escapeHtml(numberedMatch[2])}</li>`;
            continue;
        }

        // Liste dışındaysak kapat
        if (inList) {
            html += inList ? '</ul>' : '</ol>';
            inList = false;
        }

        // Normal paragraf
        // Tab ile başlıyorsa girinti ekle
        if (line.startsWith('\t') || line.startsWith('    ')) {
            html += `<p style="text-indent: 2em">${escapeHtml(trimmedLine)}</p>`;
        } else {
            html += `<p>${escapeHtml(trimmedLine)}</p>`;
        }
    }

    // Liste açık kaldıysa kapat
    if (inList) {
        html += '</ul>';
    }

    return html;
}

/**
 * HTML özel karakterlerini escape eder
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * File input'tan UDF dosyasını okur ve HTML olarak döndürür
 */
export async function importUdfAsHtml(file: File): Promise<{ html: string; title?: string }> {
    const content = await parseUdfFile(file);
    const html = textToHtml(content.text);

    return {
        html,
        title: content.title
    };
}
