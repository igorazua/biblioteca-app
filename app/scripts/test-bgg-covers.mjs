async function testOg() {
  const games = [
    { id: 'boardgame:scout-2019', bggId: 291453, name: 'SCOUT' },
    { id: 'boardgame:ark-nova-2021', bggId: 342942, name: 'Ark Nova' },
    { id: 'boardgame:inis-2016', bggId: 155821, name: 'Inis' },
    { id: 'boardgame:kemet-2012', bggId: 127023, name: 'Kemet' },
    { id: 'boardgame:cyclades-2009', bggId: 54998, name: 'Cyclades' },
    { id: 'boardgame:love-letter-2019', bggId: 129622, name: 'Love Letter' },
    { id: 'boardgame:oath-2021', bggId: 291572, name: 'Oath' },
    { id: 'boardgame:through-the-desert-1998', bggId: 503, name: 'Through the Desert' },
    { id: 'boardgame:next-station-london-2022', bggId: 353545, name: 'Next Station: London' },
    { id: 'boardgame:descent-journeys-in-the-dark-2005', bggId: 17226, name: 'Descent' },
    { id: 'boardgame:villagers-2019', bggId: 241724, name: 'Villagers' },
    { id: 'boardgame:cards-against-humanity-2009', bggId: 50381, name: 'Cards Against Humanity' },
    { id: 'boardgame:risk-1959', bggId: 181, name: 'Risk' },
    { id: 'boardgame:monopoly-1935', bggId: 1406, name: 'Monopoly' },
    { id: 'boardgame:exploding-kittens-2015', bggId: 172225, name: 'Exploding Kittens' },
    { id: 'boardgame:trivial-pursuit-1981', bggId: 2950, name: 'Trivial Pursuit' },
    { id: 'boardgame:parchis-1900', bggId: 2139, name: 'Parchís' },
    { id: 'boardgame:cluedo-1949', bggId: 1293, name: 'Cluedo' }
  ];

  for (const g of games) {
    try {
      const pageUrl = `https://boardgamegeek.com/boardgame/${g.bggId}`;
      const res = await fetch(pageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      });
      if (res.ok) {
        const html = await res.text();
        const m = html.match(/property="og:image"\s+content="([^"]+)"/);
        console.log(g.name, m ? m[1] : 'NO OG IMAGE');
      } else {
        console.log(g.name, 'HTTP', res.status);
      }
    } catch (e) {
      console.log(g.name, 'ERR', e.message);
    }
  }
}

testOg();
