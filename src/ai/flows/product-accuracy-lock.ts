import type { GenerateProductViewInput } from './types';

export function buildReferencePhotoInstructions(input: GenerateProductViewInput) {
  if (input.productCategory !== 'Shirt') {
    return 'Use all uploaded product images as reference images. If references conflict, preserve the clearest product detail visible in the uploaded images.';
  }

  const references = [
    'Reference photo roles:',
    '- Main product photo: overall product source of truth.',
  ];

  if (input.openShirtImage) {
    references.push('- Full open shirt photo: override AI guessing for full garment structure, sleeve length, and overall shape.');
  }

  if (input.fabricCloseupImage) {
    references.push('- Fabric / pattern close-up: override AI guessing for true color, texture, plain finish, checks, stripes, print, and pattern density.');
  }

  if (input.collarButtonCloseupImage) {
    references.push('- Collar + button close-up: override AI guessing for collar type, placket, and button style/color.');
  }

  if (input.pocketLogoDetailImage) {
    references.push('- Pocket / logo / detail close-up: override AI guessing for pocket shape, logo presence/absence, and small details. If it shows no logo, do not invent one.');
  }

  if (input.backSideImage) {
    references.push('- Back side photo: override AI guessing for the back view. Back image must follow this reference.');
  }

  references.push('If an optional reference image is present, it overrides guessing.');

  return references.join('\n');
}

export function buildStudioConsistencyInstructions(input: GenerateProductViewInput) {
  const style = input.outputBackgroundStyle || 'Clean Light Grey Studio';
  const background =
    style === 'Clean Off-White Studio'
      ? 'clean off-white studio background'
      : style === 'Premium Beige Studio'
        ? 'clean premium beige studio background'
        : style === 'Transparent/Isolated Product Style later'
          ? 'clean isolated product-style light grey studio background; do not use actual transparency in generated photos'
          : 'clean light grey studio background';

  return [
    `Output Background Style: ${style}. Use a ${background}.`,
    'All generated images must look like they were shot in a professional photography studio with DSLR equipment and soft-box lighting. They must NOT look like phone photos, table photos, or casual snapshots.',
    'Background consistency lock: front, side, back, and flatlay must feel like one premium e-commerce studio shoot.',
    'Use the same clean studio background style, same camera quality, same exposure, and same soft even lighting across all generated views.',
    'Do not randomly switch between grey, beige, brown, outdoor, lifestyle, room, table, wall, floor, or textured backgrounds.',
    'Default to clean light grey studio unless the selected Output Background Style says otherwise.',
    'Keep lighting consistent across front, side, back, and flatlay. Avoid dramatic lighting, warm color casts, uneven shadows, or background color shifts.',
    'Color consistency: preserve the same product color across all views. Do not make lavender more pink, purple, blue, or grey between images.',
    'Use uploaded product/reference images as the color source of truth. If fabric close-up is provided, use it as the true color and fabric finish source.',
    'Model consistency: keep the same model identity across front, side, and back as much as possible: same body type, hairstyle, age, and styling.',
    'Shirt consistency: same collar, same buttons, same placket, same pocket, same sleeve type, same fabric finish.',
    'Do not add or remove pocket between front, side, back, and flatlay.',
    'Do not add logo if logo is set to No visible logo. Do not add sleeve band, patch, embroidery, text, extra label, or contrast design.',
    'All output images must be pin-sharp, high-detail, HD quality with professional studio aesthetics suitable for premium e-commerce product listing pages.',
  ].join('\n');
}

export function buildProductLockSummary(input: GenerateProductViewInput) {
  if (input.productCategory !== 'Shirt') {
    return `Product source of truth: use the uploaded product image(s) as the exact reference. Do not redesign the ${input.productCategory.toLowerCase()}.`;
  }

  return [
    'Product Accuracy Lock for Shirt:',
    `- Front Pocket: ${input.frontPocket || 'Auto Detect'}`,
    `- Pattern Override: ${input.patternOverride || 'Auto Detect'}`,
    `- Collar Type: ${input.collarType || 'Auto Detect'}`,
    `- Visible Logo on Worn Shirt: ${input.visibleLogo || 'Auto Detect'}`,
  ].join('\n');
}

function buildPocketInstructions(input: GenerateProductViewInput) {
  if (input.frontPocket === 'Yes') {
    return [
      'Pocket rule: show exactly one front pocket where naturally visible.',
      'Keep one front pocket visible and consistent whenever the camera angle naturally shows it.',
      'Keep the same single pocket consistent across front and side/angle views.',
      'Do not remove the pocket. Do not add a second pocket.',
      'Do not change a plain pocket into a flap pocket unless the uploaded product clearly has a flap.',
    ].join(' ');
  }

  if (input.frontPocket === 'No') {
    return 'Pocket rule: show no front pocket. Do not invent a pocket.';
  }

  return [
    'Pocket rule: auto detect conservatively from the uploaded product image.',
    'If a pocket is clearly visible, keep it. If uncertain, do not invent extra pockets.',
    'Never add a second pocket or pocket flap unless clearly present.',
  ].join(' ');
}

function buildPatternInstructions(input: GenerateProductViewInput) {
  if (input.patternOverride === 'Plain') {
    return 'Pattern rule: keep the shirt plain. Do not add print, stripes, checks, texture, embroidery, contrast panels, or new design details.';
  }

  if (input.patternOverride === 'Printed') {
    return 'Pattern rule: preserve the same print style and density from the uploaded product. Do not create a different print.';
  }

  if (input.patternOverride === 'Checked' || input.patternOverride === 'Striped') {
    return `Pattern rule: preserve the same ${input.patternOverride.toLowerCase()} direction, density, scale, and colors from the uploaded product. Do not create a different scale or color.`;
  }

  if (input.patternOverride === 'Textured') {
    return 'Pattern rule: preserve the same subtle texture from the uploaded product. Do not invent prints, checks, stripes, embroidery, or decorative texture.';
  }

  return 'Pattern rule: auto detect conservatively from the uploaded product. Do not invent a new pattern, print, stripes, checks, embroidery, or texture.';
}

