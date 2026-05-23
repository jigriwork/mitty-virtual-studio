
'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy } from 'lucide-react';
import { MittyLogo } from '@/components/mitty-logo';

const reportContent = `
### **MITTY Virtual Studio: In-Depth Technical Report**

---

#### **1. Executive Summary**

MITTY Virtual Studio is a sophisticated web application engineered to automate and scale the creation of e-commerce product assets. It replaces traditional photoshoots with a powerful AI pipeline. By leveraging Google's cutting-edge generative AI models, the application transforms basic user inputs and reference photos into a complete, consistent, and professional set of marketing materials. This includes high-resolution product images from multiple angles (on-model and flat lay) and expertly crafted product titles and descriptions.

The system is designed for operational efficiency, ensuring brand consistency and significantly reducing the time and cost associated with product launches. Its architecture is built on a modern, robust tech stack (Next.js and Genkit) and features a modular, category-driven workflow that can be easily extended.

---

#### **2. System Architecture & Technology Stack**

The application is architected as a modern, server-rendered web app that interfaces with a server-side AI backend.

*   **Frontend Framework:** **Next.js 15 (with Turbopack)** using the App Router. This provides server-side rendering (SSR) for fast initial loads, a client-side React environment for rich interactivity, and an efficient development experience.
*   **Language:** **TypeScript**. Used across the entire project to ensure type safety, improve code quality, and enable better developer tooling.
*   **UI Components:** **ShadCN UI**. A collection of beautifully designed, accessible, and composable React components built on Radix UI and styled with Tailwind CSS. This allows for rapid development of a polished and professional user interface.
*   **Styling:** **Tailwind CSS**. A utility-first CSS framework that enables rapid, custom styling directly within the HTML, configured with a custom theme in \`src/app/globals.css\`.
*   **State Management & Forms:** **React Hook Form** combined with **Zod** for schema-based validation. This provides a performant and reliable way to manage the main product input form, with validation logic clearly defined in \`src/lib/types.ts\`.
*   **AI Backend:** **Genkit (with the \`@genkit-ai/googleai\` plugin)**. Genkit acts as the orchestration layer for all AI operations. It defines server-side functions called "flows" (\`ai.defineFlow\`) that structure and execute calls to Google's AI models.
    *   **Text & Analysis Model:** \`gemini-1.5-flash-latest\` is used for generating product titles and descriptions and for analyzing images to detect color.
    *   **Image Generation Model:** \`gemini-2.0-flash-preview-image-generation\` is used for all photorealistic image generation tasks.

---

#### **3. Core Logic and Workflow (The "How It Works")**

The application's logic is orchestrated from the main page component (\`src/app/page.tsx\`), which manages state, user input, and the multi-step AI generation process.

**Step 1: User Input & Data Preparation (\`ProductForm\` & \`onSubmit\`)**

1.  **Dynamic Form (\`src/components/product-form.tsx\`):** The user interacts with a form driven by \`react-hook-form\`. The form dynamically shows or hides fields (e.g., \`sleeveType\` for Shirts, \`fitType\` for Trousers) based on the selected \`productCategory\`.
2.  **Image Handling (\`src/components/file-upload.tsx\`):** When a user uploads an image, the \`FileUpload\` component uses \`react-dropzone\` to handle the file. It then calls the \`fileToDataUri\` utility function (\`src/lib/utils.ts\`) to convert the binary image file into a Base64-encoded Data URI string. This format is required to send image data to the Genkit AI flows.
3.  **Submission (\`onSubmit\` in \`src/app/page.tsx\`):**
    *   The function is triggered, and the UI enters a "loading" state.
    *   It retrieves all validated data from the form.
    *   It converts all necessary uploaded images into Data URIs and stores them in a state variable (\`productImageUris\`). This is crucial for the "Regenerate" functionality.
    *   It constructs an \`imageFlowInput\` object, which is the standardized data structure passed to the AI flows.

**Step 2: AI Text and Color Generation (The First AI Call)**

1.  **Call \`generateProductTitleDescription\`:** The first AI call is to this flow (\`src/ai/flows/generate-product-title-description.ts\`). This is a critical first step because it determines the product's color.
2.  **Conditional Color Logic:** The prompt for this flow is explicitly instructed:
    *   **If the user provided a color** in the form, the AI **MUST** use that exact color.
    *   **If the user left the color field blank**, the AI must analyze the uploaded image(s) and detect the primary color.
3.  **Output:** This flow returns the final \`productTitle\`, \`productDescription\`, and the \`detectedColor\`.

**Step 3: AI Image Generation (The Parallel AI Calls)**

1.  **Enriching the Input:** The \`detectedColor\` from the previous step is now added to the \`imageFlowInput\`. This ensures all subsequent image generation flows use the same, correct color, guaranteeing consistency.
2.  **Parallel Execution:** The application then triggers all the necessary image generation flows concurrently using \`Promise.all()\`. This is highly efficient, as it doesn't wait for one image to finish before starting the next.
    *   **If \`productCategory\` is "Trousers"**, it calls: \`generateFrontView\`, \`generateBackView\`, \`generateTextureView\`, \`generateHdFlatlay\`
    *   **If \`productCategory\` is "Shoes" or "Shirt"**, it calls: \`generateFrontView\`, \`generateSideView\`, \`generateBackView\`, \`generateHdFlatlay\`
3.  **Receiving Images:** Each of these flows returns a Data URI string for the generated image.

**Step 4: Display, Refine, and Download (\`ResultsDisplay\`)**

1.  **State Update:** Once all promises from \`Promise.all()\` resolve, the \`results\` state is updated with all the generated text and image data. The UI switches from the loading state to display the results in the \`ResultsDisplay\` component (\`src/components/results-display.tsx\`).
2.  **Regeneration (\`handleRegenerate...\` functions):** Each generated image has a "Regenerate" button. Clicking it calls a specific handler (e.g., \`handleRegenerateFrontView\`) which re-runs *only* that single AI image flow and updates the corresponding image in the \`results\` state.
3.  **Downloading (\`handleDownloadAll\`):** This function uses the \`JSZip\` library. It fetches the Base64 data from each image URI, adds it to a zip archive, includes the product title and description in a \`Product_Info.txt\` file, and then triggers a browser download with a dynamically generated, descriptive filename.

---

#### **4. Detailed AI Prompts by Category**

These are the precise instructions given to the AI, which are the core of the application's functionality. They are located within the \`src/ai/flows/\` directory.

##### **A. For Product Category: \`Trousers\`**

*   **Front View (\`generate-front-view.ts\`):**
    \`Generate a realistic full-body image of a male model standing straight in a studio. He is wearing \${input.fitType} formal trousers made of \${input.fabricType} in \${input.color}. The model has a white or black tucked-in formal shirt and black dress shoes. Both legs should be straight, showing perfect trouser fall and crease. Sleeves must not be rolled. The waistband, belt loops, pockets, and fabric must exactly match the uploaded image. Keep facial expression neutral and posture professional. Use a soft beige background.\`

*   **Back View (\`generate-back-view.ts\`):**
    \`Generate a back view of the same model, standing straight with arms by the side, wearing the same \${input.color} \${input.fitType} \${input.materialStretch === 'Yes' ? 'stretch' : ''} trousers. Clearly show back welt pockets, seams, and waistband as shown in the uploaded product image. Use the same lighting and background as the front view. Fabric must still show \${input.materialStretch === 'Yes' ? 'slight stretch' : 'a standard fall'} and a clean finish. No model pose changes.\`

*   **Texture View (\`generate-texture-view.ts\`):**
    \`Generate a high-resolution close-up macro shot of the trouser’s thigh or upper hip area, showcasing the texture of the \${input.materialStretch === 'Yes' ? 'stretchable' : 'non-stretchable'} \${input.fabricType} in \${input.color}. The final image color MUST be \${input.color}. Match the weave, grain, and finish from the uploaded texture reference, but do not use the color from the reference image. No alterations or smoothing. Use soft light and clean background to keep the texture natural and realistic. If the brand tag is visible in the original, preserve it.\`

*   **Flat Lay View (\`generate-hd-flatlay.ts\`):**
    \`Generate a clean, high-resolution flat lay image of the \${input.color} formal trousers based on the uploaded product photo. Show them fully spread and neatly arranged, with waistband, belt loops, and front pocket lines visible. Ensure the MITTY tag/logo remains untouched and readable. Use white or beige background with soft shadows and sharp focus. This image will be used directly for ecommerce listing.\`

##### **B. For Product Category: \`Shoes\`**

*   **Front View (\`generate-front-view.ts\`):**
    \`Generate an ultra-realistic, e-commerce studio photograph of a single \${gender} formal shoe. The shoe should be made of high-quality \${color} \${material} and must perfectly match the design, texture, and stitching from the uploaded image. The view should be straight-on, showing the front of the shoe, including the toe cap, vamp, and laces clearly. The shoe must be standing upright on a plain, solid light grey background (hex #f0f2f5) with a soft, clean shadow underneath...\`

*   **Side View (\`generate-side-view.ts\`):**
    \`Generate an ultra-realistic, e-commerce studio photograph of a single \${gender} formal shoe, viewed from the side profile. The shoe, made of \${color} \${material}, must exactly match the style and details of the uploaded image. It should be perfectly perpendicular to the camera, showcasing the quarter, sole construction, and heel...\`

*   **Back View (\`generate-back-view.ts\`):**
    \`Generate an ultra-realistic, e-commerce studio photograph of a PAIR of \${gender} formal shoes... The shot should be from a three-quarter back angle, showing the heel counter, the side profile of one shoe, and the back of the other...\`

*   **Top View (\`generate-hd-flatlay.ts\`):**
    \`Generate a high-resolution, professional e-commerce studio photograph of a PAIR of \${gender} formal shoes, viewed from an elevated, angled top-down perspective... Do not add any brand names or logos.\`

##### **C. For Product Category: \`Shirt\`**

*   Prompts are similar in structure, focusing on a model wearing the shirt for front, side, and back views, with a separate prompt for an enhanced flat lay. The key instruction for shirts is:
    \`Enhance the uploaded shirt image into a clean, high-resolution flat lay. Retain the exact branding (MITTY logo), button placement, and color tone... Do not alter the shirt's layout, style, or logo.\`
`;

