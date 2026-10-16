import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOVIES, SERIES, BOOKS, PLATFORM } from './seed-catalog.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const TARGET = join(here, 'seed-catalog.mjs')

const NEW_MOVIES = [
  ['La vida de Brian', 1979, 'Terry Jones', 94, 'Comedia', 'Brian nace en un establo vecino al de Jesús y pasa su vida siendo confundido con el Mesías.', 86, 'N,F'],
  ['Los caballeros de la mesa cuadrada', 1975, 'Terry Gilliam y Terry Jones', 91, 'Comedia,Aventura', 'El Rey Arturo y sus caballeros emprenden la disparatada búsqueda del Santo Grial.', 85, 'N,F'],
  ['La princesa Mononoke', 1997, 'Hayao Miyazaki', 134, 'Animación,Fantasía', 'Un joven guerrero se ve envuelto en una lucha feroz entre los dioses del bosque y una colonia minera.', 89, 'N,F'],
  ['El castillo ambulante', 2004, 'Hayao Miyazaki', 119, 'Animación,Fantasía', 'Una joven hechizada con cuerpo de anciana busca refugio en el castillo mágico del mago Howl.', 87, 'N,F'],
  ['El gran hotel Budapest', 2014, 'Wes Anderson', 99, 'Comedia,Drama', 'Las peripecias de un legendario conserje en un famoso balneario europeo de entreguerras y su fiel botones.', 86, 'D'],
  ['Moonrise Kingdom', 2012, 'Wes Anderson', 94, 'Comedia,Romance', 'En una isla de Nueva Inglaterra en los sesenta, dos niños de doce años se enamoran y huyen juntos al bosque.', 83, 'P,F'],
  ['Fantastic Mr. Fox', 2009, 'Wes Anderson', 87, 'Animación,Comedia', 'Un zorro padre de familia no puede resistirse a su antigua vida de ladrón y asalta las granjas vecinas.', 84, 'D'],
  ['Birdman', 2014, 'Alejandro González Iñárritu', 119, 'Comedia,Drama', 'Un actor famoso por interpretar a un icónico superhéroe intenta montar una obra de teatro en Broadway.', 84, 'D,P'],
  ['El renacido', 2015, 'Alejandro González Iñárritu', 156, 'Aventura,Drama', 'Un trampero en la América salvaje de 1823 sobrevive al ataque de un oso y busca venganza.', 86, 'D,N'],
  ['Amores perros', 2000, 'Alejandro González Iñárritu', 154, 'Drama,Thriller', 'Un trágico accidente de tráfico en Ciudad de México conecta tres historias de amor, violencia y redención.', 85, 'F,P'],
  ['La forma del agua', 2017, 'Guillermo del Toro', 123, 'Fantasía,Romance', 'En la Guerra Fría, una limpiadora muda descubre a un hombre anfibio capturado en un laboratorio militar.', 83, 'D'],
  ['Spider-Man 2', 2004, 'Sam Raimi', 127, 'Acción,Ciencia ficción', 'Peter Parker lucha por equilibrar su vida personal con su deber mientras el Doctor Octopus amenaza la ciudad.', 87, 'D,N'],
  ['El caballero oscuro: La leyenda renace', 2012, 'Christopher Nolan', 165, 'Acción,Crimen', 'Ocho años después, Batman regresa del exilio para salvar a Gotham del brutal terrorista Bane.', 88, 'H,P'],
  ['Dunkerque', 2017, 'Christopher Nolan', 106, 'Bélica,Drama', 'La milagrosa evacuación de cientos de miles de soldados aliados rodeados por el ejército nazi en las playas.', 85, 'H,M'],
  ['Tenet', 2020, 'Christopher Nolan', 150, 'Ciencia ficción,Acción', 'Un agente secreto armado con una sola palabra viaja a través del flujo temporal para evitar la Tercera Guerra Mundial.', 82, 'H,M'],
  ['Shutter Island', 2010, 'Martin Scorsese', 138, 'Misterio,Thriller', 'Dos agentes judiciales viajan a un psiquiátrico penitenciario en una isla remota para investigar una fuga imposible.', 88, 'N,P'],
  ['Infiltrados', 2006, 'Martin Scorsese', 151, 'Crimen,Thriller', 'Un policía infiltrado en la mafia y un topo de la mafia en la policía intentan descubrirse mutuamente.', 89, 'H,P'],
  ['Casino', 1995, 'Martin Scorsese', 178, 'Crimen,Drama', 'El auge y descomposición de un imperio de juego en Las Vegas regentado por la mafia y la ambición desmedida.', 86, 'P,M'],
  ['Toro salvaje', 1980, 'Martin Scorsese', 129, 'Drama,Biografía', 'La violencia destructiva y los celos obsesivos del campeón de boxeo Jake LaMotta dentro y fuera del ring.', 83, 'F,P'],
  ['E.T., el extraterrestre', 1982, 'Steven Spielberg', 115, 'Ciencia ficción,Aventura', 'Un niño solitario acoge en su casa a un entrañable ser de otro planeta y lo ayuda a volver con los suyos.', 88, 'P,M'],
  ['En busca del arca perdida', 1981, 'Steven Spielberg', 115, 'Aventura,Acción', 'El arqueólogo Indiana Jones compite contra los nazis por encontrar el Arca de la Alianza con poderes divinos.', 90, 'D,P'],
  ['Indiana Jones y la última cruzada', 1989, 'Steven Spielberg', 127, 'Aventura,Acción', 'Indy y su excéntrico padre emprenden una trepidante aventura tras la pista del Santo Grial.', 89, 'D,P'],
  ['Tiburón', 1975, 'Steven Spielberg', 124, 'Terror,Aventura', 'Un gigantesco tiburón blanco aterroriza un pueblo turístico de Nueva Inglaterra durante el verano.', 87, 'N,P'],
  ['Atrápame si puedes', 2002, 'Steven Spielberg', 141, 'Comedia,Crimen', 'Un agente del FBI persigue durante años al más joven y escurridizo falsificador de cheques del país.', 87, 'N,P'],
  ['La red social', 2010, 'David Fincher', 120, 'Drama,Biografía', 'Mark Zuckerberg funda Facebook en su dormitorio de Harvard entre genialidad, traiciones y pleitos millonarios.', 86, 'N,P'],
  ['Perdida', 2014, 'David Fincher', 149, 'Misterio,Thriller', 'En su quinto aniversario de boda, un hombre ve cómo su esposa desaparece y todos los focos le señalan a él.', 87, 'D,P'],
  ['El curioso caso de Benjamin Button', 2008, 'David Fincher', 166, 'Drama,Romance', 'La extraordinaria vida de un hombre que nace con el cuerpo de un anciano de ochenta años y rejuvenece.', 84, 'H,M'],
  ['Cisne negro', 2010, 'Darren Aronofsky', 108, 'Thriller,Drama', 'Una bailarina de ballet se obsesiona con la perfección artística hasta descender a una espiral de paranoia.', 85, 'D'],
  ['Réquiem por un sueño', 2000, 'Darren Aronofsky', 102, 'Drama', 'Cuatro personas de Coney Island ven cómo sus sueños se destruyen brutalmente por el peso de sus adicciones.', 84, 'P,F'],
  ['El truco final (El prestigio)', 2006, 'Christopher Nolan', 130, 'Misterio,Drama', 'Dos magos rivales del Londres victoriano desatan una encarnizada guerra de obsesión por el truco supremo.', 89, 'H,M'],
  ['Pozos de ambición', 2007, 'Paul Thomas Anderson', 158, 'Drama', 'La implacable ambición de un buscador de petróleo en California a principios del siglo XX y su choque con la religión.', 85, 'P,M'],
  ['Snatch: Cerdos y diamantes', 2000, 'Guy Ritchie', 104, 'Comedia,Crimen', 'Promotores de boxeo clandestino, gánsteres rusos y gitanos cruzan sus caminos tras el robo de un diamante gigante.', 86, 'N,P'],
  ['Doce monos', 1995, 'Terry Gilliam', 129, 'Ciencia ficción,Thriller', 'Un convicto de un futuro postapocalíptico viaja al pasado para descubrir el origen de un virus letal.', 83, 'F,P'],
  ['Oldboy', 2003, 'Park Chan-wook', 120, 'Thriller,Misterio', 'Un hombre es encerrado en una habitación durante quince años sin motivo y liberado con solo cinco días para vengarse.', 86, 'F'],
  ['La doncella', 2016, 'Park Chan-wook', 144, 'Thriller,Drama', 'En la Corea ocupada por Japón, una carterista contratada como doncella urde un engaño contra una rica heredera.', 85, 'F'],
  ['Nightcrawler', 2014, 'Dan Gilroy', 117, 'Thriller,Crimen', 'Un joven sin escrúpulos descubre el morboso negocio del periodismo de sucesos nocturno en Los Ángeles.', 84, 'P,M'],
  ['Ex Machina', 2014, 'Alex Garland', 108, 'Ciencia ficción,Thriller', 'Un programador pasa una semana en el refugio de su jefe evaluando la conciencia humana de una bella robot humanoide.', 84, 'N,P'],
  ['Todo a la vez en todas partes', 2022, 'Daniel Kwan y Daniel Scheinert', 139, 'Ciencia ficción,Comedia', 'Una inmigrante china en crisis descubre que debe conectar con sus versiones de otros universos para salvar la realidad.', 88, 'M,P'],
  ['Past Lives (Vidas pasadas)', 2023, 'Celine Song', 105, 'Romance,Drama', 'Dos amigos de la infancia en Seúl se reencuentran en Nueva York dos décadas después para confrontar su destino.', 84, 'M,F'],
  ['La sociedad de la nieve', 2023, 'Juan Antonio Bayona', 144, 'Drama,Aventura', 'En 1972, un equipo de rugby uruguayo sobrevive al accidente de su avión en el gélido corazón de los Andes.', 89, 'N'],
]

