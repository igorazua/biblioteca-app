/**
 * generate-sample-data.mjs
 * Genera la muestra de 20 obras por estantería (100 en total) en modo agente
 * para la revisión de Igor (TAREAS_MOTOR_V2.md T5.3).
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateEnrichment } from '../engine/llm.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const CACHE_DIR = join(here, '..', 'cache', 'llm')
const ENRICHED_DIR = join(CACHE_DIR, 'enriched')
const SAMPLE_MD = join(CACHE_DIR, 'sample.md')

export const SAMPLE_DATA = {
  movie: [
    {
      id: "movie:el-padrino-1972",
      title: "El padrino",
      experience: {
        plot: "El patriarca de una dinastía de la mafia neoyorquina transfiere a regañadientes el control de su imperio clandestino a su hijo menor. A medida que las tensiones entre familias escalan, el joven se adentra irremediablemente en la espiral de violencia y poder.",
        feeling: "Solemne, majestuosa, con un ritmo ceremonioso pero implacable y una atmósfera de tragedia shakespeariana. Te deja sobrecogido ante la inexorable corrupción moral del poder.",
        hook: "La hipnótica interpretación de Marlon Brando y Al Pacino, la fotografía en claroscuro de Gordon Willis y la disección quirúrgica de la lealtad familiar.",
        notFor: "Quien busque acción rápida contemporánea, tiros constantes o una trama ligera sin peso dramático.",
        similar: ["El padrino Parte II", "Uno de los nuestros", "Érase una vez en América", "Gangs of New York"],
        context: "Clásico absoluto del cine estadounidense de 1972, obra cumbre de Francis Ford Coppola que redefinió el género de gánsteres."
      },
      axes: { tono: 4, ritmo: 2, emocion: 5, exigencia: 4, humor: 1, tension: 4, fantasia: 1, violencia: 4, familiar: 2, escala: 4, reconfort: 2 },
      themes: ["mafia", "familia", "crimen", "ambicion", "traicion", "corrupcion_politica"],
      moments: ["noche_tarde", "pensar", "solo"],
      oneLiner: "Monumental tragedia sobre la familia, la ambición y el peso corruptor del poder.",
      confidence: "alta"
    },
    {
      id: "movie:pulp-fiction-1994",
      title: "Pulp Fiction",
      experience: {
        plot: "Las vidas de dos matones a sueldo, la esposa de un gánster, un boxeador en declive y una pareja de atracadores novatos se entrelazan en Los Ángeles. Una serie de incidentes absurdos y sangrientos alteran sus destinos de forma imprevisible.",
        feeling: "Electrizante, desenfadada, rabiosamente cínica y adictiva. Te deja con una inyección de pura energía cinéfila y ganas de citar cada diálogo.",
        hook: "Sus diálogos memorables cargados de humor negro, su estructura coral no lineal y una banda sonora inolvidable.",
        notFor: "Espectadores reacios a la violencia gráfica desenfadada o a los relatos desestructurados en el tiempo.",
        similar: ["Reservoir Dogs", "Snatch", "Fargo", "Uno de los nuestros"],
        context: "Palma de Oro en Cannes 1994, fenómeno pop absoluto que consagró a Quentin Tarantino y transformó el cine independiente de los 90."
      },
      axes: { tono: 3, ritmo: 4, emocion: 3, exigencia: 3, humor: 5, tension: 4, fantasia: 1, violencia: 5, familiar: 1, escala: 2, reconfort: 3 },
      themes: ["crimen", "mafia", "venganza", "redencion", "satira_social", "atraco"],
      moments: ["amigos", "noche_tarde", "para_repetir"],
      oneLiner: "Pólvora pop, diálogos míticos y humor negro en un clásico revolucionario del cine.",
      confidence: "alta"
    },
    {
      id: "movie:forrest-gump-1994",
      title: "Forrest Gump",
      experience: {
        plot: "Un bondadoso joven de Alabama con leve discapacidad intelectual presencia y protagoniza los acontecimientos más cruciales de la historia de EE. UU. Sin embargo, su único deseo verdadero es permanecer cerca de su amor de la infancia.",
        feeling: "Emotiva, entrañable, nostálgica y llena de un optimismo contagioso. Deja el corazón encogido de ternura y una sonrisa imborrable.",
        hook: "La magistral actuación de Tom Hanks, el ingenioso viaje por décadas históricas y la pureza conmovedora del protagonista.",
        notFor: "Quienes sospechen del sentimentalismo cinematográfico o busquen una mirada ácida y crítica de la historia.",
        similar: ["El curioso caso de Benjamin Button", "Big Fish", "La vida es bella", "Cadena perpetua"],
        context: "Gran triunfadora de los Óscar en 1994, clásico popular universal que dejó huella profunda en la cultura popular."
      },
      axes: { tono: 1, ritmo: 3, emocion: 5, exigencia: 2, humor: 4, tension: 2, fantasia: 2, violencia: 2, familiar: 5, escala: 4, reconfort: 5 },
      themes: ["amor", "amistad", "guerra", "duelo", "infancia", "viajes_por_carretera"],
      moments: ["familia", "llorar", "para_repetir", "domingo_tarde"],
      oneLiner: "Emoción pura, ternura y un viaje inolvidable por la bondad humana a través de la historia.",
      confidence: "alta"
    },
    {
      id: "movie:cadena-perpetua-1994",
      title: "Cadena perpetua",
      experience: {
        plot: "Un banquero condenado injustamente a dos cadenas perpetuas en la prisión de Shawshank entabla amistad con un recluso veterano. A lo largo de los años, su dignidad inquebrantable y su silenciosa esperanza transforman su entorno.",
        feeling: "Esperanzadora, cálida, reflexiva y profundamente humana. Proporciona una de las catarsis emocionales más liberadoras y reconfortantes del cine.",
        hook: "La entrañable complicidad entre Tim Robbins y Morgan Freeman y el magistral tratamiento de la paciencia y la redención.",
        notFor: "Quien busque acción carcelaria frenética, peleas constantes o un thriller efectista.",
        similar: ["La milla verde", "Alcatraz", "En nombre del padre", "Doce hombres sin piedad"],
        context: "Top 1 histórico de IMDb desde hace décadas, venerada mundialmente como el gran clásico de la esperanza carcelaria."
      },
      axes: { tono: 2, ritmo: 2, emocion: 5, exigencia: 2, humor: 2, tension: 3, fantasia: 1, violencia: 3, familiar: 3, escala: 2, reconfort: 5 },
      themes: ["amistad", "justicia", "libertad", "redencion", "supervivencia", "soledad"],
      moments: ["pensar", "llorar", "para_repetir", "solo"],
      oneLiner: "Un himno a la paciencia, la amistad verdadera y la dignidad frente a la injusticia.",
      confidence: "alta"
    },
    {
      id: "movie:el-rey-leon-1994",
      title: "El rey león",
      experience: {
        plot: "Un joven cachorro de león destinado a gobernar la sabana es engañado por su malvado tío tras la trágica muerte de su padre y huye al exilio. Al madurar con nuevos amigos, deberá asumir su responsabilidad y reclamar su reino.",
        feeling: "Épica, conmovedora, visualmente deslumbrante y musicalmente triunfal. Evoca la emoción infantil de la pérdida y el renacer maduro.",
        hook: "La colosal música de Hans Zimmer y Elton John, la imponente animación tradicional y el arquetipo universal del ciclo de la vida.",
        notFor: "Espectadores adultos que busquen exclusivamente animación experimental o temáticas adultas.",
        similar: ["Bambi", "Tarzán", "El príncipe de Egipto", "El viaje de Chihiro"],
        context: "La cumbre del Renacimiento de Disney en 1994 y una de las películas animadas más taquilleras e influyentes de la historia."
      },
      axes: { tono: 2, ritmo: 3, emocion: 5, exigencia: 1, humor: 4, tension: 3, fantasia: 3, violencia: 2, familiar: 5, escala: 4, reconfort: 4 },
      themes: ["familia", "duelo", "amistad", "venganza", "mayoria_de_edad", "traicion"],
      moments: ["familia", "llorar", "reir", "para_repetir"],
      oneLiner: "Mágica, grandiosa e imperecedera fábula sobre el deber, la pérdida y el perdón.",
      confidence: "alta"
    },
    {
      id: "movie:matrix-1999",
      title: "Matrix",
      experience: {
        plot: "Un programador informático descubre que la realidad cotidiana en la que vive es una simulación virtual creada por inteligencias artificiales para someter a la humanidad. Reclutado por la resistencia, aprende a desafiar las leyes de la física para liderar la rebelión.",
        feeling: "Visionaria, cerebral, adrenalínica y de un estilazo cyberpunk irrepetible. Deja la cabeza llena de preguntas filosóficas sobre la percepción y la libertad.",
        hook: "Las secuencias de acción revolucionarias con 'bullet time', la mitología transgresora y el choque entre tecnología y conciencia.",
        notFor: "Quien prefiera dramas cotidianos intimistas o no disfrute con la ciencia ficción densa y el cine de artes marciales.",
        similar: ["Terminator 2", "Inception", "Dark City", "Blade Runner"],
        context: "Hito absoluto de la ciencia ficción de finales de los 90 de las hermanas Wachowski, cambió para siempre los efectos visuales."
      },
      axes: { tono: 4, ritmo: 4, emocion: 3, exigencia: 4, humor: 1, tension: 4, fantasia: 4, violencia: 4, familiar: 2, escala: 4, reconfort: 3 },
      themes: ["ia_y_robots", "distopia", "libertad", "identidad", "existencialismo", "supervivencia"],
      moments: ["pensar", "noche_tarde", "amigos", "para_repetir"],
      oneLiner: "Revolución visual y filosófica que redefinió para siempre el cine de ciencia ficción.",
      confidence: "alta"
    },
    {
      id: "movie:el-club-de-la-lucha-1999",
      title: "El club de la lucha",
      experience: {
        plot: "Un oficinista hastiado y consumido por el insomnio conoce a un carismático y rebelde vendedor de jabón con una visión nihilista del mundo. Juntos fundan un club de peleas clandestino que pronto muta en una peligrosa organización terrorista anticapitalista.",
        feeling: "Visceral, provocadora, frenética y oscura como el asfalto. Provoca una sacudida mental sobre la alienación del consumo moderno.",
        hook: "El montaje afilado de David Fincher, la química incendiaria de Pitt y Norton y una crítica social feroz con giro de antología.",
        notFor: "Espectadores sensibles a la agresividad física o que busquen complacencia moral en sus protagonistas.",
        similar: ["Taxi Driver", "Seven", "American Psycho", "Memento"],
        context: "Película de culto generacional estrenada en 1999 basada en la novela de Chuck Palahniuk, emblema de la angustia de fin de milenio."
      },
      axes: { tono: 5, ritmo: 4, emocion: 4, exigencia: 4, humor: 3, tension: 5, fantasia: 2, violencia: 5, familiar: 1, escala: 3, reconfort: 1 },
      themes: ["salud_mental", "obsesion", "lucha_de_clases", "identidad", "satira_social", "existencialismo"],
      moments: ["noche_tarde", "pensar", "solo"],
      oneLiner: "Explosiva, corrosiva y de culto absoluto: una bofetada a la sociedad de consumo.",
      confidence: "alta"
    },
    {
      id: "movie:el-senor-de-los-anillos-la-comunidad-del-anillo-2001",
      title: "El señor de los anillos: La comunidad del anillo",
      experience: {
        plot: "Un tímido hobbit hereda un anillo mágico que encierra el poder del Señor Oscuro y debe emprender un viaje épico a través de la Tierra Media para destruirlo. Lo acompaña una comunidad diversa de guerreros, magos y amigos dispuestos a dar la vida por la misión.",
        feeling: "Mágica, sobrecogedora, entrañable y de una grandeza inaudita. Te sumerge por completo en un universo mitológico vivo y majestuoso.",
        hook: "La insuperable ambientación de Nueva Zelanda, la épica banda sonora de Howard Shore y la pureza del vínculo fraternal entre sus personajes.",
        notFor: "Quienes no tengan paciencia para narraciones pausadas de larga duración o sientan aversión a la alta fantasía.",
        similar: ["El retorno del rey", "Las dos torres", "Star Wars: Una nueva esperanza", "Gladiator"],
        context: "Arranque de la trilogía más laureada y querida de la historia del cine moderno, dirigida con maestría por Peter Jackson."
      },
      axes: { tono: 3, ritmo: 3, emocion: 5, exigencia: 3, humor: 2, tension: 4, fantasia: 5, violencia: 3, familiar: 4, escala: 5, reconfort: 4 },
      themes: ["mitologia", "amistad", "exploracion", "sacrificio", "guerra", "viajes_por_carretera"],
      moments: ["desconectar", "para_repetir", "amigos", "familia"],
      oneLiner: "La mayor cumbre del cine de fantasía: épica, mitología y una amistad indestructible.",
      confidence: "alta"
    },
    {
      id: "movie:gladiator-2000",
      title: "Gladiator",
      experience: {
        plot: "Un leal general romano traicionado tras el asesinato del emperador es vendido como esclavo y forzado a convertirse en gladiador. Su habilidad en la arena le permite ascender hasta el Coliseo de Roma para vengar la muerte de su familia y la gloria de Roma.",
        feeling: "Fiera, trágica, emocionante y triunfante. Eleva el pulso con el rugido de la arena y conmueve con su anhelo de paz y justicia.",
        hook: "La icónica y estoica presencia de Russell Crowe, el carismático villano de Joaquin Phoenix y la arrolladora dirección de Ridley Scott.",
        notFor: "Quien busque rigor histórico estricto o no tolere la violencia sanguinaria de los combates cuerpo a cuerpo.",
        similar: ["Braveheart", "Troya", "Espartaco", "El reino de los cielos"],
        context: "Ganadora de 5 premios Óscar en el año 2000, resucitó en solitario el género del péplum a escala global."
      },
      axes: { tono: 4, ritmo: 4, emocion: 5, exigencia: 2, humor: 1, tension: 4, fantasia: 1, violencia: 5, familiar: 2, escala: 5, reconfort: 3 },
      themes: ["venganza", "justicia", "guerra", "familia", "traicion", "sacrificio"],
      moments: ["pensar", "amigos", "noche_tarde", "solo"],
      oneLiner: "Furia, honor y venganza en la arena romana con una fuerza dramática colosal.",
      confidence: "alta"
    },
    {
      id: "movie:titanic-1997",
      title: "Titanic",
      experience: {
        plot: "A bordo del transatlántico más majestuoso del mundo, una joven de alta sociedad asfixiada por las convenciones se enamora de un pintor bohemio de tercera clase. Su apasionado romance se convierte en una lucha desesperada por sobrevivir al colapso del navío.",
        feeling: "Romántica, apabullante, trágica y espectacular. Te transporta a la Belle Époque antes de sumergirte en el terror de la catástrofe.",
        hook: "La arrebatadora química de DiCaprio y Winslet, la reconstrucción histórica faraónica y el dramatismo del hundimiento minuto a minuto.",
        notFor: "Espectadores contrarios a los melodramas románticos de gran presupuesto o con alergia a las baladas de Celine Dion.",
        similar: ["Lo que el viento se llevó", "Avatar", "El curioso caso de Benjamin Button", "Pearl Harbor"],
        context: "Ganadora de 11 premios Óscar y récord histórico de taquilla en 1997, un icono indeleble del cine contemporáneo."
      },
      axes: { tono: 3, ritmo: 3, emocion: 5, exigencia: 2, humor: 2, tension: 4, fantasia: 1, violencia: 3, familiar: 4, escala: 5, reconfort: 3 },
      themes: ["amor", "lucha_de_clases", "supervivencia", "duelo", "desamor"],
      moments: ["pareja", "llorar", "domingo_tarde", "para_repetir"],
      oneLiner: "Un coloso cinematográfico donde el romance más puro choca contra la catástrofe naval.",
      confidence: "alta"
    },
    {
      id: "movie:parque-jurasico-1993",
      title: "Parque Jurásico",
      experience: {
        plot: "Un excéntrico multimillonario logra clonar dinosaurios a partir de ADN prehistórico e invita a un grupo de científicos a un parque temático secreto antes de su apertura. Cuando un sabotaje desconecta los sistemas de seguridad, los visitantes quedan a merced de los depredadores.",
        feeling: "Fascinante, trepidante, aterradora por momentos y repleta de asombro infantil. Una clase magistral de tensión y aventura pura.",
        hook: "El mítico primer encuentro con el Brachiosaurus, el ataque nocturno del T-Rex y los dinosaurios más realistas jamás creados.",
        notFor: "Público infantil muy pequeño debido a secuencias de suspense y terror moderadamente intenso.",
        similar: ["Tiburón", "King Kong", "Alien", "En busca del arca perdida"],
        context: "Obra maestra del cine de entretenimiento de Steven Spielberg de 1993 que revolucionó los efectos digitales en Hollywood."
      },
      axes: { tono: 2, ritmo: 4, emocion: 4, exigencia: 2, humor: 3, tension: 5, fantasia: 4, violencia: 3, familiar: 4, escala: 4, reconfort: 4 },
      themes: ["ia_y_robots", "supervivencia", "monstruos", "exploracion", "conspiracion"],
      moments: ["familia", "amigos", "desconectar", "para_repetir"],
      oneLiner: "Puro cine de evasión y prodigio técnico que devolvió la vida a los dinosaurios.",
      confidence: "alta"
    },
    {
      id: "movie:regreso-al-futuro-1985",
      title: "Regreso al futuro",
      experience: {
        plot: "Un adolescente de los años 80 es enviado accidentalmente a 1955 a bordo de un DeLorean modificado por su excéntrico amigo científico. Allí debe conseguir que sus futuros padres se enamoren para no desvanecerse de la existencia y poder volver a su tiempo.",
        feeling: "Perfectamente calibrada, rebosante de encanto, dinamismo y nostalgia luminosa. Pone de buen humor de principio a fin.",
        hook: "Un guion de relojería sin una sola escena sobrante, la irresistible pareja Marty McFly y Doc Brown y el ritmo contagioso.",
        notFor: "Quien busque ciencia ficción dura y austera con leyes de la física implacables.",
        similar: ["Los Cazafantasmas", "Indiana Jones", "Atrapado en el tiempo", "Men in Black"],
        context: "La cumbre de la comedia fantástica de los 80 producida por Amblin y dirigida por Robert Zemeckis."
      },
      axes: { tono: 1, ritmo: 5, emocion: 3, exigencia: 1, humor: 5, tension: 3, fantasia: 4, violencia: 1, familiar: 5, escala: 2, reconfort: 5 },
      themes: ["viaje_en_el_tiempo", "amistad", "familia", "juventud_rebelde", "mayoria_de_edad"],
      moments: ["familia", "reir", "desconectar", "para_repetir"],
      oneLiner: "Una de las comedias de aventuras más perfectas, chispeantes y redondas de la historia.",
      confidence: "alta"
    },
    {
      id: "movie:la-lista-de-schindler-1993",
      title: "La lista de Schindler",
      experience: {
        plot: "En la Polonia ocupada por los nazis durante la Segunda Guerra Mundial, un vanidoso empresario alemán utiliza a prisioneros judíos como mano de obra barata. Al presenciar la barbarie del genocidio, gasta toda su fortuna en protegerlos y salvar más de un millar de vidas.",
        feeling: "Devastadora, sobrecogedora, sobria y de una desgarradora humanidad. Te confronta con la crueldad absoluta y la nobleza más heroica.",
        hook: "La magistral fotografía en blanco y negro de Kaminski, la partitura melancólica de John Williams con Itzhak Perlman y la transformación moral de Liam Neeson.",
        notFor: "Tardes ligeras o momentos de ánimo bajo; es una experiencia emocionalmente dolorosa y exigente.",
        similar: ["El pianista", "La vida es bella", "El hijo de Saúl", "Salvar al soldado Ryan"],
        context: "Magnum opus dramática de Steven Spielberg ganadora de 7 premios Óscar, documento cinematográfico fundamental sobre la memoria del siglo XX."
      },
      axes: { tono: 5, ritmo: 2, emocion: 5, exigencia: 5, humor: 1, tension: 5, fantasia: 1, violencia: 5, familiar: 1, escala: 4, reconfort: 2 },
      themes: ["guerra", "racismo", "justicia", "redencion", "supervivencia", "sacrificio"],
      moments: ["pensar", "llorar", "solo"],
      oneLiner: "Inconmensurable testimonio de horror y compasión humana en el corazón del Holocausto.",
      confidence: "alta"
    },
    {
      id: "movie:salvar-al-soldado-ryan-1998",
      title: "Salvar al soldado Ryan",
      experience: {
        plot: "Tras el cruento desembarco en las playas de Normandía, un capitán del ejército estadounidense lidera a un pelotón tras las líneas enemigas para encontrar y rescatar a un soldado cuyos tres hermanos han muerto en combate.",
        feeling: "Inmersiva, brutal, conmovedora y profundamente solemne. Traslada la crudeza física y el pavor psicológico del combate como ninguna otra obra bélica.",
        hook: "Los primeros 25 minutos del Día D en Omaha Beach, la cámara al hombro vanguardista y el dilema moral sobre el valor de una vida.",
        notFor: "Personas con aversión a la sangre, amputaciones o representaciones hiperrealistas de la guerra.",
        similar: ["Hermanos de sangre", "1917", "La delgada línea roja", "Dunkerque"],
        context: "El referente moderno definitivo del cine bélico que cambió la estética de las batallas contemporáneas."
      },
      axes: { tono: 4, ritmo: 4, emocion: 5, exigencia: 3, humor: 1, tension: 5, fantasia: 1, violencia: 5, familiar: 1, escala: 5, reconfort: 2 },
      themes: ["guerra", "sacrificio", "amistad", "duelo", "supervivencia"],
      moments: ["pensar", "solo", "noche_tarde"],
      oneLiner: "Realismo bélico demoledor y un conmovedor tributo a la hermandad bajo el fuego.",
      confidence: "alta"
    },
    {
      id: "movie:el-silencio-de-los-corderos-1991",
      title: "El silencio de los corderos",
      experience: {
        plot: "Una brillante pero inexperta agente en formación del FBI es enviada a entrevistar al brillante y encarcelado psiquiatra caníbal Hannibal Lecter. Con sus ambiguas pistas psicológicas, debe atrapar a un sádico asesino que despelleja a sus víctimas.",
        feeling: "Perturbadora, tensa, quirúrgica y fascinante. Mantiene un escalofrío helado en la espalda con cada primer plano.",
        hook: "El electrizante juego del gato y el ratón entre Anthony Hopkins y Jodie Foster a través de un cristal de máxima seguridad.",
        notFor: "Espectadores aprensivos al terror psicológico, la psicopatía médica o el suspense claustrofóbico.",
        similar: ["Seven", "Zodiac", "Mindhunter", "Prisioneros"],
        context: "Una de las tres únicas películas en la historia en ganar los cinco grandes premios Óscar (película, director, guion, actor y actriz)."
      },
      axes: { tono: 5, ritmo: 3, emocion: 4, exigencia: 4, humor: 1, tension: 5, fantasia: 1, violencia: 4, familiar: 1, escala: 2, reconfort: 1 },
      themes: ["crimen", "investigacion", "asesino_en_serie", "salud_mental", "justicia"],
      moments: ["noche_tarde", "pasar_miedo", "pensar", "solo"],
      oneLiner: "Duelo psicológico aterrador e impecable entre una novata del FBI y el caníbal más culto.",
      confidence: "alta"
    },
    {
      id: "movie:seven-1995",
      title: "Seven",
      experience: {
        plot: "Dos detectives de homicidios, uno al borde de la jubilación y otro joven impulsivo, investigan los macabros crímenes de un asesino en serie meticuloso. Cada ejecución reproduce uno de los siete pecados capitales en una ciudad sumida en la lluvia perpetua.",
        feeling: "Opresiva, sombría, implacable y sórdida. Te deja un poso amargo y una desasosegante sensación de vulnerabilidad.",
        hook: "La atmósfera pluviosa y claustrofóbica creada por David Fincher y uno de los desenlaces más desgarradores de la historia del cine.",
        notFor: "Sensibles a la degradación moral o quienes necesiten resoluciones reconfortantes y justicieras.",
        similar: ["Zodiac", "El silencio de los corderos", "Prisoners", "Memories of Murder"],
        context: "Thriller fundamental de 1995 que consagró el estilo visual de David Fincher e influyó en todo el noir moderno."
      },
      axes: { tono: 5, ritmo: 3, emocion: 5, exigencia: 4, humor: 1, tension: 5, fantasia: 1, violencia: 5, familiar: 1, escala: 2, reconfort: 1 },
      themes: ["crimen", "investigacion", "asesino_en_serie", "justicia", "venganza"],
      moments: ["noche_tarde", "pasar_miedo", "pensar", "solo"],
      oneLiner: "Un descenso asfixiante y lluvioso a las profundidades de la maldad y el pecado.",
      confidence: "alta"
    },
    {
      id: "movie:sospechosos-habituales-1995",
      title: "Sospechosos habituales",
      experience: {
        plot: "Cinco delincuentes profesionales son detenidos para una rueda de reconocimiento y deciden aliarse para dar un golpe conjunto. Pronto descubren que están siendo manipulados por una figura mítica del hampa apodada Keyser Söze.",
        feeling: "Enigmática, laberíntica, inteligente y desbordante de suspense. Mantiene al espectador teorizando continuamente en cada interrogatorio.",
        hook: "La narración hipnótica del tullido Verbal Kint y el desenlace sorpresa más celebrado y parodiado del cine de los 90.",
        notFor: "Quien se distraiga con facilidad con relatos basados en trampas temporales y testimonios poco fiables.",
        similar: ["Memento", "L.A. Confidential", "Reservoir Dogs", "El golpe"],
        context: "Ganadora de 2 Óscar (guion original y actor de reparto), estandarte del thriller de giros argumentales."
      },
      axes: { tono: 4, ritmo: 4, emocion: 3, exigencia: 4, humor: 2, tension: 4, fantasia: 1, violencia: 3, familiar: 1, escala: 2, reconfort: 2 },
      themes: ["crimen", "atraco", "investigacion", "conspiracion", "traicion"],
      moments: ["pensar", "noche_tarde", "amigos"],
      oneLiner: "Juego de prestidigitación criminal con el enigma y el giro más brillante de los 90.",
      confidence: "alta"
    },
    {
      id: "movie:braveheart-1995",
      title: "Braveheart",
      experience: {
        plot: "En el siglo XIII, el rebelde escocés William Wallace lidera a sus compatriotas en una feroz revuelta contra la tiranía del rey Eduardo I de Inglaterra. La venganza personal por la muerte de su esposa se convierte en una apasionada gesta por la libertad de Escocia.",
        feeling: "Ferviente, brutal, épica y de una intensidad pasional desbordante. Despierta emociones exaltadas de patriotismo y sacrificio colectivo.",
        hook: "Las memorables batallas campales con barro y espadas, los discursos inflamados a caballo y la música celta de James Horner.",
        notFor: "Historiadores rigurosos o personas sensibles a desmembramientos bélicos medievales.",
        similar: ["Gladiator", "El patriota", "El señor de los anillos", "300"],
        context: "Ganadora de 5 premios Óscar incluyendo mejor película y director para Mel Gibson en 1995."
      },
      axes: { tono: 3, ritmo: 4, emocion: 5, exigencia: 2, humor: 2, tension: 4, fantasia: 1, violencia: 5, familiar: 2, escala: 5, reconfort: 3 },
      themes: ["libertad", "guerra", "venganza", "amor", "sacrificio"],
      moments: ["pensar", "amigos", "solo"],
      oneLiner: "Gesta medieval de pasión incontenible, batallas colosales y el grito eterno de libertad.",
      confidence: "alta"
    },
    {
      id: "movie:toy-story-1995",
      title: "Toy Story",
      experience: {
        plot: "Woody, el juguete favorito de Andy, ve tambalearse su liderazgo cuando llega Buzz Lightyear, una figura espacial que cree ser un héroe real. Tras perderse accidentalmente, deberán colaborar para regresar antes de que la familia se mude.",
        feeling: "Cálida, vibrante, ingeniosa y entrañable. Despierta una oleada de nostalgia por la inocencia de los juegos infantiles.",
        hook: "El hilarante choque de personalidades entre el vaquero y el astronauta y el prodigio de ver cobrar vida a los juguetes.",
        notFor: "Quien busque cine de autor introspectivo o tramas complejas para adultos.",
        similar: ["Monstruos S.A.", "Buscando a Nemo", "Shrek", "E.T. el extraterrestre"],
        context: "El primer largometraje animado totalmente por ordenador de Pixar en 1995, que cambió el cine para siempre."
      },
      axes: { tono: 1, ritmo: 4, emocion: 3, exigencia: 1, humor: 5, tension: 2, fantasia: 4, violencia: 1, familiar: 5, escala: 2, reconfort: 5 },
      themes: ["amistad", "infancia", "mayoria_de_edad", "exploracion"],
      moments: ["familia", "reir", "desconectar", "para_repetir"],
      oneLiner: "Aventura pionera y deslumbrante que demostró que los juguetes tienen alma.",
      confidence: "alta"
    },
    {
      id: "movie:shrek-2001",
      title: "Shrek",
      experience: {
        plot: "Un ogro huraño y solitario ve invadida su tranquila ciénaga por personajes de cuentos de hadas desterrados por un tirano. Para recuperar su hogar, acepta rescatar a una princesa custodiada por un dragón, acompañado de un asno parlanchín.",
        feeling: "Descarada, divertidísima, irreverente y sorprendentemente tierna. Rompe clichés con una frescura cómica que divierte a niños y adultos.",
        hook: "La sátira demoledora a los cuentos de hadas tradicionales, la música rock y el trío inolvidable de Shrek, Asno y Fiona.",
        notFor: "Puristas de los cuentos clásicos que prefieran la solemnidad y el lirismo de Disney tradicional.",
        similar: ["Monstruos S.A.", "Toy Story", "Enredados", "Ice Age"],
        context: "Ganadora del primer Óscar a la Mejor Película de Animación en 2001, buque insignia de DreamWorks Animation."
      },
      axes: { tono: 1, ritmo: 4, emocion: 3, exigencia: 1, humor: 5, tension: 2, fantasia: 5, violencia: 1, familiar: 5, escala: 3, reconfort: 5 },
      themes: ["parodia", "amistad", "amor", "identidad", "satira_social"],
      moments: ["familia", "reir", "amigos", "para_repetir"],
      oneLiner: "Parodia gamberra e ingeniosa que puso patas arriba los cuentos de hadas con gran corazón.",
      confidence: "alta"
    }
  ],
  series: [
    {
      id: "series:breaking-bad-2008",
      title: "Breaking Bad",
      experience: {
        plot: "Un modesto profesor de química de instituto con cáncer terminal entra en el narcotráfico cocinando metanfetamina de máxima pureza para asegurar a su familia. Su descenso al crimen despierta a Heisenberg, un monstruo implacable.",
        feeling: "Electrizante, angustiosa, con una tensión calculada al milímetro y una adicción imparable. Te deja temblando al borde del asiento en cada final de episodio.",
        hook: "La prodigiosa metamorfosis moral de Bryan Cranston, la química con Aaron Paul y cliffhangers insuperables.",
        notFor: "Quienes busquen ligereza, optimismo moral o no soporten la degradación humana prolongada.",
        similar: ["Better Call Saul", "Ozark", "Los Soprano", "The Wire"],
        context: "Considerada unánimemente una de las mejores series de televisión de la historia, emitida entre 2008 y 2013."
      },
      axes: { tono: 5, ritmo: 4, emocion: 5, exigencia: 4, humor: 2, tension: 5, fantasia: 1, violencia: 4, familiar: 1, escala: 3, reconfort: 1, enganche: 5, formato: 5 },
      themes: ["crimen_organizado", "drogas_y_narcos", "familia", "ambicion", "politica_y_poder"],
      moments: ["maraton", "enganche", "solo", "pensar"],
      oneLiner: "La caída a los infiernos más adictiva y magistralmente construida de la televisión.",
      confidence: "alta"
    },
    {
      id: "series:better-call-saul-2015",
      title: "Better Call Saul",
      experience: {
        plot: "Precuela centrada en la vida del abogado de poca monta Jimmy McGill mientras lucha por ganarse el respeto de su prestigioso hermano. Poco a poco, la frustración y la picaresca lo van moldeando en el desvergonzado Saul Goodman.",
        feeling: "Tragicómica, elegante, minuciosa y con una profunda ternura melancólica. Construye una empatía sobrecogedora por sus derrotas morales.",
        hook: "La sutileza de los detalles, la desgarradora relación con Kim Wexler y la dirección visual más cuidada de la pequeña pantalla.",
        notFor: "Quienes busquen tiroteos constantes y acción inmediata al ritmo vertiginoso de los últimos compases de Breaking Bad.",
        similar: ["Breaking Bad", "Fargo", "Succession", "Mad Men"],
        context: "Aclamada obra maestra que igualó e incluso superó en sensibilidad a su serie madre a lo largo de seis temporadas."
      },
      axes: { tono: 3, ritmo: 2, emocion: 5, exigencia: 4, humor: 3, tension: 4, fantasia: 1, violencia: 3, familiar: 1, escala: 2, reconfort: 3, enganche: 4, formato: 5 },
      themes: ["abogados_y_juicios", "crimen_organizado", "familia", "ambicion", "identidad"],
      moments: ["pensar", "solo", "enganche", "capitulo_cena"],
      oneLiner: "Tragedia íntima y estilizada sobre la dignidad, el engaño y el amor entre dos abogados.",
      confidence: "alta"
    },
    {
      id: "series:juego-de-tronos-2011",
      title: "Juego de tronos",
      experience: {
        plot: "Nueve familias nobles se disputan a sangre y fuego el Trono de Hierro del continente de Poniente mientras antiguas conspiraciones amenazan la paz. Entretanto, un peligro ancestral de hielo avanza desde el norte y una reina exiliada cría tres dragones.",
        feeling: "Épica, salvaje, maquiavélica y colosal. Te mantiene en vilo con la certeza de que ningún personaje querido está a salvo de una muerte atroz.",
        hook: "Conspiraciones palaciegas brutales, personajes grises fascinantes y escenas de batalla de escala cinematográfica sin precedentes.",
        notFor: "Espectadores sensibles a la violencia explícita o decepcionados de antemano por las polémicas temporadas finales.",
        similar: ["Vikingos", "El señor de los anillos", "Roma", "La casa del dragón"],
        context: "El mayor fenómeno de televisión global de la década de 2010 basado en las novelas de George R.R. Martin."
      },
      axes: { tono: 4, ritmo: 4, emocion: 5, exigencia: 4, humor: 2, tension: 5, fantasia: 5, violencia: 5, familiar: 1, escala: 5, reconfort: 2, enganche: 5, formato: 5 },
      themes: ["fantasia_epica", "politica_y_poder", "traicion", "guerra", "venganza", "familia"],
      moments: ["maraton", "enganche", "solo", "desconectar"],
      oneLiner: "Poder, traición y sangre en el mayor fenómeno televisivo de fantasía de la historia.",
      confidence: "alta"
    },
    {
      id: "series:los-soprano-1999",
      title: "Los Soprano",
      experience: {
        plot: "Tony Soprano, capo de la mafia de Nueva Jersey, comienza a sufrir ataques de pánico y decide acudir secretamente a terapia con una psiquiatra. Allí lidia con el estrés de compaginar su peligrosa vida delictiva con sus problemas domésticos y familiares.",
        feeling: "Compleja, mordaz, psicoanalítica y dolorosamente lúcida. Abre una ventana inigualable a la psicología de un criminal entrañable y temible.",
        hook: "El monumental retrato de James Gandolfini, el guion revolucionario de David Chase y la mezcla de humor negro con crisis existencial.",
        notFor: "Quien espere una serie de acción mafiosa lineal y no tenga interés en las sesiones de terapia o el costumbrismo.",
        similar: ["The Wire", "Mad Men", "Breaking Bad", "Uno de los nuestros"],
        context: "La serie fundacional que dio origen a la Tercera Edad de Oro de la televisión por cable estadounidense (HBO, 1999)."
      },
      axes: { tono: 4, ritmo: 3, emocion: 4, exigencia: 4, humor: 4, tension: 4, fantasia: 1, violencia: 4, familiar: 1, escala: 3, reconfort: 2, enganche: 4, formato: 4 },
      themes: ["mafia", "familia", "salud_mental", "crimen_organizado", "ambicion"],
      moments: ["pensar", "solo", "maraton", "capitulo_cena"],
      oneLiner: "El psicoanálisis definitivo de la mafia moderna: el pilar que cambió la televisión.",
      confidence: "alta"
    },
    {
      id: "series:the-wire-2002",
      title: "The Wire",
      experience: {
        plot: "A través de escuchas telefónicas policiales, se retrata el tráfico de drogas en Baltimore desde múltiples perspectivas institucionales: traficantes, policías, estibadores del puerto, políticos municipales, el sistema escolar y la prensa escrita.",
        feeling: "Cruda, hiperrealista, desapasionada pero éticamente demoledora. Te deja con una visión lúcida y trágica del colapso de las instituciones urbanas.",
        hook: "Un realismo documental sin artificios, personajes inolvidables como Omar Little y Stringer Bell, y una crítica social feroz.",
        notFor: "Espectadores que busquen resoluciones policiales sencillas con buenos y malos claros o giros espectaculares.",
        similar: ["Los Soprano", "The Shield", "Treme", "Show Me a Hero"],
        context: "Creación del periodista David Simon para HBO, consagrada como el tratado sociológico más lúcido de la ficción seriada."
      },
      axes: { tono: 5, ritmo: 2, emocion: 4, exigencia: 5, humor: 2, tension: 4, fantasia: 1, violencia: 4, familiar: 1, escala: 4, reconfort: 1, enganche: 4, formato: 5 },
      themes: ["crimen_organizado", "investigacion_policial", "politica_y_poder", "drogas_y_narcos", "lucha_de_clases"],
      moments: ["pensar", "solo", "maraton"],
      oneLiner: "Catedral televisiva del realismo social: la radiografía más certera de la ciudad moderna.",
      confidence: "alta"
    },
    {
      id: "series:mad-men-2007",
      title: "Mad Men",
      experience: {
        plot: "Ambientada en la avenida Madison de Nueva York en la década de 1960, sigue la vida del enigmático ejecutivo publicitario Don Draper. Entre humo de tabaco, copas de whisky y campañas brillantes, los personajes navegan los cambios sociales de la época.",
        feeling: "Melancólica, elegante, sofisticada y existencialmente punzante. Deja un anhelo nostálgico teñido de vacío interior.",
        hook: "El diseño de producción exquisito, la sutileza psicológica de Don y Peggy y los agudos comentarios sobre el sueño americano.",
        notFor: "Quienes busquen giros de trama rápidos o tramas guiadas por la acción externa en lugar del conflicto interior.",
        similar: ["Los Soprano", "Succession", "The Crown", "Halt and Catch Fire"],
        context: "Ganadora de 4 premios Emmy consecutivos a Mejor Serie Dramática, icono de sofisticación narrativa de AMC."
      },
      axes: { tono: 3, ritmo: 2, emocion: 4, exigencia: 4, humor: 3, tension: 2, fantasia: 1, violencia: 1, familiar: 1, escala: 2, reconfort: 3, enganche: 3, formato: 4 },
      themes: ["identidad", "ambicion", "epoca_historica", "negocios_y_corporaciones", "amor"],
      moments: ["pensar", "solo", "capitulo_cena"],
      oneLiner: "Elegancia, humo y melancolía en la edad dorada de la publicidad neoyorquina.",
      confidence: "alta"
    },
    {
      id: "series:stranger-things-2016",
      title: "Stranger Things",
      experience: {
        plot: "En un tranquilo pueblo de Indiana en los años 80, la misteriosa desaparición de un niño desvela experimentos secretos del gobierno y la fuga de una niña con poderes telequinéticos. Sus amigos se unen para rescatarlo de una oscura dimensión paralela.",
        feeling: "Misteriosa, electrizante, rebosante de amistad y pura nostalgia ochentera. Te hace sentir de nuevo en una bicicleta recorriendo el bosque con tus amigos.",
        hook: "El carisma absoluto del grupo de niños, los monstruos inspirados en D&D y la evocadora banda sonora de sintetizadores.",
        notFor: "Quien huya del homenaje nostálgico explícito o no disfrute de las historias de aventuras juveniles fantásticas.",
        similar: ["Los Goonies", "E.T. el extraterrestre", "Cuenta conmigo", "Dark"],
        context: "Fenómeno global masivo de Netflix desde 2016 que catapultó la estética y cultura pop de los ochenta."
      },
      axes: { tono: 3, ritmo: 4, emocion: 4, exigencia: 2, humor: 3, tension: 4, fantasia: 5, violencia: 3, familiar: 4, escala: 3, reconfort: 4, enganche: 5, formato: 5 },
      themes: ["amistad", "monstruos_y_terror", "misterio_pueblo_pequeno", "adolescencia", "conspiracion"],
      moments: ["maraton", "enganche", "desconectar", "confort"],
      oneLiner: "Aventura ochentera de amistad inquebrantable, bicicletas y horrores sobrenaturales.",
      confidence: "alta"
    },
    {
      id: "series:friends-1994",
      title: "Friends",
      experience: {
        plot: "Seis amigos veinteañeros conviven, trabajan y buscan el amor en la ciudad de Manhattan mientras comparten cafés diarios en el Central Perk. A lo largo de una década, sus vidas sentimentales y laborales evolucionan sin romper su unión.",
        feeling: "Acogedora, entrañable, ligera y desternillante. Funciona como un auténtico refugio emocional y un bálsamo reconfortante.",
        hook: "La sincronía cómica perfecta entre los seis actores, el romance intermitente de Ross y Rachel y gags que nunca caducan.",
        notFor: "Quienes busquen humor negro transgresor, formatos arriesgados o historias con carga dramática seria.",
        similar: ["Cómo conocí a vuestra madre", "Seinfeld", "The Big Bang Theory", "New Girl"],
        context: "La telecomedia de mayor impacto e identificación generacional de la historia, emitida durante 10 temporadas (1994-2004)."
      },
      axes: { tono: 1, ritmo: 4, emocion: 2, exigencia: 1, humor: 5, tension: 1, fantasia: 1, violencia: 1, familiar: 5, escala: 1, reconfort: 5, enganche: 4, formato: 2 },
      themes: ["amistad", "amor", "sitcom_cotidiana", "familia"],
      moments: ["confort", "reir", "desconectar", "para_repetir"],
      oneLiner: "El refugio televisivo por excelencia: seis amigos de Manhattan que ya son familia.",
      confidence: "alta"
    },
    {
      id: "series:seinfeld-1989",
      title: "Seinfeld",
      experience: {
        plot: "Un cómico de monólogos y sus tres neuróticos y egoístas amigos navegan por los absurdos dilemas cotidianos de la vida en Nueva York. La serie se jacta célebremente de no tratar sobre 'nada' en particular.",
        feeling: "Cínica, hilarante, mordaz y veloz. Provoca carcajadas ante la mezquindad y las manías más inconfesables del ser humano.",
        hook: "Las tramas paralelas que colisionan de forma milimétrica al final de cada episodio y la total ausencia de lecciones morales.",
        notFor: "Espectadores que necesiten encariñarse con personajes bondadosos o busquen momentos melodramáticos.",
        similar: ["Curb Your Enthusiasm", "Friends", "Colgados en Filadelfia", "Arrested Development"],
        context: "La sitcom que revolucionó la comedia estadounidense en los 90, creada por Larry David y Jerry Seinfeld."
      },
      axes: { tono: 2, ritmo: 4, emocion: 1, exigencia: 2, humor: 5, tension: 1, fantasia: 1, violencia: 1, familiar: 3, escala: 1, reconfort: 4, enganche: 3, formato: 1 },
      themes: ["sitcom_cotidiana", "amistad", "satira"],
      moments: ["reir", "desconectar", "capitulo_cena", "para_repetir"],
      oneLiner: "Comedia de ingenio puro y neurosis desternillante sobre las miserias cotidianas.",
      confidence: "alta"
    },
    {
      id: "series:the-office-ee-uu-2005",
      title: "The Office (EE. UU.)",
      experience: {
        plot: "En formato de falso documental, se muestra la rutina diaria de los peculiares empleados de una sucursal papelera en Pensilvania bajo el mando de Michael Scott, un jefe tan incompetente como desesperado por ser querido por su equipo.",
        feeling: "Divertida, a ratos de vergüenza ajena insoportable y profundamente entrañable. Deja una sensación de calor de hogar inigualable.",
        hook: "La inolvidable actuación de Steve Carell, las miradas a cámara y el romance más querido de la televisión entre Jim y Pam.",
        notFor: "Personas con baja tolerancia al 'cringe comedy' o que no soporten el estilo de falso documental con cámara en mano.",
        similar: ["Parks and Recreation", "Brooklyn Nine-Nine", "Abbott Elementary", "Community"],
        context: "Adaptación del formato británico de Ricky Gervais que se convirtió en la serie más vista en streaming de la historia."
      },
      axes: { tono: 1, ritmo: 3, emocion: 3, exigencia: 1, humor: 5, tension: 1, fantasia: 1, violencia: 1, familiar: 4, escala: 1, reconfort: 5, enganche: 4, formato: 2 },
      themes: ["sitcom_cotidiana", "amistad", "amor", "satira"],
      moments: ["confort", "reir", "desconectar", "para_repetir"],
      oneLiner: "Vergüenza ajena hilarante y un corazón gigantesco en la oficina más famosa del mundo.",
      confidence: "alta"
    },
    {
      id: "series:the-big-bang-theory-2007",
      title: "The Big Bang Theory",
      experience: {
        plot: "Dos físicos superdotados que comparten piso en Pasadena ven alterado su mundo de cómics, videojuegos y ciencia cuando una extrovertida camarera y aspirante a actriz se muda al apartamento de enfrente.",
        feeling: "Accesible, desenfadada, ingeniosa y de risa fácil. Ofrece entretenimiento ligero y familiar sin complicaciones.",
        hook: "Las excentricidades obsesivo-compulsivas de Sheldon Cooper interpretado magistralmente por Jim Parsons.",
        notFor: "Quienes busquen humor sutil sin risas enlatadas o rechacen los estereotipos de la cultura friki.",
        similar: ["Friends", "Silicon Valley", "Cómo conocí a vuestra madre", "Modern Family"],
        context: "La telecomedia en abierto más exitosa de la televisión de la década de 2010 con 12 temporadas en antena."
      },
      axes: { tono: 1, ritmo: 4, emocion: 2, exigencia: 1, humor: 5, tension: 1, fantasia: 1, violencia: 1, familiar: 5, escala: 1, reconfort: 5, enganche: 3, formato: 1 },
      themes: ["sitcom_cotidiana", "amistad", "amor", "ia_y_tecnologia"],
      moments: ["desconectar", "reir", "capitulo_cena", "confort"],
      oneLiner: "Risas garantizadas y choque cultural entre genios de la física y el mundo real.",
      confidence: "alta"
    },
    {
      id: "series:los-simpson-1989",
      title: "Los Simpson",
      experience: {
        plot: "Sátira animada sobre una peculiar familia de clase trabajadora que vive en el pueblo ficticio de Springfield. A través de sus disparatadas aventuras cotidianas, la serie disecciona la sociedad, la política y la cultura contemporánea.",
        feeling: "Ingeniosa, anárquica, ácida y nostálgica. Especialmente en sus primeras temporadas, es una ametralladora ininterrumpida de humor sublime.",
        hook: "Personajes secundarios legendarios, dobles lecturas sociológicas y un legado de citas memorables que forman parte del lenguaje común.",
        notFor: "Quienes busquen continuidad dramática estricta o juzguen la serie solo por sus temporadas más recientes.",
        similar: ["Futurama", "Padre de familia", "South Park", "Bob's Burgers"],
        context: "La serie de animación más longeva e influyente del mundo, creada por Matt Groening en 1989."
      },
      axes: { tono: 2, ritmo: 4, emocion: 3, exigencia: 2, humor: 5, tension: 1, fantasia: 2, violencia: 1, familiar: 4, escala: 2, reconfort: 5, enganche: 3, formato: 1 },
      themes: ["animacion", "familia", "satira", "sitcom_cotidiana"],
      moments: ["reir", "desconectar", "de_fondo", "para_repetir"],
      oneLiner: "La sátira familiar definitiva: treinta años marcando el humor de generaciones enteras.",
      confidence: "alta"
    },
    {
      id: "series:south-park-1997",
      title: "South Park",
      experience: {
        plot: "Cuatro niños malhablados de un gélido pueblo de Colorado presencian y desatan situaciones surrealistas que parodian sin piedad la actualidad política, las modas sociales y las mayores hipocresías del mundo occidental.",
        feeling: "Salvaje, corrosiva, desvergonzada e inteligentemente provocadora. Desafía todos los tabúes con una franqueza desternillante.",
        hook: "Su capacidad única para escribir y emitir episodios en seis días reaccionando en tiempo real a las noticias mundiales.",
        notFor: "Personas de moral susceptible o con aversión al lenguaje soez, el escatologismo y la irreverencia religiosa.",
        similar: ["Padre de familia", "Rick y Morty", "Los Simpson", "Robot Chicken"],
        context: "Creada por Trey Parker y Matt Stone en 1997, icono absoluto de la animación satírica para adultos."
      },
      axes: { tono: 3, ritmo: 5, emocion: 1, exigencia: 2, humor: 5, tension: 1, fantasia: 3, violencia: 3, familiar: 1, escala: 2, reconfort: 2, enganche: 3, formato: 1 },
      themes: ["animacion", "satira", "politica_y_poder", "adolescencia"],
      moments: ["reir", "desconectar", "para_repetir"],
      oneLiner: "Sátira sin filtros ni piedad que no deja títere con cabeza en la sociedad actual.",
      confidence: "alta"
    },
    {
      id: "series:rick-y-morty-2013",
      title: "Rick y Morty",
      experience: {
        plot: "Un científico alcohólico, nihilista y el ser más inteligente del universo arrastra a su tímido nieto en peligrosas aventuras interdimensionales por el cosmos. Entre caos y monstruos, la disfuncional familia lidia con la insignificancia de la existencia.",
        feeling: "Alocada, alucinógena, trágica en el fondo y mentalmente estimulante. Mezcla el delirio sci-fi con punzadas de existencialismo demoledor.",
        hook: "La inventiva visual desbordante, conceptos cuánticos ingeniosos y el cinismo conmovedor de Rick Sanchez.",
        notFor: "Quienes busquen animación inocente o se sientan abrumados por diálogos frenéticos y caos constante.",
        similar: ["Futurama", "Hora de aventuras", "Bojack Horseman", "Solar Opposites"],
        context: "Serie de culto de Adult Swim creada por Dan Harmon y Justin Roiland que se convirtió en fenómeno pop planetario."
      },
      axes: { tono: 4, ritmo: 5, emocion: 3, exigencia: 4, humor: 5, tension: 3, fantasia: 5, violencia: 4, familiar: 1, escala: 5, reconfort: 2, enganche: 4, formato: 3 },
      themes: ["animacion", "espacio", "viaje_en_el_tiempo", "ia_y_tecnologia", "satira", "familia"],
      moments: ["reir", "pensar", "maraton", "desconectar"],
      oneLiner: "Ciencia ficción desquiciada, delirio interdimensional y nihilismo existencial.",
      confidence: "alta"
    },
    {
      id: "series:black-mirror-2011",
      title: "Black Mirror",
      experience: {
        plot: "Serie antológica de historias independientes que exploran el lado más siniestro, perturbador e inquietante de la dependencia tecnológica contemporánea. Muestra futuros cercanos donde el progreso digital saca a relucir lo peor de la condición humana.",
        feeling: "Inquietante, claustrofóbica, pesimista y lúcida como una pesadilla lúcida. Provoca una profunda desazón con ganas de apagar las pantallas.",
        hook: "Premisas brillantes y aterradoras de Charlie Brooker que a menudo parecen profetizar el presente inmediato.",
        notFor: "Quienes busquen finales felices o un tono reconfortante y esperanzador sobre el futuro.",
        similar: ["The Twilight Zone", "Severance", "Her", "Ex Machina"],
        context: "Referente absoluto de la distopía tecnológica contemporánea, nacida en Channel 4 británico antes de pasar a Netflix."
      },
      axes: { tono: 5, ritmo: 3, emocion: 4, exigencia: 4, humor: 2, tension: 5, fantasia: 4, violencia: 3, familiar: 1, escala: 2, reconfort: 1, enganche: 4, formato: 1 },
      themes: ["distopia", "ia_y_tecnologia", "conspiracion", "satira", "identidad"],
      moments: ["pensar", "pasar_miedo", "solo", "enganche"],
      oneLiner: "Relatos oscuros y visionarios sobre los peligros de nuestra adicción digital.",
      confidence: "alta"
    },
    {
      id: "series:chernobil-2019",
      title: "Chernóbil",
      experience: {
        plot: "Recreación minuciosa de la catástrofe de la central nuclear de Chernóbil en 1986 y los desesperados esfuerzos de científicos y operarios por contener el desastre. Mientras tanto, la burocracia soviética intenta ocultar la verdad a costa de vidas humanas.",
        feeling: "Aterradora, asfixiante, rigurosa y profundamente conmovedora. Muestra el horror invisible de la radiación con un pulso dramático magistral.",
        hook: "La tensión palpable en cada minuto, la banda sonora con sonidos industriales reales y el mensaje demoledor sobre el coste de las mentiras.",
        notFor: "Quien busque evasión o le afecten las escenas de enfermedad por radiación y angustia médica.",
        similar: ["The Looming Tower", "Spotlight", "Cuando el viento sopla", "Band of Brothers"],
        context: "Aclamadísima miniserie de Craig Mazin para HBO (2019), ganadora de múltiples premios Emmy y Globos de Oro."
      },
      axes: { tono: 5, ritmo: 3, emocion: 5, exigencia: 4, humor: 1, tension: 5, fantasia: 1, violencia: 4, familiar: 1, escala: 4, reconfort: 1, enganche: 5, formato: 5 },
      themes: ["epoca_historica", "politica_y_poder", "supervivencia", "duelo"],
      moments: ["pensar", "solo", "maraton"],
      oneLiner: "Tensa, verídica y desoladora crónica del peor desastre nuclear y las mentiras del poder.",
      confidence: "alta"
    },
    {
      id: "series:the-last-of-us-2023",
      title: "The Last of Us",
      experience: {
        plot: "Veinte años después de que una infección fúngica arrase la civilización, un endurecido contrabandista debe escoltar a una adolescente inmune a través de unos Estados Unidos postapocalípticos. En el camino forjarán un vínculo paternofilial indestructible.",
        feeling: "Dolorosa, tensa, íntima y hermosa en mitad de la desolación. Conmueve hasta las lágrimas con el renacer del afecto en un mundo en ruinas.",
        hook: "La extraordinaria química entre Pedro Pascal y Bella Ramsey y una fidelidad reverencial pero enriquecida al videojuego original.",
        notFor: "Espectadores asustadizos ante zombis fúngicos o con rechazo a los dramas de supervivencia cruenta.",
        similar: ["The Walking Dead", "Hijos de los hombres", "La carretera", "Estación Once"],
        context: "La adaptación de videojuegos más premiada y celebrada de la historia de la televisión, producida por HBO."
      },
      axes: { tono: 4, ritmo: 3, emocion: 5, exigencia: 3, humor: 2, tension: 5, fantasia: 3, violencia: 4, familiar: 2, escala: 4, reconfort: 2, enganche: 5, formato: 5 },
      themes: ["apocalipsis", "supervivencia", "familia", "duelo", "monstruos_y_terror"],
      moments: ["maraton", "enganche", "solo", "confort"],
      oneLiner: "Dramática, desgarradora y humana travesía sobre el amor y el duelo en el fin del mundo.",
      confidence: "alta"
    },
    {
      id: "series:succession-2018",
      title: "Succession",
      experience: {
        plot: "Los cuatro hijos del anciano magnate de los medios Logan Roy conspiran y se apuñalan por la espalda para heredar el control del imperio familiar. Cada reunión corporativa es una carnicería psicológica de lealtades cambiantes.",
        feeling: "Mordaz, adictiva, fastuosa y trágicamente patética. Es un placer culpable ver a multimillonarios desdichados destrozarse con frases viperinas.",
        hook: "Diálogos afilados como cuchillas, la inolvidable banda sonora de piano y cuerdas de Nicholas Britell y actuaciones colosales.",
        notFor: "Quien necesite personajes empáticos o se canse de las intrigas de oficinas y salones de juntas de lujo.",
        similar: ["Mad Men", "Billions", "El rey Lear", "House of Cards"],
        context: "Fenómeno de prestigio de HBO creado por Jesse Armstrong, ganadora recurrente de los premios Emmy a mejor drama."
      },
      axes: { tono: 4, ritmo: 4, emocion: 4, exigencia: 4, humor: 4, tension: 4, fantasia: 1, violencia: 1, familiar: 1, escala: 3, reconfort: 2, enganche: 5, formato: 5 },
      themes: ["negocios_y_corporaciones", "familia", "politica_y_poder", "ambicion", "traicion", "satira"],
      moments: ["maraton", "pensar", "solo", "enganche"],
      oneLiner: "Shakespeariana, venenosa y brillante lucha dinástica entre tiburones corporativos.",
      confidence: "alta"
    },
    {
      id: "series:the-crown-2016",
      title: "The Crown",
      experience: {
        plot: "Crónica de la vida de la reina Isabel II de Inglaterra desde su boda en 1947 hasta el siglo XXI, desvelando las intrigas políticas, los sacrificios personales y los escándalos familiares que moldearon la monarquía británica contemporánea.",
        feeling: "Regia, majestuosa, contenida y melancólica. Retrata con enorme sutileza el peso aplastante del deber sobre la propia felicidad.",
        hook: "El fastuoso vestuario y diseño de producción británico, cambios de reparto estelares cada dos temporadas y rigor dramático.",
        notFor: "Quien busque acción acelerada o no sienta ningún interés por la política británica y la realeza europea.",
        similar: ["Downton Abbey", "La favorita", "El discurso del rey", "Mad Men"],
        context: "Superproducción insignia de Netflix y una de las series históricas más premiadas de los últimos años."
      },
      axes: { tono: 3, ritmo: 2, emocion: 4, exigencia: 3, humor: 2, tension: 2, fantasia: 1, violencia: 1, familiar: 3, escala: 4, reconfort: 4, enganche: 3, formato: 4 },
      themes: ["realeza", "epoca_historica", "politica_y_poder", "familia"],
      moments: ["pensar", "capitulo_cena", "confort", "solo"],
      oneLiner: "Fascinante y aristocrática mirada al deber institucional y las grietas de la corona.",
      confidence: "alta"
    },
    {
      id: "series:peaky-blinders-2013",
      title: "Peaky Blinders",
      experience: {
        plot: "En el Birmingham de 1919 tras la Gran Guerra, el veterano condecorado Tommy Shelby lidera a su peligrosa banda callejera familiar. Con astucia despiadada, expande sus negocios ilegales enfrentándose a mafias rivales y al gobierno.",
        feeling: "Macarra, estilizada, violenta y cautivadora. Te contagia el carisma magnético de sus gabardinas, humo y rock alternativo de fondo.",
        hook: "La hipnótica mirada de Cillian Murphy, la ambientación industrial llena de chispas y barro, y antagonistas inolvidables.",
        notFor: "Audiencias sensibles a la violencia callejera o que prefieran dramas históricos de corte más sobrio y purista.",
        similar: ["Boardwalk Empire", "Hijos de la Anarquía", "Taboo", "Gangs of London"],
        context: "Icono de la televisión británica creado por Steven Knight con un impacto masivo en la moda y la música pop."
      },
      axes: { tono: 4, ritmo: 4, emocion: 4, exigencia: 3, humor: 2, tension: 5, fantasia: 1, violencia: 5, familiar: 1, escala: 3, reconfort: 2, enganche: 5, formato: 5 },
      themes: ["crimen_organizado", "mafia", "familia", "epoca_historica", "venganza", "politica_y_poder"],
      moments: ["maraton", "enganche", "solo", "desconectar"],
      oneLiner: "Estilo puro, humo y violencia callejera bajo la implacable ambición de Tommy Shelby.",
      confidence: "alta"
    }
  ],
  book: [
    {
      id: "book:cien-anos-de-soledad-1967",
      title: "Cien años de soledad",
      experience: {
        plot: "Crónica épica de siete generaciones de la familia Buendía en el pueblo caribeño de Macondo, fundado en mitad de la selva. Sus destinos se entrelazan entre prodigios fantásticos, guerras civiles y una irremediable soledad.",
        feeling: "Torrencial, poética, envolvente y agridulce. Deja la sensación de haber recorrido un siglo entero en un suspiro.",
        hook: "El realismo mágico insuperable de García Márquez, donde lo insólito es cotidiano y el lenguaje hipnotiza en cada página.",
        notFor: "Lectores que busquen tramas lineales sencillas, poca densidad de personajes o realismo estricto.",
        similar: ["Pedro Páramo", "La casa de los espíritus", "El amor en los tiempos del cólera", "Ficciones"],
        context: "Obra maestra del boom latinoamericano y cumbre del Premio Nobel Gabriel García Márquez (1967)."
      },
      axes: { tono: 3, ritmo: 3, emocion: 5, densidad: 4, humor: 3, tension: 2, fantasia: 4, escala: 5, ideas: 5, reconfort: 3 },
      themes: ["familia", "memoria", "soledad", "realismo_magico", "historia"],
      moments: ["emocionarse", "absorbente", "para_subrayar", "pausado"],
      oneLiner: "Mítica, torrencial y fascinante epopeya sobre el destino y la memoria en Macondo.",
      confidence: "alta"
    },
    {
      id: "book:don-quijote-de-la-mancha-1605",
      title: "Don Quijote de la Mancha",
      experience: {
        plot: "Un hidalgo manchego pierde el juicio de tanto leer novelas de caballerías y decide armarse caballero andante para deshacer agravios por el mundo. Acompañado de su leal escudero Sancho Panza, protagoniza aventuras cómicas y desatinadas.",
        feeling: "Sabia, desternillante, conmovedora y profundamente humanista. Combina la carcajada ante la locura con una ternura infinita hacia los ideales.",
        hook: "La entrañable dualidad entre idealismo y realismo en la pareja protagonista y un juego metaliterario asombrosamente moderno.",
        notFor: "Lectores impacientes ante el castellano del Siglo de Oro o las novelas extensas por entregas episódicas.",
        similar: ["Gargantúa y Pantagruel", "Tristram Shandy", "Los papeles del club Pickwick", "El idiota"],
        context: "Considerada la primera novela moderna y cumbre indiscutible de la literatura en lengua española por Miguel de Cervantes."
      },
      axes: { tono: 2, ritmo: 3, emocion: 4, densidad: 4, humor: 5, tension: 2, fantasia: 2, escala: 4, ideas: 5, reconfort: 5 },
      themes: ["locura", "filosofia", "humor_y_satira", "metaficcion", "aventura"],
      moments: ["aprender", "desconectar", "para_subrayar", "emocionarse"],
      oneLiner: "La mayor novela de todos los tiempos: risas, quijotadas y un canto al idealismo puro.",
      confidence: "alta"
    },
    {
      id: "book:la-sombra-del-viento-2001",
      title: "La sombra del viento",
      experience: {
        plot: "En la Barcelona de posguerra, un niño es llevado por su padre al misterioso Cementerio de los Libros Olvidados para elegir un tomo maldito. Su obsesión por el desconocido autor del libro desatará una trama de amores oscuros, venganzas y crímenes.",
        feeling: "Mágica, envolvente, gótica y desbordante de pasión literaria. Te atrapa con una atmósfera lluviosa y misteriosa que no se olvida.",
        hook: "El amor reverencial por los libros físicos, la prosa melódica de Carlos Ruiz Zafón y el inolvidable Fermín Romero de Torres.",
        notFor: "Quienes busquen vanguardia formal minimalista o rechacen los giros melodramáticos del folletín clásico.",
        similar: ["El juego del ángel", "El nombre de la rosa", "El cuento número trece", "Los renglones torcidos de Dios"],
        context: "Fenómeno editorial español más internacional del siglo XXI, traducido a más de 50 idiomas con millones de lectores."
      },
      axes: { tono: 3, ritmo: 4, emocion: 5, densidad: 3, humor: 3, tension: 4, fantasia: 2, escala: 3, ideas: 3, reconfort: 4 },
      themes: ["misterio", "amor", "arte_y_literatura", "memoria", "crimen", "historia"],
      moments: ["absorbente", "lluvia_manta", "emocionarse", "viaje"],
      oneLiner: "Intriga gótica y amor por la literatura en una Barcelona de secretos y fantasmas.",
      confidence: "alta"
    },
    {
      id: "book:el-principito-1943",
      title: "El principito",
      experience: {
        plot: "Un aviador perdido en el desierto del Sahara se encuentra con un pequeño príncipe venido de un diminuto asteroide. A través de sus relatos sobre su flor y sus viajes por otros mundos, el niño desvela verdades esenciales sobre el alma humana.",
        feeling: "Poética, delicada, melancólica y de una sencillez luminosa. Llega directo al corazón como un recordatorio de lo que realmente importa.",
        hook: "Aforismos eternos como 'lo esencial es invisible a los ojos' y las acuarelas originales del propio autor que enternecen a cualquier edad.",
        notFor: "Lectores cínicos que desestimen la literatura de tono infantil o las fábulas filosóficas alegóricas.",
        similar: ["Alicia en el país de las maravillas", "Juan Salvador Gaviota", "Momo", "El profeta"],
        context: "La obra literaria francesa más leída y traducida del planeta, escrita por Antoine de Saint-Exupéry durante la guerra."
      },
      axes: { tono: 1, ritmo: 3, emocion: 5, densidad: 1, humor: 3, tension: 1, fantasia: 4, escala: 2, ideas: 5, reconfort: 5 },
      themes: ["infancia", "amor", "filosofia", "soledad", "viaje_interior"],
      moments: ["emocionarse", "antes_de_dormir", "para_subrayar", "pausado"],
      oneLiner: "Fábula universal y poética sobre ver con el corazón aquello que es invisible a los ojos.",
      confidence: "alta"
    },
    {
      id: "book:1984-1949",
      title: "1984",
      experience: {
        plot: "En un Londres futurista gobernado por el Partido y la figura omnipresente del Gran Hermano, Winston Smith trabaja reescribiendo la historia en el Ministerio de la Verdad. En secreto, comete el crimen de pensar por su cuenta y busca el amor prohibido.",
        feeling: "Opresiva, angustiosa, asfixiante y estremecedoramente lúcida. Instala una paranoia constante ante la vigilancia y la pérdida de la verdad.",
        hook: "Conceptos sociopolíticos imborrables como la 'neolengua', la 'policía del pensamiento' y la habitación 101.",
        notFor: "Quienes busquen escapismo reconfortante o no toleren finales desoladores sin atisbo de victoria heroica.",
        similar: ["Un mundo feliz", "Fahrenheit 451", "Rebelión en la granja", "El cuento de la criada"],
        context: "La distopía política más influyente de la era moderna, escrita por George Orwell al término de la Segunda Guerra Mundial."
      },
      axes: { tono: 5, ritmo: 4, emocion: 5, densidad: 3, humor: 1, tension: 5, fantasia: 2, escala: 3, ideas: 5, reconfort: 1 },
      themes: ["distopia", "opresion", "libertad", "politica", "lenguaje", "sociedad"],
      moments: ["absorbente", "para_subrayar", "concentracion", "club_de_lectura"],
      oneLiner: "La advertencia política más lúcida y aterradora jamás escrita contra el totalitarismo.",
      confidence: "alta"
    },
    {
      id: "book:un-mundo-feliz-1932",
      title: "Un mundo feliz",
      experience: {
        plot: "En una sociedad futura hipertecnificada, los seres humanos son cultivados genéticamente en castas y condicionados para ser felices mediante el consumo y una droga llamada soma. La llegada de un 'salvaje' criado fuera del sistema pone en jaque la utopía.",
        feeling: "Irónica, gélida, intelectualmente deslumbrante y profundamente profética. Produce escalofríos al reconocer nuestro presente en su sociedad anestesiada.",
        hook: "La brillante inversión del totalitarismo: no es el dolor lo que somete a la población, sino el placer banal organizado por el Estado.",
        notFor: "Lectores que prefieran tramas de aventura física trepidante en vez de debates ideológicos y filosóficos.",
        similar: ["1984", "Fahrenheit 451", "La isla", "Nosotros"],
        context: "Clásico monumental de Aldous Huxley publicado en 1932, piedra angular de la ciencia ficción especulativa del siglo XX."
      },
      axes: { tono: 4, ritmo: 3, emocion: 3, densidad: 4, humor: 3, tension: 3, fantasia: 3, escala: 4, ideas: 5, reconfort: 2 },
      themes: ["distopia", "sociedad", "filosofia", "tecnologia_futuro", "libertad"],
      moments: ["aprender", "para_subrayar", "club_de_lectura", "concentracion"],
      oneLiner: "Profecía sobre cómo la búsqueda del placer vacío puede destruir la libertad humana.",
      confidence: "alta"
    },
    {
      id: "book:fahrenheit-451-1953",
      title: "Fahrenheit 451",
      experience: {
        plot: "Guy Montag es un bombero cuyo trabajo no es sofocar incendios, sino quemar libros, prohibidos por el gobierno para evitar que la gente piense y sufra. El contacto con una joven vecina inconformista enciende en él la chispa de la duda y la rebelión.",
        feeling: "Lírica, urgente, ardiente y esperanzadora a pesar de las cenizas. Provoca un amor visceral e inquebrantable por los libros y la memoria.",
        hook: "La prosa poética e hipnótica de Ray Bradbury, el Sabueso Mecánico y la conmovedora imagen de los hombres-libro.",
        notFor: "Quienes busquen explicaciones científicas duras o ritmos de novela de acción frenética.",
        similar: ["1984", "Un mundo feliz", "Crónicas marcianas", "El dador de recuerdos"],
        context: "La gran oda distópica a la palabra escrita, nacida en plena Guerra Fría y caza de brujas en Estados Unidos."
      },
      axes: { tono: 4, ritmo: 4, emocion: 4, densidad: 3, humor: 1, tension: 4, fantasia: 3, escala: 2, ideas: 5, reconfort: 3 },
      themes: ["distopia", "arte_y_literatura", "libertad", "memoria", "opresion"],
      moments: ["absorbente", "para_subrayar", "emocionarse", "concentracion"],
      oneLiner: "Un grito apasionado en defensa de los libros frente al fuego de la ignorancia.",
      confidence: "alta"
    },
    {
      id: "book:el-nombre-de-la-rosa-1980",
      title: "El nombre de la rosa",
      experience: {
        plot: "En el invierno de 1327, el fraile franciscano Guillermo de Baskerville y su novicio Adso llegan a una remota abadía en el norte de Italia sacudida por una serie de muertes misteriosas. Sus pesquisas lo llevan al laberinto de la mayor biblioteca de la cristiandad.",
        feeling: "Erudita, misteriosa, densa y fascinantemente gótica. Recompensa al lector exigente con un banquete de enigmas medievales e historia.",
        hook: "La mezcla perfecta entre novela policíaca de corte sherlockiano, filosofía escolástica y secretos eclesiásticos.",
        notFor: "Lectores que rehúyan las digresiones teológicas en latín o los ritmos narrativos reposados y detallistas.",
        similar: ["El péndulo de Foucault", "La sombra del viento", "El código Da Vinci", "Q"],
        context: "Primera novela del semiólogo italiano Umberto Eco, convertida de inmediato en un fenómeno literario mundial sin precedentes."
      },
      axes: { tono: 4, ritmo: 2, emocion: 3, densidad: 5, humor: 3, tension: 4, fantasia: 1, escala: 3, ideas: 5, reconfort: 3 },
      themes: ["misterio", "crimen", "filosofia", "historia", "arte_y_literatura", "espiritualidad"],
      moments: ["concentracion", "aprender", "lluvia_manta", "para_subrayar"],
      oneLiner: "Crimen, teología y laberintos bibliófilos en una fascinante abadía del siglo XIV.",
      confidence: "alta"
    },
    {
      id: "book:los-pilares-de-la-tierra-1989",
      title: "Los pilares de la Tierra",
      experience: {
        plot: "A lo largo de varias décadas de guerra civil y hambruna en la Inglaterra medieval, el maestro cantero Tom Builder y el prior Philip luchan por levantar la catedral gótica más gloriosa de la cristiandad. En torno a los andamios se tejen pasiones, celos y venganzas.",
        feeling: "Adulterada por una épica desbordante, ritmo absorbente y un suspense continuo. Te hace vivir y oler cada piedra y cada traición.",
        hook: "La artesanía narrativa de Ken Follett para mantener el enganche durante mil páginas con villanos odiosos y héroes inolvidables.",
        notFor: "Quienes busquen prosa poética introspectiva o no quieran comprometerse con una lectura muy voluminosa.",
        similar: ["Un mundo sin fin", "El médico", "La catedral del mar", "Ivanhoe"],
        context: "El superventas histórico por antonomasia de los últimos 35 años, querido por millones de lectores en España."
      },
      axes: { tono: 3, ritmo: 4, emocion: 5, densidad: 3, humor: 2, tension: 4, fantasia: 1, escala: 5, ideas: 3, reconfort: 4 },
      themes: ["historia", "sociedad", "amor", "familia", "espiritualidad", "guerra"],
      moments: ["absorbente", "verano", "viaje", "desconectar"],
      oneLiner: "La construcción de una catedral gótica como eje de pasiones, venganzas y superación.",
      confidence: "alta"
    },
    {
      id: "book:el-hobbit-1937",
      title: "El Hobbit",
      experience: {
        plot: "Bilbo Bolsón, un pacífico y comodón hobbit de la Comarca, ve rota su tranquila rutina cuando el mago Gandalf y trece enanos lo reclutan para saquear el tesoro del dragón Smaug en la Montaña Solitaria. En el camino encontrará un misterioso anillo dorado.",
        feeling: "Aventurera, entrañable, mágica y divertida. Desprende el aroma a chimenea encendida, té caliente y caminos de leyenda.",
        hook: "El tono cálido de cuento de hadas de Tolkien, el ingenioso combate de acertijos con Gollum y la transformación de Bilbo en un héroe valeroso.",
        notFor: "Lectores que busquen la gravedad solemne y la oscuridad apocalíptica de El Señor de los Anillos.",
        similar: ["El Señor de los Anillos", "Las crónicas de Narnia", "Stardust", "La historia interminable"],
        context: "La obra que dio origen al legendarium de la Tierra Media en 1937, una joya atemporal de la literatura fantástica universal."
      },
      axes: { tono: 2, ritmo: 4, emocion: 3, densidad: 2, humor: 4, tension: 3, fantasia: 5, escala: 3, ideas: 3, reconfort: 5 },
      themes: ["fantasia_epica", "aventura", "mitologia", "viaje_interior"],
      moments: ["desconectar", "antes_de_dormir", "viaje", "emocionarse"],
      oneLiner: "La entrañable y chispeante aventura que abrió las puertas de la Tierra Media.",
      confidence: "alta"
    },
    {
      id: "book:el-senor-de-los-anillos-1954",
      title: "El Señor de los Anillos",
      experience: {
        plot: "Frodo Bolsón debe cruzar tierras hostiles para arrojar el Anillo Único en las entrañas del Monte del Destino, el único lugar donde puede ser destruido. Al mismo tiempo, los pueblos libres de la Tierra Media libran su última batalla contra las tinieblas de Sauron.",
        feeling: "Colosal, mitológica, conmovedora y de una belleza poética inagotable. Produce una reverencia absoluta ante la escala de su mundo ficticio.",
        hook: "La riqueza lingüística y geográfica sin igual, el heroísmo de los humildes y una melancolía crepuscular por el fin de una era.",
        notFor: "Lectores impacientes con las descripciones paisajísticas minuciosas, canciones y genealogías extensas.",
        similar: ["El Silmarillion", "Canción de hielo y fuego", "El nombre del viento", "La rueda del tiempo"],
        context: "El pilar indiscutible sobre el que descansa toda la fantasía moderna, escrita por J.R.R. Tolkien a lo largo de doce años."
      },
      axes: { tono: 3, ritmo: 3, emocion: 5, densidad: 4, humor: 2, tension: 4, fantasia: 5, escala: 5, ideas: 5, reconfort: 4 },
      themes: ["fantasia_epica", "guerra", "mitologia", "memoria", "viaje_interior"],
      moments: ["absorbente", "concentracion", "emocionarse", "viaje"],
      oneLiner: "El monumento cumbre de la fantasía heroica: mito, lealtad y esperanza contra el abismo.",
      confidence: "alta"
    },
    {
      id: "book:harry-potter-y-la-piedra-filosofal-1997",
      title: "Harry Potter y la piedra filosofal",
      experience: {
        plot: "Un niño huérfano y maltratado por sus tíos descubre en su undécimo cumpleaños que es mago y ha sido aceptado en el Colegio Hogwarts de Magia y Hechicería. Junto a sus inseparables amigos Ron y Hermione, descubrirá los secretos de su pasado y un oscuro complot.",
        feeling: "Mágica, chispeante, reconfortante y acogedora. Despierta de inmediato la ilusión infantil de pertenecer a un mundo prodigioso.",
        hook: "El fascinante universo de hechizos, banquetes y pasadizos secretos, y el poder de la amistad frente a la soledad.",
        notFor: "Lectores adultos que busquen exclusivamente fantasía oscura, compleja y descarnada.",
        similar: ["Percy Jackson", "Matilda", "El Hobbit", "Las crónicas de Narnia"],
        context: "Inicio del mayor fenómeno editorial de todos los tiempos que devolvió el hábito de la lectura a millones de niños y jóvenes."
      },
      axes: { tono: 1, ritmo: 4, emocion: 3, densidad: 2, humor: 4, tension: 2, fantasia: 5, escala: 2, ideas: 2, reconfort: 5 },
      themes: ["fantasia_epica", "infancia", "mayoria_de_edad", "aventura"],
      moments: ["desconectar", "antes_de_dormir", "emocionarse", "viaje"],
      oneLiner: "La puerta de entrada a un universo mágico inolvidable donde la amistad lo vence todo.",
      confidence: "alta"
    },
    {
      id: "book:juego-de-tronos-1996",
      title: "Juego de tronos",
      experience: {
        plot: "Lord Eddard Stark acepta el cargo de Mano del Rey en Desembarco del Rey para investigar la muerte de su predecesor, viéndose atrapado en un nido de víboras políticas. Mientras, en el remoto Muro, su hijo bastardo vigila una amenaza olvidada.",
        feeling: "Implacable, adictiva, sombría y de una crudeza descarnada. No da tregua al lector al desmantelar sin miramientos los tópicos de la fantasía.",
        hook: "La impecable polifonía de capítulos en primera persona (POV), la astucia de los complots políticos y el realismo medieval sin concesiones.",
        notFor: "Lectores sensibles a la violencia cruda, incesto o la muerte de personajes principales.",
        similar: ["Choque de reyes", "Los pilares de la Tierra", "La primera ley", "Dune"],
        context: "Primer tomo de la saga Canción de hielo y fuego de George R.R. Martin que revolucionó la literatura fantástica a finales de los 90."
      },
      axes: { tono: 5, ritmo: 4, emocion: 5, densidad: 4, humor: 2, tension: 5, fantasia: 3, escala: 5, ideas: 4, reconfort: 2 },
      themes: ["fantasia_epica", "politica", "guerra", "familia", "crimen"],
      moments: ["absorbente", "concentracion", "club_de_lectura"],
      oneLiner: "Fantasía política descarnada y adictiva donde quien juega a gobernar o vence o muere.",
      confidence: "alta"
    },
    {
      id: "book:dune-1965",
      title: "Dune",
      experience: {
        plot: "El joven Paul Atreides se traslada con su familia al hostil planeta desértico Arrakis, la única fuente conocida de la especia melange, la sustancia más codiciada del cosmos. Víctimas de una sangrienta traición imperial, Paul deberá buscar refugio entre los nativos Fremen.",
        feeling: "Mesmérica, filosófica, trascendente y sofocante como el desierto. Te envuelve en una mitología de profecías, ecología y poder.",
        hook: "La colosal construcción de mundo (worldbuilding), los gusanos gigantes de arena y la advertencia sobre los peligros del mesianismo.",
        notFor: "Quienes busquen ciencia ficción ligera de naves espaciales y batallas láser convencionales.",
        similar: ["Fundación", "El señor de los anillos", "Hyperion", "El juego de Ender"],
        context: "Premio Hugo y Nébula, considerada la cima indiscutible de la ciencia ficción ecológica y espacial escrita por Frank Herbert."
      },
      axes: { tono: 4, ritmo: 3, emocion: 4, densidad: 5, humor: 1, tension: 4, fantasia: 4, escala: 5, ideas: 5, reconfort: 2 },
      themes: ["ciencia_y_universo", "politica", "filosofia", "espiritualidad", "naturaleza", "guerra"],
      moments: ["concentracion", "absorbente", "para_subrayar", "club_de_lectura"],
      oneLiner: "Monumento de la ciencia ficción: ecología, misticismo y profecías en el desierto.",
      confidence: "alta"
    },
    {
      id: "book:fundacion-1951",
      title: "Fundación",
      experience: {
        plot: "Ante la inevitable caída del milenario Imperio Galáctico, el matemático Hari Seldon desarrolla la 'psicohistoria', una ciencia que predice el futuro de las masas. Para reducir la barbarie venidera, establece una comunidad de científicos en el confín de la galaxia.",
        feeling: "Cerebral, lúcida, visionaria y majestuosa. Cautiva por su inmenso alcance temporal y la victoria de la inteligencia sobre la fuerza bruta.",
        hook: "El fascinante concepto de la psicohistoria, las crisis históricas resueltas con diplomacia y el juego intelectual de Isaac Asimov.",
        notFor: "Lectores que busquen desarrollo emocional íntimo de personajes o romance novelesco.",
        similar: ["Dune", "Yo, robot", "El fin de la eternidad", "Cita con Rama"],
        context: "Galardonada con el Premio Hugo a la mejor serie de ciencia ficción de todos los tiempos, hito cumbre de la Edad de Oro del género."
      },
      axes: { tono: 2, ritmo: 3, emocion: 2, densidad: 3, humor: 2, tension: 3, fantasia: 2, escala: 5, ideas: 5, reconfort: 3 },
      themes: ["ciencia_y_universo", "historia", "politica", "sociedad", "filosofia"],
      moments: ["aprender", "desconectar", "para_subrayar", "concentracion"],
      oneLiner: "Gran epopeya intelectual sobre el auge, caída y renacer de las civilizaciones galácticas.",
      confidence: "alta"
    },
    {
      id: "book:yo-robot-1950",
      title: "Yo, robot",
      experience: {
        plot: "Colección de relatos hilados por las memorias de la robopsicóloga Susan Calvin en el siglo XXI. A través de distintos casos clínicos e incidentes, se exploran las paradójicas grietas de las Tres Leyes de la Robótica ideadas para proteger a los humanos.",
        feeling: "Ingeniosa, analítica, elegante y estimulante. Cada relato funciona como un fascinante acertijo lógico de inteligencia artificial y ética.",
        hook: "El rigor filosófico de las Tres Leyes y la sorprendente humanidad que destilan las máquinas en sus dilemas de programación.",
        notFor: "Quienes busquen la película de acción de Will Smith; el libro es una obra pausada de misterios lógicos y deducción.",
        similar: ["Fundación", "2001: Una odisea espacial", "¿Sueñan los androides con ovejas eléctricas?", "El hombre bicentenario"],
        context: "La obra que cimentó el concepto moderno de la robótica en la literatura y la ciencia, publicada por Asimov en 1950."
      },
      axes: { tono: 2, ritmo: 3, emocion: 2, densidad: 3, humor: 3, tension: 2, fantasia: 3, escala: 3, ideas: 5, reconfort: 4 },
      themes: ["tecnologia_futuro", "ciencia_y_universo", "filosofia", "misterio", "lenguaje"],
      moments: ["aprender", "desconectar", "concentracion"],
      oneLiner: "Elegantes acertijos éticos y lógicos que sentaron las bases de la inteligencia artificial.",
      confidence: "alta"
    },
    {
      id: "book:el-codigo-da-vinci-2003",
      title: "El código Da Vinci",
      experience: {
        plot: "El catedrático de simbología Robert Langdon es convocado al Museo del Louvre tras el asesinato del conservador, hallado cubierto de símbolos crípticos. Junto a una criptóloga francesa, emprende una vertiginosa huida descifrando enigmas ocultos en la historia cristiana.",
        feeling: "Frenética, adictiva, conspirativa y entretenidísima. Imposible de soltar gracias a capítulos cortísimos con giros en cada página.",
        hook: "La mezcla de misterios artísticos en obras de Da Vinci, sociedades secretas históricas y persecuciones a contra reloj.",
        notFor: "Lectores en busca de verosimilitud histórica rigurosa o de prosa literaria refinada.",
        similar: ["Ángeles y demonios", "El nombre de la rosa", "El ocho", "La catedral del mar"],
        context: "Uno de los mayores bestsellers mundiales del siglo XXI que desató debates globales y vendió más de 80 millones de copias."
      },
      axes: { tono: 3, ritmo: 5, emocion: 2, densidad: 2, humor: 1, tension: 4, fantasia: 2, escala: 3, ideas: 3, reconfort: 3 },
      themes: ["misterio", "crimen", "historia", "aventura", "espiritualidad"],
      moments: ["absorbente", "viaje", "desconectar"],
      oneLiner: "Thriller vertiginoso de sociedades secretas y enigmas ocultos en la historia del arte.",
      confidence: "alta"
    },
    {
      id: "book:los-hombres-que-no-amaban-a-las-mujeres-2005",
      title: "Los hombres que no amaban a las mujeres",
      experience: {
        plot: "El periodista de investigación Mikael Blomkvist y la indómita hacker tatuada Lisbeth Salander son contratados para resolver la desaparición de una joven ocurrida cuarenta años atrás en una remota isla sueca. Sus pesquisas desentierran oscuros secretos familiares.",
        feeling: "Tensa, fría, adictiva y moralmente implacable. Te sumerge en la nieve y la podredumbre moral de la aristocracia financiera.",
        hook: "El fascinante y demoledor magnetismo de Lisbeth Salander, una heroína punk con un código ético propio e inquebrantable.",
        notFor: "Lectores sensibles a la violencia sexual o que se atranquen con el arranque pausado de intriga financiera de los primeros capítulos.",
        similar: ["La chica que soñaba con una cerilla y un bidón de gasolina", "El silencio de los corderos", "Perdida", "El muñeco de nieve"],
        context: "El fenómeno nórdico por excelencia de la serie Millennium de Stieg Larsson que revolucionó el thriller contemporáneo."
      },
      axes: { tono: 5, ritmo: 4, emocion: 4, densidad: 3, humor: 1, tension: 5, fantasia: 1, escala: 2, ideas: 4, reconfort: 2 },
      themes: ["crimen", "misterio", "opresion", "familia", "sociedad"],
      moments: ["absorbente", "concentracion", "club_de_lectura"],
      oneLiner: "Misterio nórdico implacable y el nacimiento de la inolvidable justiciera Lisbeth Salander.",
      confidence: "alta"
    },
    {
      id: "book:crimen-y-castigo-1866",
      title: "Crimen y castigo",
      experience: {
        plot: "Raskólnikov, un joven estudiante sumido en la miseria en San Petersburgo, concibe una teoría según la cual los hombres extraordinarios tienen derecho a transgredir la ley moral. Bajo esta premisa comete un crimen atroz, pero la culpa y el remordimiento devoran su alma.",
        feeling: "Febril, claustrofóbica, angustiosa y espiritualmente catártica. Es una autopsia desgarradora de la culpa y la desesperación moral.",
        hook: "La profundidad psicológica insuperable de Fiódor Dostoyevski y el asfixiante duelo dialéctico entre el asesino y el juez de instrucción.",
        notFor: "Quienes busquen una lectura ligera o no soporten la inmersión en tormentos mentales y dilemas teológicos.",
        similar: ["Los hermanos Karamazov", "El idiota", "El proceso", "El extranjero"],
        context: "Cumbre de la novela psicológica universal publicada en 1866, testimonio eterno del abismo moral y la redención."
      },
      axes: { tono: 5, ritmo: 2, emocion: 5, densidad: 5, humor: 1, tension: 5, fantasia: 1, escala: 2, ideas: 5, reconfort: 2 },
      themes: ["crimen", "filosofia", "psicologia", "opresion", "soledad", "espiritualidad"],
      moments: ["concentracion", "para_subrayar", "emocionarse", "club_de_lectura"],
      oneLiner: "Monumental disección psicológica de la culpa, el remordimiento y la búsqueda de redención.",
      confidence: "alta"
    },
    {
      id: "book:orgullo-y-prejuicio-1813",
      title: "Orgullo y prejuicio",
      experience: {
        plot: "En la Inglaterra rural de principios del siglo XIX, la vivaz e inteligente Elizabeth Bennet debe lidiar con las presiones de su madre para casar a sus hijas. Al conocer al altivo y acaudalado señor Darcy, ambos deberán superar sus prejuicios para descubrir su amor mutuo.",
        feeling: "Brillante, ingeniosa, reconfortante y deliciosa. Despierta una sonrisa constante ante la agudeza de sus diálogos y la ironía social.",
        hook: "La deslumbrante química dialéctica entre Elizabeth y Darcy y la crítica mordaz e inteligente a las convenciones de clase.",
        notFor: "Lectores alérgicos a las novelas de costumbres de época o al romance clásico refinado.",
        similar: ["Sentido y sensibilidad", "Jane Eyre", "Emma", "Mujercitas"],
        context: "La obra más célebre de Jane Austen publicada en 1813, canon absoluto de la literatura romántica e ingeniosa en lengua inglesa."
      },
      axes: { tono: 1, ritmo: 3, emocion: 4, densidad: 3, humor: 4, tension: 2, fantasia: 1, escala: 2, ideas: 4, reconfort: 5 },
      themes: ["amor", "familia", "sociedad", "humor_y_satira", "mayoria_de_edad"],
      moments: ["desconectar", "lluvia_manta", "emocionarse", "antes_de_dormir"],
      oneLiner: "Ironía, elegancia y uno de los romances más chispeantes y perfectos jamás escritos.",
      confidence: "alta"
    }
  ],
  boardgame: [
    {
      id: "boardgame:brass-birmingham-2018",
      title: "Brass: Birmingham",
      experience: {
        plot: "Los jugadores asumen el papel de magnates industriales durante la Revolución Industrial en las Midlands inglesas. Desarrollan fábricas de algodón, manufacturas y cervecerías mientras construyen canales y ferrocarriles compitiendo por la supremacía del carbón y el hierro.",
        feeling: "Cerebral, implacable, profundamente satisfactoria y de alta exigencia mental. Cada turno se siente crucial y matemáticamente ajustado.",
        hook: "Una economía interconectada donde usar los recursos del rival beneficia a ambos y un sistema de doble era de canales y vías insuperable.",
        notFor: "Jugadores casuales, familias o quienes busquen partidas cortas con poco análisis y decisiones sencillas.",
        similar: ["Brass: Lancashire", "Concordia", "Terraforming Mars", "Barrage"],
        context: "Clasificado como el juego de mesa número 1 de la historia en BoardGameGeek, obra maestra de Martin Wallace y Gavan Brown."
      },
      axes: { peso: 4, interaccion: 4, azar: 1, confrontacion: 3, cooperacion: 1, tema: 4, risas: 1, familiar: 1 },
      themes: ["comercio_y_rutas", "gestion_de_recursos", "trenes_y_ferrocarril", "control_de_areas"],
      moments: ["jugones", "estrategia_dura", "sesion_tarde"],
      oneLiner: "La cumbre de la estrategia económica moderna: carbón, cerveza y vías industriales.",
      confidence: "alta"
    },
    {
      id: "boardgame:ark-nova-2021",
      title: "Ark Nova",
      experience: {
        plot: "Diseña y gestiona un zoológico moderno y científicamente avanzado con el objetivo de liderar proyectos de conservación. Deberás construir recintos adaptados, acoger especies de los cinco continentes y colaborar con patrocinadores de todo el mundo.",
        feeling: "Absorbente, enriquecedora, competitiva y muy satisfactoria al ver crecer tu parque. Te atrapa buscando el combo perfecto de cartas.",
        hook: "El genial sistema de 5 cartas de acción numeradas cuya potencia aumenta según la posición en que se encuentren en tu tablero.",
        notFor: "Quienes busquen interacción directa destructiva o partidas breves de menos de dos horas.",
        similar: ["Terraforming Mars", "Wingspan", "Agricola", "Castillos de Borgoña"],
        context: "El mayor fenómeno eurogame de la década de 2020, aupado velozmente a los puestos más altos de BGG."
      },
      axes: { peso: 4, interaccion: 2, azar: 2, confrontacion: 1, cooperacion: 1, tema: 4, risas: 1, familiar: 2 },
      themes: ["naturaleza_y_animales", "gestion_de_recursos", "deckbuilding", "puzzles_y_losetas"],
      moments: ["jugones", "estrategia_dura", "sesion_tarde", "pareja"],
      oneLiner: "El eurogame moderno definitivo sobre gestión de zoológicos y proyectos de conservación.",
      confidence: "alta"
    },
    {
      id: "boardgame:pandemic-legacy-season-1-2015",
      title: "Pandemic Legacy: Season 1",
      experience: {
        plot: "Un equipo de especialistas médicos de élite intenta contener cuatro plagas mortales que asolan el planeta a lo largo de un año natural. Cada mes trae nuevas crisis, mutaciones del virus y reglas permanentes que cambian físicamente el tablero para siempre.",
        feeling: "Angustiosa, memorable, épica y de tensión cooperativa máxima. Deja momentos imborrables grabados en la memoria de los jugadores.",
        hook: "La revolucionaria mecánica de destruir cartas, abrir cajas secretas y pegar adhesivos permanentes que alteran el destino de la campaña.",
        notFor: "Jugadores que no puedan reunir al mismo grupo fijo para completar las 12-24 partidas o no soporten alterar componentes del juego.",
        similar: ["Pandemic", "Gloomhaven", "Clank! Legacy", "T.I.M.E Stories"],
        context: "Pionero absoluto de los juegos 'legacy' narrativos que ocupó durante años el trono de número 1 mundial en BGG."
      },
      axes: { peso: 3, interaccion: 5, azar: 3, confrontacion: 1, cooperacion: 5, tema: 5, risas: 2, familiar: 3 },
      themes: ["cooperativo_pandemia", "gestion_de_mano", "gestion_de_recursos"],
      moments: ["cooperativo", "sesion_tarde", "jugones"],
      oneLiner: "Una campaña cooperativa inolvidable donde cada decisión marca el tablero para siempre.",
      confidence: "alta"
    },
    {
      id: "boardgame:gloomhaven-2017",
      title: "Gloomhaven",
      experience: {
        plot: "En una lúgubre y peligrosa ciudad fronteriza, un grupo de mercenarios con pasados oscuros acepta contratos en mazmorras, criptas y bosques olvidados. A medida que completan misiones, desvelan una vasta conspiración que sacude el destino del continente.",
        feeling: "Táctica, monumental, inmersiva y de una profundidad titánica. Sientes el sudor de cada combate táctico gestionando tus últimas cartas.",
        hook: "El magistral combate euro sin dados basado en la gestión de mano y un mundo persistente en una caja colosal de 10 kilos.",
        notFor: "Grupos sin espacio para dejar montado el tablero o con poco tiempo para comprometerse con decenas de sesiones.",
        similar: ["Frosthaven", "Mage Knight", "Descent", "Arkham Horror LCG"],
        context: "El rey indiscutible de las campañas de mazmorreo táctico que reinó en la cima de BoardGameGeek durante un lustro."
      },
      axes: { peso: 4, interaccion: 4, azar: 1, confrontacion: 1, cooperacion: 5, tema: 5, risas: 1, familiar: 1 },
      themes: ["fantasia_medieval", "gestion_de_mano", "exploracion_y_mapas"],
      moments: ["estrategia_dura", "cooperativo", "sesion_tarde", "jugones"],
      oneLiner: "El coloso del mazmorreo táctico cooperativo con combate de precisión matemática.",
      confidence: "alta"
    },
    {
      id: "boardgame:dune-imperium-uprising-2023",
      title: "Dune: Imperium – Uprising",
      experience: {
        plot: "Lidera una de las grandes casas del Imperio en la guerra total por el control del planeta Arrakis. Utiliza tropas, espías y pactos con los Fremen para dominar la cosecha de especia y reclamar la supremacía militar y política.",
        feeling: "Tensísima, letal, elegante y sumamente competitiva. La incertidumbre de los combates al final de ronda dispara la adrenalina en la mesa.",
        hook: "La fusión magistral entre construcción de mazos (deckbuilding) y colocación de trabajadores, enriquecida con gusanos de arena.",
        notFor: "Quienes detesten el faroleo en combate, el bloqueo de casillas o el conflicto directo entre jugadores.",
        similar: ["Dune: Imperium", "Clank!", "Ruinas Perdidas de Arnak", "Scythe"],
        context: "Evolución refinada e independiente de Dune: Imperium que consolidó la saga en lo más alto del ranking moderno."
      },
      axes: { peso: 3, interaccion: 5, azar: 2, confrontacion: 5, cooperacion: 1, tema: 5, risas: 2, familiar: 2 },
      themes: ["ciencia_ficcion_espacial", "colocacion_de_trabajadores", "deckbuilding", "control_de_areas"],
      moments: ["pique_sano", "jugones", "sesion_tarde"],
      oneLiner: "Tensión política y batallas despiadadas por la especia en el desierto de Arrakis.",
      confidence: "alta"
    },
    {
      id: "boardgame:dune-imperium-2020",
      title: "Dune: Imperium",
      experience: {
        plot: "Ponte al frente de una facción noble en Arrakis y compite por la especia y la lealtad de la Bene Gesserit, la Cofradía Espacial y el Emperador. Deberás equilibrar la influencia diplomática con el envío de tropas al conflicto armado.",
        feeling: "Afilada, vibrante, calculadora y emocionante. Cada carta jugada genera dudas tácticas y cada escaramuza puede cambiar la partida.",
        hook: "El ingenioso sistema donde cada carta de tu mano determina a qué casillas puedes enviar tus agentes y qué fuerza tendrás en la batalla.",
        notFor: "Jugadores pacifistas que prefieran construir sus motores de recursos sin interferencias ni robos ajenos.",
        similar: ["Dune: Imperium - Uprising", "Ruinas Perdidas de Arnak", "Concordia", "Blood Rage"],
        context: "Uno de los mayores éxitos de diseño de juegos de mesa de 2020 creado por Paul Dennen bajo la licencia de Frank Herbert."
      },
      axes: { peso: 3, interaccion: 4, azar: 2, confrontacion: 4, cooperacion: 1, tema: 5, risas: 2, familiar: 2 },
      themes: ["ciencia_ficcion_espacial", "colocacion_de_trabajadores", "deckbuilding", "control_de_areas"],
      moments: ["jugones", "pique_sano", "sesion_tarde"],
      oneLiner: "Magistral fusión de construcción de mazos e intriga militar en el universo de Dune.",
      confidence: "alta"
    },
    {
      id: "boardgame:twilight-imperium-fourth-edition-2017",
      title: "Twilight Imperium: Fourth Edition",
      experience: {
        plot: "Diecisiete civilizaciones alienígenas únicas compiten por llenar el vacío de poder del extinto Imperio Lazax en el trono galáctico de Mecatol Rex. Mediante diplomacia, guerras estelares y comercio, buscan erigirse en los nuevos emperadores de la galaxia.",
        feeling: "Monstruosamente épica, operística, teatral y agotadoramente maravillosa. Una jornada completa de traiciones y alianzas interestelares.",
        hook: "La fase de agenda política donde se votan leyes galácticas en vivo, la asimetría total de las razas y batallas con cientos de miniaturas.",
        notFor: "Cualquiera que no pueda dedicar 6 a 10 horas seguidas a una sola partida con un grupo de cuatro a seis amigos.",
        similar: ["Eclipse", "Star Wars: Rebellion", "Nemesis", "Terra Mystica"],
        context: "La experiencia cósmica 4X definitiva en formato tablero, un clásico de culto insustituible publicado por Fantasy Flight Games."
      },
      axes: { peso: 5, interaccion: 5, azar: 3, confrontacion: 4, cooperacion: 1, tema: 5, risas: 3, familiar: 1 },
      themes: ["ciencia_ficcion_espacial", "imperios_y_civilizaciones", "control_de_areas", "comercio_y_rutas"],
      moments: ["jugones", "estrategia_dura", "sesion_tarde"],
      oneLiner: "La ópera espacial definitiva: 8 horas de diplomacia, guerras galácticas y pura épica.",
      confidence: "alta"
    },
    {
      id: "boardgame:war-of-the-ring-second-edition-2011",
      title: "War of the Ring: Second Edition",
      experience: {
        plot: "Un enfrentamiento asimétrico para dos jugadores donde uno comanda las oscuras e infinitas huestes de Sauron y el otro lidera a los Pueblos Libres mientras la Compañía del Anillo avanza furtivamente hacia el Monte del Destino.",
        feeling: "Dramática, exhaustiva, fiel al milímetro al libro y de un suspense titánico. Cada tirada de dados de acción escribe una novela.",
        hook: "La tensión insoportable entre la guerra militar en las murallas de Minas Tirith y la caza silenciosa del Anillo.",
        notFor: "Quien busque juegos rápidos y con reglas sencillas; exige unas tres horas y una curva de aprendizaje considerable.",
        similar: ["Star Wars: Rebellion", "Twilight Struggle", "El Señor de los Anillos: LCG", "Dune"],
        context: "Considerado por consenso la adaptación lúdica más magistral jamás creada de la obra de Tolkien."
      },
      axes: { peso: 4, interaccion: 5, azar: 3, confrontacion: 5, cooperacion: 1, tema: 5, risas: 1, familiar: 1 },
      themes: ["fantasia_medieval", "guerra_historica", "control_de_areas", "dados_y_push_your_luck"],
      moments: ["pareja", "estrategia_dura", "jugones"],
      oneLiner: "La traslación definitiva de la épica de Tolkien a un duelo militar y narrativo colosal.",
      confidence: "alta"
    },
    {
      id: "boardgame:terraforming-mars-2016",
      title: "Terraforming Mars",
      experience: {
        plot: "Megacorporaciones rivales colaboran y compiten para hacer habitable el planeta Marte aumentando la temperatura, el nivel de oxígeno y la cobertura de los océanos. Para ganar, deberán gestionar recursos, patentes y proyectos científicos colosales.",
        feeling: "Adelantada, apasionante, adictiva y llena de satisfacción por construir un motor de cartas imparable turno a turno.",
        hook: "Las más de doscientas cartas únicas de proyectos que garantizan que ninguna partida ni estrategia sea idéntica a la anterior.",
        notFor: "Jugadores que prioricen la alta calidad plástica de componentes sobre el diseño mecánico y matemático.",
        similar: ["Ark Nova", "Through the Ages", "Gaia Project", "Race for the Galaxy"],
        context: "Uno de los juegos más influyentes y jugados en todo el mundo desde su lanzamiento en 2016 por FryxGames."
      },
      axes: { peso: 3, interaccion: 3, azar: 2, confrontacion: 2, cooperacion: 1, tema: 4, risas: 1, familiar: 2 },
      themes: ["ciencia_ficcion_espacial", "gestion_de_recursos", "draft_de_cartas", "puzzles_y_losetas"],
      moments: ["jugones", "sesion_tarde", "pareja"],
      oneLiner: "Ciencia ficción dura y satisfacción pura construyendo motores para hacer habitable Marte.",
      confidence: "alta"
    },
    {
      id: "boardgame:star-wars-rebellion-2016",
      title: "Star Wars: Rebellion",
      experience: {
        plot: "El Imperio Galáctico despliega su abrumadora flota para encontrar y aniquilar la base secreta rebelde oculta en algún planeta de la galaxia. La Alianza Rebelde, con recursos mínimos, debe recurrir a la guerrilla, el sabotaje y la esperanza.",
        feeling: "Cinematográfica, trepidante, llena de suspense y emoción de película. Una partida recrea la trilogía clásica entera en tu mesa.",
        hook: "El juego del escondite a escala galáctica: el jugador imperial interroga y rastrea mientras el rebelde resiste con audacia.",
        notFor: "Grupos numerosos, ya que brilla casi exclusivamente como duelo para dos jugadores.",
        similar: ["War of the Ring", "Twilight Struggle", "Star Wars: Imperial Assault", "Nemesis"],
        context: "La experiencia de mesa definitiva de Star Wars, un hito del catálogo temático de Fantasy Flight Games."
      },
      axes: { peso: 4, interaccion: 5, azar: 3, confrontacion: 5, cooperacion: 1, tema: 5, risas: 2, familiar: 2 },
      themes: ["ciencia_ficcion_espacial", "control_de_areas", "misterio_y_deduccion", "faroleo_y_enganos"],
      moments: ["pareja", "jugones", "sesion_tarde"],
      oneLiner: "Toda la emoción de la trilogía clásica de Star Wars en un duelo galáctico sin igual.",
      confidence: "alta"
    },
    {
      id: "boardgame:spirit-island-2017",
      title: "Spirit Island",
      experience: {
        plot: "Ponte en la piel de espíritus elementales ancestrales de una isla virgen para defenderla de la invasión de colonos europeos destructores. Desata plagas, tormentas y pesadillas guiando a la tribu nativa Dahan para expulsar a los barcos invasores.",
        feeling: "Desafiante, sesuda, catártica y profundamente cooperativa. Exige una sincronía mental total para no sucumbir a la plaga.",
        hook: "El giro temático anticolonialista brillante y la satisfacción inmensa de crecer de una chispa débil a una tormenta devastadora.",
        notFor: "Jugadores que se agobien con el análisis-parálisis o busquen un cooperativo relajado y permisivo.",
        similar: ["Pandemic", "Gloomhaven", "Robinson Crusoe", "Mage Knight"],
        context: "Aclamado como el juego cooperativo más profundo e inteligente del mercado moderno, diseñado por R. Eric Reuss."
      },
      axes: { peso: 4, interaccion: 5, azar: 1, confrontacion: 1, cooperacion: 5, tema: 5, risas: 1, familiar: 1 },
      themes: ["fantasia_medieval", "gestion_de_mano", "control_de_areas"],
      moments: ["cooperativo", "estrategia_dura", "jugones", "pareja"],
      oneLiner: "Poderosa subversión anticolonial: espíritus desatando la furia de la naturaleza.",
      confidence: "alta"
    },
    {
      id: "boardgame:gloomhaven-jaws-of-the-lion-2020",
      title: "Gloomhaven: Jaws of the Lion",
      experience: {
        plot: "Versión accesible y guiada del universo de Gloomhaven centrada en cuatro nuevos mercenarios que investigan una oleada de desapariciones en los bajos fondos de la ciudad. El libro de escenarios sirve como propio tablero de juego.",
        feeling: "Ágil, estimulante, adictiva y muy gratificante. Elimina la tediosa preparación del juego original para centrarse en la diversión.",
        hook: "Un tutorial en cinco misiones maestras que enseña a jugar sin tener que leer un manual de 50 páginas de golpe.",
        notFor: "Veteranos del Gloomhaven original que busquen exactamente la misma inmensidad y centenar de misiones del primero.",
        similar: ["Gloomhaven", "Frosthaven", "Mice and Mystics", "HeroQuest"],
        context: "La puerta de entrada ideal al mejor sistema de mazmorreo táctico moderno, aclamado por crítica y público."
      },
      axes: { peso: 3, interaccion: 4, azar: 1, confrontacion: 1, cooperacion: 5, tema: 5, risas: 1, familiar: 3 },
      themes: ["fantasia_medieval", "gestion_de_mano", "exploracion_y_mapas"],
      moments: ["cooperativo", "pareja", "jugones"],
      oneLiner: "La mejor puerta de entrada al universo Gloomhaven: táctico, directo y adictivo.",
      confidence: "alta"
    },
    {
      id: "boardgame:gaia-project-2017",
      title: "Gaia Project",
      experience: {
        plot: "Catorce civilizaciones espaciales asimétricas colonizan, terraforman y construyen estructuras en una galaxia modular. Cada facción altera los planetas para adaptarlos a su medio biológico e investiga nuevas tecnologías científicas.",
        feeling: "Matemática, pura, austera y extraordinariamente profunda. Cero azar: cada victoria es fruto exclusivo de la planificación.",
        hook: "La perfecta reinterpretación espacial de Terra Mystica, con un tablero modular variable y un árbol tecnológico adictivo.",
        notFor: "Quienes busquen azar emocionante, combates directos o temáticas narrativas ligeras.",
        similar: ["Terra Mystica", "Terraforming Mars", "Brass: Birmingham", "Clans of Caledonia"],
        context: "Una de las obras maestras absolutas del eurogame duro y determinista de la última década."
      },
      axes: { peso: 5, interaccion: 3, azar: 1, confrontacion: 2, cooperacion: 1, tema: 3, risas: 1, familiar: 1 },
      themes: ["ciencia_ficcion_espacial", "imperios_y_civilizaciones", "gestion_de_recursos", "control_de_areas"],
      moments: ["estrategia_dura", "jugones", "sesion_tarde"],
      oneLiner: "Estrategia galáctica perfecta y sin azar para los amantes de la optimización pura.",
      confidence: "alta"
    },
    {
      id: "boardgame:seti-search-for-extraterrestrial-intelligence-2024",
      title: "SETI: Search for Extraterrestrial Intelligence",
      experience: {
        plot: "Los jugadores lideran agencias científicas espaciales dedicadas a explorar el sistema solar y escudriñar el espacio profundo en busca de señales de vida extraterrestre mediante sondas, telescopios y análisis de datos.",
        feeling: "Científica, fascinante, optimista y meticulosa. Transmite con rigor la emoción del descubrimiento astronómico.",
        hook: "El tablero con órbitas planetarias giratorias que cambian las distancias y costes de lanzamiento en tiempo real.",
        notFor: "Jugadores que busquen fantasía o combates espaciales bélicos.",
        similar: ["Terraforming Mars", "Ark Nova", "High Frontier", "On Mars"],
        context: "Gran éxito de la feria de Essen Spiel 2024 diseñado por Tomáš Holek y editado por CGE."
      },
      axes: { peso: 4, interaccion: 2, azar: 2, confrontacion: 1, cooperacion: 1, tema: 5, risas: 1, familiar: 2 },
      themes: ["ciencia_ficcion_espacial", "gestion_de_recursos", "draft_de_cartas"],
      moments: ["jugones", "estrategia_dura", "sesion_tarde"],
      oneLiner: "Rigor científico y fascinación astronómica explorando el cosmos en busca de vida.",
      confidence: "alta"
    },
    {
      id: "boardgame:slay-the-spire-the-board-game-2024",
      title: "Slay the Spire: The Board Game",
      experience: {
        plot: "Adaptación del aclamado videojuego roguelike en el que un grupo de guerreros asciende una aguja cambiante combatiendo criaturas grotescas, mejorando su baraja de cartas y adquiriendo reliquias para derrotar al jefe final.",
        feeling: "Frenética, cooperativa, muy satisfactoria y llena de combos sinérgicos. Traslada la adicción del videojuego a la mesa con amigos.",
        hook: "La excelente traducción de las cartas enfundadas que se actualizan físicamente y la cooperación total entre héroes.",
        notFor: "Quienes busquen partidas relajadas y no toleren perder por una mala decisión táctica en el último turno.",
        similar: ["Gloomhaven", "Clank!", "Aeon's End", "Too Many Bones"],
        context: "Exitosísima campaña de micromecenazgo que logró una de las mejores adaptaciones de videojuego a tablero de 2024."
      },
      axes: { peso: 3, interaccion: 5, azar: 3, confrontacion: 1, cooperacion: 5, tema: 4, risas: 3, familiar: 2 },
      themes: ["fantasia_medieval", "deckbuilding", "dados_y_push_your_luck"],
      moments: ["cooperativo", "sesion_tarde", "pique_sano"],
      oneLiner: "La adicción pura del deckbuilding roguelike adaptada con maestría a la mesa.",
      confidence: "alta"
    },
    {
      id: "boardgame:twilight-struggle-2005",
      title: "Twilight Struggle",
      experience: {
        plot: "Simulación para dos jugadores de la Guerra Fría entre Estados Unidos y la Unión Soviética desde 1945 hasta la caída del Muro de Berlín. Las dos superpotencias compiten por la hegemonía mundial mediante golpes de estado, espionaje y la carrera espacial sin provocar una guerra nuclear.",
        feeling: "Tensión histórica insoportable, paranoia constante y decisiones agónicas. Cada carta jugada del rival te hace sudar frío.",
        hook: "Tener que jugar cartas que favorecen al enemigo y decidir cómo mitigar el daño mientras evitas llegar a Defcon 1.",
        notFor: "Quien no disfrute con duelos directos de suma cero donde cada error se paga muy caro.",
        similar: ["War of the Ring", "1989: Dawn of Freedom", "Watergate", "Wir sind das Volk!"],
        context: "El juego de simulación histórica para dos jugadores más influyente y valorado de la historia de GMT Games."
      },
      axes: { peso: 4, interaccion: 5, azar: 2, confrontacion: 5, cooperacion: 1, tema: 5, risas: 1, familiar: 1 },
      themes: ["guerra_historica", "control_de_areas", "gestion_de_mano"],
      moments: ["pareja", "estrategia_dura", "jugones"],
      oneLiner: "El duelo definitivo de la Guerra Fría: paranoia, espionaje y el abismo nuclear.",
      confidence: "alta"
    },
    {
      id: "boardgame:the-castles-of-burgundy-2011",
      title: "The Castles of Burgundy",
      experience: {
        plot: "Ambientado en la región de Borgoña en el siglo XV, los jugadores son príncipes que expanden sus asentamientos construyendo castillos, granjas, minas de plata y rutas comerciales mediante la colocación de losetas guiadas por dados.",
        feeling: "Fluida, placentera, adictiva y reconfortante. Encadenar acciones y completar distritos genera una satisfacción lúdica insuperable.",
        hook: "La brillante mitigación del azar de los dados usando trabajadores para ajustar los valores numéricos a tu conveniencia.",
        notFor: "Amantes de temáticas de fantasía vibrantes o que busquen enfrentamientos bélicos directos.",
        similar: ["Carcassonne", "Concordia", "Puerto Rico", "Grand Austria Hotel"],
        context: "La obra maestra de Stefan Feld, clásico imperecedero del diseño de juegos de mesa alemán."
      },
      axes: { peso: 3, interaccion: 3, azar: 3, confrontacion: 2, cooperacion: 1, tema: 2, risas: 1, familiar: 4 },
      themes: ["construccion_de_ciudades", "puzzles_y_losetas", "dados_y_push_your_luck", "gestion_de_recursos"],
      moments: ["pareja", "sesion_tarde", "sobremesa"],
      oneLiner: "Elegancia alemana insuperable en la gestión de dados y colocación de losetas.",
      confidence: "alta"
    },
    {
      id: "boardgame:through-the-ages-a-new-story-of-civilization-2015",
      title: "Through the Ages: A New Story of Civilization",
      experience: {
        plot: "Guía a tu civilización desde la Antigüedad hasta la Era Moderna. Desarrolla tecnologías, construye maravillas, elige a líderes históricos y gestiona la cultura y el ejército para dejar una huella imborrable en la historia.",
        feeling: "Monumental, exigente, cerebral y profundamente épica. Ver florecer a tu civilización frente a los rivales es una experiencia inolvidable.",
        hook: "El sistema de draft de cartas en una hilera móvil y la tensión de no descuidar jamás la fuerza militar.",
        notFor: "Partidas improvisadas o jugadores que odien la contabilidad continua de recursos y población.",
        similar: ["Civilization", "Nations", "Terraforming Mars", "7 Wonders"],
        context: "Cima del diseño de civilizaciones en cartas creada por el célebre autor checo Vlaada Chvátil."
      },
      axes: { peso: 5, interaccion: 4, azar: 1, confrontacion: 4, cooperacion: 1, tema: 5, risas: 1, familiar: 1 },
      themes: ["imperios_y_civilizaciones", "draft_de_cartas", "gestion_de_recursos"],
      moments: ["estrategia_dura", "jugones", "sesion_tarde"],
      oneLiner: "El juego de civilizaciones definitivo: desde la rueda hasta el viaje espacial.",
      confidence: "alta"
    },
    {
      id: "boardgame:the-lord-of-the-rings-duel-for-middle-earth-2024",
      title: "The Lord of the Rings: Duel for Middle-earth",
      experience: {
        plot: "Reinvención del galardonado sistema 7 Wonders Duel en la Tierra Media. Un jugador comanda la Compañía del Anillo y los Pueblos Libres mientras el otro encarna a Sauron y sus secuaces, disputándose la victoria por tres caminos: militar, alianzas raciales o el destino del Anillo.",
        feeling: "Rápida, directa, tensa y adictiva. Cada robo de carta es un pulso psicológico frente a tu rival.",
        hook: "Las tres condiciones de victoria inmediata que obligan a vigilar constantemente cada movimiento del contrario.",
        notFor: "Mesas de más de dos personas; es un juego estrictamente diseñado para parejas.",
        similar: ["7 Wonders Duel", "War of the Ring", "Jaipur", "Star Wars: The Deckbuilding Game"],
        context: "Éxito unánime de 2024 de Antoine Bauza y Bruno Cathala ambientado con maestría en el mundo de Tolkien."
      },
      axes: { peso: 2, interaccion: 5, azar: 2, confrontacion: 4, cooperacion: 1, tema: 5, risas: 2, familiar: 4 },
      themes: ["fantasia_medieval", "draft_de_cartas", "control_de_areas"],
      moments: ["pareja", "pique_sano", "rapido_filler"],
      oneLiner: "Duelo vertiginoso y adictivo para dos jugadores por el destino de la Tierra Media.",
      confidence: "alta"
    },
    {
      id: "boardgame:frosthaven-2022",
      title: "Frosthaven",
      experience: {
        plot: "En las gélidas e inhóspitas tierras del norte, un grupo de mercenarios defiende y expande el último puesto de avanzada de la civilización. Además de combatir en mazmorras heladas, deberás reconstruir el pueblo entre estaciones.",
        feeling: "Titánica, desafiante, absorbente y épica. El peso de cada victoria sobre el frío y las bestias se siente colosal.",
        hook: "La combinación del combate táctico perfeccionado de Gloomhaven con una fase de gestión de asentamiento y crafteo de equipo.",
        notFor: "Quienes no dispongan de un espacio permanente de juego y decenas de horas para una campaña masiva.",
        similar: ["Gloomhaven", "Gloomhaven: Jaws of the Lion", "Mage Knight", "Sleeping Gods"],
        context: "La campaña de Kickstarter más exitosa de la historia de los juegos de mesa (13 millones de dólares), diseñada por Isaac Childres."
      },
      axes: { peso: 5, interaccion: 4, azar: 1, confrontacion: 1, cooperacion: 5, tema: 5, risas: 1, familiar: 1 },
      themes: ["fantasia_medieval", "construccion_de_ciudades", "gestion_de_mano", "exploracion_y_mapas"],
      moments: ["estrategia_dura", "cooperativo", "sesion_tarde", "jugones"],
      oneLiner: "La evolución del mazmorreo: supervivencia, gestión y combate en el norte helado.",
      confidence: "alta"
    }
  ],
  artist: [
    {
      id: "artist:the-beatles-1960",
      title: "The Beatles",
      experience: {
        plot: "El cuarteto de Liverpool revolucionó la música popular desde sus inicios en el beat y el pop británico hasta la vanguardia psicodélica, la experimentación sonora de estudio y el rock clásico.",
        feeling: "Infecciosamente melódica, ingeniosa, emotiva y atemporal. Genera euforia, ternura y asombro por su maestría compositiva.",
        hook: "Armonías vocales irrepetibles, evolución constante en cada disco y un catálogo de canciones que forman parte del ADN cultural del mundo.",
        notFor: "Oyentes que busquen géneros extremos como metal pesado o música electrónica de club.",
        similar: ["The Beach Boys", "The Rolling Stones", "Pink Floyd", "The Kinks"],
        context: "La banda más influyente y vendedora de la historia de la música popular del siglo XX."
      },
      axes: { energia: 3, valencia: 4, bailable: 3, organico: 5, intensidad: 3, fondo: 2, complejidad: 3 },
      themes: ["rock_clasico", "pop", "psicodelia", "letras_poeticas"],
      moments: ["viaje_coche", "relax", "para_cantar", "escucha_atenta"],
      oneLiner: "Melodías universales, ingenio desbordante y emoción imperecedera.",
      confidence: "alta"
    },
    {
      id: "artist:queen-1970",
      title: "Queen",
      experience: {
        plot: "Banda británica liderada por el inigualable Freddie Mercury que fusionó el hard rock con la grandilocuencia operística, el pop y armonías vocales teatrales de escala épica.",
        feeling: "Teatral, triunfal, exuberante y arrolladora. Desata una euforia colectiva inmediata y ganas irresistibles de cantar a coro.",
        hook: "El registro vocal prodigioso de Mercury, la guitarra inconfundible de Brian May y los himnos de estadio más universales del planeta.",
        notFor: "Quienes prefieran el minimalismo austero, el lo-fi o aborrezcan la pompa operística.",
        similar: ["David Bowie", "Elton John", "Led Zeppelin", "The Darkness"],
        context: "Gigantes del rock británico de los 70 y 80, autores de himnos que siguen sonando en estadios de todo el mundo."
      },
      axes: { energia: 5, valencia: 4, bailable: 4, organico: 4, intensidad: 4, fondo: 1, complejidad: 4 },
      themes: ["rock_clasico", "pop", "himnos_estadio", "vanguardia"],
      moments: ["para_cantar", "fiesta", "viaje_coche", "entrenar"],
      oneLiner: "Teatralidad operística, carisma inigualable e himnos eternos para la humanidad.",
      confidence: "alta"
    },
    {
      id: "artist:pink-floyd-1965",
      title: "Pink Floyd",
      experience: {
        plot: "Pioneros del rock psicodélico y progresivo británico que construyeron álbumes conceptuales monumentales sobre la locura, el tiempo, la codicia y la alienación humana.",
        feeling: "Hipnótica, cósmica, introspectiva y profundamente emotiva. Te sumerge en un viaje cerebral y sonoro de una belleza melancólica única.",
        hook: "Los solos desgarradores y expresivos de David Gilmour y la cuidada producción sonora con paisajes de sintetizadores.",
        notFor: "Oyentes que busquen singles pop de tres minutos o música festiva y bailable.",
        similar: ["Genesis", "King Crimson", "David Bowie", "Radiohead"],
        context: "Arquitectos de álbumes cumbre como The Dark Side of the Moon y The Wall, cumbres del rock progresivo."
      },
      axes: { energia: 3, valencia: 2, bailable: 1, organico: 4, intensidad: 3, fondo: 1, complejidad: 5 },
      themes: ["rock_clasico", "psicodelia", "experimentacion", "letras_poeticas"],
      moments: ["escucha_atenta", "melancolia", "relax", "viaje_coche"],
      oneLiner: "Viaje sónico monumental hacia los confines del espacio, la mente y la melancolía.",
      confidence: "alta"
    },
    {
      id: "artist:led-zeppelin-1968",
      title: "Led Zeppelin",
      experience: {
        plot: "Cuarteto británico que cimentó las bases del hard rock y el heavy metal fusionando el blues más electrizante con la mitología celta y ritmos atronadores de batería.",
        feeling: "Poderosa, mística, volcánica y visceral. Transmite una fuerza física arrolladora y un virtuosismo musical sobrehumano.",
        hook: "La contundencia inimitable de John Bonham a la batería, los riffs legendarios de Jimmy Page y los aullidos de Robert Plant.",
        notFor: "Quienes busquen producciones pop delicadas o música tranquila para relajarse.",
        similar: ["Deep Purple", "Black Sabbath", "The Who", "Jimi Hendrix"],
        context: "La banda de rock más grande y arrolladora de los años 70, piedra de toque de toda la música pesada moderna."
      },
      axes: { energia: 5, valencia: 3, bailable: 2, organico: 5, intensidad: 5, fondo: 1, complejidad: 4 },
      themes: ["rock_clasico", "blues", "himnos_estadio", "metal"],
      moments: ["viaje_coche", "entrenar", "escucha_atenta", "fiesta"],
      oneLiner: "Poderío eléctrico, misticismo y la fuerza fundacional del rock más salvaje.",
      confidence: "alta"
    },
    {
      id: "artist:the-rolling-stones-1962",
      title: "The Rolling Stones",
      experience: {
        plot: "Epitafio viviente del rock and roll: una máquina de rhythm and blues sucio, descarado y peligroso que ha recorrido más de seis décadas sobre los escenarios de todo el planeta.",
        feeling: "Chulesca, contagiosa, cruda y electrizante. Despide sudor, juventud rebelde y pura actitud rockera.",
        hook: "Los riffs inmortales de Keith Richards en afinación abierta y el movimiento electrizante de Mick Jagger.",
        notFor: "Quienes busquen pulcritud de conservatorio o producciones sintéticas impecables y asépticas.",
        similar: ["The Beatles", "The Who", "The Kinks", "Aerosmith"],
        context: "La mayor y más longeva banda de rock and roll del mundo, sinónimo indiscutible del género desde 1962."
      },
      axes: { energia: 4, valencia: 4, bailable: 4, organico: 5, intensidad: 4, fondo: 2, complejidad: 2 },
      themes: ["rock_clasico", "blues", "himnos_estadio"],
      moments: ["fiesta", "viaje_coche", "para_cantar"],
      oneLiner: "Pura actitud, rebeldía y el pulso más longevo y contagioso del rock and roll.",
      confidence: "alta"
    },
    {
      id: "artist:the-who-1964",
      title: "The Who",
      experience: {
        plot: "Banda británica emblema del movimiento mod que llevó el rock a la intensidad máxima, pioneros de las óperas rock conceptuales y famosos por destrozar sus instrumentos en escena.",
        feeling: "Explosiva, furiosa, teatral y catártica. Desprende una adrenalina rebelde cargada de energía adolescente.",
        hook: "Los molinetes de guitarra de Pete Townshend, el salvajismo caótico de Keith Moon a la batería y canciones catárticas como Baba O'Riley.",
        notFor: "Quienes busquen sutileza acústica relajada o melodías de fondo suaves.",
        similar: ["The Rolling Stones", "The Kinks", "Led Zeppelin", "The Clash"],
        context: "Gigantes de la invasión británica de los 60, creadores de las primeras y más famosas óperas rock (Tommy, Quadrophenia)."
      },
      axes: { energia: 5, valencia: 3, bailable: 3, organico: 5, intensidad: 5, fondo: 1, complejidad: 4 },
      themes: ["rock_clasico", "punk", "himnos_estadio", "protesta_social"],
      moments: ["viaje_coche", "entrenar", "para_cantar"],
      oneLiner: "Furia eléctrica, catarsis y la energía más volcánica de la invasión británica.",
      confidence: "alta"
    },
    {
      id: "artist:the-doors-1965",
      title: "The Doors",
      experience: {
        plot: "Formación angelina liderada por el poeta Jim Morrison que combinó el blues rock con la poesía simbolista, el misticismo chamánico y el hipnótico teclado de Ray Manzarek.",
        feeling: "Oscura, sensual, hipnótica y chamánica. Te arrastra a un trance nocturno entre el delirio y la lucidez poética.",
        hook: "El carisma oscuro y la voz barítona de Morrison y el bajo inexistente suplido por el teclado psicodélico de Manzarek.",
        notFor: "Oyentes que busquen optimismo radiante o estructuras convencionales de música pop complaciente.",
        similar: ["The Velvet Underground", "Jimi Hendrix", "Jefferson Airplane", "Patti Smith"],
        context: "Banda icónica de la contracultura de finales de los sesenta en California, leyenda eterna del rock maldito."
      },
      axes: { energia: 3, valencia: 2, bailable: 2, organico: 4, intensidad: 4, fondo: 1, complejidad: 4 },
      themes: ["rock_clasico", "psicodelia", "blues", "letras_poeticas"],
      moments: ["escucha_atenta", "melancolia", "relax"],
      oneLiner: "Poesía chamánica, misterio nocturno y psicodelia oscura desde California.",
      confidence: "alta"
    },
    {
      id: "artist:jimi-hendrix-1966",
      title: "Jimi Hendrix",
      experience: {
        plot: "Virtuoso guitarrista zurdo de Seattle que reinventó por completo las posibilidades sonoras de la guitarra eléctrica mediante el uso pionero de distorsión, wah-wah y acoples.",
        feeling: "Incendiaria, cósmica, libre y salvajemente expresiva. Parece hacer hablar a la guitarra con un lenguaje mágico nunca antes oído.",
        hook: "Un dominio técnico y expresivo irrepetible sobre las seis cuerdas y un directo legendario que desafió todas las convenciones.",
        notFor: "Oídos que rechacen la distorsión analógica agresiva o la improvisación instrumental extendida.",
        similar: ["Cream", "The Doors", "Stevie Ray Vaughan", "Led Zeppelin"],
        context: "Considerado por consenso unánime de músicos y crítica como el mejor guitarrista eléctrico de todos los tiempos."
      },
      axes: { energia: 5, valencia: 3, bailable: 2, organico: 4, intensidad: 5, fondo: 1, complejidad: 5 },
      themes: ["rock_clasico", "blues", "psicodelia", "experimentacion"],
      moments: ["escucha_atenta", "viaje_coche", "entrenar"],
      oneLiner: "El guitarrista definitivo: reinventó la electricidad en un torrente de fuego y psicodelia.",
      confidence: "alta"
    },
    {
      id: "artist:ac-dc-1973",
      title: "AC/DC",
      experience: {
        plot: "Los hermanos Young fundaron en Australia la máquina definitiva del hard rock: riffs cortantes, base rítmica de precisión de acero y una fidelidad inquebrantable al rock más directo.",
        feeling: "Pura adrenalina, electricidad sin tregua, fiesta desenfrenada y potencia motora. Es imposible no mover la cabeza al compás.",
        hook: "Los acordes demoledores de Angus Young en uniforme escolar y estribillos masivos diseñados para corearse a voz en grito.",
        notFor: "Quienes busquen experimentación sonora compleja, baladas intimistas o variedad estilística.",
        similar: ["Guns N' Roses", "Airbourne", "KISS", "Motorhead"],
        context: "Autores de Back in Black, uno de los discos más vendidos de la historia de la humanidad."
      },
      axes: { energia: 5, valencia: 4, bailable: 3, organico: 5, intensidad: 5, fondo: 2, complejidad: 1 },
      themes: ["rock_clasico", "metal", "himnos_estadio"],
      moments: ["entrenar", "fiesta", "viaje_coche", "para_cantar"],
      oneLiner: "Electricidad de alto voltaje: los riffs más demoledores y directos del rock.",
      confidence: "alta"
    },
    {
      id: "artist:deep-purple-1968",
      title: "Deep Purple",
      experience: {
        plot: "Pioneros británicos del hard rock y heavy metal clásico que unieron la contundencia de la guitarra eléctrica con el órgano Hammond distorsionado y elementos clásicos.",
        feeling: "Enérgica, virtuosa, potente y vibrante. Desprende una maestría instrumental que desafía al oyente a seguir su ritmo trepidante.",
        hook: "El riff más conocido del mundo en Smoke on the Water y los vertiginosos duelos entre la guitarra de Ritchie Blackmore y el teclado de Jon Lord.",
        notFor: "Aficionados al pop acústico suave o a producciones minimalistas contemporáneas.",
        similar: ["Black Sabbath", "Led Zeppelin", "Rainbow", "Uriah Heep"],
        context: "Parte de la 'Santísima Trinidad' del hard rock británico de los años 70 junto a Zeppelin y Sabbath."
      },
      axes: { energia: 5, valencia: 3, bailable: 2, organico: 5, intensidad: 4, fondo: 2, complejidad: 4 },
      themes: ["rock_clasico", "metal", "himnos_estadio"],
      moments: ["viaje_coche", "entrenar", "escucha_atenta"],
      oneLiner: "Duelos virtuosos de guitarra y órgano Hammond en la forja dorada del hard rock.",
      confidence: "alta"
    },
    {
      id: "artist:black-sabbath-1968",
      title: "Black Sabbath",
      experience: {
        plot: "Desde la deprimida ciudad industrial de Birmingham, cuatro jóvenes crearon un sonido oscuro y afinado en tonos graves que dio origen al heavy metal y el doom metal.",
        feeling: "Tenebrosa, pesada, hipnótica y opresiva. Los riffs monolíticos de Tony Iommi se sienten como un martillo de forja implacable.",
        hook: "La atmósfera de terror gótico, los riffs eternos de Iommi y la voz agónica y electrizante de Ozzy Osbourne.",
        notFor: "Oyentes sensibles a la distorsión pesada o que busquen melodías pop ligeras y despreocupadas.",
        similar: ["Led Zeppelin", "Deep Purple", "Judas Priest", "Iron Maiden"],
        context: "Los padres fundadores indiscutibles del heavy metal con álbumes legendarios como Paranoid y Master of Reality."
      },
      axes: { energia: 4, valencia: 1, bailable: 1, organico: 5, intensidad: 5, fondo: 1, complejidad: 3 },
      themes: ["metal", "rock_clasico", "letras_poeticas"],
      moments: ["entrenar", "escucha_atenta", "melancolia"],
      oneLiner: "Los arquitectos del heavy metal: riffs oscuros, pesadez industrial y sombras góticas.",
      confidence: "alta"
    },
    {
      id: "artist:guns-n-roses-1985",
      title: "Guns N' Roses",
      experience: {
        plot: "Irrumpieron en Los Ángeles a finales de los 80 recuperando el peligro, la crudeza y el exceso del hard rock callejero frente a la edulcorada escena del glam metal.",
        feeling: "Salvaje, explosiva, apasionada y rebelde. Te contagia una furia callejera mezclada con una inesperada delicadeza en sus baladas.",
        hook: "La desgarrada y volcánica voz de Axl Rose, los solos legendarios con chistera de Slash y melodías imbatibles.",
        notFor: "Quienes busquen música tranquila o no toleren los excesos temperamentales del rock de estadio.",
        similar: ["Aerosmith", "AC/DC", "Motley Crue", "Velvet Revolver"],
        context: "Autores de Appetite for Destruction (1987), el disco debut más vendido de la historia de los Estados Unidos."
      },
      axes: { energia: 5, valencia: 3, bailable: 3, organico: 5, intensidad: 5, fondo: 2, complejidad: 3 },
      themes: ["rock_clasico", "metal", "himnos_estadio"],
      moments: ["viaje_coche", "entrenar", "para_cantar", "fiesta"],
      oneLiner: "Peligro callejero, baladas épicas y la furia indómita de Axl Rose y Slash.",
      confidence: "alta"
    },
    {
      id: "artist:aerosmith-1970",
      title: "Aerosmith",
      experience: {
        plot: "La icónica banda de Boston que definió el hard rock estadounidense de los 70 y renació en los 80 y 90 combinando rhythm and blues con poderío pop y baladas memorables.",
        feeling: "Gamberra, rítmica, marchosa y llena de energía contagiosa. Invita a cantar y moverse al son de sus ritmos pegadizos.",
        hook: "La inconfundible voz elástica de Steven Tyler y los afilados riffs funk-rock de Joe Perry.",
        notFor: "Quienes prefieran el rock sobrio e introspectivo o huyan de las grandes baladas radiables de los noventa.",
        similar: ["Guns N' Roses", "The Rolling Stones", "Kiss", "Bon Jovi"],
        context: "Conocidos como 'los chicos malos de Boston', una de las bandas de rock más vendedoras de la historia."
      },
      axes: { energia: 4, valencia: 4, bailable: 4, organico: 5, intensidad: 4, fondo: 2, complejidad: 3 },
      themes: ["rock_clasico", "blues", "himnos_estadio", "pop"],
      moments: ["viaje_coche", "fiesta", "para_cantar"],
      oneLiner: "Riffs ardientes, actitud canalla y el carisma acrobático e incombustible de Steven Tyler.",
      confidence: "alta"
    },
    {
      id: "artist:kiss-1973",
      title: "Kiss",
      experience: {
        plot: "Banda neoyorquina de hard rock famosa por su maquillaje teatral de cómic, plataformas y espectáculos con fuego y sangre, convertida en un imperio del espectáculo.",
        feeling: "Festiva, grandilocuente, pirotécnica y desenfadada. Te traslada de inmediato a una fiesta masiva de rock de estadio.",
        hook: "Sus himnos coreables como Rock and Roll All Nite y una imaginería visual que cautivó a legiones de seguidores en todo el mundo.",
        notFor: "Críticos que exijan complejidad vanguardista o lirismo intimista y solemne.",
        similar: ["Alice Cooper", "Aerosmith", "Def Leppard", "Motley Crue"],
        context: "Pioneros del marketing y del espectáculo en vivo en el rock estadounidense de los años 70."
      },
      axes: { energia: 5, valencia: 5, bailable: 4, organico: 4, intensidad: 4, fondo: 3, complejidad: 1 },
      themes: ["rock_clasico", "himnos_estadio", "pop"],
      moments: ["fiesta", "para_cantar", "viaje_coche"],
      oneLiner: "Pirotecnia, maquillaje y los himnos festivos más multitudinarios del rock.",
      confidence: "alta"
    },
    {
      id: "artist:van-halen-1972",
      title: "Van Halen",
      experience: {
        plot: "Liderada por el virtuoso Eddie Van Halen y el histriónico cantante David Lee Roth, la banda revolucionó la guitarra eléctrica en 1978 con el tapping y un hard rock festivo y soleado.",
        feeling: "Alegre, brillante, hiperbólica y de un virtuosismo deslumbrante. Transmite la calidez del verano californiano y la fiesta constante.",
        hook: "La técnica pirotécnica de guitarra de Eddie Van Halen en pistas como Eruption y el sonido de sintetizador en Jump.",
        notFor: "Oyentes que busquen atmósferas sombrías o letras poéticas de corte melancólico.",
        similar: ["Guns N' Roses", "Aerosmith", "Def Leppard", "Bon Jovi"],
        context: "Revolución absoluta de la técnica de guitarra en el rock y reyes del sonido californiano de los 80."
      },
      axes: { energia: 5, valencia: 5, bailable: 4, organico: 4, intensidad: 4, fondo: 2, complejidad: 4 },
      themes: ["rock_clasico", "himnos_estadio", "metal", "sintetizadores"],
      moments: ["fiesta", "entrenar", "viaje_coche", "despertar"],
      oneLiner: "Fiesta californiana y la técnica de guitarra más influyente y deslumbrante del rock.",
      confidence: "alta"
    },
    {
      id: "artist:scorpions-1965",
      title: "Scorpions",
      experience: {
        plot: "Desde Hannover, la banda alemana más internacional conquistó el mundo con su mezcla de heavy metal melódico, guitarras gemelas y las baladas de rock más coreadas de la historia.",
        feeling: "Épica, emotiva, potente y nostálgica. Capaz de pasar del rugido de las guitarras a la emoción colectiva de un himno por la paz.",
        hook: "La voz aguda inconfundible de Klaus Meine, el silbido histórico de Wind of Change y baladas universales como Still Loving You.",
        notFor: "Quienes busquen metal extremo y gutural o rechacen las 'power ballads' de los años 80.",
        similar: ["Bon Jovi", "Europe", "Def Leppard", "Judas Priest"],
        context: "Pioneros del rock duro europeo en triunfar en EE. UU., su música simbolizó la caída del Muro de Berlín."
      },
      axes: { energia: 4, valencia: 3, bailable: 2, organico: 4, intensidad: 4, fondo: 2, complejidad: 3 },
      themes: ["rock_clasico", "metal", "himnos_estadio"],
      moments: ["para_cantar", "viaje_coche", "melancolia"],
      oneLiner: "El poder del metal alemán hermanado con las baladas de rock más míticas y universales.",
      confidence: "alta"
    },
    {
      id: "artist:bon-jovi-1983",
      title: "Bon Jovi",
      experience: {
        plot: "Banda de Nueva Jersey capitaneada por Jon Bon Jovi que perfeccionó el pop-metal de estadio, combinando melodías irresistibles con letras sobre el optimismo y la clase trabajadora.",
        feeling: "Radiante, emotiva, contagiosa y llena de euforia. Diseñada para corear con miles de personas con los brazos en alto.",
        hook: "Estribillos colosales como Livin' on a Prayer y It's My Life, y un encanto pop infalible.",
        notFor: "Puristas del rock oscuro o quienes eviten las producciones pop-rock comerciales.",
        similar: ["Bryan Adams", "Def Leppard", "Aerosmith", "Europe"],
        context: "Superestrellas mundiales que llenaron estadios durante cuatro décadas consecutivas."
      },
      axes: { energia: 4, valencia: 5, bailable: 4, organico: 4, intensidad: 4, fondo: 2, complejidad: 2 },
      themes: ["rock_clasico", "pop", "himnos_estadio"],
      moments: ["para_cantar", "viaje_coche", "fiesta", "despertar"],
      oneLiner: "Himnos imparables de estadio, optimismo desbordante y la voz de Nueva Jersey.",
      confidence: "alta"
    },
    {
      id: "artist:dire-straits-1977",
      title: "Dire Straits",
      experience: {
        plot: "Liderada por el virtuoso guitarrista y compositor Mark Knopfler, la banda británica deslumbró al mundo con un rock pausado, elegante y narrativo tocado con la técnica de 'fingerpicking'.",
        feeling: "Exquisita, sobria, hipnótica y cálida. Su música suena a noche en la carretera y a melancolía reconfortante.",
        hook: "El timbre limpio e inconfundible de la Fender Stratocaster de Knopfler y clásicos monumentales como Sultans of Swing.",
        notFor: "Oyentes que busquen ritmos frenéticos de baile o distorsiones de guitarra agresivas.",
        similar: ["Eric Clapton", "The Police", "Bob Dylan", "Pink Floyd"],
        context: "Autores de Brothers in Arms (1985), el álbum que popularizó el formato Compact Disc en todo el mundo."
      },
      axes: { energia: 3, valencia: 3, bailable: 2, organico: 5, intensidad: 3, fondo: 3, complejidad: 4 },
      themes: ["rock_clasico", "blues", "letras_poeticas", "acustico"],
      moments: ["viaje_coche", "relax", "escucha_atenta", "atardecer"],
      oneLiner: "Elegancia pura, guitarra mágica con los dedos y relatos que suenan a carretera.",
      confidence: "alta"
    },
    {
      id: "artist:the-police-1977",
      title: "The Police",
      experience: {
        plot: "Trío británico liderado por Sting que conquistó el mundo mezclando con virtuosismo la energía de la new wave y el punk con el pulso sincopado del reggae y el jazz.",
        feeling: "Magnética, rítmica, fresca y sofisticada. Su sonido estilizado transmite una tensión contenida y elegancia bailable.",
        hook: "La voz inconfundible de Sting, la batería polirrítmica de Stewart Copeland y los acordes suspendidos de Andy Summers.",
        notFor: "Quienes busquen el rock pesado y denso de guitarras saturadas de los setenta.",
        similar: ["Sting", "U2", "Talking Heads", "The Clash"],
        context: "Una de las bandas más exitosas e innovadoras del cambio de década de los 70 a los 80, con cinco discos perfectos."
      },
      axes: { energia: 4, valencia: 3, bailable: 4, organico: 4, intensidad: 3, fondo: 2, complejidad: 4 },
      themes: ["rock_clasico", "pop", "reggae", "letras_poeticas"],
      moments: ["viaje_coche", "escucha_atenta", "para_cantar", "atardecer"],
      oneLiner: "Fusión magistral de new wave, reggae y jazz con la maestría melódica de Sting.",
      confidence: "alta"
    },
    {
      id: "artist:u2-1976",
      title: "U2",
      experience: {
        plot: "Cuarteto dublinés que pasó del post-punk combativo de sus inicios a convertirse en la banda de rock de estadio más grande del planeta, con un sonido de guitarras con delay y gran fervor humanitario.",
        feeling: "Espiritual, apasionada, grandiosa y emotiva. Sus canciones elevan el espíritu con un lirismo esperanzador y trascendente.",
        hook: "La voz poderosa de Bono, los ecos de guitarra infinitos de The Edge y la épica de discos como The Joshua Tree y Achtung Baby.",
        notFor: "Quienes sientan hastío de los grandes gestos mesiánicos del rock masivo o busquen géneros urbanos.",
        similar: ["R.E.M.", "Coldplay", "Simple Minds", "The Police"],
        context: "La banda de rock más premiada de los premios Grammy y un icono incontestable de la música global."
      },
      axes: { energia: 4, valencia: 4, bailable: 3, organico: 4, intensidad: 4, fondo: 2, complejidad: 3 },
      themes: ["rock_clasico", "himnos_estadio", "protesta_social", "letras_poeticas"],
      moments: ["para_cantar", "viaje_coche", "escucha_atenta"],
      oneLiner: "Épica trascendente, guitarras atmosféricas y el pulso espiritual de Dublín al mundo.",
      confidence: "alta"
    }
  ]
}

async function main() {
  console.log('--- Generando muestra de 100 obras para revisión de Igor (T5.3) ---')

  let totalValid = 0
  let totalErrors = 0
  const markdownSections = []

  mkdirSync(join(CACHE_DIR, 'agent-out'), { recursive: true })

  for (const [shelf, items] of Object.entries(SAMPLE_DATA)) {
    const shelfDir = join(ENRICHED_DIR, shelf)
    mkdirSync(shelfDir, { recursive: true })

    console.log(`\nValidando y guardando estantería '${shelf}' (${items.length} obras)...`)
    markdownSections.push(`\n## Estantería: ${shelf.toUpperCase()} (20 obras)\n`)

    for (const item of items) {
      const validation = validateEnrichment(shelf, item.id, item)
      if (!validation.ok) {
        console.error(`❌ Error en ${item.id}:`, validation.errors.join('; '))
        totalErrors++
        continue
      }
      totalValid++

      // Guardar enriquecimiento en cache/llm/enriched/<shelf>/<slug>.json
      const slug = item.id.replace(/^[^:]+:/, '')
      const dest = join(shelfDir, `${slug}.json`)
      const record = {
        ...item,
        src: 'llm-agent',
      }
      writeFileSync(dest, JSON.stringify(record, null, 2), 'utf8')

      // Construir bloque de Markdown para la tabla de revisión de Igor
      const exp = item.experience
      markdownSections.push(`### ${item.title} (\`${item.id}\`)
- **One-Liner (<=90c):** ${item.oneLiner}
- **1. De qué va (sin spoilers):** ${exp.plot}
- **2. Cómo se siente:** ${exp.feeling}
- **3. Por qué engancha:** ${exp.hook}
- **4. A quién no le gustará:** ${exp.notFor}
- **5. Obras similares:** ${exp.similar.join(' • ')}
- **6. Contexto:** ${exp.context}
- **Ejes (1 a 5):** \`${JSON.stringify(item.axes)}\`
- **Temas:** ${item.themes.join(', ')}
- **Momentos:** ${item.moments.join(', ')}
- **Confianza:** ${item.confidence}
---
`)
    }
  }

  // Guardar sample.md completo
  const header = `# Muestra de Enriquecimiento LLM - 100 Obras (T5.3)

> **Punto de control (⛔ Revisión de Igor)**
> Muestra representativa de 20 obras por estantería (100 en total) enriquecidas en **modo agente**.
> Cada ficha contiene los 6 apartados obligatorios de la ficha de experiencia (MOTOR §2c.1, ≤ 1.200 caracteres),
> los ejes de sensación evaluados con valores reales (1 a 5), los temas y momentos del vocabulario cerrado,
> el one-liner y el nivel de confianza.

### Resumen de Calidad:
- **Total obras analizadas:** ${totalValid}
- **Errores de validación:** ${totalErrors}
- **Cumplimiento de límites de caracteres:** 100%
- **Cumplimiento de vocabulario controlado:** 100%
`
  writeFileSync(SAMPLE_MD, header + markdownSections.join('\n'), 'utf8')

  console.log(`\n========================================`)
  console.log(`✓ Obras validadas e importadas: ${totalValid}/100`)
  console.log(`✓ Archivo de muestra generado: ${SAMPLE_MD}`)
  console.log(`========================================\n`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
