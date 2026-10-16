import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SEED_FILE = join(here, '..', 'src', 'data', 'seed.json')

const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const ARTISTS_CATALOG = [
  // --- ROCK CLÁSICO & HARD ROCK ---
  { name: 'The Beatles', year: 1960, creator: 'Liverpool, Reino Unido', genres: ['Rock', 'Pop', 'Psicodelia'] },
  { name: 'Queen', year: 1970, creator: 'Londres, Reino Unido', genres: ['Rock', 'Glam rock', 'Ópera rock'] },
  { name: 'Pink Floyd', year: 1965, creator: 'Londres, Reino Unido', genres: ['Rock progresivo', 'Psicodelia'] },
  { name: 'Led Zeppelin', year: 1968, creator: 'Londres, Reino Unido', genres: ['Hard rock', 'Blues rock'] },
  { name: 'The Rolling Stones', year: 1962, creator: 'Londres, Reino Unido', genres: ['Rock and roll', 'Blues rock'] },
  { name: 'The Who', year: 1964, creator: 'Londres, Reino Unido', genres: ['Hard rock', 'Mod', 'Power pop'] },
  { name: 'The Doors', year: 1965, creator: 'Los Ángeles, EE. UU.', genres: ['Rock psicodélico', 'Blues rock'] },
  { name: 'Jimi Hendrix', year: 1966, creator: 'Seattle, EE. UU.', genres: ['Rock psicodélico', 'Hard rock', 'Blues'] },
  { name: 'AC/DC', year: 1973, creator: 'Sídney, Australia', genres: ['Hard rock', 'Heavy metal'] },
  { name: 'Deep Purple', year: 1968, creator: 'Hertford, Reino Unido', genres: ['Hard rock', 'Heavy metal'] },
  { name: 'Black Sabbath', year: 1968, creator: 'Birmingham, Reino Unido', genres: ['Heavy metal', 'Doom metal'] },
  { name: 'Guns N\' Roses', year: 1985, creator: 'Los Ángeles, EE. UU.', genres: ['Hard rock', 'Glam metal'] },
  { name: 'Aerosmith', year: 1970, creator: 'Boston, EE. UU.', genres: ['Hard rock', 'Blues rock'] },
  { name: 'Kiss', year: 1973, creator: 'Nueva York, EE. UU.', genres: ['Hard rock', 'Glam rock'] },
  { name: 'Van Halen', year: 1972, creator: 'Pasadena, EE. UU.', genres: ['Hard rock', 'Heavy metal'] },
  { name: 'Scorpions', year: 1965, creator: 'Hannover, Alemania', genres: ['Hard rock', 'Heavy metal'] },
  { name: 'Bon Jovi', year: 1983, creator: 'Nueva Jersey, EE. UU.', genres: ['Hard rock', 'Glam metal'] },
  { name: 'Dire Straits', year: 1977, creator: 'Londres, Reino Unido', genres: ['Roots rock', 'Blues rock'] },
  { name: 'The Police', year: 1977, creator: 'Londres, Reino Unido', genres: ['New wave', 'Post-punk', 'Reggae rock'] },
  { name: 'U2', year: 1976, creator: 'Dublín, Irlanda', genres: ['Rock', 'Post-punk', 'Alt-rock'] },
  { name: 'Bruce Springsteen', year: 1972, creator: 'Nueva Jersey, EE. UU.', genres: ['Heartland rock', 'Folk rock'] },
  { name: 'Tom Petty and the Heartbreakers', year: 1976, creator: 'Florida, EE. UU.', genres: ['Heartland rock', 'Rock'] },
  { name: 'Creedence Clearwater Revival', year: 1967, creator: 'California, EE. UU.', genres: ['Roots rock', 'Swamp rock'] },
  { name: 'The Kinks', year: 1963, creator: 'Londres, Reino Unido', genres: ['Rock', 'British invasion', 'Garage rock'] },
  { name: 'The Beach Boys', year: 1961, creator: 'California, EE. UU.', genres: ['Surf rock', 'Pop psicodélico'] },
  { name: 'The Velvet Underground', year: 1964, creator: 'Nueva York, EE. UU.', genres: ['Art rock', 'Proto-punk'] },
  { name: 'David Bowie', year: 1967, creator: 'Londres, Reino Unido', genres: ['Art rock', 'Glam rock', 'Pop'] },
  { name: 'Bob Dylan', year: 1962, creator: 'Minnesota, EE. UU.', genres: ['Folk rock', 'Poesía'] },
  { name: 'Neil Young', year: 1968, creator: 'Toronto, Canadá', genres: ['Folk rock', 'Country rock', 'Grunge'] },
  { name: 'Fleetwood Mac', year: 1967, creator: 'Londres, Reino Unido', genres: ['Pop rock', 'Soft rock'] },

  // --- METAL & PUNK ---
  { name: 'Metallica', year: 1981, creator: 'Los Ángeles, EE. UU.', genres: ['Thrash metal', 'Heavy metal'] },
  { name: 'Iron Maiden', year: 1975, creator: 'Londres, Reino Unido', genres: ['Heavy metal', 'NWOBHM'] },
  { name: 'Judas Priest', year: 1969, creator: 'Birmingham, Reino Unido', genres: ['Heavy metal'] },
  { name: 'Megadeth', year: 1983, creator: 'Los Ángeles, EE. UU.', genres: ['Thrash metal', 'Speed metal'] },
  { name: 'Slayer', year: 1981, creator: 'Huntington Park, EE. UU.', genres: ['Thrash metal'] },
  { name: 'Pantera', year: 1981, creator: 'Arlington, EE. UU.', genres: ['Groove metal', 'Thrash metal'] },
  { name: 'Slipknot', year: 1995, creator: 'Des Moines, EE. UU.', genres: ['Nu metal', 'Alternative metal'] },
  { name: 'System of a Down', year: 1994, creator: 'Glendale, EE. UU.', genres: ['Alternative metal', 'Nu metal'] },
  { name: 'Rammstein', year: 1994, creator: 'Berlín, Alemania', genres: ['Neue Deutsche Härte', 'Industrial metal'] },
  { name: 'Motorhead', year: 1975, creator: 'Londres, Reino Unido', genres: ['Heavy metal', 'Speed metal', 'Punk rock'] },
  { name: 'The Clash', year: 1976, creator: 'Londres, Reino Unido', genres: ['Punk rock', 'Post-punk', 'Reggae rock'] },
  { name: 'Sex Pistols', year: 1975, creator: 'Londres, Reino Unido', genres: ['Punk rock'] },
  { name: 'Ramones', year: 1974, creator: 'Nueva York, EE. UU.', genres: ['Punk rock'] },
  { name: 'Green Day', year: 1987, creator: 'Rodeo, California, EE. UU.', genres: ['Punk rock', 'Pop punk', 'Alt-rock'] },
  { name: 'Blink-182', year: 1992, creator: 'Poway, California, EE. UU.', genres: ['Pop punk', 'Skate punk'] },
  { name: 'The Offspring', year: 1984, creator: 'Garden Grove, EE. UU.', genres: ['Punk rock', 'Skate punk'] },

  // --- ALT ROCK, GRUNGE, INDIE & BRITPOP ---
  { name: 'Nirvana', year: 1987, creator: 'Aberdeen, EE. UU.', genres: ['Grunge', 'Rock alternativo'] },
  { name: 'Pearl Jam', year: 1990, creator: 'Seattle, EE. UU.', genres: ['Grunge', 'Hard rock'] },
  { name: 'Soundgarden', year: 1984, creator: 'Seattle, EE. UU.', genres: ['Grunge', 'Heavy metal'] },
  { name: 'Alice in Chains', year: 1987, creator: 'Seattle, EE. UU.', genres: ['Grunge', 'Alternative metal'] },
  { name: 'Radiohead', year: 1985, creator: 'Abingdon, Reino Unido', genres: ['Rock alternativo', 'Art rock', 'Electrónica'] },
  { name: 'The Smashing Pumpkins', year: 1988, creator: 'Chicago, EE. UU.', genres: ['Rock alternativo', 'Grunge'] },
  { name: 'Red Hot Chili Peppers', year: 1983, creator: 'Los Ángeles, EE. UU.', genres: ['Funk rock', 'Alt-rock'] },
  { name: 'Foo Fighters', year: 1994, creator: 'Seattle, EE. UU.', genres: ['Post-grunge', 'Hard rock'] },
  { name: 'R.E.M.', year: 1980, creator: 'Athens, Georgia, EE. UU.', genres: ['Alt-rock', 'Jangle pop'] },
  { name: 'The Pixies', year: 1986, creator: 'Boston, EE. UU.', genres: ['Alt-rock', 'Indie rock'] },
  { name: 'Sonic Youth', year: 1981, creator: 'Nueva York, EE. UU.', genres: ['Noise rock', 'Alt-rock'] },
  { name: 'The Cure', year: 1978, creator: 'Crawley, Reino Unido', genres: ['Post-punk', 'Gothic rock', 'New wave'] },
  { name: 'The Smiths', year: 1982, creator: 'Mánchester, Reino Unido', genres: ['Indie pop', 'Post-punk'] },
  { name: 'Joy Division', year: 1976, creator: 'Salford, Reino Unido', genres: ['Post-punk', 'Gothic rock'] },
  { name: 'New Order', year: 1980, creator: 'Salford, Reino Unido', genres: ['Synth-pop', 'Post-punk', 'Alternative dance'] },
  { name: 'Depeche Mode', year: 1980, creator: 'Basildon, Reino Unido', genres: ['Synth-pop', 'Electrónica', 'Rock industrial'] },
  { name: 'Oasis', year: 1991, creator: 'Mánchester, Reino Unido', genres: ['Britpop', 'Rock'] },
  { name: 'Blur', year: 1988, creator: 'Londres, Reino Unido', genres: ['Britpop', 'Alt-rock'] },
  { name: 'Pulp', year: 1978, creator: 'Sheffield, Reino Unido', genres: ['Britpop', 'Glam rock'] },
  { name: 'Coldplay', year: 1997, creator: 'Londres, Reino Unido', genres: ['Pop rock', 'Alt-rock'] },
  { name: 'Muse', year: 1994, creator: 'Teignmouth, Reino Unido', genres: ['Rock alternativo', 'Space rock'] },
  { name: 'Arctic Monkeys', year: 2002, creator: 'Sheffield, Reino Unido', genres: ['Indie rock', 'Garage rock'] },
  { name: 'The Strokes', year: 1998, creator: 'Nueva York, EE. UU.', genres: ['Indie rock', 'Garage rock'] },
  { name: 'The White Stripes', year: 1997, creator: 'Detroit, EE. UU.', genres: ['Garage rock revival', 'Blues rock'] },
  { name: 'The Killers', year: 2001, creator: 'Las Vegas, EE. UU.', genres: ['Indie rock', 'Synth-pop'] },
  { name: 'Franz Ferdinand', year: 2002, creator: 'Glasgow, Escocia', genres: ['Post-punk revival', 'Indie rock'] },
  { name: 'Kings of Leon', year: 1999, creator: 'Nashville, EE. UU.', genres: ['Southern rock', 'Indie rock'] },
  { name: 'The Black Keys', year: 2001, creator: 'Akron, Ohio, EE. UU.', genres: ['Garage rock', 'Blues rock'] },
  { name: 'Arcade Fire', year: 2001, creator: 'Montreal, Canadá', genres: ['Indie rock', 'Art rock'] },
  { name: 'Interpol', year: 1997, creator: 'Nueva York, EE. UU.', genres: ['Post-punk revival', 'Indie rock'] },
  { name: 'Vampire Weekend', year: 2006, creator: 'Nueva York, EE. UU.', genres: ['Indie pop', 'Afropop'] },
  { name: 'Florence + The Machine', year: 2007, creator: 'Londres, Reino Unido', genres: ['Indie rock', 'Art pop'] },
  { name: 'The National', year: 1999, creator: 'Cincinnati, EE. UU.', genres: ['Indie rock', 'Post-punk'] },
  { name: 'Linkin Park', year: 1996, creator: 'Agoura Hills, EE. UU.', genres: ['Nu metal', 'Alternative rock'] },
  { name: 'Gorillaz', year: 1998, creator: 'Londres, Reino Unido', genres: ['Hip hop alternativo', 'Electrónica', 'Art pop'] },
  { name: 'Massive Attack', year: 1988, creator: 'Bristol, Reino Unido', genres: ['Trip hop', 'Electrónica'] },
  { name: 'Portishead', year: 1991, creator: 'Bristol, Reino Unido', genres: ['Trip hop', 'Downtempo'] },
  { name: 'Björk', year: 1977, creator: 'Reikiavik, Islandia', genres: ['Art pop', 'Electrónica', 'Avant-garde'] },

  // --- POP, SOUL, R&B & FUNK ---
  { name: 'Michael Jackson', year: 1971, creator: 'Indiana, EE. UU.', genres: ['Pop', 'R&B', 'Funk'] },
  { name: 'Madonna', year: 1982, creator: 'Bay City, Michigan, EE. UU.', genres: ['Pop', 'Dance-pop'] },
  { name: 'Prince', year: 1978, creator: 'Minneapolis, EE. UU.', genres: ['Funk', 'Pop rock', 'R&B'] },
  { name: 'Stevie Wonder', year: 1961, creator: 'Michigan, EE. UU.', genres: ['Soul', 'Funk', 'R&B'] },
  { name: 'Elton John', year: 1969, creator: 'Londres, Reino Unido', genres: ['Pop rock', 'Glam rock'] },
  { name: 'Whitney Houston', year: 1985, creator: 'Newark, EE. UU.', genres: ['Pop', 'Soul', 'R&B'] },
  { name: 'George Michael', year: 1982, creator: 'Londres, Reino Unido', genres: ['Pop', 'Soul', 'Post-disco'] },
  { name: 'Aretha Franklin', year: 1956, creator: 'Memphis, EE. UU.', genres: ['Soul', 'Gospel', 'R&B'] },
  { name: 'Marvin Gaye', year: 1961, creator: 'Washington D.C., EE. UU.', genres: ['Soul', 'R&B', 'Motown'] },
  { name: 'Otis Redding', year: 1960, creator: 'Georgia, EE. UU.', genres: ['Soul', 'Southern soul'] },
  { name: 'Ray Charles', year: 1949, creator: 'Georgia, EE. UU.', genres: ['Soul', 'R&B', 'Blues'] },
  { name: 'James Brown', year: 1956, creator: 'Carolina del Sur, EE. UU.', genres: ['Funk', 'Soul', 'R&B'] },
  { name: 'Amy Winehouse', year: 2003, creator: 'Londres, Reino Unido', genres: ['Soul', 'R&B', 'Jazz'] },
  { name: 'Adele', year: 2008, creator: 'Londres, Reino Unido', genres: ['Pop', 'Soul'] },
  { name: 'Beyoncé', year: 1997, creator: 'Houston, EE. UU.', genres: ['R&B', 'Pop', 'Hip hop'] },
  { name: 'Taylor Swift', year: 2006, creator: 'Pensilvania, EE. UU.', genres: ['Pop', 'Country', 'Folk-pop'] },
  { name: 'Rihanna', year: 2005, creator: 'Saint Michael, Barbados', genres: ['Pop', 'R&B', 'Dancehall'] },
  { name: 'Lady Gaga', year: 2008, creator: 'Nueva York, EE. UU.', genres: ['Pop', 'Dance-pop', 'Electro'] },
  { name: 'Katy Perry', year: 2001, creator: 'California, EE. UU.', genres: ['Pop', 'Dance-pop'] },
  { name: 'Bruno Mars', year: 2010, creator: 'Honolulu, Hawái, EE. UU.', genres: ['Pop', 'Funk', 'R&B'] },
  { name: 'Dua Lipa', year: 2015, creator: 'Londres, Reino Unido', genres: ['Pop', 'Nu-disco', 'Dance-pop'] },
  { name: 'Billie Eilish', year: 2015, creator: 'Los Ángeles, EE. UU.', genres: ['Alt-pop', 'Electropop'] },
  { name: 'Harry Styles', year: 2010, creator: 'Redditch, Reino Unido', genres: ['Pop rock', 'Soft rock'] },
  { name: 'The Weeknd', year: 2010, creator: 'Toronto, Canadá', genres: ['R&B alternativo', 'Synth-pop'] },
  { name: 'Frank Ocean', year: 2011, creator: 'Nueva Orleans, EE. UU.', genres: ['R&B alternativo', 'Neo-soul'] },
  { name: 'SZA', year: 2012, creator: 'San Luis, Misuri, EE. UU.', genres: ['Neo-soul', 'R&B'] },
  { name: 'Lana Del Rey', year: 2011, creator: 'Nueva York, EE. UU.', genres: ['Dream pop', 'Baroque pop'] },
  { name: 'Lorde', year: 2013, creator: 'Auckland, Nueva Zelanda', genres: ['Art pop', 'Electropop'] },
  { name: 'Sia', year: 1997, creator: 'Adelaida, Australia', genres: ['Pop', 'Electropop'] },
  { name: 'Ed Sheeran', year: 2011, creator: 'Halifax, Reino Unido', genres: ['Pop', 'Folk-pop'] },
  { name: 'Sam Smith', year: 2013, creator: 'Londres, Reino Unido', genres: ['Pop', 'Soul'] },
  { name: 'Alicia Keys', year: 2001, creator: 'Nueva York, EE. UU.', genres: ['R&B', 'Soul', 'Neo-soul'] },
  { name: 'John Legend', year: 2004, creator: 'Springfield, Ohio, EE. UU.', genres: ['R&B', 'Soul'] },
  { name: 'Justin Timberlake', year: 1995, creator: 'Memphis, EE. UU.', genres: ['Pop', 'R&B'] },

  // --- HIP HOP & RAP ---
  { name: 'Tupac Shakur', year: 1989, creator: 'Nueva York, EE. UU.', genres: ['West coast hip hop', 'Gangsta rap'] },
  { name: 'The Notorious B.I.G.', year: 1992, creator: 'Nueva York, EE. UU.', genres: ['East coast hip hop', 'Gangsta rap'] },
  { name: 'Eminem', year: 1996, creator: 'Detroit, EE. UU.', genres: ['Hip hop', 'Hardcore hip hop'] },
  { name: 'Kendrick Lamar', year: 2004, creator: 'Compton, EE. UU.', genres: ['Hip hop', 'Conscious rap'] },
  { name: 'Kanye West', year: 1996, creator: 'Chicago, EE. UU.', genres: ['Hip hop', 'Art pop'] },
  { name: 'Jay-Z', year: 1986, creator: 'Nueva York, EE. UU.', genres: ['East coast hip hop'] },
  { name: 'Nas', year: 1991, creator: 'Nueva York, EE. UU.', genres: ['East coast hip hop'] },
  { name: 'Snoop Dogg', year: 1992, creator: 'Long Beach, California, EE. UU.', genres: ['West coast hip hop', 'G-funk'] },
  { name: 'Dr. Dre', year: 1985, creator: 'Compton, EE. UU.', genres: ['West coast hip hop', 'G-funk'] },
  { name: 'Wu-Tang Clan', year: 1992, creator: 'Staten Island, Nueva York, EE. UU.', genres: ['Hardcore hip hop'] },
  { name: 'Outkast', year: 1992, creator: 'Atlanta, EE. UU.', genres: ['Southern hip hop', 'Dirty south'] },
  { name: 'A Tribe Called Quest', year: 1985, creator: 'Nueva York, EE. UU.', genres: ['Jazz rap', 'Alternative hip hop'] },
  { name: 'Beastie Boys', year: 1981, creator: 'Nueva York, EE. UU.', genres: ['Hip hop', 'Rap rock'] },
  { name: 'Drake', year: 2006, creator: 'Toronto, Canadá', genres: ['Hip hop', 'R&B', 'Pop rap'] },
  { name: 'Travis Scott', year: 2008, creator: 'Houston, EE. UU.', genres: ['Trap', 'Psychedelic rap'] },
  { name: 'J. Cole', year: 2007, creator: 'Fayetteville, Carolina del Norte, EE. UU.', genres: ['Hip hop', 'Conscious rap'] },
  { name: 'Tyler, The Creator', year: 2007, creator: 'Los Ángeles, EE. UU.', genres: ['Alternative hip hop', 'Neo-soul'] },
  { name: 'Post Malone', year: 2015, creator: 'Syracuse, Nueva York, EE. UU.', genres: ['Pop rap', 'Hip hop', 'Country'] },
  { name: 'Mac Miller', year: 2007, creator: 'Pittsburgh, EE. UU.', genres: ['Hip hop', 'Jazz rap'] },
  { name: 'MF DOOM', year: 1988, creator: 'Londres / Nueva York', genres: ['Underground hip hop', 'Abstract hip hop'] },

  // --- ELECTRÓNICA & DANCE ---
  { name: 'Daft Punk', year: 1993, creator: 'París, Francia', genres: ['Electrónica', 'French house', 'Disco'] },
  { name: 'The Chemical Brothers', year: 1989, creator: 'Manchester, Reino Unido', genres: ['Big beat', 'Electrónica'] },
  { name: 'The Prodigy', year: 1990, creator: 'Braintree, Reino Unido', genres: ['Big beat', 'Electronic rock'] },
  { name: 'Kraftwerk', year: 1970, creator: 'Düsseldorf, Alemania', genres: ['Krautrock', 'Synth-pop', 'Electro'] },
  { name: 'Aphex Twin', year: 1985, creator: 'Cornualles, Reino Unido', genres: ['IDM', 'Ambient techno', 'Drill and bass'] },
  { name: 'Brian Eno', year: 1970, creator: 'Suffolk, Reino Unido', genres: ['Ambient', 'Art rock', 'Glam rock'] },
  { name: 'Moby', year: 1989, creator: 'Nueva York, EE. UU.', genres: ['Electrónica', 'Downtempo', 'Ambient'] },
  { name: 'Fatboy Slim', year: 1979, creator: 'Bromley, Reino Unido', genres: ['Big beat', 'Acid house'] },
  { name: 'Justice', year: 2003, creator: 'París, Francia', genres: ['French house', 'Electro house'] },
  { name: 'Avicii', year: 2008, creator: 'Estocolmo, Suecia', genres: ['EDM', 'Progressive house'] },
  { name: 'Calvin Harris', year: 2002, creator: 'Dumfries, Escocia', genres: ['EDM', 'Electro house', 'Dance-pop'] },
  { name: 'David Guetta', year: 1984, creator: 'París, Francia', genres: ['Dance-pop', 'EDM'] },
  { name: 'Deadmau5', year: 1998, creator: 'Niagara Falls, Canadá', genres: ['Progressive house', 'Electro house'] },
  { name: 'Skrillex', year: 2004, creator: 'Los Ángeles, EE. UU.', genres: ['Dubstep', 'EDM', 'Trap'] },
  { name: 'Tiësto', year: 1994, creator: 'Breda, Países Bajos', genres: ['Trance', 'EDM'] },
  { name: 'Bonobo', year: 1999, creator: 'Brighton, Reino Unido', genres: ['Downtempo', 'Trip hop', 'Nu-jazz'] },
  { name: 'Four Tet', year: 1997, creator: 'Londres, Reino Unido', genres: ['Folktronica', 'Microhouse', 'IDM'] },
  { name: 'Burial', year: 2005, creator: 'Londres, Reino Unido', genres: ['Future garage', 'Dubstep', 'Ambient'] },

  // --- ESPAÑA & HISPANOHABLANTE (Música en español) ---
  { name: 'Rosalía', year: 2017, creator: 'Barcelona, España', genres: ['Nuevo flamenco', 'Art pop', 'Urbano'] },
  { name: 'C. Tangana', year: 2006, creator: 'Madrid, España', genres: ['Música latina', 'Pop', 'Flamenco urbano'] },
  { name: 'Extremoduro', year: 1987, creator: 'Plasencia, España', genres: ['Rock transgresivo', 'Hard rock'] },
  { name: 'Héroes del Silencio', year: 1984, creator: 'Zaragoza, España', genres: ['Rock en español', 'Hard rock'] },
  { name: 'Estopa', year: 1999, creator: 'Cornellà de Llobregat, España', genres: ['Rumba rock', 'Pop rock'] },
  { name: 'Joaquín Sabina', year: 1978, creator: 'Úbeda, España', genres: ['Canción de autor', 'Rock'] },
  { name: 'Joan Manuel Serrat', year: 1965, creator: 'Barcelona, España', genres: ['Nova Cançó', 'Canción de autor'] },
  { name: 'Vetusta Morla', year: 1998, creator: 'Tres Cantos, España', genres: ['Indie rock', 'Pop rock'] },
  { name: 'Fito & Fitipaldis', year: 1998, creator: 'Bilbao, España', genres: ['Rock and roll', 'Blues rock'] },
  { name: 'Love of Lesbian', year: 1997, creator: 'Sant Vicenç dels Horts, España', genres: ['Indie pop', 'Indie rock'] },
  { name: 'Los Planetas', year: 1992, creator: 'Granada, España', genres: ['Indie rock', 'Noise pop', 'Psicodelia'] },
  { name: 'Triana', year: 1974, creator: 'Sevilla, España', genres: ['Rock andaluz', 'Rock progresivo', 'Flamenco'] },
  { name: 'Camarón de la Isla', year: 1969, creator: 'San Fernando, España', genres: ['Flamenco', 'Nuevo flamenco'] },
  { name: 'Paco de Lucía', year: 1958, creator: 'Algeciras, España', genres: ['Guitarra flamenca', 'Flamenco jazz'] },
  { name: 'Mecano', year: 1981, creator: 'Madrid, España', genres: ['Tecno-pop', 'Pop rock', 'New wave'] },
  { name: 'Bunbury', year: 1997, creator: 'Zaragoza, España', genres: ['Rock en español', 'Cabaret pop'] },
  { name: 'Manolo García', year: 1980, creator: 'Barcelona, España', genres: ['Pop rock español', 'Rumba'] },
  { name: 'El Último de la Fila', year: 1984, creator: 'Barcelona, España', genres: ['Pop rock', 'Rumba catalana'] },
  { name: 'Platero y Tú', year: 1989, creator: 'Bilbao, España', genres: ['Rock and roll', 'Hard rock'] },
  { name: 'Marea', year: 1997, creator: 'Berriozar, Navarra, España', genres: ['Hard rock', 'Rock urbano'] },
  { name: 'Robe', year: 2015, creator: 'Plasencia, España', genres: ['Rock transgresivo', 'Rock sinfónico'] },
  { name: 'Leiva', year: 2012, creator: 'Madrid, España', genres: ['Pop rock', 'Rock en español'] },
  { name: 'Pereza', year: 2001, creator: 'Madrid, España', genres: ['Pop rock', 'Glam rock'] },
  { name: 'Melendi', year: 2001, creator: 'Oviedo, España', genres: ['Rumba pop', 'Pop rock'] },
  { name: 'Amaral', year: 1992, creator: 'Zaragoza, España', genres: ['Pop rock', 'Folk rock'] },
  { name: 'Lori Meyers', year: 1998, creator: 'Loja, Granada, España', genres: ['Indie pop', 'Indie rock'] },
  { name: 'Izal', year: 2010, creator: 'Madrid, España', genres: ['Indie pop', 'Pop rock'] },
  { name: 'Arde Bogotá', year: 2017, creator: 'Cartagena, España', genres: ['Rock alternativo', 'Indie rock'] },
  { name: 'Viva Suecia', year: 2013, creator: 'Murcia, España', genres: ['Indie rock'] },
  { name: 'Shinova', year: 2008, creator: 'Bérriz, Vizcaya, España', genres: ['Indie rock', 'Pop rock'] },
  { name: 'La Oreja de Van Gogh', year: 1996, creator: 'San Sebastián, España', genres: ['Pop', 'Pop rock'] },
  { name: 'Alejandro Sanz', year: 1989, creator: 'Madrid, España', genres: ['Pop latino', 'Balada', 'Flamenco pop'] },
  { name: 'Pablo Alborán', year: 2010, creator: 'Málaga, España', genres: ['Pop latino', 'Balada'] },
  { name: 'Kase.O', year: 1993, creator: 'Zaragoza, España', genres: ['Rap', 'Hip hop en español'] },
  { name: 'Violadores del Verso', year: 1998, creator: 'Zaragoza, España', genres: ['Rap', 'Hardcore hip hop'] },
  { name: 'SFDK', year: 1993, creator: 'Sevilla, España', genres: ['Rap', 'Hip hop en español'] },
  { name: 'Ayax y Prok', year: 2014, creator: 'Granada, España', genres: ['Rap hardcore', 'Hip hop'] },
  { name: 'Natos y Waor', year: 2010, creator: 'Madrid, España', genres: ['Rap', 'Hip hop underground'] },
  { name: 'Quevedo', year: 2020, creator: 'Las Palmas de Gran Canaria, España', genres: ['Urbano', 'Reggaeton', 'Trap'] },
  { name: 'Saiko', year: 2019, creator: 'Armilla, Granada, España', genres: ['Urbano', 'Trap', 'Reggaeton'] },
  { name: 'Bad Gyal', year: 2016, creator: 'Vilassar de Mar, España', genres: ['Dancehall', 'Reggaeton', 'Trap'] },
  { name: 'Rigoberta Bandini', year: 2020, creator: 'Barcelona, España', genres: ['Electropop', 'Indie pop'] },
  { name: 'Zahara', year: 2005, creator: 'Úbeda, España', genres: ['Indie pop', 'Electrónica'] },

  // --- LATINOAMÉRICA & URBANO ---
  { name: 'Bad Bunny', year: 2016, creator: 'Vega Baja, Puerto Rico', genres: ['Reggaeton', 'Trap latino', 'Pop'] },
  { name: 'Shakira', year: 1990, creator: 'Barranquilla, Colombia', genres: ['Pop latino', 'Pop rock'] },
  { name: 'Soda Stereo', year: 1982, creator: 'Buenos Aires, Argentina', genres: ['Rock en español', 'New wave', 'Post-punk'] },
  { name: 'Gustavo Cerati', year: 1993, creator: 'Buenos Aires, Argentina', genres: ['Rock alternativo', 'Electrónica'] },
  { name: 'Charly García', year: 1972, creator: 'Buenos Aires, Argentina', genres: ['Rock argentino', 'Sinfónico'] },
  { name: 'Fito Páez', year: 1984, creator: 'Rosario, Argentina', genres: ['Rock en español', 'Pop rock'] },
  { name: 'Spinetta', year: 1967, creator: 'Buenos Aires, Argentina', genres: ['Rock argentino', 'Jazz fusion'] },
  { name: 'Caifanes', year: 1987, creator: 'Ciudad de México, México', genres: ['Rock en español', 'Gothic rock'] },
  { name: 'Café Tacvba', year: 1989, creator: 'Ciudad Satélite, México', genres: ['Rock alternativo', 'Folk latino'] },
  { name: 'Molotov', year: 1995, creator: 'Ciudad de México, México', genres: ['Rap rock', 'Rock en español'] },
  { name: 'Los Fabulosos Cadillacs', year: 1985, creator: 'Buenos Aires, Argentina', genres: ['Ska', 'Rock latino'] },
  { name: 'Los Enanitos Verdes', year: 1979, creator: 'Mendoza, Argentina', genres: ['Rock en español', 'Pop rock'] },
  { name: 'Andrés Calamaro', year: 1982, creator: 'Buenos Aires, Argentina', genres: ['Rock en español', 'Canción de autor'] },
  { name: 'Los Rodríguez', year: 1990, creator: 'Madrid, España', genres: ['Rock and roll', 'Rumba rock'] },
  { name: 'Bizarrap', year: 2018, creator: 'Ramos Mejía, Argentina', genres: ['Trap', 'Electronic dance', 'Urbano'] },
  { name: 'Duki', year: 2016, creator: 'Buenos Aires, Argentina', genres: ['Trap latino', 'Hip hop'] },
  { name: 'Rauw Alejandro', year: 2014, creator: 'San Juan, Puerto Rico', genres: ['R&B latino', 'Reggaeton'] },
  { name: 'J Balvin', year: 2007, creator: 'Medellín, Colombia', genres: ['Reggaeton', 'Pop urbano'] },
  { name: 'Daddy Yankee', year: 1992, creator: 'San Juan, Puerto Rico', genres: ['Reggaeton', 'Urbano'] },
  { name: 'Don Omar', year: 1999, creator: 'Carolina, Puerto Rico', genres: ['Reggaeton', 'Urbano'] },
  { name: 'Residente', year: 2004, creator: 'San Juan, Puerto Rico', genres: ['Hip hop', 'Música latina'] },
  { name: 'Calle 13', year: 2004, creator: 'San Juan, Puerto Rico', genres: ['Hip hop', 'Música urbana'] },
  { name: 'Juanes', year: 2000, creator: 'Medellín, Colombia', genres: ['Pop rock latino', 'Cumbia'] },
  { name: 'Carlos Vives', year: 1986, creator: 'Santa Marta, Colombia', genres: ['Vallenato pop', 'Cumbia'] },
  { name: 'Luis Miguel', year: 1982, creator: 'San Juan / México', genres: ['Bolero', 'Pop latino', 'Mariachi'] },
  { name: 'Ricky Martin', year: 1984, creator: 'San Juan, Puerto Rico', genres: ['Pop latino', 'Dance-pop'] },
  { name: 'Mon Laferte', year: 2003, creator: 'Viña del Mar, Chile', genres: ['Bolero', 'Rock alternativo', 'Pop'] },
  { name: 'Natalia Lafourcade', year: 2002, creator: 'Coatepec, Veracruz, México', genres: ['Folk latino', 'Indie pop'] },
  { name: 'Jorge Drexler', year: 1992, creator: 'Montevideo, Uruguay', genres: ['Canción de autor', 'Pop alternativo'] },
  { name: 'Silvio Rodríguez', year: 1967, creator: 'San Antonio de los Baños, Cuba', genres: ['Nueva Trova', 'Canción de autor'] },
  { name: 'Mercedes Sosa', year: 1959, creator: 'Tucumán, Argentina', genres: ['Folclore argentino', 'Nueva Canción'] },

  // --- JAZZ & BLUES ---
  { name: 'Miles Davis', year: 1944, creator: 'Illinois, EE. UU.', genres: ['Jazz', 'Cool jazz', 'Jazz fusion'] },
  { name: 'John Coltrane', year: 1955, creator: 'Carolina del Norte, EE. UU.', genres: ['Modal jazz', 'Free jazz', 'Hard bop'] },
  { name: 'Louis Armstrong', year: 1923, creator: 'Nueva Orleans, EE. UU.', genres: ['Dixieland', 'Traditional jazz', 'Swing'] },
  { name: 'Billie Holiday', year: 1933, creator: 'Filadelfia, EE. UU.', genres: ['Vocal jazz', 'Blues', 'Swing'] },
  { name: 'Ella Fitzgerald', year: 1934, creator: 'Virginia, EE. UU.', genres: ['Vocal jazz', 'Bebop', 'Swing'] },
  { name: 'Nina Simone', year: 1954, creator: 'Carolina del Norte, EE. UU.', genres: ['Jazz', 'Soul', 'Civil rights songs'] },
  { name: 'Chet Baker', year: 1952, creator: 'Oklahoma, EE. UU.', genres: ['Cool jazz', 'West coast jazz'] },
  { name: 'Thelonious Monk', year: 1944, creator: 'Carolina del Norte, EE. UU.', genres: ['Bebop', 'Hard bop'] },
  { name: 'Charles Mingus', year: 1945, creator: 'Arizona, EE. UU.', genres: ['Post-bop', 'Avant-garde jazz'] },
  { name: 'Herbie Hancock', year: 1961, creator: 'Chicago, EE. UU.', genres: ['Post-bop', 'Jazz-funk', 'Jazz fusion'] },
  { name: 'B.B. King', year: 1949, creator: 'Misisipi, EE. UU.', genres: ['Electric blues', 'Blues rock'] },
  { name: 'Muddy Waters', year: 1941, creator: 'Misisipi, EE. UU.', genres: ['Chicago blues', 'Delta blues'] },
  { name: 'Robert Johnson', year: 1936, creator: 'Misisipi, EE. UU.', genres: ['Delta blues'] },
  { name: 'Buddy Guy', year: 1953, creator: 'Luisiana, EE. UU.', genres: ['Chicago blues', 'Blues rock'] },
  { name: 'Stevie Ray Vaughan', year: 1978, creator: 'Dallas, Texas, EE. UU.', genres: ['Texas blues', 'Blues rock'] },

  // --- CLÁSICA & BANDAS SONORAS ---
  { name: 'Hans Zimmer', year: 1977, creator: 'Frankfurt, Alemania', genres: ['Banda sonora', 'Clásica cinematográfica'] },
  { name: 'Ennio Morricone', year: 1946, creator: 'Roma, Italia', genres: ['Banda sonora', 'Spaghetti western'] },
  { name: 'John Williams', year: 1958, creator: 'Nueva York, EE. UU.', genres: ['Banda sonora', 'Música orquestal'] },
  { name: 'Ludovico Einaudi', year: 1980, creator: 'Turín, Italia', genres: ['Neoclásica', 'Minimalismo', 'Piano'] },
  { name: 'Max Richter', year: 1996, creator: 'Hamelín, Alemania', genres: ['Post-minimalismo', 'Neoclásica'] },
  { name: 'Howard Shore', year: 1970, creator: 'Toronto, Canadá', genres: ['Banda sonora', 'Música orquestal'] },
  { name: 'Ryuichi Sakamoto', year: 1978, creator: 'Tokio, Japón', genres: ['Neoclásica', 'Electrónica', 'Banda sonora'] },
  { name: 'Joe Hisaishi', year: 1981, creator: 'Nakano, Japón', genres: ['Banda sonora', 'Ghibli', 'Orquestal'] },
  { name: 'Yann Tiersen', year: 1995, creator: 'Brest, Francia', genres: ['Neoclásica', 'Folk', 'Banda sonora'] },
  { name: 'Johann Sebastian Bach', year: 1708, creator: 'Eisenach, Alemania', genres: ['Barroco', 'Música sacra'] },
  { name: 'Wolfgang Amadeus Mozart', year: 1761, creator: 'Salzburgo, Austria', genres: ['Clasicismo', 'Ópera', 'Música de cámara'] },
  { name: 'Ludwig van Beethoven', year: 1792, creator: 'Bonn, Alemania', genres: ['Clasicismo', 'Romanticismo', 'Sinfónico'] },
  { name: 'Frédéric Chopin', year: 1830, creator: 'Żelazowa Wola, Polonia', genres: ['Romanticismo', 'Piano'] },
  { name: 'Piotr Ilich Chaikovski', year: 1865, creator: 'Vótkinsk, Rusia', genres: ['Romanticismo', 'Ballet', 'Sinfónico'] },
  { name: 'Claude Debussy', year: 1890, creator: 'Saint-Germain-en-Laye, Francia', genres: ['Impresionismo', 'Música moderna'] },
  { name: 'Antonio Vivaldi', year: 1703, creator: 'Venecia, Italia', genres: ['Barroco', 'Concierto'] },
]

