import { PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_UPDATED_AT } from '@/constants/privacyPolicy'

/** Texto da política de privacidade, reusado no modal de aceite e em /profile/privacy. */
export default function PrivacyPolicyContent() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Última atualização: {new Date(PRIVACY_POLICY_UPDATED_AT).toLocaleDateString('pt-BR')}
      </p>
      {PRIVACY_POLICY_SECTIONS.map((section) => (
        <div key={section.heading}>
          <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{section.heading}</h3>
          {section.paragraphs.map((p, i) => (
            <p key={i} className="mb-1 text-sm text-gray-600 dark:text-gray-300">{p}</p>
          ))}
        </div>
      ))}
    </div>
  )
}
