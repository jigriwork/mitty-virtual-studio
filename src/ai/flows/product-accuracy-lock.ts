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

function buildTrouserFrontPocketInstructions(input: GenerateProductViewInput) {
  if (input.trouserFrontPocketType === 'Slant Side Pockets') {
    return 'Front pocket rule: front view must preserve slant side pockets exactly as shown in the front trouser reference. Do not change them into straight pockets, patch pockets, cargo pockets, zipper pockets, or decorative seams.';
  }

  if (input.trouserFrontPocketType === 'Straight Side Pockets') {
    return 'Front pocket rule: preserve straight side pockets exactly as shown. Do not change them into slant pockets, patch pockets, cargo pockets, zipper pockets, or decorative seams.';
  }

  if (input.trouserFrontPocketType === 'No Visible Front Pockets') {
    return 'Front pocket rule: show no visible front pockets. Do not invent front pockets, pocket openings, pocket flaps, or decorative pocket seams.';
  }

  return 'Front pocket rule: auto detect conservatively from the front reference. If slant side pockets are visible, preserve slant side pockets. If pocket type is uncertain, do not invent extra pockets or decorative pocket details.';
}

function buildTrouserBackPocketInstructions(input: GenerateProductViewInput) {
  if (input.trouserBackPocketType === 'Two Welt Pockets With Buttons') {
    return 'Back pocket rule: back view must show exactly two welt pockets with buttons, matching the back reference. Do not remove buttons, add flaps, add tabs, add patches, or change the pocket count.';
  }

  if (input.trouserBackPocketType === 'Two Welt Pockets No Buttons') {
    return 'Back pocket rule: back view must show exactly two welt pockets without buttons, matching the back reference. Do not add buttons, flaps, tabs, patches, or extra pockets.';
  }

  if (input.trouserBackPocketType === 'One Back Pocket') {
    return 'Back pocket rule: show exactly one back pocket only if that matches the reference. Do not invent a second back pocket, buttons, flaps, tabs, patches, or logos.';
  }

  if (input.trouserBackPocketType === 'No Back Pockets') {
    return 'Back pocket rule: show no back pockets. Do not invent welt pockets, patch pockets, buttons, flaps, tabs, or back labels.';
  }

  return 'Back pocket rule: auto detect conservatively from the back reference. If two welt pockets with buttons are visible, preserve two welt pockets with buttons. Do not invent pocket count, buttons, flaps, patches, tabs, or labels.';
}

