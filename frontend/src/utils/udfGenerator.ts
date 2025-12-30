import JSZip from 'jszip';

interface UdfOptions {
    title?: string;
    content: string;
    date?: string;
    source?: string;
}

/**
 * UYAP (.udf) formatında dosya oluşturur
 * UDF dosyası aslında ZIP formatında içinde content.xml ve documentproperties.xml barındırır
 */
export async function generateUdfBlob(options: UdfOptions): Promise<Blob> {
    const {
        title = 'Hukuki Belge',
        content,
        date = new Date().toLocaleDateString('tr-TR'),
        source = 'Yargısal Zeka - yargisalzeka.com'
    } = options;

    // Satırları ayır ve boş satırları filtrele
    const lines = content.split('\n');

    // Düz metin içerik oluştur (CDATA için)
    const plainContent = `${title}

${content}

Oluşturma Tarihi: ${date}
Kaynak: ${source}`;

    // CDATA için güvenli hale getir
    const safeContent = plainContent.replace(/]]>/g, ']]]><![CDATA[>');

    // Benzersiz doğrulama kodu oluştur (8 karakterlik rastgele alfanumerik)
    const generateVerificationCode = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    // Rastgele sicil numarası oluştur (7 haneli)
    const generateSicil = (): string => {
        return Math.floor(1000000 + Math.random() * 9000000).toString();
    };

    // Rastgele web ID oluştur
    const generateWebId = (): string => {
        const segments: string[] = [];
        for (let i = 0; i < 4; i++) {
            let segment = '';
            for (let j = 0; j < 8; j++) {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                segment += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            segments.push(segment);
        }
        return segments.join('  -  ') + '=';
    };

    const verificationCode = generateVerificationCode();
    const sicil = generateSicil();
    const webId = generateWebId();

    // Paragraph elements oluştur - Her satır için ayrı paragraf
    let currentOffset = 0;
    const paragraphElements: string[] = [];

    // Başlık paragrafı (ortalı ve kalın)
    paragraphElements.push(`<paragraph SpaceBelow="1.0" Alignment="1" LineSpacing="0.0" SpaceAbove="1.0" resolver="hvl-default" LeftIndent="0.0" Hanging="0.0" RightIndent="0.0"><content resolver="hvl-default" header="false" bold="true" startOffset="${currentOffset}" length="${title.length}" /></paragraph>`);
    currentOffset += title.length + 1;

    // Boş satır
    paragraphElements.push(`<paragraph SpaceBelow="1.0" Alignment="0" LineSpacing="0.0" SpaceAbove="1.0" resolver="hvl-default" LeftIndent="0.0" Hanging="0.0" RightIndent="0.0"><content resolver="hvl-default" startOffset="${currentOffset}" length="1" /></paragraph>`);
    currentOffset += 1;

    // İçerik satırları
    for (const line of lines) {
        const trimmedLine = line.trim();
        const lineLength = trimmedLine.length || 1;

        // Boş satır kontrolü
        if (trimmedLine === '') {
            paragraphElements.push(`<paragraph SpaceBelow="1.0" Alignment="0" LineSpacing="0.0" SpaceAbove="1.0" resolver="hvl-default" LeftIndent="0.0" Hanging="0.0" RightIndent="0.0"><content resolver="hvl-default" startOffset="${currentOffset}" length="1" /></paragraph>`);
            currentOffset += 1;
        } else {
            // Normal paragraf
            paragraphElements.push(`<paragraph SpaceBelow="1.0" Alignment="3" LineSpacing="0.0" SpaceAbove="1.0" resolver="hvl-default" LeftIndent="0.0" Hanging="0.0" RightIndent="0.0" TabSet="27.0:0:0"><content resolver="hvl-default" startOffset="${currentOffset}" length="${lineLength}" /></paragraph>`);
            currentOffset += lineLength + 1;
        }
    }

    // Footer paragrafları
    paragraphElements.push(`<paragraph SpaceBelow="1.0" Alignment="0" LineSpacing="0.0" SpaceAbove="1.0" resolver="hvl-default" LeftIndent="0.0" Hanging="0.0" RightIndent="0.0"><content resolver="hvl-default" startOffset="${currentOffset}" length="1" /></paragraph>`);
    currentOffset += 1;

    const footerDateText = `Oluşturma Tarihi: ${date}`;
    paragraphElements.push(`<paragraph SpaceBelow="1.0" Alignment="0" LineSpacing="0.0" SpaceAbove="1.0" resolver="hvl-default" LeftIndent="0.0" Hanging="0.0" RightIndent="0.0"><content resolver="hvl-default" startOffset="${currentOffset}" length="${footerDateText.length}" /></paragraph>`);
    currentOffset += footerDateText.length + 1;

    const sourceText = `Kaynak: ${source}`;
    paragraphElements.push(`<paragraph SpaceBelow="1.0" Alignment="0" LineSpacing="0.0" SpaceAbove="1.0" resolver="hvl-default" LeftIndent="0.0" Hanging="0.0" RightIndent="0.0"><content resolver="hvl-default" startOffset="${currentOffset}" length="${sourceText.length}" /></paragraph>`);

    // UYAP uyumlu content.xml yapısı
    const contentXml = `<?xml version="1.0" encoding="UTF-8" ?>

<template format_id="1.8" >
<content><![CDATA[${safeContent}
]]></content><properties><pageFormat mediaSizeName="1" leftMargin="70.8661413192749" rightMargin="42.51968479156494" topMargin="42.51968479156494" bottomMargin="42.51968479156494" paperOrientation="1" headerFOffset="15.0" footerFOffset="60.00944846916199" /></properties>
<elements >
${paragraphElements.join('\n')}
<footer pageNumber-spec="BSP32_2088" pageNumber-seperator="/" pageNumber-fontBold="false" pageNumber-fontItalic="false" pageNumber-fontFace="Arial" pageNumber-fontSize="11" pageNumber-color="-16777216" pageNumber-foreStr="" pageNumber-pageStartNumStr=""><paragraph Alignment="0" SpaceBelow="0.0" description="Gövde" LineSpacing="0.0" SpaceAbove="0.0" family="Times New Roman" LeftIndent="0.0" RightIndent="0.0" size="12"><content resolver="hvl-default" family="Times New Roman" size="12" startOffset="${currentOffset}" length="3" /></paragraph></footer>
</elements>
<styles><style name="default" italic="false" description="Geçerli" bold="false" foreground="-16777216" family="Dialog" RightIndent="15.0" size="12" FONT_ATTRIBUTE_KEY="javax.swing.plaf.FontUIResource[family=Dialog,name=Dialog,style=plain,size=12]" /><style name="hvl-default" Alignment="0" SpaceBelow="0.0" description="Gövde" LineSpacing="0.0" SpaceAbove="0.0" family="Times New Roman" LeftIndent="0.0" RightIndent="0.0" size="12" /></styles>
<webID id="${webId}" >

</webID>

</template>
`;

    // UYAP uyumlu documentproperties.xml yapısı
    const documentPropertiesXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
<entry key="uyapdogrulamakodu">${verificationCode}</entry>
<entry key="uyapsicil">${sicil}</entry>
</properties>`;

    // ZIP oluştur - STORE (sıkıştırmasız) kullan
    const zip = new JSZip();
    zip.file('content.xml', contentXml);
    zip.file('documentproperties.xml', documentPropertiesXml);

    // ZIP'i blob olarak al
    const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE',
        mimeType: 'application/octet-stream'
    });

    return blob;
}

/**
 * UDF dosyasını indirir
 */
export async function downloadUdf(options: UdfOptions, filename: string): Promise<void> {
    const blob = await generateUdfBlob(options);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.udf') ? filename : `${filename}.udf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