function buildCollarInstructions(input: GenerateProductViewInput) {
  if (input.collarType && input.collarType !== 'Auto Detect') {
    return `Collar rule: keep the shirt as a ${input.collarType}. Do not change the collar type.`;
  }

  return 'Collar rule: preserve the collar type visible in the uploaded product. Do not change it.';
}

function buildLogoInstructions(input: GenerateProductViewInput) {
  if (input.visibleLogo === 'No visible logo') {
    return [
      'Visible logo lock: no visible logo.',
      'Logo rule: show ZERO visible logos on the worn shirt.',
      'No chest logo, no sleeve logo, no cuff logo, no collar logo, no pocket logo, no back logo, and no button logo.',
      'Do not invent MITTY logos or brand marks anywhere on the model-worn shirt.',
    ].join(' ');
  }

  if (input.visibleLogo === 'Label/tag only') {
    return [
      'Logo rule: model-worn shirt must show no chest logo, no sleeve logo, and no visible outer logo.',
      'A brand label/tag may only appear in flatlay/packshot if it exists in the uploaded product.',
      'Do not treat inner neck labels, price tags, hanging tags, packaging ribbon, or brand tape as an outer wearable logo.',
    ].join(' ');
  }

  if (input.visibleLogo === 'Small chest logo') {
    return 'Logo rule: a small chest logo is allowed only on the chest. Do not add sleeve, cuff, collar, pocket, back, or extra logos.';
  }

  return [
    'Logo rule: if the uploaded product does not clearly show an outer visible logo on the wearable shirt surface, do not add any logo on the worn shirt.',
    'Never invent MITTY logos on chest, sleeve, cuff, pocket, collar, buttons, or back unless the uploaded product clearly has that logo in that exact place.',
  ].join(' ');
}

export function buildForbiddenDesignInstructions(input: GenerateProductViewInput) {
  const product = input.productCategory.toLowerCase();

  return [
    `Forbidden extra elements: do not add a sleeve band, arm patch, chest emblem, chest logo, extra logo, extra label, embroidery, contrast stripe, contrast panel, decorative patch, printed text, new pattern, zipper if the ${product} has buttons, different button color, different sleeve type, different fabric texture, or different color shade.`,
    'Explicitly forbidden: no sleeve band, no chest emblem, no extra outer label, no decorative patch, no invented logo.',
    'Do not add anything extra. Do not remove visible product details. Do not invent design elements.',
  ].join(' ');
}

export function buildProductAccuracyInstructions(input: GenerateProductViewInput) {
  const genericRules = [
    buildProductLockSummary(input),
    buildReferencePhotoInstructions(input),
    buildStudioConsistencyInstructions(input),
    'The uploaded product image is the source of truth. Generate the same product, not an inspired or redesigned product.',
    'Product must not change. Preserve visible color, buttons, placket, collar, sleeve type, pocket state, pattern, proportions, and fabric appearance.',
    buildForbiddenDesignInstructions(input),
  ];

  if (input.productCategory !== 'Shirt') {
    return genericRules.join('\n');
  }

  return [
    ...genericRules,
    buildPocketInstructions(input),
    buildPatternInstructions(input),
    buildCollarInstructions(input),
    buildLogoInstructions(input),
    'Model-worn rule: the model may wear the shirt naturally, but the shirt design must match the uploaded product exactly. Do not add styling details to the shirt itself.',
    'Packaging rule: black MITTY ribbon/tape on folded product packaging is packaging/retail presentation only. It must NOT appear on the model-worn shirt.',
    'Back view rule: if no back design is visible or specified, the back view must be a plain continuation of the same color/fabric/pattern with no logo, text, patch, yoke decoration, contrast panel, or added design.',
  ].join('\n');
}

export function buildFlatlayAccuracyInstructions(input: GenerateProductViewInput) {
  return [
    buildProductAccuracyInstructions(input),
    'Flatlay Style: Clean Ecommerce Packshot.',
    'Flatlay/packshot rule: create a premium HD ecommerce product packshot, not a casual phone/table photo.',
    'Camera and composition: top-down view, product centered, full product visible, straight alignment, high detail, sharp focus, clean edges, realistic proportions.',
    'Lighting and background: evenly lit on a clean light grey or off-white studio background, matching the selected studio style and the model-view background family.',
    'Strict no-shadow rule: no harsh shadow, no camera shadow, no phone shadow, no photographer shadow, no hand shadow, no reflection shadow, no dark bottom shadow, no glass reflection, no dramatic lighting, and no uneven vignette.',
    'Strict clean-scene rule: no human hand, no mannequin/model body, no table clutter, no background objects, no lifestyle background, no room setting, no visible phone/camera reflection.',
    'Product preservation rule: preserve exact shirt color, pocket, collar, buttons, placket, cuff, sleeve type, pattern, fabric finish, and visible construction details.',
    'Do not invent a logo, print, stripe, patch, sleeve band, embroidery, label, contrast panel, or new design detail.',
    'Packaging rule: do not treat packaging ribbon, price tag, hanging tag, retail tape, or black MITTY ribbon/tape as part of the shirt design.',
    'For a clean ecommerce flatlay, remove distracting packaging, tags, and ribbon if possible, but do not remove actual shirt details like pocket, buttons, collar, cuffs, placket, or pattern.',
  ].join('\n');
}
