'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Map, QrCode, Check } from 'lucide-react'
import { generateShareUrl } from '@/lib/utils'
import Button from '@/components/ui/Button'

interface ShareSheetProps {
  occurrenceId: string
  latitude: number
  longitude: number
  onClose: () => void
}

export default function ShareSheet({ occurrenceId, latitude, longitude, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const shareUrl = generateShareUrl(occurrenceId)

  useEffect(() => {
    // Generate QR code as data URL using a simple approach
    const encoded = encodeURIComponent(shareUrl)
    setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded}`)
  }, [shareUrl])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenMaps = () => {
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank')
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 rounded-t-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Compartilhar</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-500" />}
            <div>
              <p className="text-sm font-medium text-gray-900">{copied ? 'Link copiado!' : 'Copiar link'}</p>
              <p className="text-xs text-gray-500 truncate">{shareUrl}</p>
            </div>
          </button>

          <button
            onClick={handleOpenMaps}
            className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <Map className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Abrir no Google Maps</p>
              <p className="text-xs text-gray-500">{latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
            </div>
          </button>

          {qrDataUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
              <QrCode className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-2">QR Code</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR Code" className="h-24 w-24 rounded-lg" />
              </div>
            </div>
          )}
        </div>

        <Button variant="secondary" className="w-full mt-4" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </>
  )
}