function buildTrouserLogoInstructions(input: GenerateProductViewInput) {
  const sourceVisibleOnlyRules = [
    'Source-visible-only branding rule: do not invent any brand tag, brand tab, label, waistband label, inner label, stitched patch, side tab, back tab, logo plaque, text mark, hanging tag, paper tag, price tag, retail tag, or packaging element.',
    'A tag/brand/label may only appear if it is clearly visible in the uploaded source image for that product and the selected Tag / Branding Visibility setting allows it.',
    'If the source image does not clearly show a tag/label/branding, generated output must contain zero tags/branding elements.',
    'If not clearly visible in source, do not add any tag/branding element.',
  ];

  if (input.trouserTagBrandingVisibility === 'No visible tags or branding anywhere') {
    return [
      ...sourceVisibleOnlyRules,
      'Tag / Branding Visibility rule: no visible tags or branding anywhere. Show zero tags, labels, tabs, patches, logos, text marks, hanging tags, paper tags, retail tags, waistband labels, or inner labels in front, back, texture, and flatlay outputs.',
      'Model-worn rule: never show invented brand tags, tabs, labels, patches, or logos. Even if product has a retail hanging tag in a store photo, do not place it on model-worn trouser.',
    ].join(' ');
  }

  if (input.trouserTagBrandingVisibility === 'Show only if clearly visible in source') {
    return [
      ...sourceVisibleOnlyRules,
      'Tag / Branding Visibility rule: show a tag, label, tab, or branding only if it is clearly visible in the uploaded source image and only in the same location/type. Do not infer, recreate, relocate, enlarge, stylize, or add black tabs.',
    ].join(' ');
  }

  if (input.trouserTagBrandingVisibility === 'Flatlay/product-only tag allowed if clearly visible in source') {
    return [
      ...sourceVisibleOnlyRules,
      'Tag / Branding Visibility rule: model-worn images must have no visible branding, tag, label, side tab, back tab, patch, logo, hanging tag, paper tag, or retail tag.',
      'Flatlay/product-only tag may appear only if clearly visible in the uploaded source product image. If not clearly visible in source, flatlay must be completely tag-free.',
    ].join(' ');
  }

  if (input.trouserVisibleLogo === 'No visible logo') {
    return [
      ...sourceVisibleOnlyRules,
      'Trouser logo rule: show zero visible logos, labels, brand tabs, side tabs, back tabs, patches, text, or brand marks on the model-worn trouser.',
      'Do not add black label/logo/tab anywhere on the model-worn trouser.',
    ].join(' ');
  }

  if (input.trouserVisibleLogo === 'Tag only') {
    return [
      ...sourceVisibleOnlyRules,
      'Trouser logo rule: a tag may appear only in product/flatlay if it exists in the uploaded product reference.',
      'Never place that tag as a wearable logo, side tab, back tab, patch, or label on the model-worn trouser.',
    ].join(' ');
  }

  return [
    ...sourceVisibleOnlyRules,
    'Trouser logo rule: if the uploaded wearable trouser surface does not clearly show an outer visible logo, do not add any logo, label, side tab, back tab, patch, or brand mark.',
    'Do not add black label/logo/tab anywhere on the model-worn trouser.',
    'Back view branding rule: do not add black label/tab near waistband, belt loops, back pocket edge, or side seam unless clearly visible in source. Do not invent waistband branding patch. Back view must remain clean if source has no visible branding.',
    'Flatlay branding rule: do not invent inner waistband brand label, hanging tag, paper tag, retail tag, or neck/waist label substitute. If source flatlay/product references do not clearly show a tag, flatlay must be completely tag-free.',
  ].join(' ');
}

function buildTrouserFrontStyleInstructions(input: GenerateProductViewInput) {
  if (input.trouserFrontStyle === 'Flat Front') {
    return 'Front style rule: preserve a flat front trouser. Do not add single pleats, double pleats, darts that look like pleats, or decorative folds.';
  }

  if (input.trouserFrontStyle === 'Single Pleat') {
    return 'Front style rule: preserve a single pleat style. Do not change it to flat front or double pleat.';
  }

  if (input.trouserFrontStyle === 'Double Pleat') {
    return 'Front style rule: preserve a double pleat style. Do not change it to flat front or single pleat.';
  }

  return 'Front style rule: auto detect conservatively from the front reference. Do not invent pleats if the front reference looks flat front.';
}

function buildTrouserCreaseInstructions(input: GenerateProductViewInput) {
  if (input.trouserCrease === 'Visible Center Crease') {
    return 'Crease rule: preserve clean visible center crease lines down the legs, matching the uploaded trouser reference. Do not move, remove, or exaggerate the crease.';
  }

  if (input.trouserCrease === 'No Visible Crease') {
    return 'Crease rule: do not add strong center crease lines if the reference does not show them.';
  }

  return 'Crease rule: auto detect conservatively from the front reference. If visible center crease lines are present, preserve them cleanly and consistently.';
}

function buildTrouserFitInstructions(input: GenerateProductViewInput) {
  if (input.trouserFit === 'Slim Fit') {
    return 'Fit rule: keep a slim formal silhouette, not skinny/tight and not relaxed or baggy.';
  }

  if (input.trouserFit === 'Regular Fit') {
    return 'Fit rule: keep a regular formal trouser silhouette. Do not make it skinny, overly tapered, relaxed, or baggy.';
  }

  if (input.trouserFit === 'Relaxed Fit') {
    return 'Fit rule: keep a relaxed trouser silhouette only as selected, while preserving formal trouser structure.';
  }

  const fitText = input.fitType?.trim();
  return fitText
    ? `Fit rule: preserve the provided fit wording "${fitText}" while matching the uploaded trouser silhouette.`
    : 'Fit rule: auto detect the trouser silhouette from the uploaded reference and preserve it without making the trouser skinny, baggy, or redesigned.';
}

