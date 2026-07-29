/**
 * Animação de carregamento temática: uma semente brota, ganha folhas e
 * floresce, depois desvanece e recomeça — o mesmo ciclo de vida que o app
 * já usa para classificar plantas (muda → jovem → adulta), só que em loop.
 * Puro SVG + CSS (@keyframes em globals.css), sem dependência nova.
 */
export default function SproutLoader({ label = 'Brotando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-label={label}>
      <svg viewBox="0 0 120 140" className="h-28 w-28" aria-hidden="true">
        {/* Terra */}
        <ellipse cx="60" cy="126" rx="28" ry="6" className="fill-black/10 dark:fill-white/10" />

        {/* Semente/base — sempre visível, é o "estado de repouso" do loop */}
        <ellipse cx="60" cy="123" rx="7" ry="4" className="fill-amber-800 dark:fill-amber-700" />

        {/* Caule: desenhado via stroke-dashoffset (pathLength normaliza p/ 100) */}
        <path
          d="M60 123 C 61 108, 58 90, 60 68"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={100}
          className="sprout-stem stroke-green-600 dark:stroke-green-500"
        />

        {/* Folha esquerda */}
        <path
          d="M58 100 C 46 96, 36 100, 32 110 C 44 112, 55 108, 58 100 Z"
          className="sprout-leaf-left fill-green-600 dark:fill-green-500"
        />

        {/* Folha direita */}
        <path
          d="M62 86 C 74 81, 84 85, 88 95 C 76 98, 65 94, 62 86 Z"
          className="sprout-leaf-right fill-green-500 dark:fill-green-400"
        />

        {/* Flor no topo */}
        <g className="sprout-flower">
          <circle cx="52" cy="66" r="5" className="fill-pink-300 dark:fill-pink-400" />
          <circle cx="68" cy="66" r="5" className="fill-pink-300 dark:fill-pink-400" />
          <circle cx="60" cy="58" r="5" className="fill-pink-300 dark:fill-pink-400" />
          <circle cx="60" cy="72" r="5" className="fill-pink-300 dark:fill-pink-400" />
          <circle cx="60" cy="66" r="4.5" className="fill-yellow-400 dark:fill-yellow-500" />
        </g>
      </svg>
      <p className="text-sm font-medium text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  )
}
