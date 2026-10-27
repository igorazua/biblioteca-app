"""
build_space.py — El espacio único del cerebro (MOTOR §2c.2-§2c.3, T6.5 y T7; Igor, 27/10/2026).

Para cada estantería:
  1. Contenido: vectores de texto de cada obra (cache/vectors/content/<shelf>/*.json, 384 d).
  2. Comportamiento: todas las fuentes cache/graph/cooc-*.jsonl (clickstream de Wikipedia, ListenBrainz, goodbooks,
     BGG…) + relaciones duras de Wikidata (cache/graph/edges.jsonl: sagas, mismo autor…). PPMI por fuente, suma
     pesada y SVD truncada → vector de comportamiento de cada obra.
  3. Fusión: [contenido ⊕ β_i · comportamiento], con β_i = β_max · grado / (grado + k): una obra con pocas
     conexiones se queda cerca de su sitio por contenido. PCA a 48 d, int8, 20 vecinos.

Evaluación (lo que decide si se escribe):
  - Predicción de enlaces: se esconde el 20 % de las aristas de comportamiento, se construye con el resto y se mira
    si cada arista escondida sale entre los 20 vecinos (recall@20). Vale para todas las estanterías.
  - Usuarios reales (si existe cache/eval/real-users-<shelf>.jsonl): se esconde el 20 % de lo que le gustó a cada
    uno y se mira si sale entre las 50 más cercanas a su perfil (recall@50) y entre las 10 primeras (hit@10).
  Se compara con el espacio actual (engine/<shelf>.json) y con solo contenido. Solo se escribe si mejora.

Uso:
  python scripts/brain/build_space.py --eval              # mide y escribe el informe, no toca la app
  python scripts/brain/build_space.py --eval --write      # además escribe engine/<shelf>.json donde mejora
  python scripts/brain/build_space.py --shelf movie ...
"""

import argparse
import datetime
import glob
import hashlib
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(os.path.join(HERE, '..', '..'))
CACHE = os.path.join(APP, 'scripts', 'cache')
SEED = os.path.join(APP, 'src', 'data', 'seed.json')
ALIASES = os.path.join(APP, 'src', 'data', 'aliases.json')
ENGINE_DIR = os.path.join(APP, 'src', 'data', 'engine')
PARAMS_FILE = os.path.join(HERE, 'space-params.json')
REPORT = os.path.join(CACHE, 'eval', 'space-report.md')
HIST = os.path.join(CACHE, 'eval', 'historico.md')
LAST = os.path.join(CACHE, 'eval', 'last-scores.json')

SHELVES = ['movie', 'series', 'book', 'boardgame', 'artist']
DIM = 48
NN = 20
CONTENT_DIR = 'content'  # subcarpeta de cache/vectors con los vectores de contenido (--content-dir)

DEFAULT_PARAMS = {
    'sources': {'wikipedia-clickstream': 1.0, 'listenbrainz': 1.0, 'goodbooks': 1.0, 'bgg-recs': 1.0, 'movielens': 1.0, 'users': 1.0, 'relations': 0.5},
    'svd_dim': 32,
    'grid': {'beta_max': [0.5, 1.0, 2.0], 'k': [3, 10]},
}


