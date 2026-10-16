// Genera seed-catalog.mjs con >= 100 pelis, >= 100 series y >= 100 libros
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOVIES as OLD_MOVIES, SERIES as OLD_SERIES, BOOKS as OLD_BOOKS, PLATFORM } from './seed-catalog.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const TARGET = join(here, 'seed-catalog.mjs')

const EXTRA_MOVIES = [
  ['El gran dictador', 1940, 'Charles Chaplin', 125, 'Comedia,Bélica', 'Un barbero judío y un dictador idéntico a él intercambian sus identidades en plena época fascista.', 85, 'F,P'],
  ['El club de los poetas muertos', 1989, 'Peter Weir', 128, 'Drama', 'Un profesor de literatura poco ortodoxo inspira a sus alumnos a vivir con pasión y a pensar por sí mismos.', 86, 'D,P'],
  ['La princesa prometida', 1987, 'Rob Reiner', 98, 'Fantasía,Aventura', 'Un abuelo lee a su nieto enfermo un cuento sobre piratas, princesas, gigantes y un amor verdadero.', 84, 'P,M'],
  ['El bueno, el feo y el malo', 1966, 'Sergio Leone', 161, 'Western', 'Tres pistoleros buscan una caja con 200.000 dólares enterrada en un cementerio durante la guerra civil.', 88, 'P,F'],
  ['Doce hombres sin piedad', 1957, 'Sidney Lumet', 96, 'Drama', 'Un jurado de doce hombres debe deliberar sobre la culpabilidad de un joven acusado de asesinato en una sala asfixiante.', 89, 'F,P'],
  ['El show de Truman', 1998, 'Peter Weir', 103, 'Drama,Ciencia ficción', 'Un agente de seguros descubre que toda su vida es un programa de telerrealidad emitido para todo el mundo.', 88, 'N,P'],
  ['¡Olvídate de mí!', 2004, 'Michel Gondry', 108, 'Romance,Ciencia ficción', 'Un hombre destrozado se somete a un tratamiento experimental para borrar de su memoria los recuerdos de su ex.', 86, 'P,F'],
  ['Spotlight', 2015, 'Tom McCarthy', 128, 'Drama,Crimen', 'Un equipo de investigación periodística del Boston Globe destapa un escándalo de abusos en la Iglesia católica.', 82, 'P,M'],
  ['Spider-Man: Un nuevo universo', 2018, 'Bob Persichetti, Peter Ramsey y Rodney Rothman', 117, 'Animación,Acción', 'Miles Morales se convierte en el nuevo Spider-Man y une fuerzas con versiones de otras dimensiones.', 88, 'D,N'],
  ['Drive', 2011, 'Nicolas Winding Refn', 100, 'Acción,Crimen', 'Un conductor especialista de cine que trabaja por las noches como chófer de huidas se enamora de su vecina.', 82, 'P,F'],
  ['Relatos salvajes', 2014, 'Damián Szifron', 122, 'Comedia,Drama', 'Seis historias autoconclusivas que exploran los límites del autocontrol ante situaciones cotidianas extremas.', 86, 'M,P'],
  ['El secreto de sus ojos', 2009, 'Juan José Campanella', 129, 'Misterio,Drama', 'Un oficial de un juzgado retirado escribe una novela sobre un asesinato sin resolver ocurrido 25 años antes.', 85, 'M,F'],
  ['La isla mínima', 2014, 'Alberto Rodríguez', 105, 'Thriller,Crimen', 'Dos policías ideológicamente opuestos viajan a las marismas del Guadalquivir para investigar la desaparición de dos chicas.', 81, 'M,N'],
  ['Tesis', 1996, 'Alejandro Amenábar', 125, 'Thriller,Terror', 'Una estudiante de Imagen prepara una tesis sobre la violencia audiovisual y descubre una cinta snuff real en su universidad.', 82, 'F,P'],
  ['Abre los ojos', 1997, 'Alejandro Amenábar', 117, 'Ciencia ficción,Misterio', 'Un joven apuesto sufre un accidente que le desfigura la cara y empieza a confundir la realidad con las pesadillas.', 80, 'F,M'],
  ['Mujeres al borde de un ataque de nervios', 1988, 'Pedro Almodóvar', 88, 'Comedia', 'Una actriz de doblaje ve cómo su amante la abandona mientras su casa se llena de personajes extravagantes y gazpacho con somníferos.', 82, 'N,F'],
  ['Dolor y gloria', 2019, 'Pedro Almodóvar', 113, 'Drama', 'Un director de cine en su declive físico rememora su infancia humilde en Paterna y sus grandes pasiones amorosas.', 83, 'N,F'],
  ['El espíritu de la colmena', 1973, 'Víctor Erice', 97, 'Drama', 'En un pueblo castellano tras la guerra civil, una niña queda fascinada tras ver la película de Frankenstein.', 79, 'F,M'],
  ['Amanece, que no es poco', 1989, 'José Luis Cuerda', 110, 'Comedia', 'Un ingeniero español regresa de Estados Unidos a un pueblo de la sierra donde ocurren los sucesos más surrealistas.', 83, 'F,M'],
  ['La gran belleza', 2013, 'Paolo Sorrentino', 141, 'Drama', 'Un escritor hedonista de 65 años recorre las fiestas de la alta sociedad romana buscando el sentido y la belleza.', 82, 'F,M'],
  ['La llegada', 2016, 'Denis Villeneuve', 116, 'Ciencia ficción,Drama', 'Una lingüista es contratada por el ejército para comunicarse con unos extraterrestres que acaban de llegar a la Tierra.', 87, 'N,P'],
  ['Sin perdón', 1992, 'Clint Eastwood', 131, 'Western,Drama', 'Un viejo pistolero viudo acepta un último trabajo para conseguir dinero para criar a sus dos hijos.', 86, 'H,M'],
  ['No es país para viejos', 2007, 'Joel y Ethan Coen', 122, 'Thriller,Crimen', 'Un cazador encuentra dinero procedente del narcotráfico y es perseguido sin piedad por un asesino psicópata.', 87, 'P,M'],
  ['El gran Lebowski', 1998, 'Joel y Ethan Coen', 117, 'Comedia,Crimen', 'Un vago entrañable es confundido con un millonario de mismo apellido y acaba involucrado en un secuestro delirante.', 85, 'P,M'],
  ['Zodiac', 2007, 'David Fincher', 157, 'Thriller,Crimen', 'Un dibujante de prensa y varios periodistas y detectives se obsesionan con atrapar al escurridizo Asesino del Zodiaco.', 84, 'H,P'],
  ['Her', 2013, 'Spike Jonze', 126, 'Romance,Ciencia ficción', 'Un hombre solitario a punto de divorciarse desarrolla una relación sentimental con un sistema operativo avanzado.', 85, 'P,F'],
  ['Soul', 2020, 'Pete Docter y Kemp Powers', 100, 'Animación,Comedia', 'Un profesor de música de instituto sufre un accidente justo antes de triunfar y viaja al lugar donde nacen las almas.', 85, 'D'],
  ['WALL·E', 2008, 'Andrew Stanton', 98, 'Animación,Ciencia ficción', 'Un pequeño robot compactador de basura en una Tierra abandonada emprende un viaje estelar tras enamorarse de una sonda.', 88, 'D'],
  ['Ratatouille', 2007, 'Brad Bird', 111, 'Animación,Comedia', 'Una rata con un paladar exquisito se alía con un patoso ayudante de cocina en el mejor restaurante de París.', 87, 'D'],
  ['Spider-Man: Cruzando el Multiverso', 2023, 'Joaquim Dos Santos, Kemp Powers y Justin K. Thompson', 140, 'Animación,Acción', 'Miles Morales se catapulta a través del multiverso y se enfrenta a un equipo de Spider-Heroes encargados de proteger su existencia.', 90, 'N,M'],
]

