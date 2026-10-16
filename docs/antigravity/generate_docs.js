const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');

async function createWordDocument() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 22, // 11pt
            color: "222222"
          }
        }
      }
    },
    sections: [{
      properties: {},
      children: [
        // Portada / Encabezado Principal
        new Paragraph({
          text: "📜 Manifiesto y Especificación de Producto",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Plataforma de Legado Cultural & Red Social de Afinidad",
              bold: true,
              size: 28,
              color: "1e3a8a" // Azul elegante
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),

        // 1. Visión y Misión
        new Paragraph({
          text: "1. Visión y Misión",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "«No eres lo que aparentas ni lo que compras: eres las historias, coplas, películas y libros que te han construido por dentro.»",
              italics: true,
              bold: true,
              color: "b45309"
            })
          ],
          spacing: { after: 120 }
        }),
        new Paragraph({
          text: "A diferencia de las redes sociales convencionales (Instagram, TikTok, LinkedIn) centradas en el contenido efímero, la estética y la vanidad, esta plataforma es un Museo de la Sensibilidad Personal: una biblioteca viva del legado cultural que una persona consume, atesora y comparte a lo largo de su existencia.",
          spacing: { after: 200 }
        }),

        // 2. Compartir Listas y Cápsulas
        new Paragraph({
          text: "2. Compartir Listas y «Cápsulas Culturales» con Amigos (Feature Principal)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          text: "Una de las utilidades más directas y diarias de la app es poder enviar recomendaciones reales a quien tú quieras sin tener que redactar mensajes largos por WhatsApp:",
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Envío de Listas Completas: ", bold: true }),
            new TextRun("Entras a una categoría (ej. Mis Películas), pulsas «Seleccionar todas» y le das a compartir. A tu amigo le llega tu catálogo ordenado con tus notas.")
          ],
          spacing: { after: 80 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Selección Quirúrgica (Micro-listas bajo demanda): ", bold: true }),
            new TextRun("Un amigo te pide consejo: seleccionas 3 o 5 obras concretas y se las envías directamente. Recibirá cada ficha con tu valoración y tu comentario personal de por qué se la recomiendas.")
          ],
          spacing: { after: 80 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Paquetes Culturales Cruzados («Cápsulas»): ", bold: true }),
            new TextRun("Puedes componer un paquete temático personalizado combinando distintos tipos de contenido (por ejemplo: 2 libros, 1 serie y 5 canciones para superar una ruptura o un paquete de bienvenida al Carnaval de Cádiz).")
          ],
          spacing: { after: 200 }
        }),

        // 3. Mecánicas de Ingesta & Descubrimiento
        new Paragraph({
          text: "3. Mecánicas de Ingesta & Descubrimiento Rápido",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          text: "Discovery Feed Estilo «Swipe» (Curación Rápida):",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Objetivo: Descubrir nuevas obras o registrar rápidamente el contenido que ya has consumido en el pasado sin que resulte una tarea tediosa.",
          spacing: { after: 60 }
        }),
        new Paragraph({
          text: "• Flujo de la Ficha (Card UI): Portada a pantalla completa (libro, carátula, póster o chirigota) con avatares de amigos que ya lo tienen guardado en primer plano. Al pulsar sobre la ficha se despliega la ficha completa.",
          spacing: { after: 60 }
        }),
        new Paragraph({
          text: "• Gestos de Swipe:",
          spacing: { after: 40 }
        }),
        new Paragraph({ text: "   - Swipe Izquierda: «No me interesa / Descartar»." }),
        new Paragraph({ text: "   - Swipe Derecha: «Ya lo he visto / leído» (despliega micro-formulario: puntuación 1-10 + cajetín de nota personal)." }),
        new Paragraph({ text: "   - Swipe Arriba: «Guardar en Pendientes / Por ver»." }),
        new Paragraph({ text: "   - Click Central: Abrir ficha expandida con reseñas de tu círculo y perfiles destacados.", spacing: { after: 200 } }),

        // 4. Mecánica a Pares
        new Paragraph({
          text: "4. Mecánica de Clasificación a Pares («A vs B»)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          text: "El ser humano duda mucho cuando tiene que poner una nota numérica abstracta en frío. Sin embargo, comparar dos elementos cara a cara («¿Cuál prefieres, A o B?») es instantáneo. Esta mecánica se enfoca en dos utilidades claras:",
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "1. Curación Rápida de Contenido Importado (Sin esfuerzo mental): ", bold: true }),
            new TextRun("Tras importar de golpe 200 libros o películas desde Goodreads o Letterboxd, muchas quedan sin valorar. En lugar de poner notas una a una, la app te muestra pares rápidos: vas eligiendo cuál te gustó más y el sistema las califica y ordena automáticamente.")
          ],
          spacing: { after: 80 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "2. Coordinación de Parejas y Grupos («¿Qué vemos / qué escuchamos?»): ", bold: true }),
            new TextRun("Dos o más personas conectan sus perfiles para resolver el clásico dilema en segundos: películas pendientes comunes que ninguno ha visto, favoritos compartidos para apuestas seguras, o «el DJ de consenso» que genera una lista musical equilibrada para un viaje o fiesta.")
          ],
          spacing: { after: 200 }
        }),

        // 5. El Validador Previo
        new Paragraph({
          text: "5. El Validador Previo («¿Quién lo vio antes que yo?»)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          text: "Antes de pagar una entrada de cine, comprar un libro o empezar una serie, entras a la ficha de la obra en la app y ves inmediatamente qué amigos de tu círculo ya la han consumido y qué opinan («Carlos le dio un 9; Laura un 4»).",
          spacing: { after: 80 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "El Puente hacia la Conversación Real: ", bold: true }),
            new TextRun("Más allá de leer la ficha, te da el motivo perfecto para escribir o llamar a ese amigo en persona («Oye Carlos, he visto que le pusiste un 9 a esta peli, ¿me la recomiendas para este finde?»). La tecnología al servicio de la conversación humana real, no para sustituirla.")
          ],
          spacing: { after: 200 }
        }),

        // 6. Trazabilidad
        new Paragraph({
          text: "6. Trazabilidad & Árbol Genealógico del Descubrimiento",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• El Metadato Oculto descubierto_por: @amigo: ", bold: true }),
            new TextRun("Si guardas una obra partiendo del perfil o lista de un amigo, queda registrado quién te la descubrió.")
          ],
          spacing: { after: 60 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• El Efecto Onda (Ser un 'Tastemaker'): ", bold: true }),
            new TextRun("Visualiza el impacto de tu criterio: «Le descubriste esta chirigota a Carlos → Carlos se la pasó a Laura → Laura se la enseñó a 40 personas».")
          ],
          spacing: { after: 60 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• El Agradecimiento Automático: ", bold: true }),
            new TextRun("Recordatorio anual: «Hoy hace un año que María te recomendó este libro que calificaste con 5 estrellas. Pulsa aquí para enviarle un 'Gracias por descubrírmelo'».")
          ],
          spacing: { after: 200 }
        }),

        // 7. Wishlist Viva
        new Paragraph({
          text: "7. Wishlist Viva (Regalos Infalibles) & Wrapped Anual",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Social Gifting: ", bold: true }),
            new TextRun("En cumpleaños o Navidad, tus amigos o pareja entran a tu perfil para ver tus obras en «Pendientes» o tus obras favoritas de siempre (para regalar vinilos, libros o entradas sin equivocarse).")
          ],
          spacing: { after: 60 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Wrapped Anual con Alma: ", bold: true }),
            new TextRun("Recapitulación anual del crecimiento cultural y reconocimiento a los amigos que más aportaron a tu biblioteca ese año.")
          ],
          spacing: { after: 200 }
        }),

        // 8. Importación de Datos
        new Paragraph({
          text: "8. Importación de Datos & Integraciones Externas",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({ text: "• Goodreads & Letterboxd: Importación instantánea vía archivo oficial .csv." }),
        new Paragraph({ text: "• Spotify: Sincronización oficial por API con biblioteca y favoritos." }),
        new Paragraph({ text: "• FilmAffinity: Importación asistida por enlace público de usuario." }),
        new Paragraph({ text: "• Contactos del Móvil: Detección de amigos mediante hash seguro de agenda telefónica." }),
        new Paragraph({ text: "• TikTok / YouTube / Instagram: Ingesta directa desde el menú nativo «Compartir con...» del teléfono.", spacing: { after: 200 } }),

        // 9. Futuro
        new Paragraph({
          text: "9. Ideas y Extensiones para el Futuro",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Dating por Afinidad Cultural: ", bold: true }),
            new TextRun("Modo de conexión profunda entre personas afines basado en su compatibilidad de consumo artístico y sensibilidad compartida, sin superficialidad.")
          ],
          spacing: { after: 120 }
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, 'VISION_Y_FEATURES.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Documento Word (.docx) generado en:', outPath);
}

createWordDocument().catch(console.error);
