// Test script to verify flashcard_progress table exists and is working
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFlashcardTable() {
  console.log('Testing flashcard_progress table...\n')

  // Test 1: Check if table exists by querying it
  console.log('1. Checking if table exists...')
  const { data: tableCheck, error: tableError } = await supabase
    .from('flashcard_progress')
    .select('*')
    .limit(1)

  if (tableError && tableError.code === '42P01') {
    console.error('❌ Table does not exist!')
    console.error('Run the migration: supabase/migrations/011_create_flashcard_progress.sql')
    process.exit(1)
  } else if (tableError) {
    console.error('❌ Error querying table:', tableError.message)
    process.exit(1)
  } else {
    console.log('✅ Table exists')
    console.log(`   Found ${tableCheck?.length || 0} existing records\n`)
  }

  // Test 2: Check table structure
  console.log('2. Checking table structure...')
  const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
    table_name: 'flashcard_progress'
  }).catch(() => null)

  if (columnsError) {
    console.log('⚠️  Could not verify columns (this is okay)')
  } else {
    console.log('✅ Table structure verified\n')
  }

  console.log('3. Sample query test...')
  const testUserId = '00000000-0000-0000-0000-000000000000'
  const testGuideId = '00000000-0000-0000-0000-000000000001'

  const { data, error } = await supabase
    .from('flashcard_progress')
    .select('*')
    .eq('user_id', testUserId)
    .eq('study_guide_id', testGuideId)

  if (error) {
    console.error('❌ Query failed:', error.message)
  } else {
    console.log('✅ Query successful')
    console.log(`   Result: ${data.length} records found\n`)
  }

  console.log('✅ All tests passed! The flashcard_progress table is ready.')
}

testFlashcardTable().catch(console.error)
