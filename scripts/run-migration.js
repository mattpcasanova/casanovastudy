// Script to run the grading_results migration
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
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('📝 Running grading_results migration...')

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/002_create_grading_results.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('SQL to execute:')
  console.log(sql)
  console.log('\n⚠️  Note: You need to run this SQL manually in the Supabase SQL Editor')
  console.log('Go to: https://supabase.com/dashboard/project/_/sql/new')
  console.log('\n📋 Copy the SQL above and paste it into the SQL Editor, then click "Run"')

  // Try to check if table exists
  console.log('\n🔍 Checking if grading_results table exists...')
  const { data, error } = await supabase
    .from('grading_results')
    .select('count')
    .limit(1)

  if (error) {
    if (error.message.includes('relation "public.grading_results" does not exist')) {
      console.log('❌ Table does not exist yet. Please run the migration SQL manually.')
      console.log('\nSteps:')
      console.log('1. Go to Supabase Dashboard > SQL Editor')
      console.log('2. Copy the SQL from: supabase/migrations/002_create_grading_results.sql')
      console.log('3. Paste and run the SQL')
    } else {
      console.error('❌ Error checking table:', error.message)
    }
  } else {
    console.log('✅ Table already exists!')
  }
}

runMigration()