const EXTRA_SERIES = [
  ['The Bear', 2022, 'Christopher Storer', 30, 3, 'Drama,Comedia', 'Un joven chef de alta cocina regresa a Chicago para hacerse cargo de la sandwichería italiana de su familia tras un suicidio.', 92, 'D'],
  ['Severance', 2022, 'Dan Erickson', 50, 2, 'Ciencia ficción,Thriller', 'Empleados de una corporación se someten a un procedimiento quirúrgico que separa sus recuerdos laborales de sus recuerdos personales.', 90, 'A'],
  ['Mindhunter', 2017, 'Joe Penhall', 55, 2, 'Crimen,Thriller', 'Dos agentes del FBI a finales de los setenta entrevistan a asesinos en serie en prisión para comprender su psicología.', 89, 'N'],
  ['Atlanta', 2016, 'Donald Glover', 30, 4, 'Comedia,Drama', 'Dos primos intentan abrirse camino en la escena del rap de Atlanta mientras lidian con el racismo y situaciones surrealistas.', 84, 'D'],
  ['Barry', 2018, 'Bill Hader y Alec Berg', 30, 4, 'Comedia,Crimen', 'Un sicario deprimido del Medio Oeste viaja a Los Ángeles para matar y descubre por accidente su verdadera vocación: la actuación.', 85, 'H'],
  ['BoJack Horseman', 2014, 'Raphael Bob-Waksberg', 25, 6, 'Animación,Comedia', 'Un caballo humanoide que triunfó en una telecomedia en los noventa intenta reencaminar su vida entre depresión y adicciones.', 90, 'N'],
  ['Arcane', 2021, 'Christian Linke y Alex Yee', 40, 2, 'Animación,Acción', 'En las ciudades rivales de Piltover y Zaun, dos hermanas luchan en bandos opuestos de una guerra por tecnologías mágicas.', 94, 'N'],
  ['Cowboy Bebop', 1998, 'Shinichiro Watanabe', 24, 1, 'Animación,Ciencia ficción', 'Un grupo heterogéneo de cazarrecompensas viaja por el sistema solar en el año 2071 a ritmo de jazz.', 86, 'N'],
  ['Evangelion', 1995, 'Hideaki Anno', 24, 1, 'Animación,Ciencia ficción', 'Adolescentes pilotan robots biomecánicos gigantes para proteger a la humanidad de seres monstruosos conocidos como Ángeles.', 87, 'N'],
  ['Fullmetal Alchemist: Brotherhood', 2009, 'Yasuhiro Irie', 24, 1, 'Animación,Fantasía', 'Dos hermanos alquimistas buscan la piedra filosofal para restaurar sus cuerpos tras un fallido intento de revivir a su madre.', 92, 'N'],
  ['Demon Slayer: Kimetsu no Yaiba', 2019, 'Haruo Sotozaki', 24, 4, 'Animación,Acción', 'Un joven de buen corazón se convierte en cazador de demonios después de que su familia sea masacrada y su hermana transformada.', 89, 'N,P'],
  ['Monster', 2004, 'Masayuki Kojima', 24, 1, 'Animación,Thriller', 'Un neurocirujano japonés en Alemania salva la vida de un niño que años después resulta ser un psicópata implacable.', 88, 'N'],
  ['The Boys', 2019, 'Eric Kripke', 60, 4, 'Acción,Ciencia ficción', 'Un grupo de vigilantes se propone derribar a superhéroes corruptos controlados por una siniestra corporación.', 91, 'P'],
  ['Invincible', 2021, 'Robert Kirkman', 45, 2, 'Animación,Acción', 'El hijo del superhéroe más poderoso del planeta empieza a desarrollar sus propios poderes y descubre un secreto oscuro.', 88, 'P'],
  ['Daredevil', 2015, 'Drew Goddard', 50, 3, 'Acción,Crimen', 'Un abogado ciego con sentidos extraordinarios combate el crimen por la noche como vigilante en el barrio neoyorquino de Hell’s Kitchen.', 88, 'D'],
  ['Loki', 2021, 'Michael Waldron', 50, 2, 'Ciencia ficción,Aventura', 'El Dios del Engaño se ve atrapado por la Autoridad de Variación Temporal tras escapar con el Teseracto.', 87, 'D'],
  ['Andor', 2022, 'Tony Gilroy', 45, 2, 'Ciencia ficción,Thriller', 'Cassian Andor descubre la diferencia que puede marcar en la lucha contra el tiránico Imperio Galáctico.', 89, 'D'],
  ['Shōgun', 2024, 'Rachel Kondo y Justin Marks', 60, 1, 'Drama,Histórica', 'En el Japón feudal de 1600, un astuto señor de la guerra y un náufrago inglés cruzan sus destinos.', 91, 'D'],
  ['Slow Horses', 2022, 'Will Smith', 45, 4, 'Thriller,Crimen', 'Un disfuncional equipo de agentes del MI5 relegados al vertedero administrativo se ve envuelto en conspiraciones reales.', 88, 'A'],
  ['Silo', 2023, 'Graham Yost', 50, 2, 'Ciencia ficción,Misterio', 'En un futuro tóxico, miles de personas viven en un gigantesco silo subterráneo con normas estrictas.', 86, 'A'],
  ['Broadchurch', 2013, 'Chris Chibnall', 48, 3, 'Crimen,Misterio', 'El asesinato de un niño conmociona a una pequeña comunidad costera inglesa y desata una investigación asfixiante.', 84, 'P,M'],
  ['Line of Duty', 2012, 'Jed Mercurio', 60, 6, 'Crimen,Thriller', 'Una unidad anticorrupción de la policía británica investiga a compañeros sospechosos en interrogatorios electrizantes.', 85, 'M,F'],
  ['Happy Valley', 2014, 'Sally Wainwright', 55, 3, 'Crimen,Drama', 'Una sargento de policía en un valle rural de Yorkshire lidia con la liberación del hombre que destrozó a su familia.', 84, 'M,F'],
  ['The Shield', 2002, 'Shawn Ryan', 45, 7, 'Crimen,Drama', 'Una unidad de élite de la policía de Los Ángeles cruza constantemente las líneas de la legalidad.', 83, 'M,P'],
  ['Sons of Anarchy', 2008, 'Kurt Sutter', 50, 7, 'Crimen,Drama', 'Un club de moteros que trafica con armas en un pequeño pueblo de California enfrenta rivalidades internas y externas.', 86, 'D'],
  ['Justified', 2010, 'Graham Yost', 42, 6, 'Crimen,Drama', 'Un taciturno marshall con métodos del siglo XIX es reasignado a su Kentucky natal.', 82, 'D'],
  ['Deadwood', 2004, 'David Milch', 55, 3, 'Western,Drama', 'La vida en un campamento minero en Dakota del Sur durante la fiebre del oro, donde la ley no existe.', 82, 'H'],
  ['Roma', 2005, 'Bruno Heller, John Milius y William J. MacDonald', 55, 2, 'Histórica,Drama', 'La caída de la República romana y el nacimiento del Imperio vistos a través de dos legionarios ordinarios.', 83, 'H'],
  ['A dos metros bajo tierra', 2001, 'Alan Ball', 55, 5, 'Drama,Comedia', 'La disfuncional familia Fisher regenta una funeraria independiente en Los Ángeles conviviendo con la muerte diaria.', 86, 'H,M'],
  ['Battlestar Galactica', 2004, 'Ronald D. Moore', 45, 4, 'Ciencia ficción,Drama', 'Los últimos supervivientes humanos huyen por el espacio buscando la mítica Tierra mientras los cylons los persiguen.', 84, 'P,M'],
  ['Expediente X', 1993, 'Chris Carter', 45, 11, 'Ciencia ficción,Misterio', 'Dos agentes del FBI investigan casos inexplicables relacionados con fenómenos paranormales y conspiraciones del gobierno.', 88, 'D'],
  ['Twin Peaks', 1990, 'David Lynch y Mark Frost', 47, 3, 'Misterio,Drama', 'El agente especial Dale Cooper llega al montañoso pueblo de Twin Peaks para investigar el asesinato de Laura Palmer.', 87, 'M,P'],
  ['Doctor Who', 2005, 'Russell T Davies', 45, 14, 'Ciencia ficción,Aventura', 'Un Señor del Tiempo alienígena viaja a través del espacio y el tiempo en la TARDIS junto a sus acompañantes humanos.', 85, 'D,M'],
  ['Downton Abbey', 2010, 'Julian Fellowes', 50, 6, 'Drama,Histórica', 'Las vidas entrelazadas de la aristocrática familia Crawley y sus sirvientes en una gran casa de campo inglesa.', 87, 'P,N'],
  ['Modern Family', 2009, 'Christopher Lloyd y Steven Levitan', 22, 11, 'Comedia', 'Un documental ficticio sigue el divertido día a día de tres ramas diferentes de una misma familia.', 91, 'D'],
  ['Parks and Recreation', 2009, 'Greg Daniels y Michael Schur', 22, 7, 'Comedia', 'Una funcionaria entusiasta del departamento de parques de un pueblo de Indiana lucha por mejorar su comunidad.', 85, 'H,P'],
  ['Brooklyn Nine-Nine', 2013, 'Dan Goor y Michael Schur', 22, 8, 'Comedia,Crimen', 'Las disparatadas aventuras de un talentoso pero inmaduro detective y sus compañeros en una comisaría neoyorquina.', 88, 'N'],
  ['Community', 2009, 'Dan Harmon', 22, 6, 'Comedia', 'Un abogado suspendido forma un grupo de estudio con excéntricos compañeros en una peculiar universidad comunitaria.', 84, 'N,P'],
  ['Scrubs', 2001, 'Bill Lawrence', 22, 9, 'Comedia,Drama', 'Un joven médico residente aprende el oficio y la vida entre ensoñaciones y pacientes en el hospital Sacred Heart.', 83, 'D'],
  ['Curb Your Enthusiasm', 2000, 'Larry David', 30, 12, 'Comedia', 'Larry David se mete continuamente en situaciones incómodas y absurdas por su incapacidad para aceptar normas sociales.', 82, 'H'],
  ['Arrested Development', 2003, 'Mitchell Hurwitz', 22, 5, 'Comedia', 'Un hijo sensato intenta mantener a flote la empresa familiar después de que su excéntrico padre sea encarcelado.', 83, 'N'],
  ['It\'s Always Sunny in Philadelphia', 2005, 'Rob McElhenney', 22, 16, 'Comedia', 'Cinco amigos narcisistas y sin escrúpulos regentan un ruinoso pub irlandés en Filadelfia.', 82, 'D'],
  ['Yellowstone', 2018, 'Taylor Sheridan', 50, 5, 'Drama,Western', 'La familia Dutton defiende el rancho más grande de Estados Unidos de promotores inmobiliarios y reservas indígenas.', 87, 'M,P'],
  ['Euphoria', 2019, 'Sam Levinson', 55, 2, 'Drama', 'Un grupo de estudiantes de secundaria navega entre el amor, el trauma, las drogas, las redes sociales y la identidad.', 88, 'H'],
  ['The White Lotus', 2021, 'Mike White', 55, 2, 'Comedia,Drama', 'Las vacaciones de huéspedes adinerados en un resort de lujo sacan a relucir secretos oscuros y tensiones clasistas.', 88, 'H'],
  ['Antidisturbios', 2020, 'Rodrigo Sorogoyen e Isabel Peña', 50, 1, 'Drama,Crimen', 'Un furgón de antidisturbios ejecuta un desahucio que sale mal y una inspectora de Asuntos Internos investiga lo ocurrido.', 85, 'M'],
  ['Fariña', 2018, 'Ramón Campos y Gema R. Neira', 70, 1, 'Crimen,Drama', 'La transformación de los contrabandistas de tabaco gallegos en los grandes capos del narcotráfico en los años ochenta.', 86, 'N,A'],
  ['El Ministerio del Tiempo', 2015, 'Javier y Pablo Olivares', 70, 4, 'Ciencia ficción,Aventura', 'Una institución gubernamental secreta viaja a través de puertas temporales para impedir que el pasado cambie.', 86, 'M,H'],
  ['Paquita Salas', 2016, 'Javier Calvo y Javier Ambrossi', 30, 3, 'Comedia', 'Una representante de actores de los noventa lucha por reinventarse en la era digital tras perder a su actriz estrella.', 85, 'N'],
  ['La Mesías', 2023, 'Javier Calvo y Javier Ambrossi', 60, 1, 'Drama,Misterio', 'El vídeo viral de un grupo de música pop cristiana despierta los fantasmas infantiles de un hombre marcado por el fanatismo.', 86, 'M'],
  ['Veneno', 2020, 'Javier Calvo y Javier Ambrossi', 50, 1, 'Drama,Biografía', 'La vida, lucha y visibilidad de Cristina Ortiz «La Veneno», icono transexual de la televisión española.', 84, 'A'],
  ['Poquita fe', 2023, 'Pepón Montero y Juan Maidagán', 15, 1, 'Comedia', 'Un año en la vida de una pareja corriente que intenta sobrevivir al ruido de sus familias y a su propia apatía.', 81, 'M'],
  ['Crematorio', 2011, 'Jorge Sánchez-Cabezudo', 50, 1, 'Crimen,Drama', 'El poder, la corrupción urbanística y la especulación inmobiliaria en la costa levantina a través de un promotor sin escrúpulos.', 82, 'M'],
  ['Gomorra', 2014, 'Roberto Saviano', 50, 5, 'Crimen,Drama', 'La feroz lucha por el control del tráfico de drogas en Nápoles en el seno del clan camorrista de los Savastano.', 85, 'M'],
  ['Suburra', 2017, 'Daniele Cesarano y Barbara Petronio', 50, 3, 'Crimen,Drama', 'Una batalla sangrienta por el control de unos terrenos costeros de Roma que enfrenta a la mafia, la Iglesia y los políticos.', 81, 'N'],
  ['Lupin', 2021, 'George Kay', 45, 3, 'Crimen,Misterio', 'Inspirado por las aventuras de Arsenio Lupin, un ladrón de guante blanco busca vengar la muerte de su padre.', 87, 'N'],
  ['Vigil', 2021, 'Tom Edge', 55, 2, 'Misterio,Thriller', 'Una inspectora sube a bordo de un submarino nuclear británico para investigar una muerte sospechosa en alta mar.', 80, 'M'],
  ['Utopía', 2013, 'Dennis Kelly', 50, 2, 'Ciencia ficción,Thriller', 'Un grupo de aficionados a un cómic de culto se ve perseguido por una misteriosa organización que busca un manuscrito.', 83, 'F,P'],
  ['Mr. Robot', 2015, 'Sam Esmail', 45, 4, 'Drama,Thriller', 'Un joven programador con fobia social y depresión trabaja como ingeniero de ciberseguridad y hacker justiciero.', 88, 'P'],
  ['Fringe', 2008, 'J. J. Abrams, Alex Kurtzman y Roberto Orci', 45, 5, 'Ciencia ficción,Misterio', 'Una agente del FBI, un científico excéntrico y su hijo investigan fenómenos inexplicables y universos paralelos.', 85, 'H,M'],
]

