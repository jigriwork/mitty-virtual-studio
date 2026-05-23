# MITTY Virtual Studio - AI Asset Generation Engine

MITTY is a high-fidelity prototype for an AI-powered e-commerce asset generation platform. It transforms raw product photos into professional marketing materials including on-model photography, packshots, and SEO-optimized metadata.

## 🚀 Project Overview
- **Purpose**: Automating e-commerce photoshoots and content creation.
- **Stack**: Next.js 15 (App Router), Genkit (AI Orchestration), Tailwind CSS, ShadCN UI.
- **AI Models**: Gemini 1.5 Flash (Text/Analysis), Gemini 2.0 Flash & Imagen 2 (Image Generation).

## 📊 Technical Audit
A comprehensive technical and product audit is available in `docs/MASTER_AUDIT_REPORT.md`. This report details the current architecture, feature status, and the roadmap for migrating to a persistent Supabase backend.

## 🛠️ Setup Instructions

### 1. Prerequisites
- Node.js 20+ installed.
- A Google Cloud / Vertex AI project with API keys.

### 2. Environment Variables
Create a `.env` file in the root directory and add your API key:
```env
GEMINI_API_KEY=your_api_key_here
```

### 3. Installation
```bash
npm install
```

### 4. Development
Run the development server:
```bash
npm run dev
```

Run the Genkit UI for debugging flows:
```bash
npm run genkit:dev
```

## 📁 Folder Structure
- `src/ai/flows/`: Core AI logic and category-specific prompts.
- `src/app/`: Next.js pages and routing.
- `src/components/`: Reusable UI components (ShadCN).
- `src/lib/`: Types, utility functions, and Zod schemas.
- `docs/`: Technical audit and migration documentation.

## 🎯 Current Status
This project is currently a **stateless prototype**. It makes real AI calls but does not persist data. The next phase of development involves migrating to **Supabase** for Auth, Database, and Storage.

---
*Developed for the Mitty Ecommerce Workflow.*