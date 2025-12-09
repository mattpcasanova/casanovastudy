// Quick test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Manually read .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=#+]+)=(.+)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Testing Supabase Connection...')
console.log('URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET')
console.log('Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 30)}...` : 'NOT SET')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Environment variables are not set!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test query
supabase
  .from('study_guides')
  .select('count')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      process.exit(1)
    }
    console.log('✅ Supabase connection successful!')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Unexpected error:', err.message)
    process.exit(1)
  })