const EXTRA_BOOKS = [
  // No ficción (Ensayos, Historia, Biografías, Divulgación)
  ['El infinito en un junco', 2019, 'Irene Vallejo', 452, 'Ensayo,Historia', 'Un recorrido apasionante por la invención de los libros y la fascinante historia de su salvación en el mundo antiguo.', 92],
  ['Pensar rápido, pensar despacio', 2011, 'Daniel Kahneman', 672, 'Ensayo,Divulgación', 'El Nobel de Economía explica los dos sistemas que modelan cómo pensamos: el intuitivo y rápido y el deliberativo y lógico.', 90],
  ['El hombre en busca de sentido', 1946, 'Viktor Frankl', 168, 'Ensayo,Biografía', 'Un psiquiatra austriaco relata su experiencia en los campos de concentración y expone la logoterapia.', 91],
  ['Meditaciones', 180, 'Marco Aurelio', 208, 'Ensayo,Filosofía', 'Reflexiones íntimas del emperador romano sobre la disciplina estoica, el autocontrol y el sentido del deber.', 88],
  ['El mundo de ayer', 1942, 'Stefan Zweig', 544, 'Biografía,Historia', 'Memorias de un europeo que vio desmoronarse la edad de oro de Viena y de Europa ante los totalitarismos.', 89],
  ['Una breve historia de casi todo', 2003, 'Bill Bryson', 640, 'Divulgación,Historia', 'Un fascinante viaje divulgativo que explica desde el Big Bang hasta el surgimiento de la civilización humana.', 87],
  ['Armas, gérmenes y acero', 1997, 'Jared Diamond', 600, 'Ensayo,Historia', 'Una explicación geográfica y ecológica de por qué las sociedades humanas evolucionaron a ritmos tan distintos.', 85],
  ['Antifrágil', 2012, 'Nassim Nicholas Taleb', 650, 'Ensayo,Filosofía', 'Cómo ciertas cosas se benefician del desorden, el caos y la volatilidad, frente a la fragilidad.', 84],
  ['Homo Deus', 2015, 'Yuval Noah Harari', 496, 'Ensayo,Historia', 'Una mirada hacia el futuro de la humanidad y los nuevos retos biotecnológicos y de inteligencia artificial.', 87],
  ['21 lecciones para el siglo XXI', 2018, 'Yuval Noah Harari', 416, 'Ensayo,Filosofía', 'Reflexiones urgentes sobre el presente: desinformación, tecnología, nacionalismos y el sentido de la verdad.', 84],
  ['El gen egoísta', 1976, 'Richard Dawkins', 480, 'Ensayo,Divulgación', 'La evolución biológica explicada desde la perspectiva del gen como unidad fundamental de selección natural.', 82],
  ['Breve historia del tiempo', 1988, 'Stephen Hawking', 256, 'Divulgación,Ciencia', 'El célebre físico explica los agujeros negros, la relatividad y el origen y destino del universo.', 88],
  ['El arte de la guerra', -500, 'Sun Tzu', 112, 'Ensayo,Clásico', 'Tratado militar milenario sobre estrategia, psicología del conflicto y victoria sin combate.', 88],
  ['El príncipe', 1532, 'Nicolás Maquiavelo', 160, 'Ensayo,Clásico', 'Tratado político renacentista sobre cómo adquirir, mantener y ejercer el poder del Estado.', 84],
  ['Steve Jobs', 2011, 'Walter Isaacson', 740, 'Biografía,Historia', 'La biografía definitiva y sin concesiones del fundador de Apple y visionario de la tecnología moderna.', 86],
  ['Fouché, el genio tenebroso', 1929, 'Stefan Zweig', 288, 'Biografía,Historia', 'La vida del implacable ministro de policía que sobrevivió a la Revolución, a Napoleón y a la Restauración.', 82],
  ['Momentos estelares de la humanidad', 1927, 'Stefan Zweig', 304, 'Historia,Biografía', 'Catorce miniaturas históricas que relatan instantes decisivos que cambiaron el rumbo del mundo.', 86],
  ['Cosmos', 1980, 'Carl Sagan', 384, 'Divulgación,Ciencia', 'La gran aventura científica y cósmica del ser humano en quince mil millones de años de evolución.', 89],
  ['El elogio de la locura', 1511, 'Erasmo de Róterdam', 160, 'Ensayo,Filosofía', 'Una sátira humanista e irónica contra las costumbres corruptas y la hipocresía de su época.', 78],
  ['Por qué fracasan los países', 2012, 'Daron Acemoglu y James A. Robinson', 600, 'Ensayo,Historia', 'El papel crucial de las instituciones políticas y económicas inclusivas en la prosperidad de las naciones.', 84],

  // Novelas, clásicos, thrillers y ficción
  ['Los renglones torcidos de Dios', 1979, 'Torcuato Luca de Tena', 448, 'Misterio,Novela', 'Una detective privada se interna voluntariamente en un psiquiátrico para investigar un homicidio.', 87],
  ['La verdad sobre el caso Harry Quebert', 2012, 'Joël Dicker', 672, 'Misterio,Thriller', 'Un joven escritor investiga la acusación de asesinato contra su mentor tras hallarse un cadáver en su jardín.', 86],
  ['El paciente inglés', 1992, 'Michael Ondaatje', 320, 'Romance,Histórica', 'Cuatro personas marcadas por la Segunda Guerra Mundial coinciden en una villa toscana en ruinas.', 80],
  ['Tokio blues (Norwegian Wood)', 1987, 'Haruki Murakami', 384, 'Romance,Novela', 'Un hombre recuerda sus años universitarios en Tokio y la relación con dos mujeres de personalidades opuestas.', 86],
  ['Crónica del pájaro que da cuerda al mundo', 1994, 'Haruki Murakami', 912, 'Novela,Realismo mágico', 'Un hombre busca al gato de su esposa y se sumerge en una maraña de personajes insólitos y pozos secos.', 83],
  ['Kafka en la orilla', 2002, 'Haruki Murakami', 720, 'Novela,Realismo mágico', 'Un muchacho de quince años huye de casa mientras un anciano con facultades psíquicas emprende un viaje paralelo.', 85],
  ['La insoportable levedad del ser', 1984, 'Milan Kundera', 336, 'Novela,Filosofía', 'Amores, dudas y elecciones vitales en Praga durante la primavera de 1968 y la invasión soviética.', 85],
  ['En busca del tiempo perdido: Por el camino de Swann', 1913, 'Marcel Proust', 480, 'Novela,Clásico', 'El narrador evoca sus recuerdos de infancia a través de la memoria involuntaria y el sabor de una magdalena.', 82],
  ['Ulises', 1922, 'James Joyce', 900, 'Novela,Clásico', 'Un día entero en la vida de Leopold Bloom recorriendo Dublín en un despliegue lingüístico monumental.', 78],
  ['Guerra y paz', 1869, 'León Tolstói', 1300, 'Histórica,Clásico', 'Cinco familias aristocráticas rusas viven el esplendor social y el horror de las guerras napoleónicas.', 86],
  ['Ana Karenina', 1877, 'León Tolstói', 1000, 'Romance,Clásico', 'Una aristócrata casada desafía las convenciones sociales al enamorarse perdidamente del oficial Vronski.', 86],
  ['Los hermanos Karamázov', 1880, 'Fiódor Dostoievski', 1120, 'Novela,Clásico', 'Un parricidio y las complejas relaciones éticas, religiosas y pasionales entre tres hermanos y su padre.', 88],
  ['El idiota', 1869, 'Fiódor Dostoievski', 750, 'Novela,Clásico', 'El bondadoso príncipe Mishkin llega a San Petersburgo y su inocencia choca contra la codicia y el cinismo.', 82],
  ['Madame Bovary', 1857, 'Gustave Flaubert', 448, 'Novela,Clásico', 'Emma Bovary busca en aventuras amorosas escapar del tedio y la mediocridad de la vida provinciana.', 83],
  ['Los miserables', 1862, 'Victor Hugo', 1400, 'Novela,Clásico', 'Jean Valjean huye del implacable inspector Javert en un fresco imponente sobre la redención y la injusticia social.', 88],
  ['El conde de Montecristo', 1844, 'Alexandre Dumas', 1200, 'Aventura,Clásico', 'Edmond Dantès escapa del castillo de If para ejecutar una paciente y deslumbrante venganza.', 92],
  ['Los tres mosqueteros', 1844, 'Alexandre Dumas', 700, 'Aventura,Clásico', 'El joven d\'Artagnan se une a Athos, Porthos y Aramis bajo el lema de todos para uno y uno para todos.', 86],
  ['Frankenstein', 1818, 'Mary Shelley', 280, 'Terror,Clásico', 'Un científico desafía a la naturaleza creando un ser vivo a partir de restos humanos y huye de su creación.', 85],
  ['Drácula', 1897, 'Bram Stoker', 416, 'Terror,Clásico', 'El conde transilvano viaja a la Inglaterra victoriana para alimentarse de sangre nueva y sembrar el pánico.', 87],
  ['El retrato de Dorian Gray', 1890, 'Oscar Wilde', 288, 'Novela,Clásico', 'Un joven hermoso conserva la juventud mientras su retrato oculto envejece y muestra la degradación de su alma.', 87],
  ['La Odisea', -800, 'Homero', 400, 'Fantasía,Clásico', 'El intrépido Odiseo regresa a Ítaca sorteando monstruos, magas y la ira de los dioses marinos.', 88],
  ['La Ilíada', -800, 'Homero', 500, 'Histórica,Clásico', 'La cólera de Aquiles durante el último año del mítico asedio de los griegos a Troya.', 84],
  ['La divina comedia', 1320, 'Dante Alighieri', 600, 'Poesía,Clásico', 'Dante desciende a los círculos del Infierno, cruza el Purgatorio y asciende al Paraíso guiado por Virgilio.', 85],
  ['Ficciones', 1944, 'Jorge Luis Borges', 224, 'Cuentos,Realismo mágico', 'Laberintos, bibliotecas infinitas, espejos y enigmas metafísicos en relatos breves y deslumbrantes.', 88],
  ['El Aleph', 1949, 'Jorge Luis Borges', 208, 'Cuentos,Realismo mágico', 'Colección de relatos filosóficos que incluye el punto en el sótano donde se observan todos los puntos del universo.', 87],
  ['El amor en los tiempos del cólera', 1985, 'Gabriel García Márquez', 500, 'Romance,Realismo mágico', 'Florentino Ariza espera durante cincuenta y un años, nueve meses y cuatro días para reiterar su amor a Fermina Daza.', 88],
  ['Crónica de una muerte anunciada', 1981, 'Gabriel García Márquez', 144, 'Novela,Misterio', 'La reconstrucción de un asesinato sabido por todo un pueblo que nadie hizo nada por evitar.', 86],
  ['Ensayo sobre la lucidez', 2004, 'José Saramago', 400, 'Novela,Distopía', 'Los habitantes de una capital votan en blanco en un ochenta por ciento y el gobierno reacciona con paranoia.', 80],
  ['Las intermitencias de la muerte', 2005, 'José Saramago', 240, 'Novela,Fantasía', 'La muerte decide hacer huelga y deja de matar, provocando una crisis sin precedentes en la sociedad.', 82],
  ['La carretera', 2006, 'Cormac McCarthy', 224, 'Distopía,Drama', 'Un padre y su hijo caminan a través de una América calcinada y sin vida empujando un carrito de supermercado.', 86],
  ['Meridiano de sangre', 1985, 'Cormac McCarthy', 400, 'Western,Novela', 'Una expedición sanguinaria de cazadores de cabelleras en la frontera entre Estados Unidos y México.', 82],
  ['El camino', 1950, 'Miguel Delibes', 240, 'Novela,Clásico', 'Daniel el Mochuelo recuerda sus amigos y su infancia en la aldea la noche antes de marcharse a la ciudad.', 84],
  ['Los santos inocentes', 1981, 'Miguel Delibes', 192, 'Drama,Clásico', 'La dura vida de una familia de sirvientes en un cortijo extremeño sometida a la tiranía de los señoritos.', 85],
  ['Cinco horas con Mario', 1966, 'Miguel Delibes', 280, 'Drama,Clásico', 'Una mujer vela en soledad el cadáver de su marido mientras desahoga sus frustraciones e incomprensión.', 81],
  ['La colmena', 1951, 'Camilo José Cela', 350, 'Novela,Clásico', 'El retrato coral de cientos de personajes que malviven en el Madrid gris de la posguerra.', 82],
  ['La familia de Pascual Duarte', 1942, 'Camilo José Cela', 200, 'Novela,Clásico', 'Las memorias carcelarias de un campesino extremeño empujado a una violencia brutal y despiadada.', 80],
  ['El árbol de la ciencia', 1911, 'Pío Baroja', 280, 'Novela,Clásico', 'Andrés Hurtado estudia medicina en Madrid y busca un sentido a la existencia entre el escepticismo y el dolor.', 80],
  ['Niebla', 1914, 'Miguel de Unamuno', 240, 'Novela,Filosofía', 'Augusto Pérez se rebela contra su creador literario en una nivola innovadora sobre el libre albedrío.', 81],
  ['Bodas de sangre', 1933, 'Federico García Lorca', 128, 'Drama,Clásico', 'Una boda campesina se tiñe de tragedia cuando la novia huye con su antiguo amante la misma noche de nupcias.', 85],
  ['La casa de Bernarda Alba', 1936, 'Federico García Lorca', 128, 'Drama,Clásico', 'Tras la muerte de su segundo esposo, Bernarda impone a sus cinco hijas un luto riguroso y asfixiante.', 87],
  ['Platero y yo', 1914, 'Juan Ramón Jiménez', 160, 'Poesía,Clásico', 'La ternura y la complicidad poética entre el escritor y su pequeño burro en el pueblo andaluz de Moguer.', 80],
  ['El tiempo entre costuras', 2009, 'María Dueñas', 640, 'Histórica,Novela', 'Una modista madrileña se traslada a Tetuán y se ve envuelta en una red de espionaje en plena guerra.', 86],
  ['Dime quién soy', 2010, 'Julia Navarro', 1100, 'Histórica,Novela', 'Un periodista reconstruye la vida de su bisabuela por los grandes acontecimientos del siglo XX.', 84],
  ['El médico', 1986, 'Noah Gordon', 800, 'Histórica,Aventura', 'Un joven inglés huérfano viaja a Persia haciéndose pasar por judío para aprender medicina con Avicena.', 89],
  ['El clan del oso cavernario', 1980, 'Jean M. Auel', 570, 'Histórica,Aventura', 'Ayla, una niña cromañón huérfana tras un terremoto, es adoptada por un clan de neandertales.', 84],
  ['La chica del tren', 2015, 'Paula Hawkins', 496, 'Thriller,Misterio', 'Una mujer que viaja en tren todos los días observa a una pareja idílica hasta que presencia una desaparición.', 82],
  ['Perdida', 2012, 'Gillian Flynn', 560, 'Thriller,Misterio', 'En su quinto aniversario de boda, Amy desaparece y las sospechas apuntan cada vez más a su marido Nick.', 85],
  ['El silencio de la ciudad blanca', 2016, 'Eva García Sáenz de Urturi', 480, 'Thriller,Crimen', 'Un inspector de Vitoria investiga una serie de asesinatos rituales que imitan crímenes de hace veinte años.', 83],
  ['Reina roja', 2018, 'Juan Gómez-Jurado', 568, 'Thriller,Crimen', 'Antonia Scott, la mujer más inteligente del mundo, sale de su encierro para resolver un secuestro de alto nivel.', 88],
  ['Loba negra', 2019, 'Juan Gómez-Jurado', 552, 'Thriller,Crimen', 'Antonia Scott y Jon Gutiérrez se enfrentan a la mafia rusa en la Costa del Sol mientras protegen a una testigo.', 85],
  ['Rey blanco', 2020, 'Juan Gómez-Jurado', 528, 'Thriller,Crimen', 'La batalla final entre Antonia Scott y el misterioso cerebro criminal conocido como el Señor White.', 86],
  ['Todo esto te daré', 2016, 'Dolores Redondo', 624, 'Misterio,Novela', 'Un escritor descubre la doble vida y los oscuros secretos aristocráticos de la familia de su difunto marido en la Ribeira Sacra.', 84],
  ['El guardián invisible', 2013, 'Dolores Redondo', 440, 'Thriller,Misterio', 'La inspectora Amaia Salazar regresa a Elizondo para cazar a un asesino en serie que deja pistas mitológicas.', 85],
  ['El nombre del viento', 2007, 'Patrick Rothfuss', 880, 'Fantasía,Aventura', 'Kvothe, músico legendario y mago, relata la verdad sobre su vida desde una posada solitaria.', 90],
  ['El temor de un hombre sabio', 2011, 'Patrick Rothfuss', 1200, 'Fantasía,Aventura', 'Kvothe continúa su relato adentrándose en intrigas cortesanas, tierras salvajes y el reino feérico.', 88],
]