function buildTrouserFabricFinishInstructions(input: GenerateProductViewInput) {
  if (input.trouserFabricFinish && input.trouserFabricFinish !== 'Auto Detect') {
    return `Fabric finish rule: preserve the ${input.trouserFabricFinish.toLowerCase()} finish from the fabric close-up. Match true color, weave, fiber appearance, texture, and formal fabric finish.`;
  }

  return 'Fabric finish rule: use the fabric close-up as the true color, weave, texture, fiber appearance, and finish source of truth. Preserve fine woven/lycra texture if visible.';
}

export function buildTrouserForbiddenDesignInstructions() {
  return [
    'Forbidden trouser elements: do not add any logo, brand tab, label, side tab, back tab, patch, embroidery, text, contrast panel, cargo pocket, extra pocket, decorative zipper, extra button, extra seam, or design element not visible on the wearable trouser.',
    'Do not add black label/logo/tab anywhere on the model-worn trouser.',
    'Do not treat hanging tag, price tag, black MITTY tag, paper tag, packaging tag, hanger clip, or retail label as a wearable trouser logo.',
    'A MITTY hanging tag or retail tag is not a wearable logo and must not become a side tab, back tab, patch, label, or brand mark on the trouser.',
    'Do not change the trouser into jeans, chinos, cargo pants, joggers, or casual pants.',
  ].join(' ');
}

export function buildTrouserAccuracyInstructions(input: GenerateProductViewInput) {
  return [
    'Trouser Accuracy Lock:',
    `- Front Pocket Type: ${input.trouserFrontPocketType || 'Auto Detect'}`,
    `- Back Pocket Type: ${input.trouserBackPocketType || 'Auto Detect'}`,
    `- Visible Logo on Worn Trouser: ${input.trouserVisibleLogo || 'Auto Detect'}`,
    `- Front Style: ${input.trouserFrontStyle || 'Auto Detect'}`,
    `- Crease: ${input.trouserCrease || 'Auto Detect'}`,
    `- Fit: ${input.trouserFit || 'Auto Detect'}`,
    `- Fabric Finish: ${input.trouserFabricFinish || 'Auto Detect'}`,
    `- Tag / Branding Visibility: ${input.trouserTagBrandingVisibility || 'Auto Detect'}`,
    'Source of truth: use uploaded trouser reference images as the exact source of truth.',
    'Front reference = front construction, front pockets, waistband, closure, crease, fit, silhouette, and formal trouser structure.',
    'Back reference = back pockets, buttons, waistband, belt loops, back construction, back crease, and pocket placement.',
    'Fabric close-up = true color, weave, texture, fiber appearance, and finish.',
    'Generated trouser must match the uploaded trouser, not a redesigned or inspired trouser.',
    'Preserve exact color, fabric finish, waistband, belt loops, closure, pockets, buttons, pleats/front style, crease lines, fit, silhouette, and formal trouser structure.',
    buildTrouserForbiddenDesignInstructions(),
    buildTrouserLogoInstructions(input),
    buildTrouserFrontPocketInstructions(input),
    buildTrouserBackPocketInstructions(input),
    buildTrouserFrontStyleInstructions(input),
    buildTrouserCreaseInstructions(input),
    buildTrouserFitInstructions(input),
    buildTrouserFabricFinishInstructions(input),
  ].join('\n');
}

export function buildProductAccuracyInstructions(input: GenerateProductViewInput) {
  if (input.productCategory === 'Trousers') {
    return [
      buildProductLockSummary(input),
      buildReferencePhotoInstructions(input),
      buildStudioConsistencyInstructions(input),
      buildTrouserAccuracyInstructions(input),
    ].join('\n');
  }

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