const NEW_SERIES = [
  ['The Pacific', 2010, 'Tom Hanks y Steven Spielberg', 55, 1, 'Bélica,Drama', 'Las brutales batallas del cuerpo de Marines en el frente del Pacífico durante la Segunda Guerra Mundial.', 84, 'H,M'],
  ['Boardwalk Empire', 2010, 'Terence Winter', 55, 5, 'Crimen,Drama', 'Nucky Thompson domina Atlantic City durante la Ley Seca entre políticos corruptos y gánsteres legendarios.', 84, 'H,M'],
  ['The Americans', 2013, 'Joe Weisberg', 45, 6, 'Drama,Thriller', 'Dos espías soviéticos del KGB fingen ser un matrimonio estadounidense corriente en los suburbios de Washington.', 86, 'D'],
  ['Homeland', 2011, 'Howard Gordon y Alex Gansa', 55, 8, 'Thriller,Drama', 'Una brillante agente de la CIA con trastorno bipolar sospecha de un marine rescatado tras años de cautiverio.', 85, 'D'],
  ['Person of Interest', 2011, 'Jonathan Nolan', 43, 5, 'Ciencia ficción,Crimen', 'Un misterioso millonario y un exagente de la CIA usan una supercomputadora para prevenir crímenes premeditados.', 84, 'H,P'],
  ['Luther', 2010, 'Neil Cross', 60, 5, 'Crimen,Misterio', 'Un brillante inspector de homicidios londinense lidia con sus demonios y una fascinante asesina psicópata.', 85, 'N,M'],
  ['The Fall (La caza)', 2013, 'Allan Cubitt', 60, 3, 'Crimen,Thriller', 'Una metódica detective de Scotland Yard viaja a Belfast para cazar a un meticuloso asesino en serie de mujeres.', 83, 'N,F'],
  ['Bodyguard', 2018, 'Jed Mercurio', 60, 1, 'Thriller,Crimen', 'Un veterano de guerra con estrés postraumático debe proteger a una controvertida secretaria de Interior.', 84, 'N'],
  ['Black Sails', 2014, 'Jonathan E. Steinberg y Robert Levine', 55, 4, 'Aventura,Drama', 'El temido Capitán Flint y sus hombres luchan por el control de la isla de Nueva Providencia frente al Imperio.', 83, 'M,P'],
  ['Spartacus', 2010, 'Steven S. DeKnight', 55, 3, 'Acción,Histórica', 'Un guerrero tracio traicionado es condenado como gladiador y lidera una colosal rebelión de esclavos en Roma.', 84, 'M,P'],
  ['Penny Dreadful', 2014, 'John Logan', 55, 3, 'Terror,Fantasía', 'Iconos de la literatura gótica como Frankenstein, Dorian Gray y Drácula conviven en el Londres victoriano.', 82, 'M,P'],
  ['Hannibal', 2013, 'Bryan Fuller', 44, 3, 'Crimen,Terror', 'La enfermiza y fascinante relación entre un criminólogo del FBI y el prestigioso psiquiatra Hannibal Lecter.', 86, 'M,P'],
  ['Bates Motel', 2013, 'Carlton Cuse, Kerry Ehrin y Anthony Cipriano', 45, 5, 'Terror,Misterio', 'Precuela contemporánea que explora la retorcida adolescencia de Norman Bates y la posesiva influencia de su madre.', 83, 'P,M'],
  ['Sex Education', 2019, 'Laurie Nunn', 50, 4, 'Comedia,Drama', 'El tímido hijo de una terapeuta sexual abre una consulta clandestina en su instituto para asesorar a sus compañeros.', 86, 'N'],
  ['Heartstopper', 2022, 'Alice Oseman', 30, 3, 'Romance,Drama', 'Dos adolescentes británicos en un instituto descubren que su amistad empieza a transformarse en algo más profundo.', 85, 'N'],
  ['Normal People', 2020, 'Lenny Abrahamson y Hettie Macdonald', 30, 1, 'Romance,Drama', 'La complicada y tierna historia de amor entre Marianne y Connell desde el instituto en un pueblo irlandés.', 87, 'M,P'],
  ['This Is Us', 2016, 'Dan Fogelman', 43, 6, 'Drama', 'La emotiva historia de la familia Pearson y de tres hermanos nacidos el mismo día a lo largo de varias décadas.', 86, 'D,P'],
  ['New Girl', 2011, 'Elizabeth Meriwether', 22, 7, 'Comedia,Romance', 'Una excéntrica maestra se muda a un loft de Los Ángeles con tres chicos solteros tras romper con su novio.', 84, 'D'],
  ['Schitt\'s Creek', 2015, 'Dan Levy y Eugene Levy', 22, 6, 'Comedia', 'Una familia multimillonaria arruinada tiene que mudarse al único bien que les queda: un pueblecito que compraron en broma.', 86, 'M'],
  ['The Good Place', 2016, 'Michael Schur', 22, 4, 'Comedia,Fantasía', 'Una mujer imperfecta llega al «Buen Lugar» por error tras morir y debe esforzarse por ser buena persona para no ser descubierta.', 87, 'N'],
  ['Veep', 2012, 'Armando Iannucci', 30, 7, 'Comedia', 'La vicepresidenta Selina Meyer y su incompetente equipo intentan dejar su huella en Washington entre torpezas y cinismo.', 85, 'H'],
  ['Silicon Valley', 2014, 'Mike Judge, John Altschuler y Dave Krinsky', 30, 6, 'Comedia', 'Un grupo de programadores crea un revolucionario algoritmo de compresión y navega por la locura del mundo de las startups.', 86, 'H'],
  ['The IT Crowd (Los informáticos)', 2006, 'Graham Linehan', 24, 4, 'Comedia', 'Dos genios informáticos inadaptados y su jefa, que no sabe nada de ordenadores, sobreviven en el sótano de una empresa.', 85, 'N,F'],
  ['Cunk on Earth', 2022, 'Charlie Brooker', 29, 1, 'Comedia', 'Philomena Cunk repasa la historia de la civilización humana haciendo preguntas disparatadas a prestigiosos académicos.', 83, 'N'],
  ['The Leftovers', 2014, 'Damon Lindelof y Tom Perrotta', 55, 3, 'Drama,Misterio', 'El dos por ciento de la población mundial desaparece repentinamente sin explicación y los que quedan buscan consuelo.', 87, 'H,M'],
  ['Station Eleven', 2021, 'Patrick Somerville', 45, 1, 'Ciencia ficción,Drama', 'Veinte años después de una pandemia que asoló el planeta, una troupe de teatro itinerante celebra el arte y la memoria.', 83, 'H'],
  ['Devs', 2020, 'Alex Garland', 50, 1, 'Ciencia ficción,Misterio', 'Una ingeniera de software investiga la secreta división de computación cuántica de su empresa tras la muerte de su novio.', 82, 'D'],
  ['Maniac', 2018, 'Patrick Somerville y Cary Joji Fukunaga', 40, 1, 'Ciencia ficción,Comedia', 'Dos desconocidos se someten a un misterioso ensayo clínico farmacéutico que promete sanar todas sus dolencias mentales.', 80, 'N'],
  ['Yellowjackets', 2021, 'Ashley Lyle y Bart Nickerson', 55, 2, 'Misterio,Drama', 'Un equipo de fútbol femenino sobrevive a un accidente aéreo en los bosques y ve cómo el pasado las persigue veinticinco años después.', 83, 'M,P'],
  ['From', 2022, 'John Griffin', 50, 3, 'Terror,Misterio', 'Los habitantes de un pueblo pesadillesco en mitad del bosque quedan atrapados sin poder escapar mientras seres nocturnos acechan.', 84, 'H,M'],
  ['La maldición de Hill House', 2018, 'Mike Flanagan', 60, 1, 'Terror,Drama', 'Cinco hermanos que crecieron en la mansión embrujada más famosa del país vuelven a reunirse tras una tragedia familiar.', 88, 'N'],
  ['Misa de medianoche', 2021, 'Mike Flanagan', 65, 1, 'Terror,Drama', 'La llegada de un carismático y joven sacerdote a una aislada comunidad isleña desata milagros y presagios aterradores.', 84, 'N'],
  ['Fallout', 2024, 'Graham Wagner y Geneva Robertson-Dworet', 60, 1, 'Ciencia ficción,Acción', 'Una ingenua habitante de un búnker subterráneo sale al despiadado y retrofuturista páramo radiactivo de Los Ángeles.', 88, 'P'],
  ['El problema de los 3 cuerpos', 2024, 'David Benioff, D. B. Weiss y Alexander Woo', 55, 1, 'Ciencia ficción,Misterio', 'La fatídica decisión de una joven científica en la China de los años sesenta resuena a través del tiempo y el espacio.', 83, 'N'],
  ['Hierro', 2019, 'Pepe Coira', 50, 2, 'Crimen,Misterio', 'Una jueza de fuerte temperamento es destinada a la isla de El Hierro justo cuando aparece asesinado un joven local.', 84, 'M'],
  ['El desorden que dejas', 2020, 'Carlos Montero', 45, 1, 'Misterio,Drama', 'Una profesora de literatura acepta una sustitución en el pueblo de su marido y descubre una inquietante nota de bienvenida.', 79, 'N'],
  ['La noche más larga', 2022, 'Víctoriano Sierra Hermoso y Xosé Morais', 45, 1, 'Acción,Thriller', 'Un grupo de hombres armados asalta una prisión psiquiátrica en Nochebuena para capturar a un asesino en serie.', 78, 'N'],
  ['El inocente', 2021, 'Oriol Paulo', 60, 1, 'Thriller,Misterio', 'Un hombre que mató accidentalmente a un joven sale de prisión y una llamada vuelve a destruir su vida nueve años después.', 82, 'N'],
  ['Intimidad', 2022, 'Verónica Fernández y Laura Sarmiento', 45, 1, 'Drama', 'La filtración de un vídeo sexual de una prometedora política pone en jaque su carrera y cruza cuatro vidas.', 81, 'N'],
  ['Galgos', 2024, 'Félix Viscarret y Nelly Reguera', 50, 1, 'Drama', 'Una acaudalada familia empresarial del sector de la bollería lucha por el control de la compañía ante una grave crisis.', 80, 'M'],
]

