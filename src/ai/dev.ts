import { config } from 'dotenv';
config();

import '@/ai/flows/generate-hd-flatlay.ts';
import '@/ai/flows/generate-front-view.ts';
import '@/ai/flows/generate-side-view.ts';
import '@/ai/flows/generate-back-view.ts';
import '@/ai/flows/generate-texture-view.ts';
import '@/ai/flows/generate-product-title-description.ts';