export async function enrichAndExpandArtists() {
  console.log(`\n--- Enriqueciendo y ampliando a ${ARTISTS_CATALOG.length} Artistas con Deezer API ---`)
  const artists = []
  const seenTitles = new Set()
  const seenIds = new Set()

  for (let idx = 0; idx < ARTISTS_CATALOG.length; idx++) {
    const a = ARTISTS_CATALOG[idx]
    const titleLower = a.name.toLowerCase().trim()
    if (seenTitles.has(titleLower)) continue

    let slug = `artist:${slugify(a.name)}-${a.year}`
    if (seenIds.has(slug)) slug = `artist:${slugify(a.name)}-${a.year}-${idx}`

    let posterUrl = null
    try {
      const q = a.name
      const res = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const d = await res.json()
        const first = d.data?.[0]
        if (first?.picture_big || first?.picture_medium) {
          posterUrl = first.picture_big || first.picture_medium
        }
      }
      await sleep(60)
    } catch (e) {
      // fallback
    }

    const synopsis = `${a.name} (${a.creator}), icono de ${a.genres.join(', ')} desde ${a.year}.`

    artists.push({
      id: slug,
      type: 'artist',
      title: a.name,
      year: a.year,
      creator: a.creator,
      genres: a.genres,
      synopsis,
      posterUrl,
      popularity: 90,
    })

    seenTitles.add(titleLower)
    seenIds.add(slug)

    if ((idx + 1) % 25 === 0 || idx === ARTISTS_CATALOG.length - 1) {
      console.log(`[Artistas] Procesados ${idx + 1}/${ARTISTS_CATALOG.length} (${artists.filter((x) => x.posterUrl).length} con foto HD)`)
    }
  }

  return artists
}

async function run() {
  const artists = await enrichAndExpandArtists()
  const currentSeed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const otherItems = (currentSeed.items || []).filter((i) => i.type !== 'artist')
  currentSeed.items = [...otherItems, ...artists]
  writeFileSync(SEED_FILE, JSON.stringify(currentSeed))
  console.log(`\nseed.json actualizado con ${artists.length} artistas (${artists.filter((a) => a.posterUrl).length} con foto Deezer)!`)
}

run().catch(console.error)