const NEW_BOOKS = [
  ['La náusea', 1938, 'Jean-Paul Sartre', 256, 'Novela,Filosofía', 'Antoine Roquentin experimenta una profunda angustia existencial al descubrir la contingencia de las cosas.', 82],
  ['El mito de Sísifo', 1942, 'Albert Camus', 160, 'Ensayo,Filosofía', 'Una meditación filosófica sobre el absurdo de la existencia y la rebelión lúcida del hombre ante la falta de sentido.', 86],
  ['Así habló Zaratustra', 1883, 'Friedrich Nietzsche', 400, 'Filosofía,Clásico', 'Zaratustra desciende de la montaña para proclamar la muerte de Dios, la voluntad de poder y el advenimiento del superhombre.', 87],
  ['Más allá del bien y del mal', 1886, 'Friedrich Nietzsche', 288, 'Ensayo,Filosofía', 'Una crítica demoledora a la moral tradicional, la religión y los prejuicios de los filósofos dogmáticos.', 84],
  ['El banquete', -385, 'Platón', 128, 'Filosofía,Clásico', 'Varios pensadores atenienses se reúnen para dialogar sobre la naturaleza, el origen y los grados del amor (Eros).', 85],
  ['La república', -375, 'Platón', 480, 'Filosofía,Clásico', 'El diálogo fundamental sobre la justicia, el Estado ideal y la célebre alegoría de la caverna.', 88],
  ['Ética a Nicómaco', -340, 'Aristóteles', 320, 'Filosofía,Clásico', 'Tratado moral sobre la felicidad (eudaimonía), la virtud y la búsqueda del justo medio entre extremos.', 84],
  ['Cartas a Lucilio', 65, 'Séneca', 480, 'Ensayo,Filosofía', 'Epístolas estoicas sobre el valor de la amistad, la serenidad de ánimo y la preparación ante la muerte.', 88],
  ['Sobre la brevedad de la vida', 49, 'Séneca', 96, 'Ensayo,Filosofía', 'Un recordatorio implacable de que la vida no es corta, sino que nosotros la desperdiciamos en cosas vanas.', 89],
  ['El arte de tener razón', 1831, 'Arthur Schopenhauer', 112, 'Ensayo,Filosofía', 'Treinta y ocho estratagemas dialécticas para salir victorioso de cualquier discusión, independientemente de la verdad.', 84],
  ['Vigilar y castigar', 1975, 'Michel Foucault', 384, 'Ensayo,Historia', 'El nacimiento de la prisión moderna y el paso del castigo físico del cuerpo al disciplinamiento del alma.', 86],
  ['La sociedad del cansancio', 2010, 'Byung-Chul Han', 112, 'Ensayo,Filosofía', 'Un ensayo breve sobre cómo la sociedad del rendimiento nos convierte en autoexplotadores voluntarios y deprimidos.', 88],
  ['El aroma del tiempo', 2009, 'Byung-Chul Han', 160, 'Ensayo,Filosofía', 'Un alegato poético y filosófico sobre la aceleración contemporánea y la necesidad de recuperar la pausa contemplativa.', 83],
  ['El laberinto de la soledad', 1950, 'Octavio Paz', 352, 'Ensayo,Historia', 'Nueve ensayos brillantes sobre la identidad, las máscaras y el carácter del pueblo mexicano.', 85],
  ['Las venas abiertas de América Latina', 1971, 'Eduardo Galeano', 384, 'Ensayo,Historia', 'Una crónica apasionada y documentada sobre cinco siglos de expolio colonial y económico en el continente.', 87],
  ['El libro de los abrazos', 1989, 'Eduardo Galeano', 272, 'Cuentos,Poesía', 'Relatos breves sobre la memoria colectiva, el arte, la política y la calidez del encuentro entre personas.', 86],
  ['El corazón de las tinieblas', 1899, 'Joseph Conrad', 160, 'Novela,Aventura', 'Marlow remonta el río Congo en busca del enigmático señor Kurtz adentrándose en la brutalidad humana.', 84],
  ['Lord Jim', 1900, 'Joseph Conrad', 416, 'Novela,Aventura', 'Un joven marino comete un acto de cobardía al abandonar un barco en peligro y busca redimirse en Oriente.', 80],
  ['Crónicas marcianas', 1950, 'Ray Bradbury', 256, 'Ciencia ficción,Cuentos', 'Relatos líricos sobre la colonización humana de Marte y el desencuentro entre civilizaciones.', 86],
  ['Solaris', 1961, 'Stanislaw Lem', 288, 'Ciencia ficción,Filosofía', 'Científicos en una estación espacial orbitan un planeta cubierto por un océano vivo que materializa sus recuerdos culposos.', 84],
  ['El fin de la eternidad', 1955, 'Isaac Asimov', 256, 'Ciencia ficción', 'Una organización situada fuera del tiempo altera los acontecimientos históricos para evitar catástrofes a la humanidad.', 85],
  ['Neuromante', 1984, 'William Gibson', 320, 'Ciencia ficción,Cyberpunk', 'Un hacker acabado con el sistema nervioso dañado es contratado para penetrar en una inteligencia artificial corporativa.', 86],
  ['¿Sueñan los androides con ovejas eléctricas?', 1968, 'Philip K. Dick', 240, 'Ciencia ficción,Distopía', 'Rick Deckard persigue androides rebeldes casi idénticos a los humanos en una Tierra cubierta de ceniza radiactiva.', 86],
  ['Ubik', 1969, 'Philip K. Dick', 288, 'Ciencia ficción,Misterio', 'Un grupo de psíquicos sufre una regresión temporal donde los objetos envejecen y la realidad se desmorona.', 83],
  ['El hombre en el castillo', 1962, 'Philip K. Dick', 320, 'Ciencia ficción,Histórica', 'Una ucronía donde las potencias del Eje ganaron la Segunda Guerra Mundial y dividieron Estados Unidos.', 82],
  ['La máquina del tiempo', 1895, 'H. G. Wells', 144, 'Ciencia ficción,Clásico', 'Un científico viaja al año 802.701 y descubre una humanidad dividida entre los pacíficos Eloi y los siniestros Morlocks.', 85],
  ['La guerra de los mundos', 1898, 'H. G. Wells', 224, 'Ciencia ficción,Clásico', 'Monstruosos trípodes marcianos invaden la Inglaterra victoriana sembrando el pánico con rayos calóricos.', 86],
  ['El hombre invisible', 1897, 'H. G. Wells', 208, 'Ciencia ficción,Clásico', 'Un brillante investigador descubre el secreto de la invisibilidad pero cae en la locura y el delirio de poder.', 82],
  ['La isla del tesoro', 1883, 'Robert Louis Stevenson', 288, 'Aventura,Clásico', 'El joven Jim Hawkins encuentra el mapa del tesoro del capitán Flint y se embarca junto al pirata Long John Silver.', 88],
  ['El extraño caso del doctor Jekyll y el señor Hyde', 1886, 'Robert Louis Stevenson', 112, 'Terror,Clásico', 'Un respetable médico londinense inventa una poción que desata su lado más oscuro y violento.', 87],
  ['Las aventuras de Sherlock Holmes', 1892, 'Arthur Conan Doyle', 352, 'Misterio,Clásico', 'Doce relatos magistrales donde el detective de Baker Street resuelve enigmas gracias a su método deductivo.', 89],
  ['El sabueso de los Baskerville', 1902, 'Arthur Conan Doyle', 240, 'Misterio,Clásico', 'Holmes y Watson investigan la legendaria maldición de una bestia demoníaca en los páramos de Devonshire.', 88],
  ['Diez negritos (Y no quedó ninguno)', 1939, 'Agatha Christie', 224, 'Misterio,Thriller', 'Diez personas sin relación aparente son invitadas a una mansión en una isla y asesinadas una a una según una canción infantil.', 91],
  ['Asesinato en el Orient Express', 1934, 'Agatha Christie', 256, 'Misterio,Clásico', 'El detective Hércules Poirot viaja en el lujoso tren detenido por la nieve mientras interroga a doce sospechosos de homicidio.', 90],
  ['El asesinato de Roger Ackroyd', 1926, 'Agatha Christie', 288, 'Misterio,Clásico', 'Una novela policíaca célebre por su audaz e inolvidable giro argumental en la resolución del caso.', 88],
  ['Muerte en el Nilo', 1937, 'Agatha Christie', 336, 'Misterio,Clásico', 'Un idílico crucero por el río Nilo se convierte en escenario de celos y crimen para una rica heredera.', 86],
  ['El dragón rojo', 1981, 'Thomas Harris', 416, 'Thriller,Crimen', 'El agente Will Graham vuelve al servicio para cazar a un sádico asesino apoyándose en los consejos del doctor Lecter.', 85],
  ['La campana de cristal', 1963, 'Sylvia Plath', 288, 'Novela,Biografía', 'El desmoronamiento psíquico y la lucha contra la depresión de una brillante estudiante universitaria neoyorquina.', 86],
  ['Una habitación propia', 1929, 'Virginia Woolf', 160, 'Ensayo,Historia', 'Un ensayo pionero sobre las condiciones materiales y la independencia necesarias para que las mujeres puedan crear literatura.', 88],
  ['Orlando', 1928, 'Virginia Woolf', 336, 'Novela,Fantasía', 'Un joven noble inglés viaja a lo largo de más de tres siglos cambiando de época y transformándose de hombre a mujer.', 84],
  ['Al faro', 1927, 'Virginia Woolf', 256, 'Novela,Clásico', 'Las complejas relaciones de la familia Ramsay en una isla escocesa a través del flujo de conciencia y el paso del tiempo.', 83],
  ['La señora Dalloway', 1925, 'Virginia Woolf', 240, 'Novela,Clásico', 'Un día en la vida de Clarissa Dalloway mientras prepara una fiesta en el Londres posterior a la Primera Guerra Mundial.', 85],
  ['Pedro y Juan', 1887, 'Guy de Maupassant', 224, 'Novela,Clásico', 'La repentina herencia recibida por uno de dos hermanos desata celos familiares y sospechas sobre su legitimidad.', 78],
  ['Bel-Ami', 1885, 'Guy de Maupassant', 384, 'Novela,Clásico', 'La ascensión social sin escrúpulos de un ambicioso periodista parisino aprovechándose de mujeres influyentes.', 82],
  ['Bola de sebo', 1880, 'Guy de Maupassant', 96, 'Cuentos,Clásico', 'Durante la guerra francoprusiana, los respetables ocupantes de una diligencia muestran su hipocresía ante una cortesana.', 82],
]