export default function ReportPage() {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent)
      .then(() => {
        toast({
          title: 'Report Copied!',
          description: 'The technical report has been copied to your clipboard.',
        });
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast({
          variant: 'destructive',
          title: 'Copy Failed',
          description: 'Could not copy the report to the clipboard.',
        });
      });
  };

  // Quick and dirty markdown to HTML
  const formatContent = (text: string) => {
    return text
      .split('---')
      .map((section) => `<hr class="my-6 border-border" />${section}`)
      .join('')
      .replace(/^<hr.*?>/, '') // remove first hr
      .replace(/####\s(.*?)\n/g, '<h4 class="text-lg font-semibold mt-6 mb-2">$1</h4>')
      .replace(/###\s(.*?)\n/g, '<h3 class="text-2xl font-bold mt-8 mb-4 border-b pb-2">$1</h3>')
      .replace(/\*\*\s(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*\s(.*?):/g, '<br />\n<strong class="font-medium">$1:</strong>')
      .replace(/`(.*?)`/g, '<code class="bg-muted text-foreground font-mono text-sm px-1 py-0.5 rounded">$1</code>')
      .replace(/\n\n/g, '<p class="mt-4" />')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
       <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center gap-2">
          <MittyLogo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">MITTY Virtual Studio</h1>
        </div>
      </header>
      <main className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-3xl">Application Technical Report</CardTitle>
              <Button onClick={handleCopy} variant="outline">
                <Copy className="mr-2" />
                Copy to Clipboard
              </Button>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: formatContent(reportContent) }}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

    
