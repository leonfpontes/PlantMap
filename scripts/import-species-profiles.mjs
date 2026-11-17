#!/usr/bin/env node
/**
 * Gera o SQL que carrega as fichas de uso das ervas (tabela species_profiles,
 * migration 032) a partir de:
 *   - o guia de ervas da casa, no cofre do Obsidian (fonte 'casa');
 *   - pesquisas na web para as ervas que o guia não cobre (fonte 'web').
 *
 * O conteúdo NÃO entra no repositório (ele é público e o material é
 * ensinamento do terreiro): este script só lê as fontes e escreve um .sql
 * fora do projeto, que é aplicado direto no banco.
 *
 * Uso:
 *   node scripts/import-species-profiles.mjs \
 *     --brain ~/Documents/Brain/10-notes/ervas \
 *     --species /tmp/species.json         # [{id, common_name}] das espécies aprovadas
 *     --web /tmp/web_1.json --web /tmp/web_2.json \
 *     --out /tmp/species_profiles.sql
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const optAll = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []))

const brainDir = opt('brain')
const speciesPath = opt('species')
const outPath = opt('out')
const webPaths = optAll('web')
if (!brainDir || !speciesPath || !outPath) {
  console.error('Uso: --brain <pasta> --species <json> [--web <json>...] --out <sql>')
  process.exit(1)
}

// ── Normalização de nomes (mesma ideia da busca do app: sem acento/pontuação) ──
export const norm = (s) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const splitNames = (s) => s.split(/\s*\/\s*/).map(norm).filter(Boolean)

// ── Limpeza do markdown do Obsidian para texto corrido ──
function clean(text) {
  return text
    .replace(/\s*\(\[\[[^\]]+\]\]\)/g, '') // "(... [[link]])" de referência
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1') // [[alvo|texto]] -> texto
    .replace(/\[\[([^\]]+)\]\]/g, (_, s) => s.replace(/^umbanda-(orixa-)?/, '').replace(/-/g, ' '))
    .replace(/\*\*|__/g, '')
    .replace(/(^|\s)\*([^*]+)\*/g, '$1$2')
    .replace(/⚠️\s*/g, '')
    .replace(/\s+\(guia da casa\)|\s+\(planilha 100 ervas\)|\s+\(planilha 100 ervas e orixás\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function section(body, title) {
  const re = new RegExp(`^## ${title}\\s*$([\\s\\S]*?)(?=^## |\\Z)`, 'm')
  const m = body.match(re)
  return m ? m[1] : ''
}

function field(body, label) {
  const m = body.match(new RegExp(`^\\*\\*${label}[^*]*:\\*\\*\\s*(.+)$`, 'm'))
  return m ? m[1].trim() : null
}

const list = (v) => (v ? clean(v).split(/\s*[,·]\s*/).map((x) => x.trim()).filter(Boolean) : [])

export function parseBrainNote(raw) {
  const fm = raw.match(/^---\n([\s\S]*?)\n---/)
  const front = fm ? fm[1] : ''
  const body = fm ? raw.slice(fm[0].length) : raw

  const title = (front.match(/^title:\s*"?(.*?)"?\s*$/m) || [])[1]
  const aliasesRaw = (front.match(/^aliases:\s*\[(.*)\]/m) || [])[1]
  const aliases = aliasesRaw ? aliasesRaw.split(',').map((x) => x.trim().replace(/^"|"$/g, '')) : []
  const outros = field(body, 'Outros nomes')
  const names = [title, ...aliases, ...(outros ? clean(outros).split(/\s*[,;]\s*/) : [])].filter(Boolean)

  // Temperatura: primeiro valor, antes das fontes entre parênteses.
  const tempRaw = field(body, 'Temperatura')
  const temperatura = tempRaw ? clean(tempRaw.split(/\s*·\s*/)[0].replace(/\s*\*\(.*$/, '')) : null

  // Para que serve: ações da planilha + bullets ensinados no curso.
  const pqs = []
  for (const line of section(body, 'Para que serve').split('\n')) {
    const t = line.trim()
    if (!t) continue
    const acoes = t.match(/^\*\*Ações registradas[^*]*:\*\*\s*(.+)$/)
    if (acoes) { pqs.push(capitalize(clean(acoes[1]))); continue }
    if (/^\*\*[^*]+:\*\*\s*$/.test(t)) continue // cabeçalho sem valor ("Função ensinada no curso")
    if (t.startsWith('- ')) pqs.push(capitalize(clean(t.slice(2))))
    else if (!t.startsWith('>')) pqs.push(capitalize(clean(t)))
  }

  // Uso ritual: aplicações, indicações e os bullets — sem a lista por orixá
  // (os orixás já ficam no campo próprio).
  const uso = []
  for (const line of section(body, 'Uso ritualístico').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('>')) continue
    if (/^\*\*(Por Orixá|No índice)/.test(t)) continue
    if (/^- \*\*[^*]+\*\* — /.test(t)) continue // linhas "Orixá — erva quente; ..."
    const ap = t.match(/^\*\*Aplicações[^*]*:\*\*\s*(.+)$/)
    if (ap) { uso.push(`Aplicações: ${list(ap[1]).join(', ')}`); continue }
    const ind = t.match(/^\*\*Indicações[^*]*:\*\*\s*(.+)$/)
    if (ind) { uso.push(`Indicações: ${clean(ind[1])}`); continue }
    if (/^\*\*[^*]+:\*\*/.test(t)) continue
    if (t.startsWith('- ')) uso.push(capitalize(clean(t.slice(2))))
  }

  const cuidados = section(body, 'Cuidados')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => capitalize(clean(l.slice(2))))

  // Resumo: primeiro parágrafo da vivência de ervas, quando houver.
  const viv = section(body, 'Na vivência de ervas')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('>'))
  const resumo = viv ? clean(viv) : null

  return {
    names,
    profile: {
      fonte: 'casa',
      resumo,
      temperatura,
      parte_usada: field(body, 'Parte usada') ? clean(field(body, 'Parte usada')) : null,
      cor: field(body, 'Cor energética') ? clean(field(body, 'Cor energética')) : null,
      orixas: list(field(body, 'Orixás e linhas')),
      verbos: list(field(body, 'Verbos')),
      para_que_serve: [...new Set(pqs)].slice(0, 10),
      uso_ritual: [...new Set(uso)].slice(0, 12),
      cuidados: [...new Set(cuidados)].slice(0, 12),
      fontes_urls: [],
    },
  }
}

