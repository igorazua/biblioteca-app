# 📜 Manifiesto y Especificación de Producto: Plataforma de Legado Cultural & Red Social de Afinidad

---

## 1. Visión y Misión
> **"No eres lo que aparentas ni lo que compras: eres las historias, coplas, películas y libros que te han construido por dentro."**

A diferencia de las redes sociales convencionales (Instagram, TikTok, LinkedIn) centradas en el contenido efímero, la estética y la vanidad, esta plataforma es un **Museo de la Sensibilidad Personal**: una biblioteca viva del legado cultural que una persona consume, atesora y comparte a lo largo de su existencia.

---

## 2. Compartir Listas y "Cápsulas Culturales" con Amigos (Feature Principal)

Una de las utilidades más directas y diarias de la app es poder enviar recomendaciones reales a quien tú quieras sin tener que redactar mensajes largos por WhatsApp:

* **Envío de Listas Completas:**
  * Entras a una categoría (ej. *Mis Películas*), pulsas **"Seleccionar todas"** y le das a compartir. A tu amigo le llega tu catálogo ordenado con tus notas.
* **Selección Quirúrgica (Micro-listas bajo demanda):**
  * Un amigo te pide consejo: seleccionas 3 o 5 obras concretas y se las envías directamente. Recibirá cada ficha con **tu valoración y tu comentario personal** de por qué se la recomiendas.
* **Paquetes Culturales Cruzados ("Cápsulas"):**
  * Puedes componer un paquete temático personalizado combinando distintos tipos de contenido (por ejemplo: *2 libros, 1 serie y 5 canciones para superar una ruptura* o *un paquete de bienvenida al Carnaval de Cádiz*).

---

## 3. Mecánicas de Ingesta & Descubrimiento Rápido

### 3.1. Discovery Feed Estilo "Swipe" (Curación Rápida)
* **Objetivo:** Descubrir nuevas obras o registrar rápidamente el contenido que ya has consumido en el pasado sin que resulte una tarea tediosa.
* **Flujo de la Ficha (Card UI):**
  * Portada a pantalla completa (libro, carátula de disco, póster de película, captura de chirigota).
  * Avatares de **amigos que ya lo tienen guardado** en primer plano.
  * Al pulsar sobre la ficha: se despliega la ficha completa (sinopsis, fecha, quién lo ha visto y qué nota/comentario le puso).
* **Gestos de Swipe:**
  * 👈 **Swipe Izquierda:** *"No me interesa / Descartar"*.
  * 👉 **Swipe Derecha:** *"Ya lo he visto / leído"*.
    * Despliega inmediatamente un micro-formulario: **puntuación (1-10 o estrellas)** + **cajetín de nota personal**.
  * 👆 **Swipe Arriba:** *"Guardar en Pendientes / Por ver"*.
  * 🔍 **Click Central:** Abrir ficha expandida con reseñas de tu círculo y perfiles destacados.

---

## 4. Mecánica de Clasificación a Pares ("A vs B")

El ser humano duda mucho cuando tiene que poner una nota numérica abstracta en frío. Sin embargo, comparar dos elementos cara a cara (*"¿Cuál prefieres, A o B?"*) es instantáneo. 

Esta mecánica se enfoca en dos utilidades claras:

1. **Curación Rápida de Contenido Importado (Sin esfuerzo mental):**
   * Tras importar de golpe 200 libros o películas desde Goodreads o Letterboxd, muchas quedan sin valorar. En lugar de poner notas una a una, la app te muestra pares rápidos: vas eligiendo cuál te gustó más y el sistema las califica y ordena automáticamente.
2. **Coordinación de Parejas y Grupos ("¿Qué vemos / qué escuchamos?"):**
   * Dos o más personas conectan sus perfiles para resolver el clásico dilema en segundos:
     * **Películas pendientes comunes:** Obras que ninguno de los dos ha visto todavía y ambos quieren ver.
     * **Favoritos compartidos:** Obras que ambos aman para una apuesta segura.
     * **"El DJ de consenso":** Cruzas los perfiles de los presentes en un coche o fiesta y se genera una lista musical equilibrada con canciones que todos disfrutan.

---

## 5. El Validador Previo ("¿Quién lo vio antes que yo?")

Antes de pagar una entrada de cine, comprar un libro o empezar una serie, entras a la ficha de la obra en la app:
* Ves inmediatamente qué amigos de tu círculo ya la han consumido y qué opinan (*"Carlos le dio un 9; Laura un 4"*).
* **El Puente hacia la Conversación Real:** Más allá de leer la ficha, te da el motivo perfecto para **escribir o llamar a ese amigo en persona** (*«Oye Carlos, he visto que le pusiste un 9 a esta peli, ¿me la recomiendas para este finde?»*). La tecnología al servicio de la conversación humana real, no para sustituirla.

---

## 6. Trazabilidad & Árbol Genealógico del Descubrimiento

* **El Metadato Oculto `descubierto_por: @amigo`:**
  * Si guardas una obra partiendo del perfil o lista de un amigo, queda registrado quién te la descubrió.
* **El Efecto Onda (Ser un 'Tastemaker'):**
  * Visualiza el impacto de tu criterio: *«Le descubriste esta chirigota a Carlos → Carlos se la pasó a Laura → Laura se la enseñó a 40 personas»*.
* **El Agradecimiento Automático:**
  * Recordatorio anual: *«Hoy hace un año que María te recomendó este libro que calificaste con 5 estrellas. Pulsa aquí para enviarle un 'Gracias por descubrírmelo'»*.

---

## 7. Wishlist Viva (Regalos Infalibles) & Wrapped Anual

* **Social Gifting:**
  * En cumpleaños o Navidad, tus amigos o pareja entran a tu perfil para ver tus obras en «Pendientes» o tus obras favoritas de siempre (para regalar vinilos, libros o entradas sin equivocarse).
* **Wrapped Anual con Alma:**
  * Recapitulación anual del crecimiento cultural y reconocimiento a los amigos que más aportaron a tu biblioteca ese año.

---

## 8. Importación de Datos & Integraciones Externas

* **Goodreads & Letterboxd:** Importación instantánea vía archivo oficial `.csv`.
* **Spotify:** Sincronización oficial por API con biblioteca y favoritos.
* **FilmAffinity:** Importación asistida por enlace público de usuario.
* **Contactos del Móvil:** Detección de amigos mediante hash seguro de agenda telefónica.
* **TikTok / YouTube / Instagram:** Ingesta directa desde el menú nativo "Compartir con..." del teléfono.

---

## 9. Ideas y Extensiones para el Futuro

* **Dating por Afinidad Cultural:** Modo de conexión profunda entre personas afines basado en su compatibilidad de consumo artístico y sensibilidad compartida, sin superficialidad.
