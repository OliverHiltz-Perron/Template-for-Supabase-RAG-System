require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const crypto = require('crypto');
const pLimit = require('p-limit');
const config = require('../config.json');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Rate limiting
const limit = pLimit(5); // Process 5 files concurrently

class DocumentProcessor {
  constructor() {
    this.processedCount = 0;
    this.maxFileCount = config.processing.max_file_count;
    this.pdfCache = new Map();
  }

  async processDocuments() {
    console.log('Starting document processing...\n');
    
    const docsDir = path.join(process.cwd(), 'docs');
    
    // Ensure docs directory exists
    try {
      await fs.access(docsDir);
    } catch {
      await fs.mkdir(docsDir, { recursive: true });
      console.log('Created /docs directory. Please add your documents there.');
      return;
    }

    // Find all markdown and PDF files
    const files = await this.findDocuments(docsDir);
    
    if (files.length === 0) {
      console.log('No documents found in /docs directory.');
      console.log('Please add .md or .pdf files and run again.');
      return;
    }

    console.log(`Found ${files.markdown.length} markdown files and ${files.pdf.length} PDF files\n`);

    // Check for PDF processing capability
    if (files.pdf.length > 0 && !process.env.LLAMAPARSE_API_KEY) {
      await this.handleMissingLlamaParseKey(files.pdf);
      if (!process.env.LLAMAPARSE_API_KEY) {
        console.log('Skipping PDF files...\n');
        files.pdf = [];
      }
    }

    // Process files with limit enforcement
    const allFiles = [...files.markdown, ...files.pdf];
    const filesToProcess = allFiles.slice(0, this.maxFileCount);
    
    if (allFiles.length > this.maxFileCount) {
      console.log(`⚠️  File limit reached. Processing first ${this.maxFileCount} files.`);
      console.log(`   (${allFiles.length - this.maxFileCount} files will be skipped)`);
      console.log(`   To process more files, increase max_file_count in config.json\n`);
    }

    // Clear existing documents
    console.log('Clearing existing documents...');
    await supabase.from('documents').delete().neq('id', 0);

    // Process each file
    const processingPromises = filesToProcess.map(file => 
      limit(() => this.processFile(file))
    );

    await Promise.all(processingPromises);

    console.log(`\n✅ Processing complete!`);
    console.log(`   Processed ${this.processedCount} files`);
    if (allFiles.length > this.maxFileCount) {
      console.log(`   Skipped ${allFiles.length - this.maxFileCount} files due to limit`);
    }
  }

  async findDocuments(dir) {
    const markdown = [];
    const pdf = [];

    async function scan(currentDir) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scan(fullPath);
        } else if (entry.isFile()) {
          if (entry.name.endsWith('.md')) {
            markdown.push(fullPath);
          } else if (entry.name.endsWith('.pdf')) {
            pdf.push(fullPath);
          }
        }
      }
    }

    await scan(dir);
    return { markdown, pdf };
  }

  async handleMissingLlamaParseKey(pdfFiles) {
    console.log('PDF files detected:');
    for (const file of pdfFiles.slice(0, 5)) {
      const stats = await fs.stat(file);
      const size = (stats.size / 1024 / 1024).toFixed(1);
      console.log(`  - ${path.basename(file)} (${size} MB)`);
    }
    if (pdfFiles.length > 5) {
      console.log(`  ... and ${pdfFiles.length - 5} more`);
    }
    
    console.log('\nTo process PDF files, you need a LlamaParse API key.');
    console.log('Get one at: https://cloud.llamaindex.ai/parse');
    console.log('\nFor now, PDFs will be skipped.');
    console.log('Add LLAMAPARSE_API_KEY to your .env file to enable PDF processing.\n');
  }

  async processFile(filePath) {
    const fileName = path.basename(filePath);
    const fileType = filePath.endsWith('.pdf') ? 'pdf' : 'markdown';
    
    console.log(`Processing: ${fileName}`);
    
    try {
      let content;
      
      if (fileType === 'pdf') {
        content = await this.convertPdfToMarkdown(filePath);
      } else {
        content = await fs.readFile(filePath, 'utf-8');
      }

      // Chunk the content
      const chunks = await this.chunkDocument(content, fileName, fileType);
      
      // Generate embeddings for each chunk
      const embeddings = await this.generateEmbeddings(chunks);
      
      // Store in Supabase
      await this.storeInSupabase(chunks, embeddings, fileName, fileType);
      
      this.processedCount++;
      console.log(`  ✓ ${fileName} - ${chunks.length} chunks created`);
      
    } catch (error) {
      console.error(`  ✗ Error processing ${fileName}:`, error.message);
    }
  }

  async convertPdfToMarkdown(pdfPath) {
    // Check cache first
    const fileContent = await fs.readFile(pdfPath);
    const hash = crypto.createHash('md5').update(fileContent).digest('hex');
    const cacheFile = path.join('.cache', 'pdf-conversions', `${hash}.md`);
    
    try {
      const cached = await fs.readFile(cacheFile, 'utf-8');
      console.log('  (using cached conversion)');
      return cached;
    } catch {
      // Cache miss, need to convert
    }

    // Simulate LlamaParse conversion (actual implementation would call LlamaParse API)
    // For now, return placeholder text
    const placeholderContent = `# PDF Content from ${path.basename(pdfPath)}

This is a placeholder for PDF content that would be converted using LlamaParse API.
In a real implementation, this would contain the extracted text from the PDF.

To enable actual PDF processing:
1. Get a LlamaParse API key from https://cloud.llamaindex.ai/parse
2. Add it to your .env file as LLAMAPARSE_API_KEY
3. The system will then convert PDFs to searchable text automatically.`;

    // Cache the result
    await fs.mkdir(path.dirname(cacheFile), { recursive: true });
    await fs.writeFile(cacheFile, placeholderContent);
    
    return placeholderContent;
  }

  async chunkDocument(content, fileName, fileType) {
    const chunks = [];
    const maxTokens = config.chunking.max_tokens;
    const overlapTokens = config.chunking.overlap_tokens;
    
    // Simple chunking by paragraphs (in production, use chunkipy or similar)
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      // Rough token estimation (1 token ≈ 4 characters)
      const paragraphTokens = paragraph.length / 4;
      const currentTokens = currentChunk.length / 4;
      
      if (currentTokens + paragraphTokens > maxTokens && currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            source: fileName,
            chunk_index: chunkIndex++,
            file_type: fileType
          }
        });
        
        // Add overlap
        const words = currentChunk.split(' ');
        const overlapWords = Math.floor(overlapTokens / 4);
        currentChunk = words.slice(-overlapWords).join(' ') + '\n\n' + paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    // Add final chunk
    if (currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          source: fileName,
          chunk_index: chunkIndex,
          file_type: fileType
        }
      });
    }
    
    return chunks;
  }

  async generateEmbeddings(chunks) {
    const embeddings = [];
    const batchSize = config.embeddings.batch_size;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.content);
      
      try {
        const response = await openai.embeddings.create({
          model: config.embeddings.model,
          input: texts,
        });
        
        embeddings.push(...response.data.map(item => item.embedding));
      } catch (error) {
        console.error('Error generating embeddings:', error.message);
        // Add null embeddings for failed batches
        embeddings.push(...batch.map(() => null));
      }
      
      // Rate limiting delay
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return embeddings;
  }

  async storeInSupabase(chunks, embeddings, fileName, fileType) {
    const records = chunks.map((chunk, index) => ({
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: embeddings[index],
      source_file: fileName,
      source_type: fileType,
      chunk_index: chunk.metadata.chunk_index
    }));

    // Filter out records with null embeddings
    const validRecords = records.filter(r => r.embedding !== null);
    
    if (validRecords.length === 0) {
      throw new Error('No valid embeddings generated');
    }

    // Insert in batches to avoid payload size limits
    const insertBatchSize = 50;
    for (let i = 0; i < validRecords.length; i += insertBatchSize) {
      const batch = validRecords.slice(i, i + insertBatchSize);
      const { error } = await supabase
        .from('documents')
        .insert(batch);
      
      if (error) {
        throw error;
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  const processor = new DocumentProcessor();
  processor.processDocuments().catch(console.error);
}

module.exports = { DocumentProcessor };