const allM = [...MOVIES, ...NEW_MOVIES]
const allS = [...SERIES, ...NEW_SERIES]
const allB = [...BOOKS, ...NEW_BOOKS]

console.log(`Nuevos totales: ${allM.length} pelis, ${allS.length} series, ${allB.length} libros (Total: ${allM.length + allS.length + allB.length})`)

let content = `// Catálogo ampliado (fallback y enriquecimiento libre). Plataformas ORIENTATIVAS.\n`
content += `// [título, año, creador, minutos, géneros, sinopsis, popularidad(0-100), plataformas]\n`
content += `// Plataformas: N=Netflix P=Prime Video H=HBO Max D=Disney+ M=Movistar+ F=Filmin A=Apple TV+\n\n`
content += `export const PLATFORM = { N: 'Netflix', P: 'Prime Video', H: 'HBO Max', D: 'Disney+', M: 'Movistar+', F: 'Filmin', A: 'Apple TV+' }\n\n`

content += `export const MOVIES = [\n`
for (const m of allM) content += `  ${JSON.stringify(m)},\n`
content += `]\n\n`

content += `export const SERIES = [\n`
for (const s of allS) content += `  ${JSON.stringify(s)},\n`
content += `]\n\n`

content += `export const BOOKS = [\n`
for (const b of allB) content += `  ${JSON.stringify(b)},\n`
content += `]\n`

writeFileSync(TARGET, content, 'utf8')
console.log('seed-catalog.mjs actualizado con éxito.')
