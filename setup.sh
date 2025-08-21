#!/bin/bash

echo "================================================"
echo "  Supabase RAG Template - Setup Script"
echo "================================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  Please edit .env file and add your API keys:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo "   - OPENAI_API_KEY"
    echo "   - LLAMAPARSE_API_KEY (optional, for PDF support)"
    echo ""
    echo "After adding your keys, run this script again."
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install

# Install frontend dependencies
echo ""
echo "Setting up frontend..."
cd frontend
npx create-react-app . --template typescript 2>/dev/null || echo "Frontend already initialized"
npm install axios react-query @tanstack/react-query tailwindcss @types/react @types/react-dom
npx tailwindcss init -p
cd ..

# Run database setup
echo ""
echo "Setting up Supabase database..."
node scripts/setup.js

echo ""
echo "================================================"
echo "  Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Add your documents to the /docs folder"
echo "2. Run: npm run process"
echo "3. Start the app: npm run dev"
echo ""
echo "Visit http://localhost:3000 to use the search interface"
echo ""