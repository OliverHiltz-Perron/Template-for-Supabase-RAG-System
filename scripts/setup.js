require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

async function setupDatabase() {
  console.log('================================================');
  console.log('  Supabase RAG System - Database Setup');
  console.log('================================================\n');

  // Validate environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'OPENAI_API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease add these to your .env file');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    // Test connection and check if tables exist
    console.log('Checking database status...');
    const { data: testData, error: testError } = await supabase
      .from('documents')
      .select('id')
      .limit(1);

    if (testError && testError.message.includes('does not exist')) {
      console.log('\n📊 Database tables not found. Setting up from scratch...\n');
      
      // Read the SQL setup file
      const sqlFilePath = path.join(__dirname, 'supabase-setup.sql');
      const sqlContent = await fs.readFile(sqlFilePath, 'utf-8');
      
      console.log('================================================');
      console.log('  IMPORTANT: Manual Step Required');
      console.log('================================================\n');
      console.log('Please follow these steps to complete the setup:\n');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to: SQL Editor → New Query');
      console.log('3. Copy and paste the contents from:\n');
      console.log(`   ${sqlFilePath}\n`);
      console.log('   OR copy the SQL below:');
      console.log('\n--- START OF SQL SCRIPT ---\n');
      
      // Output first part of SQL for visibility
      const sqlLines = sqlContent.split('\n');
      const previewLines = sqlLines.slice(0, 50);
      console.log(previewLines.join('\n'));
      console.log('\n... [Full script available in scripts/supabase-setup.sql]');
      console.log('\n--- END OF SQL PREVIEW ---\n');
      
      console.log('4. Click "Run" to execute the script');
      console.log('5. You should see "Setup Complete!" message');
      console.log('6. Run this setup script again to verify\n');
      
      console.log('================================================\n');
      
      // Also save a copy with timestamp for easy access
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputPath = path.join(process.cwd(), `supabase-setup-${timestamp}.sql`);
      await fs.writeFile(outputPath, sqlContent);
      console.log(`💾 Full SQL script saved to: ${outputPath}\n`);
      
      console.log('⏸️  Setup paused. Please run the SQL script and then run this setup again.');
      process.exit(0);
      
    } else if (testError) {
      console.error('❌ Error connecting to Supabase:', testError.message);
      console.error('\nPlease check your SUPABASE_URL and SUPABASE_ANON_KEY');
      process.exit(1);
    } else {
      console.log('✅ Database tables found!\n');
      
      // Verify table structure
      console.log('Verifying table structure...');
      
      // Check documents table
      const { data: docCount, error: docError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });
      
      if (!docError) {
        console.log(`✅ Documents table: OK (${docCount} documents)`);
      } else {
        console.log('⚠️  Documents table exists but may need updates');
      }
      
      // Check query_logs table
      const { data: logCount, error: logError } = await supabase
        .from('query_logs')
        .select('*', { count: 'exact', head: true });
      
      if (!logError) {
        console.log(`✅ Query logs table: OK (${logCount} logs)`);
      } else {
        console.log('⚠️  Query logs table exists but may need updates');
      }
      
      // Check processing_status table
      const { data: statusCount, error: statusError } = await supabase
        .from('processing_status')
        .select('*', { count: 'exact', head: true });
      
      if (!statusError) {
        console.log(`✅ Processing status table: OK (${statusCount} records)`);
      } else {
        console.log('ℹ️  Processing status table not found (optional)');
      }
      
      // Test vector search function
      console.log('\nTesting vector search function...');
      try {
        // Create a dummy embedding (1536 dimensions of 0)
        const dummyEmbedding = new Array(1536).fill(0);
        
        const { data: searchTest, error: searchError } = await supabase.rpc('match_documents', {
          query_embedding: dummyEmbedding,
          match_count: 1
        });
        
        if (!searchError) {
          console.log('✅ Vector search function: OK');
        } else {
          console.log('⚠️  Vector search function may need to be created');
          console.log('   Run the SQL setup script to create it');
        }
      } catch (e) {
        console.log('⚠️  Could not test vector search function');
      }
    }

    // Verify OpenAI API key
    console.log('\nVerifying OpenAI API key...');
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    try {
      await openai.models.list();
      console.log('✅ OpenAI API key: Valid');
      
      // Test embedding generation
      const embeddingTest = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'test'
      });
      
      if (embeddingTest.data && embeddingTest.data[0].embedding.length === 1536) {
        console.log('✅ Embedding generation: OK (1536 dimensions)');
      }
    } catch (error) {
      console.error('❌ Invalid OpenAI API key:', error.message);
      process.exit(1);
    }

    // Check for optional LlamaParse key
    console.log('\nChecking optional services...');
    if (process.env.LLAMAPARSE_API_KEY) {
      console.log('✅ LlamaParse API key: Configured (PDF support enabled)');
    } else {
      console.log('ℹ️  LlamaParse API key: Not configured (PDF support disabled)');
      console.log('   To enable PDF support, add LLAMAPARSE_API_KEY to .env');
    }
    
    if (process.env.JINA_API_KEY) {
      console.log('✅ Jina API key: Configured (reranking enabled)');
    } else {
      console.log('ℹ️  Jina API key: Not configured (reranking disabled)');
    }

    console.log('\n================================================');
    console.log('  Setup Status: READY');
    console.log('================================================\n');
    console.log('Next steps:');
    console.log('1. Add documents to the /docs folder');
    console.log('2. Run: npm run process');
    console.log('3. Start the app: npm run dev\n');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };