#!/usr/bin/env node
// Cria os 3 usuarios de teste via GoTrue Admin API.
// Equivalente multiplataforma de create-users.ps1 (macOS/Linux/Windows).
// Uso: node scripts/create-users.mjs

const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJleHAiOjk5OTk5OTk5OTl9.jcTW57KSJMhPD22vLF22Hgd7NdeZGIlTBX4-2NmQ3jM'
const AUTH_URL = 'http://localhost:9999/admin/users'
const HEALTH_URL = 'http://localhost:9999/health'
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

const USERS = [
  { email: 'ana.botanica@plantmap.test', password: 'Plantmap@123', full_name: 'Ana Botanica' },
  { email: 'carlos.verde@plantmap.test', password: 'Plantmap@123', full_name: 'Carlos Verde' },
  { email: 'julia.flora@plantmap.test', password: 'Plantmap@123', full_name: 'Julia Flora' },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForGoTrue() {
  console.log('\n=== Aguardando GoTrue ficar pronto... ===')
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(HEALTH_URL)
      if (res.ok) {
        const body = await res.json()
        if (body.version) return true
      }
    } catch {
      // GoTrue ainda não subiu, tenta de novo
    }
    await sleep(2000)
  }
  return false
}

async function createUser(user) {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.full_name },
    }),
  })

  const body = await res.json().catch(() => ({}))

  if (res.ok) {
    console.log(`OK    ${user.email}  id: ${body.id}`)
    return
  }

  const message = body.msg || body.message || JSON.stringify(body)
  if (message.toLowerCase().includes('already')) {
    console.log(`SKIP  ${user.email}  já existe`)
  } else {
    console.error(`ERRO  ${user.email}  ${message}`)
  }
}

async function main() {
  const ready = await waitForGoTrue()
  if (!ready) {
    console.error('GoTrue não respondeu. Verifique os containers.')
    process.exit(1)
  }
  console.log('GoTrue pronto!\n')

  for (const user of USERS) {
    await createUser(user)
  }

  console.log('\n=== Credenciais de teste ===')
  console.log('Email                              Senha')
  console.log('---------------------------------- ------------')
  for (const user of USERS) {
    console.log(`${user.email.padEnd(35)} ${user.password}`)
  }
  console.log('')
}

main()
