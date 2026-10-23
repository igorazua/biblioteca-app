import fs from 'node:fs'

const seed = JSON.parse(fs.readFileSync('app/src/data/seed.json', 'utf8')).items
const hp = seed.find((i) => i.id === 'movie:harry-potter-and-the-philosopher-s-stone-2001')
const parchis = seed.find((i) => i.id === 'boardgame:parchis-1900')
const trivial = seed.find((i) => i.id === 'boardgame:trivial-pursuit-1981')
const cluedo = seed.find((i) => i.id === 'boardgame:cluedo-1949')

const dir = 'app/scripts/cache/llm/enriched'

// Movie Harry Potter
const hpData = {
  id: hp.id,
  experience: {
    plot: hp.synopsis,
    feeling: 'Mágica, nostálgica y emocionante introducción al universo de Hogwarts.',
    hook: 'El descubrimiento del mundo mágico y la amistad entre Harry, Ron y Hermione.',
    notFor: 'Quienes busquen cine hiperrealista o no disfruten con relatos iniciáticos fantásticos.',
    similar: ['El señor de los anillos', 'Las crónicas de Narnia', 'Percy Jackson'],
    context: 'Estrenada en 2001, dio inicio a una de las sagas cinematográficas más influyentes.',
  },
  axes: {
    tono: 2,
    ritmo: 3,
    emocion: 3,
    exigencia: 1,
    humor: 3,
    tension: 3,
    fantasia: 5,
    violencia: 2,
    familiar: 5,
    escala: 4,
    reconfort: 5,
  },
  themes: ['magia', 'amistad', 'infancia', 'destino', 'colegio_magico'],
  moments: ['familia', 'maraton', 'domingo_tarde'],
  oneLiner: 'Harry Potter y la piedra filosofal (2001): el mágico comienzo de una saga generacional.',
  confidence: 'alta',
  src: 'llm-agent',
}
fs.writeFileSync(`${dir}/movie/harry-potter-and-the-philosopher-s-stone-2001.json`, JSON.stringify(hpData, null, 2))

// Parchís
const parchisData = {
  id: parchis.id,
  experience: {
    plot: 'Clásico juego de mesa tradicional derivado del Pachisi indio, con carreras de fichas para 4 jugadores.',
    feeling: 'Piques divertidos, competitividad familiar directa y suspense en cada tirada de dados.',
    hook: 'Comerte la ficha de un rival cuando está a punto de llegar a meta.',
    notFor: 'Jugadores que rechacen completamente el azar de los dados o busquen profundidad eurogame.',
    similar: ['La Oca', 'Ludo', 'Monopoly'],
    context: 'Juego tradicional universal arraigado en los hogares españoles durante generaciones.',
  },
  axes: {
    peso: 1,
    interaccion: 4,
    azar: 5,
    confrontacion: 4,
    cooperacion: 1,
    tema: 1,
    risas: 4,
    familiar: 5,
  },
  themes: ['carreras', 'dados_y_push_your_luck'],
  moments: ['familia', 'sobremesa', 'pique_sano'],
  oneLiner: 'Parchís: el clásico juego de mesa de carreras, dados y piques familiares.',
  confidence: 'alta',
  src: 'llm-agent',
}
fs.writeFileSync(`${dir}/boardgame/parchis-1900.json`, JSON.stringify(parchisData, null, 2))

// Trivial
const trivialData = {
  id: trivial.id,
  experience: {
    plot: 'Juego de preguntas y respuestas culturales distribuidas en seis categorías emblemáticas de quesitos.',
    feeling: 'Reto intelectual, satisfacción al acertar preguntas difíciles y rivalidad amistosa.',
    hook: 'Conseguir el último quesito en una categoría que no dominas.',
    notFor: 'Personas que se frustren con datos de cultura general o busquen mecánicas tácticas complejas.',
    similar: ['Party & Co', "Time's Up", 'Scattergories'],
    context: 'Diseñado en 1981, se convirtió en el juego de trivia más vendido del mundo.',
  },
  axes: {
    peso: 2,
    interaccion: 3,
    azar: 2,
    confrontacion: 2,
    cooperacion: 1,
    tema: 2,
    risas: 4,
    familiar: 4,
  },
  themes: ['palabras_y_asociacion'],
  moments: ['sobremesa', 'amigos', 'fiesta'],
  oneLiner: 'Trivial Pursuit: el rey indiscutible de las preguntas de cultura general.',
  confidence: 'alta',
  src: 'llm-agent',
}
fs.writeFileSync(`${dir}/boardgame/trivial-pursuit-1981.json`, JSON.stringify(trivialData, null, 2))

// Cluedo
const cluedoData = {
  id: cluedo.id,
  experience: {
    plot: 'Juego de deducción e investigación donde los jugadores descubren quién cometió el asesinato, con qué arma y en qué habitación.',
    feeling: 'Intriga detectivesca, cálculo deductivo y tensión en la libreta de notas secreta.',
    hook: 'Lanzar la acusación definitiva antes de que otro jugador ate cabos.',
    notFor: 'Quienes prefieran juegos cooperativos o partidas puramente cooperativas sin faroleo.',
    similar: ['Mysterium', 'Cartas Sherlock', 'MicroMacro'],
    context: 'Creado por Anthony Pratt en 1949, es el arquetipo clásico de misterio detectivesco.',
  },
  axes: {
    peso: 2,
    interaccion: 3,
    azar: 2,
    confrontacion: 3,
    cooperacion: 1,
    tema: 4,
    risas: 3,
    familiar: 4,
  },
  themes: ['misterio_y_deduccion', 'roles_ocultos'],
  moments: ['familia', 'amigos', 'sobremesa'],
  oneLiner: 'Cluedo: el juego de misterio y deducción más famoso de la historia.',
  confidence: 'alta',
  src: 'llm-agent',
}
fs.writeFileSync(`${dir}/boardgame/cluedo-1949.json`, JSON.stringify(cluedoData, null, 2))
console.log('4 missing items saved to enriched successfully!')