// ── SQL ──
const q = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const arr = (a) => (a && a.length ? `array[${a.map(q).join(', ')}]::text[]` : `'{}'::text[]`)

function upsert(speciesId, p) {
  return `insert into public.species_profiles (species_id, fonte, resumo, temperatura, parte_usada, cor, orixas, verbos, para_que_serve, uso_ritual, cuidados, fontes_urls, updated_at)
values (${q(speciesId)}, ${q(p.fonte)}, ${q(p.resumo)}, ${q(p.temperatura)}, ${q(p.parte_usada)}, ${q(p.cor)}, ${arr(p.orixas)}, ${arr(p.verbos)}, ${arr(p.para_que_serve)}, ${arr(p.uso_ritual)}, ${arr(p.cuidados)}, ${arr(p.fontes_urls)}, now())
on conflict (species_id) do update set fonte = excluded.fonte, resumo = excluded.resumo, temperatura = excluded.temperatura, parte_usada = excluded.parte_usada, cor = excluded.cor, orixas = excluded.orixas, verbos = excluded.verbos, para_que_serve = excluded.para_que_serve, uso_ritual = excluded.uso_ritual, cuidados = excluded.cuidados, fontes_urls = excluded.fontes_urls, updated_at = now();`
}

// ── Execução ──
const species = JSON.parse(fs.readFileSync(speciesPath, 'utf8'))

const brain = new Map()
for (const f of fs.readdirSync(brainDir).filter((f) => f.endsWith('.md'))) {
  const parsed = parseBrainNote(fs.readFileSync(path.join(brainDir, f), 'utf8'))
  for (const n of parsed.names) for (const k of splitNames(n)) if (!brain.has(k)) brain.set(k, parsed.profile)
}

const web = new Map()
for (const p of webPaths) {
  for (const item of JSON.parse(fs.readFileSync(p, 'utf8'))) {
    const vazio = !item.para_que_serve?.length && !item.uso_ritual?.length && !item.cuidados?.length && !item.orixas?.length
    if (vazio) continue
    web.set(norm(item.common_name), {
      fonte: 'web',
      resumo: null,
      temperatura: item.temperatura ?? null,
      parte_usada: item.parte_usada ?? null,
      cor: null,
      orixas: item.orixas ?? [],
      verbos: [],
      para_que_serve: item.para_que_serve ?? [],
      uso_ritual: item.uso_ritual ?? [],
      cuidados: item.cuidados ?? [],
      fontes_urls: item.fontes ?? [],
    })
  }
}

const sql = ['begin;']
let casa = 0, daWeb = 0, sem = 0
for (const sp of species) {
  const p = splitNames(sp.common_name).map((k) => brain.get(k)).find(Boolean) ?? web.get(norm(sp.common_name))
  if (!p) { sem++; continue }
  p.fonte === 'casa' ? casa++ : daWeb++
  sql.push(upsert(sp.id, p))
}
sql.push('commit;')
fs.writeFileSync(outPath, sql.join('\n\n') + '\n')
console.log(`Fichas: ${casa} da casa, ${daWeb} da web, ${sem} sem ficha → ${outPath}`)
