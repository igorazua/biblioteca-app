"""
movielens.py — Comportamiento REAL para pelis: MovieLens ml-32m (32 M valoraciones de 200.948 usuarios).

- Cruce: links.csv (movieId → tmdbId / imdbId) con `tmdbId` / `imdbId` del catálogo.
- 10 % de los usuarios (por hash estable) → evaluación: cache/eval/real-users-movies.jsonl. No entran en el grafo.
- El resto: pares de pelis del catálogo que el mismo usuario puntuó con ≥ 4 → cache/graph/cooc-movielens.jsonl
  ({a, b, source: 'movielens', n}), con n ≥ 5 y como mucho los 60 mejores vecinos (por PPMI) de cada peli.
Solo recuentos agregados; en evaluación, ids anónimos.

Uso: python scripts/brain/sources/movielens.py   (los csv en cache/graph/sources/movielens/)
"""
import csv
import hashlib
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
CACHE = os.path.join(APP, 'scripts', 'cache')
SRC = os.path.join(CACHE, 'graph', 'sources', 'movielens')
OUT = os.path.join(CACHE, 'graph', 'cooc-movielens.jsonl')
EVAL = os.path.join(CACHE, 'eval', 'real-users-movies.jsonl')
MAX_EVAL_USERS = 4000


def stable_frac(s):
    return int(hashlib.md5(s.encode('utf-8')).hexdigest()[:8], 16) / 0xFFFFFFFF


def main():
    seed = json.load(open(os.path.join(APP, 'src', 'data', 'seed.json'), encoding='utf-8'))
    items = seed['items'] if isinstance(seed, dict) else seed
    aliases = json.load(open(os.path.join(APP, 'src', 'data', 'aliases.json'), encoding='utf-8'))
    movies = [it for it in items if it.get('type') == 'movie' and not it.get('hidden')]
    by_tmdb = {str(it['tmdbId']): it['id'] for it in movies if it.get('tmdbId')}
    by_imdb = {str(it['imdbId']).lstrip('t'): it['id'] for it in movies if it.get('imdbId')}
    ids = [it['id'] for it in movies]
    idx = {iid: i for i, iid in enumerate(ids)}

    ml2cat = {}
    with open(os.path.join(SRC, 'links.csv'), encoding='utf-8') as f:
        for row in csv.DictReader(f):
            cid = by_tmdb.get(row['tmdbId'] or '-') or by_imdb.get((row['imdbId'] or '-').lstrip('0'))
            if cid:
                cid = aliases.get(cid, cid)
                if cid in idx:
                    ml2cat[row['movieId']] = idx[cid]
    print(f'Pelis del catálogo cruzadas: {len(set(ml2cat.values()))} de {len(ids)}')
    sys.stdout.flush()

    n = len(ids)
    co = np.zeros((n, n), dtype=np.float64)
    eval_users = 0
    train_users = 0
    ev = open(EVAL, 'w', encoding='utf-8')

    def flush(uid, rated):
        nonlocal eval_users, train_users
        if not rated:
            return
        if stable_frac(f'ml|{uid}') < 0.10:
            liked = [r for r in rated if r[1] >= 4]
            if len(liked) >= 10 and eval_users < MAX_EVAL_USERS:
                ev.write(json.dumps({'id': f'ml{uid}', 'platform': 'movielens', 'entries': [{'itemId': ids[i], 'score': s} for i, s in rated]}) + '\n')
                eval_users += 1
            return
        liked = np.array(sorted({i for i, s in rated if s >= 4}), dtype=np.int64)
        if len(liked) >= 2:
            co[np.ix_(liked, liked)] += 1
            train_users += 1

    cur, rated = None, []
    with open(os.path.join(SRC, 'ratings.csv'), encoding='utf-8') as f:
        next(f)
        for k, line in enumerate(f):
            uid, mid, rating, _ = line.split(',', 3)
            if uid != cur:
                flush(cur, rated)
                cur, rated = uid, []
            i = ml2cat.get(mid)
            if i is not None:
                rated.append((i, float(rating)))
            if k % 5_000_000 == 0:
                print(f'  {k // 1_000_000} M valoraciones…')
                sys.stdout.flush()
        flush(cur, rated)
    ev.close()

    np.fill_diagonal(co, 0)
    total = co.sum()
    row = co.sum(axis=1)
    with np.errstate(divide='ignore', invalid='ignore'):
        pmi = np.log((co * total) / np.outer(row, row))
    pmi[~np.isfinite(pmi)] = 0
    keep = set()
    for i in range(n):
        cand = [j for j in np.argsort(-pmi[i])[:60] if co[i, j] >= 5 and pmi[i, j] > 0]
        for j in cand:
            keep.add((min(i, j), max(i, j)))
    with open(OUT, 'w', encoding='utf-8') as f:
        for i, j in sorted(keep):
            f.write(json.dumps({'a': ids[i], 'b': ids[j], 'source': 'movielens', 'n': int(co[i, j]), 'ppmi': round(float(pmi[i, j]), 4)}) + '\n')
    deg = np.zeros(n)
    for i, j in keep:
        deg[i] += 1
        deg[j] += 1
    print(f'Usuarios de entreno: {train_users} · de evaluación: {eval_users}')
    print(f'Aristas: {len(keep)} · pelis con ≥ 1: {(deg >= 1).mean() * 100:.0f} % · con ≥ 10: {(deg >= 10).mean() * 100:.0f} %')
    title = {it['id']: it['title'] for it in movies}
    for name in ['El padrino', 'Toy Story', 'Pulp Fiction', 'Amélie', 'El laberinto del fauno']:
        hit = next((iid for iid in ids if title[iid].startswith(name)), None)
        if hit:
            i = idx[hit]
            nb = [title[ids[j]] for j in np.argsort(-pmi[i])[:6] if co[i, j] >= 5]
            print(f'  {title[hit]} → {", ".join(nb)}')


if __name__ == '__main__':
    main()
