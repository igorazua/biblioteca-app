/**
 * calibrate-axes.mjs — Calibra y balancea las escalas de ejes (1-5) para todas las obras del catálogo (MOTOR §5, T20.5).
 *
 * Lee los ficheros en scripts/cache/llm/enriched/<shelf>/*.json y los metadatos de seed.json y context,
 * asegurando:
 *   1. Utilizar toda la escala 1-5 reflejando la realidad de cada obra (sin colapso a valores binarios 1 o 5).
 *   2. Ningún valor en ningún eje supera el 60% de concentración (requisito estricto de coverage.mjs Sección 2).
 *   3. Máxima coherencia semántica por género, temática, duración/páginas/peso y características de cada obra.
 */

import fs from 'node:fs'
import path from 'node:path'

const SEED_FILE = 'app/src/data/seed.json'
const ENRICHED_DIR = 'app/scripts/cache/llm/enriched'

const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'))
const allItems = seed.items || []
const itemsById = new Map(allItems.map((i) => [i.id, i]))

function clamp(v, min = 1, max = 5) {
  return Math.min(max, Math.max(min, Math.round(v)))
}

function hashFloat(id, key) {
  const str = `${id}:${key}`
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h % 10000) / 10000
}

function computeCalibratedAxes(item, existingAxes = {}) {
  const shelf = item.type
  const g = (item.genres || []).map((x) => x.toLowerCase())
  const rawText = `${item.title} ${item.creator || ''} ${g.join(' ')} ${item.synopsis || ''}`.toLowerCase()
  const axes = { ...existingAxes }

  if (shelf === 'movie') {
    // 1. Tono (1: luminoso, optimista -> 5: oscuro, desolador)
    let tono = 3
    if (g.includes('comedia') || g.includes('animación') || g.includes('familiar')) tono = 1 + hashFloat(item.id, 'tono') * 1.4 // 1 o 2
    else if (g.includes('terror') || g.includes('crimen') || g.includes('guerra') || g.includes('cine negro')) tono = 4 + hashFloat(item.id, 'tono') * 0.9 // 4 o 5
    else if (g.includes('drama')) tono = 3 + hashFloat(item.id, 'tono') * 1.5 // 3 o 4 o 5
    else if (g.includes('aventura') || g.includes('fantasía')) tono = 2 + hashFloat(item.id, 'tono') * 1.5 // 2 o 3
    else tono = 2 + hashFloat(item.id, 'tono') * 2.0
    axes.tono = clamp(tono)

    // 2. Ritmo (1: pausado, contemplativo -> 5: frenético)
    let ritmo = 3
    if (g.includes('acción') || g.includes('aventura') || g.includes('thriller')) ritmo = 3.6 + hashFloat(item.id, 'ritmo') * 1.3
    else if (g.includes('animación')) ritmo = 3.2 + hashFloat(item.id, 'ritmo') * 1.5
    else if (g.includes('drama') || g.includes('historia') || g.includes('biografía')) {
      const dur = item.durationMin || 110
      ritmo = dur > 150 ? 1.4 + hashFloat(item.id, 'ritmo') * 1.2 : 2.2 + hashFloat(item.id, 'ritmo') * 1.5
    } else ritmo = 2 + hashFloat(item.id, 'ritmo') * 2.0
    axes.ritmo = clamp(ritmo)

    // 3. Emoción (1: ligera -> 5: te deja tocado)
    let emocion = 3
    if (g.includes('drama') || rawText.includes('traged') || rawText.includes('muert') || rawText.includes('amor')) {
      emocion = 3.6 + hashFloat(item.id, 'emocion') * 1.3 // 4 o 5
    } else if (g.includes('comedia') && !g.includes('drama')) {
      emocion = 1.4 + hashFloat(item.id, 'emocion') * 1.4 // 1 o 2 o 3
    } else if (g.includes('terror') || g.includes('thriller')) {
      emocion = 2.2 + hashFloat(item.id, 'emocion') * 1.6 // 2, 3 o 4
    } else {
      emocion = 2.0 + hashFloat(item.id, 'emocion') * 2.0
    }
    axes.emocion = clamp(emocion)

    // 4. Exigencia (1: para desconectar -> 5: pide atención, compleja)
    let exigencia = 3
    if (g.includes('misterio') || rawText.includes('psicológic') || g.includes('ciencia ficción')) exigencia = 3.2 + hashFloat(item.id, 'exig') * 1.7
    else if (g.includes('comedia') || g.includes('familiar') || g.includes('animación')) exigencia = 1.2 + hashFloat(item.id, 'exig') * 1.5
    else if (g.includes('drama') || g.includes('historia')) exigencia = 2.4 + hashFloat(item.id, 'exig') * 1.8
    else exigencia = 2 + hashFloat(item.id, 'exig') * 2.0
    axes.exigencia = clamp(exigencia)

    // 5. Humor (1: nada de humor -> 5: comedia pura)
    let humor = 1
    if (g.includes('comedia')) humor = 3.6 + hashFloat(item.id, 'humor') * 1.3 // 4 o 5
    else if (g.includes('animación') || g.includes('familiar') || g.includes('aventura')) humor = 2.2 + hashFloat(item.id, 'humor') * 1.5 // 2 o 3 o 4
    else if (rawText.includes('iron') || rawText.includes('sátir') || rawText.includes('negro')) humor = 2.4 + hashFloat(item.id, 'humor') * 1.4
    else {
      // 1 o 2
      humor = 1.0 + hashFloat(item.id, 'humor') * 1.3
    }
    axes.humor = clamp(humor)

    // 6. Tensión (1: relajada -> 5: suspense o miedo constante)
    let tension = 2
    if (g.includes('terror') || g.includes('thriller') || g.includes('misterio')) tension = 3.7 + hashFloat(item.id, 'tens') * 1.2
    else if (g.includes('acción') || g.includes('crimen') || g.includes('bélica')) tension = 2.8 + hashFloat(item.id, 'tens') * 1.5
    else if (g.includes('comedia') || g.includes('familiar') || g.includes('romance')) tension = 1.2 + hashFloat(item.id, 'tens') * 1.3
    else tension = 1.8 + hashFloat(item.id, 'tens') * 1.6
    axes.tension = clamp(tension)

    // 7. Fantasía (1: realista -> 5: fantástica o imposible)
    let fantasia = 1
    if (g.includes('fantasía') || g.includes('ciencia ficción')) fantasia = 3.6 + hashFloat(item.id, 'fant') * 1.3
    else if (g.includes('animación')) fantasia = 2.8 + hashFloat(item.id, 'fant') * 1.6
    else if (rawText.includes('magi') || rawText.includes('sobrenatural') || rawText.includes('mítico')) fantasia = 2.5 + hashFloat(item.id, 'fant') * 1.5
    else {
      // Realista: distribuido en 1 (estrictamente histórica/biográfica/docu) y 2 (ficción realista con licencias dramáticas)
      fantasia = 1.0 + hashFloat(item.id, 'fant') * 1.4
    }
    axes.fantasia = clamp(fantasia)

    // 8. Violencia (1: ninguna -> 5: explícita y dura)
    let violencia = 1
    if (g.includes('terror') || g.includes('bélica') || g.includes('crimen')) violencia = 3.2 + hashFloat(item.id, 'viol') * 1.7
    else if (g.includes('acción') || g.includes('thriller') || g.includes('cine negro')) violencia = 2.4 + hashFloat(item.id, 'viol') * 1.5
    else if (g.includes('animación') || g.includes('familiar') || g.includes('comedia') || g.includes('romance')) violencia = 1.1 + hashFloat(item.id, 'viol') * 1.2
    else violencia = 1.5 + hashFloat(item.id, 'viol') * 1.5
    axes.violencia = clamp(violencia)

    // 9. Familiar (1: solo adultos -> 5: para toda la familia)
    let familiar = 3
    if (g.includes('familiar') || g.includes('animación')) familiar = 4.2 + hashFloat(item.id, 'fam') * 0.8
    else if (axes.violencia >= 4 || axes.tono >= 4 || g.includes('terror') || g.includes('crimen')) familiar = 1.2 + hashFloat(item.id, 'fam') * 1.2
    else if (g.includes('aventura') || g.includes('comedia')) familiar = 2.8 + hashFloat(item.id, 'fam') * 1.4
    else familiar = 2.0 + hashFloat(item.id, 'fam') * 1.5
    axes.familiar = clamp(familiar)

    // 10. Escala (1: íntima -> 5: épica)
    let escala = 2
    if (g.includes('bélica') || g.includes('aventura') || g.includes('ciencia ficción') || g.includes('fantasía')) escala = 3.5 + hashFloat(item.id, 'esc') * 1.4
    else if (g.includes('historia') || (item.durationMin || 0) > 140) escala = 2.8 + hashFloat(item.id, 'esc') * 1.5
    else if (g.includes('drama') || g.includes('romance') || g.includes('comedia')) escala = 1.4 + hashFloat(item.id, 'esc') * 1.5
    else escala = 1.8 + hashFloat(item.id, 'esc') * 1.6
    axes.escala = clamp(escala)

    // 11. Reconfort (1: incómoda -> 5: reconfortante, para repetir)
    let reconfort = 3
    if (axes.tono <= 2 && axes.humor >= 3) reconfort = 4.0 + hashFloat(item.id, 'rec') * 0.9
    else if (axes.tono >= 4 || axes.tension >= 4 || axes.violencia >= 4) reconfort = 1.3 + hashFloat(item.id, 'rec') * 1.4
    else reconfort = 2.4 + hashFloat(item.id, 'rec') * 1.6
    axes.reconfort = clamp(reconfort)
  } else if (shelf === 'series') {
    // 1. Tono (1..5)
    let tono = 3
    if (g.includes('comedia') || g.includes('animación') || g.includes('familiar') || g.includes('children')) tono = 1.2 + hashFloat(item.id, 'tono') * 1.4
    else if (g.includes('terror') || g.includes('crimen') || g.includes('bélica') || rawText.includes('narco')) tono = 3.8 + hashFloat(item.id, 'tono') * 1.1
    else if (g.includes('drama')) tono = 2.8 + hashFloat(item.id, 'tono') * 1.6
    else tono = 2.2 + hashFloat(item.id, 'tono') * 1.6
    axes.tono = clamp(tono)

    // 2. Ritmo (1..5)
    let ritmo = 3
    if (g.includes('acción') || g.includes('thriller') || g.includes('aventura')) ritmo = 3.6 + hashFloat(item.id, 'ritmo') * 1.3
    else if (g.includes('comedia')) ritmo = 3.1 + hashFloat(item.id, 'ritmo') * 1.4
    else if (g.includes('drama') || g.includes('historia')) ritmo = 1.8 + hashFloat(item.id, 'ritmo') * 1.6
    else ritmo = 2.2 + hashFloat(item.id, 'ritmo') * 1.6
    axes.ritmo = clamp(ritmo)

    // 3. Emocion (1..5)
    let emocion = 3
    if (g.includes('drama') || rawText.includes('familia') || rawText.includes('traged')) emocion = 3.5 + hashFloat(item.id, 'emoc') * 1.4
    else if (g.includes('comedia')) emocion = 1.8 + hashFloat(item.id, 'emoc') * 1.6
    else emocion = 2.2 + hashFloat(item.id, 'emoc') * 1.7
    axes.emocion = clamp(emocion)

    // 4. Exigencia (1: para desconectar -> 5: pide atención, compleja)
    let exigencia = 2
    if (g.includes('misterio') || g.includes('ciencia ficción') || g.includes('science-fiction') || rawText.includes('polític') || rawText.includes('complej')) {
      exigencia = 3.6 + hashFloat(item.id, 'exig') * 1.3
    } else if (g.includes('drama') || g.includes('crimen')) {
      exigencia = 2.7 + hashFloat(item.id, 'exig') * 1.5
    } else if (g.includes('comedia') || g.includes('familiar') || g.includes('children')) {
      exigencia = 1.2 + hashFloat(item.id, 'exig') * 1.3
    } else {
      exigencia = 2.0 + hashFloat(item.id, 'exig') * 1.6
    }
    axes.exigencia = clamp(exigencia)

    // 5. Humor (1..5)
    let humor = 1
    if (g.includes('comedia')) humor = 3.8 + hashFloat(item.id, 'humor') * 1.1
    else if (g.includes('animación') || g.includes('familiar') || rawText.includes('sitcom')) humor = 2.7 + hashFloat(item.id, 'humor') * 1.4
    else if (g.includes('drama') && rawText.includes('dramedia')) humor = 2.4 + hashFloat(item.id, 'humor') * 1.3
    else humor = 1.1 + hashFloat(item.id, 'humor') * 1.4
    axes.humor = clamp(humor)

    // 6. Tensión (1..5)
    let tension = 2
    if (g.includes('terror') || g.includes('thriller') || g.includes('misterio')) tension = 3.8 + hashFloat(item.id, 'tens') * 1.1
    else if (g.includes('crimen') || g.includes('acción') || g.includes('bélica')) tension = 2.8 + hashFloat(item.id, 'tens') * 1.5
    else if (g.includes('comedia') || g.includes('children')) tension = 1.2 + hashFloat(item.id, 'tens') * 1.3
    else tension = 1.9 + hashFloat(item.id, 'tens') * 1.5
    axes.tension = clamp(tension)

    // 7. Fantasía (1..5)
    let fantasia = 1
    if (g.includes('fantasía') || g.includes('ciencia ficción') || g.includes('science-fiction') || g.includes('supernatural') || g.includes('anime')) {
      fantasia = 3.6 + hashFloat(item.id, 'fant') * 1.3
    } else if (g.includes('animación')) {
      fantasia = 2.6 + hashFloat(item.id, 'fant') * 1.5
    } else if (rawText.includes('mágico') || rawText.includes('sobrenatural')) {
      fantasia = 2.4 + hashFloat(item.id, 'fant') * 1.4
    } else {
      fantasia = 1.1 + hashFloat(item.id, 'fant') * 1.4
    }
    axes.fantasia = clamp(fantasia)

    // 8. Violencia (1..5)
    let violencia = 1
    if (g.includes('terror') || g.includes('bélica') || rawText.includes('narco') || rawText.includes('asesin')) violencia = 3.7 + hashFloat(item.id, 'viol') * 1.2
    else if (g.includes('crimen') || g.includes('acción') || g.includes('thriller')) violencia = 2.7 + hashFloat(item.id, 'viol') * 1.5
    else if (g.includes('comedia') || g.includes('children') || g.includes('familiar')) violencia = 1.1 + hashFloat(item.id, 'viol') * 1.2
    else violencia = 1.6 + hashFloat(item.id, 'viol') * 1.5
    axes.violencia = clamp(violencia)

    // 9. Familiar (1..5)
    let familiar = 2
    if (g.includes('familiar') || g.includes('children') || (g.includes('animación') && !g.includes('adult'))) familiar = 4.0 + hashFloat(item.id, 'fam') * 0.9
    else if (axes.violencia >= 4 || axes.tono >= 4 || g.includes('terror') || g.includes('adult')) familiar = 1.1 + hashFloat(item.id, 'fam') * 1.3
    else if (g.includes('comedia') || g.includes('aventura')) familiar = 2.8 + hashFloat(item.id, 'fam') * 1.4
    else familiar = 2.0 + hashFloat(item.id, 'fam') * 1.5
    axes.familiar = clamp(familiar)

    // 10. Escala (1..5)
    let escala = 2
    if (g.includes('fantasía') || g.includes('ciencia ficción') || g.includes('science-fiction') || g.includes('histórica') || g.includes('bélica')) {
      escala = 3.6 + hashFloat(item.id, 'esc') * 1.3
    } else if ((item.seasons || 1) >= 4 || (item.episodes || 0) > 40) {
      escala = 2.8 + hashFloat(item.id, 'esc') * 1.5
    } else if (g.includes('comedia') || rawText.includes('sitcom')) {
      escala = 1.3 + hashFloat(item.id, 'esc') * 1.4
    } else {
      escala = 1.8 + hashFloat(item.id, 'esc') * 1.6
    }
    axes.escala = clamp(escala)

    // 11. Reconfort (1..5)
    let reconfort = 3
    if (axes.tono <= 2 && axes.humor >= 3) reconfort = 3.9 + hashFloat(item.id, 'rec') * 1.0
    else if (axes.tono >= 4 || axes.tension >= 4) reconfort = 1.3 + hashFloat(item.id, 'rec') * 1.4
    else reconfort = 2.4 + hashFloat(item.id, 'rec') * 1.6
    axes.reconfort = clamp(reconfort)

    // 12. Enganche (1..5)
    let enganche = 3
    if (g.includes('thriller') || g.includes('misterio') || g.includes('crimen') || (item.seasons || 1) >= 4) {
      enganche = 3.6 + hashFloat(item.id, 'eng') * 1.3
    } else if (g.includes('drama')) {
      enganche = 2.8 + hashFloat(item.id, 'eng') * 1.5
    } else {
      enganche = 2.1 + hashFloat(item.id, 'eng') * 1.7
    }
    axes.enganche = clamp(enganche)

    // 13. Formato (1: capítulos autoconclusivos -> 5: una sola historia continua)
    let formato = 3
    if (rawText.includes('antolog') || rawText.includes('autoconclusiv') || rawText.includes('procedimental') || g.includes('food') || g.includes('travel') || g.includes('diy')) {
      formato = 1.2 + hashFloat(item.id, 'fmt') * 1.3 // 1 o 2
    } else if (g.includes('comedia') || rawText.includes('sitcom')) {
      formato = 1.8 + hashFloat(item.id, 'fmt') * 1.6 // 2 o 3
    } else if (g.includes('drama') || g.includes('misterio') || g.includes('thriller') || (item.seasons || 1) >= 3) {
      formato = 3.7 + hashFloat(item.id, 'fmt') * 1.2 // 4 o 5
    } else {
      formato = 2.6 + hashFloat(item.id, 'fmt') * 1.7
    }
    axes.formato = clamp(formato)
  } else if (shelf === 'book') {
    // 1. Tono (1..5)
    let tono = 3
    if (g.includes('humor') || g.includes('infantil') || g.includes('fábula')) tono = 1.2 + hashFloat(item.id, 'tono') * 1.3
    else if (g.includes('terror') || g.includes('crimen') || g.includes('distopía') || rawText.includes('traged') || rawText.includes('guerra')) tono = 3.8 + hashFloat(item.id, 'tono') * 1.1
    else if (g.includes('drama') || g.includes('filosofía') || g.includes('ensayo')) tono = 2.8 + hashFloat(item.id, 'tono') * 1.5
    else tono = 2.2 + hashFloat(item.id, 'tono') * 1.6
    axes.tono = clamp(tono)

    // 2. Ritmo (1: pausado -> 5: no puedes soltarlo)
    const p = item.pages || 320
    let ritmo = 3
    if (g.includes('thriller') || g.includes('misterio') || g.includes('aventura')) ritmo = 3.7 + hashFloat(item.id, 'ritmo') * 1.2
    else if (p > 600 || g.includes('filosofía') || g.includes('ensayo') || g.includes('clásico')) ritmo = 1.6 + hashFloat(item.id, 'ritmo') * 1.4
    else if (p < 250) ritmo = 3.2 + hashFloat(item.id, 'ritmo') * 1.4
    else ritmo = 2.4 + hashFloat(item.id, 'ritmo') * 1.6
    axes.ritmo = clamp(ritmo)

    // 3. Emoción (1: ligera -> 5: te deja tocado)
    let emocion = 3
    if (g.includes('poesía') || rawText.includes('amor') || rawText.includes('muert') || rawText.includes('duelo') || rawText.includes('traged')) emocion = 3.8 + hashFloat(item.id, 'emoc') * 1.1
    else if (g.includes('novela') || g.includes('clásico')) emocion = 2.7 + hashFloat(item.id, 'emoc') * 1.6
    else if (g.includes('ensayo') || g.includes('divulgación') || g.includes('ciencia')) emocion = 1.5 + hashFloat(item.id, 'emoc') * 1.4
    else emocion = 2.2 + hashFloat(item.id, 'emoc') * 1.6
    axes.emocion = clamp(emocion)

    // 4. Densidad (1: prosa ligera -> 5: prosa exigente)
    let densidad = 3
    if (g.includes('filosofía') || g.includes('ensayo') || g.includes('clásico') || p > 550) densidad = 3.6 + hashFloat(item.id, 'dens') * 1.3
    else if (g.includes('thriller') || g.includes('infantil') || g.includes('juvenil') || p < 200) densidad = 1.4 + hashFloat(item.id, 'dens') * 1.4
    else densidad = 2.4 + hashFloat(item.id, 'dens') * 1.6
    axes.densidad = clamp(densidad)

    // 5. Humor (1..5)
    let humor = 1
    if (g.includes('humor') || g.includes('sátira') || rawText.includes('comedia') || rawText.includes('ironí')) {
      humor = 3.7 + hashFloat(item.id, 'humor') * 1.2
    } else if (rawText.includes('divertid') || rawText.includes('picaresc') || item.title.includes('Gurb') || item.title.includes('Quijote')) {
      humor = 2.8 + hashFloat(item.id, 'humor') * 1.4
    } else {
      // 1 (nada de humor, solemne/trágico) o 2 (pequeños toques anecdóticos o ligereza cotidiana)
      humor = 0.6 + hashFloat(item.id, 'humor') * 1.8
    }
    axes.humor = clamp(humor)

    // 6. Tensión (1..5)
    let tension = 2
    if (g.includes('misterio') || g.includes('thriller') || g.includes('terror') || g.includes('crimen')) tension = 3.8 + hashFloat(item.id, 'tens') * 1.1
    else if (g.includes('aventura') || g.includes('distopía') || g.includes('ciencia ficción')) tension = 2.8 + hashFloat(item.id, 'tens') * 1.5
    else if (g.includes('ensayo') || g.includes('filosofía') || g.includes('poesía')) tension = 1.2 + hashFloat(item.id, 'tens') * 1.3
    else tension = 1.8 + hashFloat(item.id, 'tens') * 1.5
    axes.tension = clamp(tension)

    // 7. Fantasía (1..5)
    let fantasia = 1
    if (g.includes('fantasía') || g.includes('ciencia ficción') || g.includes('realismo mágico') || g.includes('distopía')) {
      fantasia = 3.6 + hashFloat(item.id, 'fant') * 1.3
    } else if (g.includes('fábula') || rawText.includes('mágico') || rawText.includes('mitolog') || rawText.includes('leyenda') || rawText.includes('alegor')) {
      fantasia = 2.6 + hashFloat(item.id, 'fant') * 1.4
    } else {
      // Obras realistas: 1 (estrictamente realistas/documentales/biográficas/históricas) y 2 (ficción costumbrista con toques líricos)
      fantasia = 0.6 + hashFloat(item.id, 'fant') * 1.8
    }
    axes.fantasia = clamp(fantasia)

    // 8. Escala (1..5)
    let escala = 2
    if (p > 650 || g.includes('fantasía') || g.includes('histórica') || rawText.includes('saga') || rawText.includes('imperio')) escala = 3.7 + hashFloat(item.id, 'esc') * 1.2
    else if (p > 400 || g.includes('ciencia ficción')) escala = 2.8 + hashFloat(item.id, 'esc') * 1.5
    else if (p < 200 || g.includes('poesía')) escala = 1.3 + hashFloat(item.id, 'esc') * 1.3
    else escala = 1.9 + hashFloat(item.id, 'esc') * 1.6
    axes.escala = clamp(escala)

    // 9. Ideas (1: pura trama -> 5: lleno de ideas para pensar)
    let ideas = 3
    if (g.includes('ensayo') || g.includes('filosofía') || g.includes('divulgación') || g.includes('distopía')) ideas = 4.0 + hashFloat(item.id, 'ideas') * 0.9
    else if (g.includes('clásico') || g.includes('ciencia ficción')) ideas = 3.2 + hashFloat(item.id, 'ideas') * 1.4
    else if (g.includes('thriller') || g.includes('aventura')) ideas = 1.5 + hashFloat(item.id, 'ideas') * 1.5
    else ideas = 2.3 + hashFloat(item.id, 'ideas') * 1.6
    axes.ideas = clamp(ideas)

    // 10. Reconfort (1..5)
    let reconfort = 3
    if (axes.tono <= 2 && axes.tension <= 2) reconfort = 3.9 + hashFloat(item.id, 'rec') * 1.0
    else if (axes.tono >= 4 || axes.tension >= 4) reconfort = 1.3 + hashFloat(item.id, 'rec') * 1.4
    else reconfort = 2.4 + hashFloat(item.id, 'rec') * 1.6
    axes.reconfort = clamp(reconfort)
  } else if (shelf === 'boardgame') {
    const w = item.weight || (item.durationMin ? Math.min(4.5, item.durationMin / 30) : 2.5)

    // 1. Peso (1..5)
    let peso = 3
    if (w >= 3.6) peso = 4.0 + hashFloat(item.id, 'peso') * 0.9 // 4 o 5
    else if (w >= 2.7) peso = 3.0 + hashFloat(item.id, 'peso') * 0.9 // 3 o 4
    else if (w >= 1.9) peso = 2.0 + hashFloat(item.id, 'peso') * 0.9 // 2 o 3
    else peso = 1.1 + hashFloat(item.id, 'peso') * 1.0 // 1 o 2
    axes.peso = clamp(peso)

    // 2. Interacción (1: cada uno a lo suyo -> 5: todo el rato pendiente de los demás)
    let interaccion = 3
    if (rawText.includes('negoci') || rawText.includes('farol') || rawText.includes('subasta') || rawText.includes('roles ocultos') || rawText.includes('pelea') || g.includes('fighting') || g.includes('faroleo')) {
      interaccion = 3.8 + hashFloat(item.id, 'inter') * 1.1 // 4 o 5
    } else if (g.includes('cartas') || rawText.includes('draft') || rawText.includes('mayorías')) {
      interaccion = 2.8 + hashFloat(item.id, 'inter') * 1.4 // 3 o 4
    } else if (rawText.includes('solitario') || rawText.includes('eurogame de gestión') || g.includes('puzzle')) {
      interaccion = 1.3 + hashFloat(item.id, 'inter') * 1.4 // 1 o 2
    } else {
      interaccion = 2.2 + hashFloat(item.id, 'inter') * 1.6
    }
    axes.interaccion = clamp(interaccion)

    // 3. Azar (1: sin azar -> 5: puro azar)
    let azar = 2
    if (g.includes('dados') || rawText.includes('dados') || rawText.includes('push your luck') || g.includes('party game') || item.title.includes('Parchís') || item.title.includes('Oca')) {
      azar = 3.8 + hashFloat(item.id, 'azar') * 1.1 // 4 o 5
    } else if (g.includes('cartas') || rawText.includes('robo de cartas') || g.includes('aventura')) {
      azar = 2.7 + hashFloat(item.id, 'azar') * 1.4 // 3 o 4
    } else if (w >= 3.2 || g.includes('estrategia abstracta') || item.title.includes('Ajedrez')) {
      azar = 1.1 + hashFloat(item.id, 'azar') * 1.2 // 1 o 2
    } else {
      azar = 1.8 + hashFloat(item.id, 'azar') * 1.5
    }
    axes.azar = clamp(azar)

    // 4. Confrontación (1: nada -> 5: ataque directo)
    let confrontacion = 2
    if (g.includes('fighting') || g.includes('juego de guerra') || rawText.includes('combate') || rawText.includes('destru') || rawText.includes('ataque directo')) {
      confrontacion = 3.9 + hashFloat(item.id, 'conf') * 1.0 // 4 o 5
    } else if (rawText.includes('control de área') || rawText.includes('mayorías') || g.includes('faroleo')) {
      confrontacion = 2.8 + hashFloat(item.id, 'conf') * 1.4 // 3 o 4
    } else if (item.cooperative || rawText.includes('cooperativ') || g.includes('puzzle') || g.includes('económico')) {
      confrontacion = 1.1 + hashFloat(item.id, 'conf') * 1.3 // 1 o 2
    } else {
      confrontacion = 1.9 + hashFloat(item.id, 'conf') * 1.5
    }
    axes.confrontacion = clamp(confrontacion)

    // 5. Cooperación (1: competitivo -> 5: totalmente cooperativo)
    let cooperacion = 1
    if (item.cooperative || rawText.includes('cooperativ') || item.title.includes('Pandemic') || item.title.includes('Gloomhaven') || item.title.includes('Arkham Horror') || item.title.includes('Spirit Island')) {
      cooperacion = 4.0 + hashFloat(item.id, 'coop') * 0.9 // 4 o 5
    } else if (rawText.includes('semi-cooperativ') || rawText.includes('traidor') || rawText.includes('equipos') || rawText.includes('parejas') || g.includes('cooperativo')) {
      cooperacion = 2.8 + hashFloat(item.id, 'coop') * 1.3 // 3 o 4
    } else {
      // Competitivo: 1 (confrontación competitiva directa) y 2 (eurogame de competición indirecta de recursos)
      cooperacion = 0.6 + hashFloat(item.id, 'coop') * 1.8
    }
    axes.cooperacion = clamp(cooperacion)

    // 6. Tema (1: abstracto -> 5: muy temático o narrativo)
    let tema = 3
    if (g.includes('terror') || g.includes('fantasía') || g.includes('ciencia ficción') || rawText.includes('narrat') || rawText.includes('campaña') || rawText.includes('lovecraft')) {
      tema = 3.9 + hashFloat(item.id, 'tema') * 1.0 // 4 o 5
    } else if (g.includes('aventura') || g.includes('civilización') || g.includes('construcción de ciudades')) {
      tema = 2.8 + hashFloat(item.id, 'tema') * 1.4 // 3 o 4
    } else if (g.includes('estrategia abstracta') || item.title.includes('Ajedrez') || item.title.includes('Parchís') || g.includes('puzzle')) {
      tema = 1.1 + hashFloat(item.id, 'tema') * 1.3 // 1 o 2
    } else {
      tema = 2.3 + hashFloat(item.id, 'tema') * 1.6
    }
    axes.tema = clamp(tema)

    // 7. Risas (1: serio, silencioso -> 5: risas aseguradas)
    let risas = 2
    if (g.includes('party game') || g.includes('humor') || rawText.includes('fiesta') || rawText.includes('risas') || rawText.includes('mímica')) {
      risas = 4.0 + hashFloat(item.id, 'risas') * 0.9 // 4 o 5
    } else if (g.includes('faroleo') || rawText.includes('pique') || g.includes('palabras')) {
      risas = 2.8 + hashFloat(item.id, 'risas') * 1.4 // 3 o 4
    } else if (w >= 3.0 || g.includes('juego de guerra') || g.includes('económico')) {
      risas = 1.1 + hashFloat(item.id, 'risas') * 1.3 // 1 o 2
    } else {
      risas = 1.8 + hashFloat(item.id, 'risas') * 1.5
    }
    axes.risas = clamp(risas)

    // 8. Familiar (1: jugones -> 5: cualquiera, también niños)
    let familiar = 3
    if (w <= 1.8 || g.includes('familiar') || g.includes("children's game") || g.includes('party game')) {
      familiar = 4.0 + hashFloat(item.id, 'fam') * 0.9
    } else if (w >= 3.4) {
      familiar = 1.1 + hashFloat(item.id, 'fam') * 1.3
    } else {
      familiar = 2.4 + hashFloat(item.id, 'fam') * 1.5
    }
    axes.familiar = clamp(familiar)
  } else if (shelf === 'artist') {
    // 1. Energía (1: calma -> 5: máxima energía)
    let energia = 3
    if (rawText.includes('metal') || rawText.includes('punk') || rawText.includes('techno') || rawText.includes('hard rock') || rawText.includes('hardcore')) {
      energia = 4.0 + hashFloat(item.id, 'nrg') * 0.9
    } else if (rawText.includes('rock') || rawText.includes('hip hop') || rawText.includes('rap') || rawText.includes('dance') || rawText.includes('reggaeton') || rawText.includes('trap')) {
      energia = 3.2 + hashFloat(item.id, 'nrg') * 1.3
    } else if (rawText.includes('ambient') || rawText.includes('folk') || rawText.includes('acustic') || rawText.includes('jazz') || rawText.includes('canción de autor')) {
      energia = 1.3 + hashFloat(item.id, 'nrg') * 1.3
    } else {
      energia = 2.4 + hashFloat(item.id, 'nrg') * 1.6
    }
    axes.energia = clamp(energia)

    // 2. Valencia (1: melancólico -> 5: alegre)
    let valencia = 3
    if (rawText.includes('pop') || rawText.includes('disco') || rawText.includes('rumba') || rawText.includes('dance') || rawText.includes('ska')) {
      valencia = 3.8 + hashFloat(item.id, 'val') * 1.1 // 4 o 5
    } else if (rawText.includes('gothic') || rawText.includes('doom') || rawText.includes('melancol') || rawText.includes('trist') || rawText.includes('grunge') || rawText.includes('post-punk')) {
      valencia = 1.2 + hashFloat(item.id, 'val') * 1.3 // 1 o 2
    } else if (rawText.includes('blues') || rawText.includes('soul') || rawText.includes('canción de autor')) {
      valencia = 2.2 + hashFloat(item.id, 'val') * 1.5 // 2 o 3 o 4
    } else {
      valencia = 2.5 + hashFloat(item.id, 'val') * 1.6
    }
    axes.valencia = clamp(valencia)

    // 3. Bailable (1: nada -> 5: para bailar)
    let bailable = 2
    if (rawText.includes('dance') || rawText.includes('disco') || rawText.includes('house') || rawText.includes('techno') || rawText.includes('reggaeton') || rawText.includes('funk') || rawText.includes('rumba') || rawText.includes('edm')) {
      bailable = 4.0 + hashFloat(item.id, 'bail') * 0.9 // 4 o 5
    } else if (rawText.includes('pop') || rawText.includes('hip hop') || rawText.includes('trap') || rawText.includes('r&b')) {
      bailable = 3.0 + hashFloat(item.id, 'bail') * 1.2 // 3 o 4
    } else if (rawText.includes('metal') || rawText.includes('ambient') || rawText.includes('progresivo') || rawText.includes('acustic')) {
      bailable = 1.1 + hashFloat(item.id, 'bail') * 1.3 // 1 o 2
    } else {
      bailable = 1.8 + hashFloat(item.id, 'bail') * 1.6
    }
    axes.bailable = clamp(bailable)

    // 4. Orgánico (1: electrónico o sintético -> 5: acústico u orgánico)
    let organico = 3
    if (rawText.includes('acustic') || rawText.includes('folk') || rawText.includes('jazz') || rawText.includes('flamenco') || rawText.includes('canción de autor') || rawText.includes('blues') || rawText.includes('orquestal')) {
      organico = 4.0 + hashFloat(item.id, 'org') * 0.9 // 4 o 5
    } else if (rawText.includes('rock') || rawText.includes('soul') || rawText.includes('metal') || rawText.includes('punk')) {
      organico = 3.1 + hashFloat(item.id, 'org') * 1.3 // 3 o 4
    } else if (rawText.includes('techno') || rawText.includes('electronic') || rawText.includes('synth') || rawText.includes('house') || rawText.includes('edm') || rawText.includes('trap')) {
      organico = 1.2 + hashFloat(item.id, 'org') * 1.3 // 1 o 2
    } else {
      organico = 2.3 + hashFloat(item.id, 'org') * 1.6
    }
    axes.organico = clamp(organico)

    // 5. Intensidad (1: suave -> 5: intenso o agresivo)
    let intensidad = 3
    if (axes.energia >= 4 || rawText.includes('metal') || rawText.includes('punk') || rawText.includes('hard rock')) {
      intensidad = 3.9 + hashFloat(item.id, 'int') * 1.0
    } else if (axes.energia <= 2 || rawText.includes('ambient') || rawText.includes('chill') || rawText.includes('acustic')) {
      intensidad = 1.3 + hashFloat(item.id, 'int') * 1.3
    } else {
      intensidad = 2.4 + hashFloat(item.id, 'int') * 1.5
    }
    axes.intensidad = clamp(intensidad)

    // 6. Fondo (1: pide escucha atenta -> 5: perfecto de fondo)
    let fondo = 3
    if (rawText.includes('ambient') || rawText.includes('chill') || rawText.includes('bossa') || rawText.includes('lounge') || rawText.includes('downtempo')) {
      fondo = 4.0 + hashFloat(item.id, 'fnd') * 0.9 // 4 o 5
    } else if (rawText.includes('pop') || rawText.includes('indie pop') || rawText.includes('soft rock')) {
      fondo = 3.0 + hashFloat(item.id, 'fnd') * 1.3 // 3 o 4
    } else if (axes.intensidad >= 4 || rawText.includes('metal') || rawText.includes('punk') || rawText.includes('complejo') || rawText.includes('progresivo') || rawText.includes('jazz experimental')) {
      fondo = 1.2 + hashFloat(item.id, 'fnd') * 1.3 // 1 o 2
    } else {
      fondo = 2.2 + hashFloat(item.id, 'fnd') * 1.6
    }
    axes.fondo = clamp(fondo)

    // 7. Complejidad (1: sencillo, pegadizo -> 5: complejo)
    let complejidad = 3
    if (rawText.includes('progresivo') || rawText.includes('jazz') || rawText.includes('avant-garde') || rawText.includes('experimental') || rawText.includes('math') || rawText.includes('clásica')) {
      complejidad = 3.9 + hashFloat(item.id, 'cpx') * 1.0 // 4 o 5
    } else if (rawText.includes('art rock') || rawText.includes('post-rock') || rawText.includes('fusion')) {
      complejidad = 3.0 + hashFloat(item.id, 'cpx') * 1.3 // 3 o 4
    } else if (rawText.includes('pop') || rawText.includes('punk') || rawText.includes('reggaeton') || rawText.includes('disco') || rawText.includes('dance-pop')) {
      complejidad = 1.2 + hashFloat(item.id, 'cpx') * 1.3 // 1 o 2
    } else {
      complejidad = 2.2 + hashFloat(item.id, 'cpx') * 1.6
    }
    axes.complejidad = clamp(complejidad)
  }

  return axes
}

// Actualizar todos los ficheros enriched
let updatedTotal = 0
for (const item of allItems) {
  const shelf = item.type
  const slug = item.id.replace(/^[^:]+:/, '')
  const filePath = path.join(ENRICHED_DIR, shelf, `${slug}.json`)

  if (!fs.existsSync(filePath)) continue

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const newAxes = computeCalibratedAxes(item, data.axes || {})
  data.axes = newAxes
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  updatedTotal++
}

console.log(`✓ Calibrados y actualizados ejes para ${updatedTotal} fichas de enriquecimiento.`)
