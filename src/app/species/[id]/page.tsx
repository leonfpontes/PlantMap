import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { AlertTriangle, BookOpen, ExternalLink, Globe, Leaf, MapPin, Plus } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import { getSpeciesWithProfile } from '@/lib/actions/speciesProfiles'
import { ORIGIN_LABEL } from '@/constants/plant'

/**
 * Ficha da erva: para que serve, uso ritual, orixás e cuidados. O conteúdo
 * vem do guia de ervas da casa (fonte 'casa') ou de pesquisa pública (fonte
 * 'web') — a tela sempre diz qual, porque não têm o mesmo peso.
 */
export default async function SpeciesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { species, profile, loggedIn, canRegister } = await getSpeciesWithProfile(id)
  if (!species) notFound()

  const nome = species.common_name

  return (
    <MobileShell>
      <PageHeader title={nome} />

      <div className="flex-1 overflow-y-auto">
        {species.image_url && (
          <div className="relative h-48 w-full bg-green-50 dark:bg-green-950">
            <Image
              src={species.image_url}
              alt={nome}
              fill
              sizes="(min-width: 1024px) 672px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        <div className="flex flex-col gap-4 p-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{nome}</h2>
            {species.scientific_name && (
              <p className="text-sm italic text-gray-500 dark:text-gray-400">{species.scientific_name}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {[species.family, ORIGIN_LABEL[species.origin]].filter(Boolean).join(' · ')}
            </p>
          </div>

          {/* Onde achar e, para quem pode, cadastrar um pé novo. */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/search?q=${encodeURIComponent(nome)}`}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700"
            >
              <MapPin className="h-4 w-4" />
              Onde encontrar
            </Link>
            {canRegister ? (
              <Link
                href="/plant/register"
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
                Cadastrar um pé
              </Link>
            ) : <span />}
          </div>

          {!loggedIn ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/60">
              <BookOpen className="mx-auto mb-2 h-7 w-7 text-green-700 dark:text-green-400" />
              <p className="font-semibold text-gray-900 dark:text-gray-100">A ficha de uso é para quem faz parte</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Entre para ver para que serve, orixás, uso ritual e cuidados desta erva.
              </p>
              <Link
                href="/auth/login"
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-5 text-sm font-semibold text-white hover:bg-green-800 dark:bg-green-600"
              >
                Entrar
              </Link>
            </div>
          ) : !profile ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300">
              Ainda não temos a ficha de uso desta erva. Na dúvida, confirme com os sacerdotes da casa.
            </div>
          ) : (
            <>
              {profile.fonte === 'casa' ? (
                <p className="flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-xs text-green-900 dark:bg-green-900/30 dark:text-green-100">
                  <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    Do <strong>guia de ervas da casa</strong>. Uso ritual é ensinamento da casa, não orientação de
                    saúde; na dúvida, confirme com os sacerdotes.
                  </span>
                </p>
              ) : (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                  <Globe className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    <strong>Pesquisa em fontes públicas</strong>, não é ensinamento da casa. Confirme com os
                    sacerdotes antes de usar em ritual.
                  </span>
                </p>
              )}

              {(profile.temperatura || profile.parte_usada || profile.cor) && (
                <dl className="grid grid-cols-2 gap-2">
                  {profile.temperatura && <Fact label="Temperatura" value={profile.temperatura} />}
                  {profile.parte_usada && <Fact label="Parte usada" value={profile.parte_usada} />}
                  {profile.cor && <Fact label="Cor energética" value={profile.cor} />}
                </dl>
              )}

              {profile.orixas.length > 0 && <Chips title="Orixás e linhas" items={profile.orixas} />}
              {profile.verbos.length > 0 && <Chips title="O que ela movimenta" items={profile.verbos} subtle />}

              {profile.resumo && (
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">{profile.resumo}</p>
              )}

              {profile.para_que_serve.length > 0 && <Bullets title="Para que serve" items={profile.para_que_serve} />}
              {profile.uso_ritual.length > 0 && <Bullets title="Uso ritual" items={profile.uso_ritual} />}

              {profile.cuidados.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-900 dark:text-amber-100">
                    <AlertTriangle className="h-4 w-4" />
                    Cuidados
                  </h3>
                  <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-amber-900 dark:text-amber-100">
                    {profile.cuidados.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </section>
              )}

              {profile.fontes_urls.length > 0 && (
                <section>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fontes</h3>
                  <ul className="flex flex-col gap-1">
                    {profile.fontes_urls.map((u) => (
                      <li key={u}>
                        <a
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1 truncate text-xs text-green-700 hover:underline dark:text-green-400"
                        >
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{new URL(u).hostname.replace(/^www\./, '')}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {!species.image_url && !profile && loggedIn && (
            <Leaf className="mx-auto h-10 w-10 text-gray-200 dark:text-gray-700" aria-hidden="true" />
          )}
        </div>
      </div>

      <BottomNav />
    </MobileShell>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-800/60">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
  )
}

function Chips({ title, items, subtle }: { title: string; items: string[]; subtle?: boolean }) {
  return (
    <section>
      <h3 className="mb-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span
            key={i}
            className={subtle
              ? 'rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200'
              : 'rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300'}
          >
            {i}
          </span>
        ))}
      </div>
    </section>
  )
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="mb-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </section>
  )
}
