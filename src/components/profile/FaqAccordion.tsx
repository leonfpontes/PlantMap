'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FAQ_CATEGORIES } from '@/constants/faq'

/** Perguntas frequentes em formato sanfona, agrupadas por categoria. */
export default function FaqAccordion() {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-6">
      {FAQ_CATEGORIES.map((category) => (
        <section key={category.category}>
          <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{category.category}</h2>
          <div className="flex flex-col gap-2">
            {category.items.map((item) => {
              const isOpen = openQuestion === item.question
              return (
                <div
                  key={item.question}
                  className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <button
                    type="button"
                    onClick={() => setOpenQuestion(isOpen ? null : item.question)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-gray-400 transition-transform dark:text-gray-500',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <p className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-300">{item.answer}</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
