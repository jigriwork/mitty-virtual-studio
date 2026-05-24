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
    'Background consistency: use the same clean ecommerce studio background across front, side, back, and flatlay images.',
    'Do not randomly switch between grey, beige, brown, outdoor, lifestyle, room, or textured backgrounds.',
    'Keep lighting consistent across front, side, and back.',
    'Color consistency: preserve the same product color across all views. Do not make lavender more pink, purple, blue, or grey between images.',
    'Use uploaded product/reference images as the color source of truth. If fabric close-up is provided, use it as the true color and fabric finish source.',
    'Model consistency: keep the same model identity across front, side, and back as much as possible: same body type, hairstyle, age, and styling.',
    'Shirt consistency: same collar, same buttons, same placket, same pocket, same sleeve type, same fabric finish.',
    'Do not add or remove pocket between front, side, back, and flatlay.',
    'Do not add logo if logo is set to No visible logo. Do not add sleeve band, patch, embroidery, text, extra label, or contrast design.',
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
    'Flatlay/packshot rule: show the product cleanly and preserve shirt color, pocket, collar, buttons, placket, and sleeve type.',
    'Flatlay quality rule: clean ecommerce top-down product image, evenly lit, no harsh shadows, no human hand, no camera shadow, no phone shadow, no photographer shadow, no reflection shadow, no table clutter, no background objects, no glass reflection, no dark shadow at bottom, no dramatic lighting, no lifestyle background, no mannequin/model body.',
    'Flatlay composition: product centered and clearly visible on a neutral off-white or light grey background, with consistent color matching the model images.',
    'For clean ecommerce flatlay, remove distracting packaging if needed, but do not alter the product design.',
    'Packaging ribbon/tag can appear only if the image is intentionally a retail packshot and it exists in the uploaded product.',
  ].join('\n');
}