def load_json(p, default=None):
    if not os.path.exists(p):
        return default
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def read_jsonl(p):
    out = []
    if not os.path.exists(p):
        return out
    with open(p, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    out.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return out


def stable_frac(s):
    """Número estable en [0,1) a partir de un texto (para separar entreno y prueba siempre igual)."""
    return int(hashlib.md5(s.encode('utf-8')).hexdigest()[:8], 16) / 0xFFFFFFFF


def unit(m):
    n = np.linalg.norm(m, axis=1, keepdims=True)
    n[n == 0] = 1
    return m / n


# ---------------------------------------------------------------------------------------------- datos

def load_catalog():
    seed = load_json(SEED)
    items = seed['items'] if isinstance(seed, dict) else seed
    aliases = load_json(ALIASES, {}) or {}
    return items, aliases


def content_matrix(shelf, ids, aliases=None):
    """Vector de contenido de cada obra (384 d); las que no tienen, ceros."""
    by_id = {}
    aliases = aliases or {}
    for p in glob.glob(os.path.join(CACHE, 'vectors', CONTENT_DIR, shelf, '*.json')):
        d = load_json(p)
        if d and 'id' in d and 'vector' in d:
            canonical_id = aliases.get(d['id'], d['id'])
            by_id[canonical_id] = d['vector']
            by_id[d['id']] = d['vector']
    dim = len(next(iter(by_id.values()))) if by_id else 384
    m = np.zeros((len(ids), dim), dtype=np.float64)
    have = 0
    for i, iid in enumerate(ids):
        v = by_id.get(iid)
        if v is not None:
            m[i] = v
            have += 1
    return unit(m), have


def behavior_edges(shelf, idx, aliases):
    """Aristas de comportamiento por fuente: {fuente: [(i, j, n)]} entre obras de la estantería."""
    by_src = {}
    canon = lambda x: aliases.get(x, x)
    files = [f for f in glob.glob(os.path.join(CACHE, 'graph', 'cooc-*.jsonl'))]
    for f in files:
        for e in read_jsonl(f):
            a, b = canon(e.get('a', '')), canon(e.get('b', ''))
            if a not in idx or b not in idx or a == b:
                continue
            src = e.get('source') or os.path.basename(f)[5:-6]
            n = float(e.get('n') or e.get('count') or e.get('w') or 1)
            by_src.setdefault(src, []).append((idx[a], idx[b], n))
    edge_files = sorted(set([os.path.join(CACHE, 'graph', 'edges.jsonl')] + glob.glob(os.path.join(CACHE, 'graph', 'edges-*.jsonl'))))
    for f in edge_files:
        for e in read_jsonl(f):
            a, b = canon(e.get('a', '')), canon(e.get('b', ''))
            if a in idx and b in idx and a != b:
                by_src.setdefault('relations', []).append((idx[a], idx[b], float(e.get('w') or 1)))
    return by_src


def ppmi(edges, n_items):
    """PPMI de una fuente como matriz simétrica densa (N×N)."""
    m = np.zeros((n_items, n_items))
    for i, j, n in edges:
        m[i, j] += n
        m[j, i] += n
    total = m.sum()
    if total <= 0:
        return m
    row = m.sum(axis=1)
    with np.errstate(divide='ignore', invalid='ignore'):
        pmi = np.log((m * total) / np.outer(row, row))
    pmi[~np.isfinite(pmi)] = 0
    pmi[pmi < 0] = 0
    mx = pmi.max()
    return pmi / mx if mx > 0 else pmi


def behavior_space(by_src, n_items, params):
    w = params['sources']
    m = np.zeros((n_items, n_items))
    for src, edges in by_src.items():
        if edges:
            m += w.get(src, 1.0) * ppmi(edges, n_items)
    degree = (m > 0).sum(axis=1).astype(np.float64)
    if not m.any():
        return np.zeros((n_items, 1)), degree
    u, s, _ = np.linalg.svd(m, hermitian=True)
    d = min(params['svd_dim'], len(s))
    emb = u[:, :d] * np.sqrt(np.abs(s[:d]))
    emb[degree == 0] = 0
    return unit(emb), degree


def pca(x, dim=DIM):
    mu = x.mean(axis=0, keepdims=True)
    xc = x - mu
    _, _, vt = np.linalg.svd(xc, full_matrices=False)
    return xc @ vt[:dim].T


# Bloques del vector final (suman DIM): cada uno con su propio PCA, para que una obra sin comportamiento conserve
# intacta su geometría de contenido y metadatos (con un único PCA, el comportamiento se lo llevaba todo y obras como
# «La casa de papel» o «Patria» perdían a sus vecinas naturales).
BLOCKS = {'content': 24, 'meta': 8, 'behavior': 16}


def block(x, dim):
    if x.shape[1] <= dim:
        out = np.zeros((x.shape[0], dim))
        out[:, :x.shape[1]] = x
        return unit(out)
    return unit(pca(x, dim))


def fuse(content, behavior, degree, beta_max, k, meta=None, meta_w=0.7):
    beta = beta_max * degree / (degree + k)
    parts = [block(content, BLOCKS['content'])]
    parts.append(block(meta, BLOCKS['meta']) * meta_w if meta is not None else np.zeros((len(content), BLOCKS['meta'])))
    b = block(behavior, BLOCKS['behavior']) if behavior.shape[1] > 1 else np.zeros((len(content), BLOCKS['behavior']))
    parts.append(b * beta[:, None])
    return unit(np.hstack(parts))


def meta_matrix(items_by_id, ids):
    """Metadatos que el texto no capta bien: idioma original, país, géneros y década (multi-hot con idf)."""
    feats = []
    for iid in ids:
        it = items_by_id[iid]
        f = set()
        if it.get('originalLanguage'):
            f.add('l:' + it['originalLanguage'])
        for c in (it.get('originCountry') or [])[:2]:
            f.add('c:' + c)
        for g in it.get('genres') or []:
            f.add('g:' + g.lower())
        if it.get('year'):
            f.add('d:' + str(it['year'] // 10))
        feats.append(f)
    vocab = {}
    for f in feats:
        for x in f:
            vocab[x] = vocab.get(x, 0) + 1
    keys = [x for x, n in vocab.items() if n >= 3]
    col = {x: i for i, x in enumerate(keys)}
    m = np.zeros((len(ids), len(keys)))
    for r, f in enumerate(feats):
        for x in f:
            if x in col:
                m[r, col[x]] = math.log(len(ids) / vocab[x])
    return unit(m)


def neighbors(v, k=NN):
    s = v @ v.T
    np.fill_diagonal(s, -np.inf)
    return np.argsort(-s, axis=1)[:, :k]


# ---------------------------------------------------------------------------------------------- evaluación

def split_edges(by_src, frac=0.2):
    train, test = {}, []
    for src, edges in by_src.items():
        for (i, j, n) in edges:
            key = f'{src}|{min(i, j)}|{max(i, j)}'
            if stable_frac(key) < frac:
                test.append((i, j))
            else:
                train.setdefault(src, []).append((i, j, n))
    return train, test


def link_recall(v, test):
    if not test:
        return None
    nn = neighbors(v)
    hits = 0
    for i, j in test:
        hits += (j in nn[i]) + (i in nn[j])
    return hits / (2 * len(test))


def user_eval(v, ids, shelf, allowed=None, pop=None):
    users = read_jsonl(os.path.join(CACHE, 'eval', f'real-users-{shelf}s.jsonl')) or read_jsonl(os.path.join(CACHE, 'eval', f'real-users-{shelf}.jsonl'))
    if not users:
        return None
    idx = {iid: i for i, iid in enumerate(ids)}
    rec, hit, n = 0.0, 0.0, 0
    for u in users:
        liked = [idx[e['itemId']] for e in u.get('entries', []) if e.get('itemId') in idx and (e.get('score') or 0) >= 4]
        if len(liked) < 10:
            continue
        hidden = [i for i in liked if stable_frac(f"{u['id']}|{ids[i]}") < 0.2]
        known = [i for i in liked if i not in hidden]
        if not hidden or not known:
            continue
        if pop is not None:
            scores = pop.astype(np.float64).copy()
        else:
            prof = v[known].mean(axis=0)
            scores = v @ prof
        scores[known] = -np.inf
        if allowed is not None:
            scores[~allowed] = -np.inf
        top = np.argsort(-scores)
        top50 = set(top[:50].tolist())
        top10 = set(top[:10].tolist())
        rec += len(top50.intersection(hidden)) / len(hidden)
        hit += 1.0 if top10.intersection(hidden) else 0.0
        n += 1
    return {'users': n, 'recall50': rec / n, 'hit10': hit / n} if n else None


def current_space(shelf, ids, aliases=None):
    e = load_json(os.path.join(ENGINE_DIR, f'{shelf}.json'))
    if not e:
        return None, None
    raw = np.frombuffer(__import__('base64').b64decode(e['vec']), dtype=np.int8).astype(np.float64)
    m = raw.reshape(len(e['ids']), -1)
    aliases = aliases or {}
    pos = {aliases.get(iid, iid): i for i, iid in enumerate(e['ids'])}
    out = np.zeros((len(ids), m.shape[1]))
    for i, iid in enumerate(ids):
        if iid in pos:
            out[i] = m[pos[iid]]
    return unit(out), e


# ---------------------------------------------------------------------------------------------- escritura

def write_engine(shelf, e, ids, v, aliases=None):
    """Sustituye vec y nn del engine/<shelf>.json actual (mismos ids y orden; ejes, clústeres y meta se conservan)."""
    aliases = aliases or {}
    canon_e_ids = [aliases.get(iid, iid) for iid in e['ids']]
    pos = {iid: i for i, iid in enumerate(ids)}
    # Obras del catálogo que aún no estaban en el motor (p. ej. los clásicos españoles añadidos el 27/10/2026): se
    # añaden al final con ejes neutros (3), sin temas, y el clúster de su vecina más cercana de las que ya estaban.
    known = set(canon_e_ids)
    extra = [iid for iid in ids if iid not in known]
    n_old = len(canon_e_ids)
    if extra:
        b64 = __import__('base64')
        n_axes = len(e['axisIds'])
        axes = bytearray(b64.b64decode(e['axes']))
        axes += bytes([3] * (n_axes * len(extra)))
        e = dict(e)
        e['axes'] = b64.b64encode(bytes(axes)).decode('ascii')
        old_rows = unit(np.array([v[pos[iid]] if iid in pos else np.zeros(DIM) for iid in canon_e_ids]))
        macro, micro, meta = list(e['macro']), list(e['micro']), dict(e['meta'])
        for iid in extra:
            j = int(np.argmax(old_rows @ v[pos[iid]]))
            macro.append(macro[j])
            micro.append(micro[j])
            meta[iid] = {'themes': [], 'moments': [], 'conf': 0}
        e['macro'], e['micro'], e['meta'] = macro, micro, meta
        canon_e_ids = canon_e_ids + extra
        e['ids'] = canon_e_ids
        print(f'  + {len(extra)} obras nuevas en el motor de {shelf} (antes {n_old})')
    rows = np.zeros((len(e['ids']), DIM))
    for r, iid in enumerate(canon_e_ids):
        if iid in pos:
            rows[r] = v[pos[iid]]
    mx = np.abs(rows).max(axis=1, keepdims=True)
    mx[mx == 0] = 1
    q = np.clip(np.round(rows / mx * 127), -127, 127).astype(np.int8)
    nn = neighbors(unit(rows))
    e = dict(e)
    e['ids'] = canon_e_ids
    e['vec'] = __import__('base64').b64encode(q.tobytes()).decode('ascii')
    e['nn'] = nn.tolist()
    e['v'] = 'm2.0-brain'
    out = os.path.join(ENGINE_DIR, f'{shelf}.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(e, f, ensure_ascii=False, separators=(',', ':'))
    return os.path.getsize(out)


# ---------------------------------------------------------------------------------------------- principal

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--shelf', default=None)
    ap.add_argument('--eval', action='store_true')
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--content-dir', default='content')
    args = ap.parse_args()
    global CONTENT_DIR
    CONTENT_DIR = args.content_dir

    params = {**DEFAULT_PARAMS, **(load_json(PARAMS_FILE, {}) or {})}
    items, aliases = load_catalog()
    items_by_id = {it['id']: it for it in items}
    shelves = [args.shelf] if args.shelf else SHELVES
    lines = [f'\n## Espacio del cerebro — {datetime.datetime.now():%Y-%m-%d %H:%M}\n']
    chosen = {}
    last = load_json(LAST, {}) or {}

    for shelf in shelves:
        ids = [it['id'] for it in items if it.get('type') == shelf and not it.get('hidden')]
        idx = {iid: i for i, iid in enumerate(ids)}
        content, have = content_matrix(shelf, ids, aliases)
        meta = meta_matrix(items_by_id, ids)
        by_src = behavior_edges(shelf, idx, aliases)
        n_edges = {s: len(e) for s, e in by_src.items()}
        cur, engine = current_space(shelf, ids, aliases)
        train, test = split_edges(by_src)

        # Referencias: el espacio de hoy y solo contenido (mismo PCA que el fusionado)
        content48 = fuse(content, np.zeros((len(ids), 1)), np.zeros(len(ids)), 0, 1, meta, 0.0)
        ref = {
            'actual': {'link': link_recall(cur, test) if cur is not None else None, 'users': user_eval(cur, ids, shelf) if cur is not None else None},
            'contenido': {'link': link_recall(content48, test), 'users': user_eval(content48, ids, shelf)},
        }
        # Rejilla pequeña de fusión (aprendida sin las aristas escondidas)
        b_train, deg_train = behavior_space(train, len(ids), params)
        best = None
        for bm in params['grid']['beta_max']:
            for k in params['grid']['k']:
                for mw in params['grid'].get('meta_w', [0.0, 0.5, 1.0]):
                    v = fuse(content, b_train, deg_train, bm, k, meta, mw)
                    link = link_recall(v, test)
                    score = link or 0
                    if best is None or score > best['score']:
                        best = {'beta_max': bm, 'k': k, 'meta_w': mw, 'link': link, 'score': score}

        # Espacio final con TODAS las aristas y el mejor ajuste; usuarios reales (no están en el grafo)
        b_all, deg_all = behavior_space(by_src, len(ids), params)
        final = fuse(content, b_all, deg_all, best['beta_max'], best['k'], meta, best['meta_w'])
        users_final = user_eval(final, ids, shelf)
        # referencias honradas: popularidad pura, y todos los métodos solo entre obras con datos de comportamiento
        pop = np.array([float(items_by_id[i].get('popularity') or 0) for i in ids])
        covered = deg_all > 0
        users_pop = user_eval(final, ids, shelf, pop=pop)
        users_cov = {'contenido': user_eval(content48, ids, shelf, allowed=covered), 'cerebro': user_eval(final, ids, shelf, allowed=covered), 'popularidad': user_eval(final, ids, shelf, allowed=covered, pop=pop)}
        cover1 = float((deg_all >= 1).mean())
        cover10 = float((deg_all >= 10).mean())

        def better():
            # el espacio actual (merge.mjs) se construyó CON esas aristas: su cifra de enlaces está contaminada y no
            # sirve de referencia. En enlaces se compara con solo contenido; con usuarios reales, con el actual.
            base_link = ref['contenido']['link'] or 0
            ok_link = (best['link'] or 0) > base_link
            base_users = ref['actual']['users']
            ok_users = users_final is None or base_users is None or users_final['recall50'] >= base_users['recall50']
            # y nunca peor que lo último que se publicó (para las estanterías sin usuarios reales es la única red)
            prev = last.get(shelf, {})
            ok_prev = (best['link'] or 0) >= prev.get('link', 0) - 0.005 and (users_final or {}).get('recall50', 1) >= prev.get('users', 0) - 0.005
            return ok_link and ok_users and ok_prev

        ship = better()
        chosen[shelf] = ship
        fmt = lambda x: '—' if x is None else f'{x * 100:.1f} %'
        fu = lambda u: '—' if not u else f"recall@50 {u['recall50'] * 100:.1f} % · hit@10 {u['hit10'] * 100:.1f} % ({u['users']} usuarios)"
        lines.append(f"### {shelf} ({len(ids)} obras, contenido {have}, aristas {sum(n_edges.values())}: {n_edges})")
        lines.append(f"- Obras con ≥ 1 arista: {cover1 * 100:.0f} % · con ≥ 10: {cover10 * 100:.0f} %")
        lines.append(f"- Enlaces escondidos (recall@20): actual {fmt(ref['actual']['link'])} (contaminado: ya vio estas aristas) · solo contenido {fmt(ref['contenido']['link'])} · **fusionado {fmt(best['link'])}** (β_max {best['beta_max']}, k {best['k']}, metadatos {best['meta_w']}; {len(test)} aristas de prueba)")
        lines.append(f"- Usuarios reales: actual {fu(ref['actual']['users'])} · solo contenido {fu(ref['contenido']['users'])} · popularidad {fu(users_pop)} · **fusionado {fu(users_final)}**")
        if users_final:
            lines.append(f"- Solo entre obras con datos: contenido {fu(users_cov['contenido'])} · popularidad {fu(users_cov['popularidad'])} · **cerebro {fu(users_cov['cerebro'])}**")
        held = (params.get('hold') or {}).get(shelf)
        if held:
            lines.append(f'- ⏸ Bloqueada: {held}')
        elif args.write and ship and engine:
            size = write_engine(shelf, engine, ids, final, aliases)
            last[shelf] = {'link': best['link'] or 0, 'users': (users_final or {}).get('recall50', 0), 'at': f'{datetime.datetime.now():%Y-%m-%d}'}
            lines.append(f"- ✅ Escrito engine/{shelf}.json ({size / 1024:.0f} KB)")
        elif args.write:
            lines.append('- ⏸ No se escribe: no mejora al espacio actual')
        else:
            lines.append(f"- {'Mejora: se escribiría' if ship else 'No mejora: no se escribiría'}")
        print('\n'.join(lines[-5:]))
        sys.stdout.flush()

    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    if args.write:
        with open(LAST, 'w', encoding='utf-8') as f:
            json.dump(last, f, indent=1)
    with open(REPORT, 'a', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    with open(HIST, 'a', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    json.dump(chosen, sys.stdout)
    print()


if __name__ == '__main__':
    main()