const allMovies = [...OLD_MOVIES, ...EXTRA_MOVIES]
const allSeries = [...OLD_SERIES, ...EXTRA_SERIES]
const allBooks = [...OLD_BOOKS, ...EXTRA_BOOKS]

console.log(`Películas: ${allMovies.length}, Series: ${allSeries.length}, Libros: ${allBooks.length}`)

let content = `// Catálogo ampliado (fallback y enriquecimiento libre). Plataformas ORIENTATIVAS.\n`
content += `// [título, año, creador, minutos, géneros, sinopsis, popularidad(0-100), plataformas]\n`
content += `// Plataformas: N=Netflix P=Prime Video H=HBO Max D=Disney+ M=Movistar+ F=Filmin A=Apple TV+\n\n`
content += `export const PLATFORM = { N: 'Netflix', P: 'Prime Video', H: 'HBO Max', D: 'Disney+', M: 'Movistar+', F: 'Filmin', A: 'Apple TV+' }\n\n`

content += `export const MOVIES = [\n`
for (const m of allMovies) {
  content += `  ${JSON.stringify(m)},\n`
}
content += `]\n\n`

content += `export const SERIES = [\n`
for (const s of allSeries) {
  content += `  ${JSON.stringify(s)},\n`
}
content += `]\n\n`

content += `export const BOOKS = [\n`
for (const b of allBooks) {
  content += `  ${JSON.stringify(b)},\n`
}
content += `]\n`

writeFileSync(TARGET, content, 'utf8')
console.log('seed-catalog.mjs actualizado correctamente.')
