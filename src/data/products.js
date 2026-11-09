import skincareImage from '../assets/category-skincare.jpg'
import makeupImage from '../assets/category-makeup.jpg'
import haircareImage from '../assets/category-haircare.jpg'
import bodycareImage from '../assets/category-bodycare.jpg'
import fragranceImage from '../assets/category-fragrance.jpg'

export const categories = [
  { id: 'skincare', label: 'Skincare', image: skincareImage, note: 'Rituals for your skin' },
  { id: 'makeup', label: 'Makeup', image: makeupImage, note: 'Colour, quietly considered' },
  { id: 'haircare', label: 'Haircare', image: haircareImage, note: 'Care from root to tip' },
  { id: 'bodycare', label: 'Bodycare', image: bodycareImage, note: 'Everyday moments of care' },
  { id: 'fragrance', label: 'Fragrance', image: fragranceImage, note: 'A scent to remember' },
]

export const brands = [
  'AUREN BOTANICALS',
  'SORA SKIN',
  'STUDIO VELA',
  'ATELIER NO. 8',
  'MAISON AUBE',
  'MÈRE STUDIO',
  'ALDER & ASH',
  'VESPER FORM',
  'SOLENNE',
  'ORIÉLLE',
]

// The first eight products match the homepage edit. All catalogue records are fictional.
const featuredProducts = [
  { id: 'LB-001', name: 'Cloud Cream Cleanser', brand: brands[0], category: 'skincare', price: 24, shape: 'jar', tone: 'rose', bestseller: true, isNew: false, descriptor: 'Comforting daily cleanse', stock: 28, size: '150 ml' },
  { id: 'LB-002', name: 'Dewdrop Hydration Serum', brand: brands[1], category: 'skincare', price: 32, shape: 'dropper', tone: 'sand', bestseller: true, isNew: false, descriptor: 'A softer kind of glow', stock: 17, size: '30 ml' },
  { id: 'LB-003', name: 'Soft Focus Cream Blush', brand: brands[2], category: 'makeup', price: 22, shape: 'compact', tone: 'mauve', bestseller: true, isNew: false, descriptor: 'A natural flush of colour', stock: 4, size: '8 g' },
  { id: 'LB-004', name: 'Silk Finish Hair Oil', brand: brands[3], category: 'haircare', price: 28, shape: 'bottle', tone: 'amber', bestseller: true, isNew: false, descriptor: 'Lightweight finishing oil', stock: 0, size: '50 ml' },
  { id: 'LB-005', name: 'Quiet Hours Eau de Parfum', brand: brands[4], category: 'fragrance', price: 68, shape: 'perfume', tone: 'amber', bestseller: false, isNew: true, descriptor: 'Bergamot, cedar and soft musk', stock: 12, size: '50 ml' },
  { id: 'LB-006', name: 'Body Soufflé', brand: brands[5], category: 'bodycare', price: 34, shape: 'jar', tone: 'ivory', bestseller: false, isNew: true, descriptor: 'A cushion of daily moisture', stock: 21, size: '200 ml' },
  { id: 'LB-007', name: 'Barrier Comfort Mist', brand: brands[0], category: 'skincare', price: 26, shape: 'spray', tone: 'blue', bestseller: false, isNew: true, descriptor: 'A refreshing skin reset', stock: 8, size: '100 ml' },
  { id: 'LB-008', name: 'Velvet Lip Treatment', brand: brands[2], category: 'makeup', price: 18, shape: 'tube', tone: 'rose', bestseller: false, isNew: true, descriptor: 'Soft care with a satin finish', stock: 31, size: '12 ml' },
].map((product) => ({
  ...product,
  sku: product.id,
  cost: Number((product.price * 0.36).toFixed(2)),
  reorderLevel: 5,
  launchDate: product.isNew ? '2026-10-15' : '2026-02-10',
  stockStatus: product.stock === 0 ? 'out-of-stock' : product.stock <= 5 ? 'low-stock' : 'in-stock',
}))

const catalogueTemplates = {
  skincare: [
    ['Barrier Repair Cream', 'Comforting moisture for a resilient-feeling skin barrier', 'jar', 'ivory', 29],
    ['Vitamin C Brightening Drops', 'A fresh-looking glow for your morning ritual', 'dropper', 'amber', 38],
    ['Calm Reset Toner', 'A gentle, refreshing step after cleansing', 'bottle', 'blue', 21],
    ['Peptide Eye Concentrate', 'A cushion-soft treatment for the eye area', 'dropper', 'sand', 42],
    ['Daily Mineral SPF 30', 'Lightweight daily protection with a soft finish', 'tube', 'ivory', 26],
    ['Velvet Renewal Night Cream', 'A nourishing final step for your evening routine', 'jar', 'mauve', 36],
    ['Gentle Enzyme Polish', 'A smooth, considered exfoliating ritual', 'jar', 'rose', 25],
    ['Ceramide Recovery Balm', 'Rich comfort for dry-feeling skin', 'jar', 'sand', 31],
    ['Hydra Veil Essence', 'A light layer of lasting-feeling hydration', 'bottle', 'blue', 27],
    ['Soft Balance Cleansing Oil', 'A silky first cleanse that rinses clean', 'bottle', 'amber', 23],
  ],
  makeup: [
    ['Satin Skin Tint', 'A natural-looking veil of buildable coverage', 'bottle', 'sand', 32],
    ['Second Skin Concealer', 'A creamy touch of flexible coverage', 'tube', 'ivory', 19],
    ['Soft Sculpt Bronzer', 'A softly diffused warmth for the complexion', 'compact', 'amber', 25],
    ['Petal Veil Lip Colour', 'A comfortable wash of understated colour', 'tube', 'rose', 21],
    ['Luminous Cheek Tint', 'A fresh, dewy hint of colour', 'bottle', 'mauve', 23],
    ['Featherlight Setting Powder', 'A finely milled, soft-focus finish', 'compact', 'ivory', 28],
    ['Length & Definition Mascara', 'Clean definition for naturally lifted-looking lashes', 'tube', 'blue', 20],
    ['Sculpting Brow Gel', 'Flexible hold for softly defined brows', 'tube', 'amber', 17],
    ['Sheer Glow Highlighter', 'A delicate, light-catching finish', 'compact', 'sand', 24],
    ['Colour Edit Eye Palette', 'Considered shades for everyday expression', 'compact', 'mauve', 39],
  ],
  haircare: [
    ['Nourish & Restore Shampoo', 'A gentle cleanse for soft, glossy-looking hair', 'bottle', 'ivory', 24],
    ['Silk Repair Conditioner', 'A smoothing daily conditioner', 'bottle', 'sand', 26],
    ['Scalp Balance Serum', 'A lightweight leave-on scalp treatment', 'dropper', 'blue', 34],
    ['Gloss Veil Hair Mist', 'A fine mist for a polished-looking finish', 'spray', 'amber', 29],
    ['Overnight Repair Mask', 'A rich weekly treatment for dry lengths', 'jar', 'rose', 35],
    ['Curl Definition Cream', 'Soft definition without a heavy feel', 'tube', 'ivory', 27],
    ['Heat Guard Styling Spray', 'A weightless pre-styling essential', 'spray', 'blue', 23],
    ['Root Lift Volume Mousse', 'Airy body and flexible movement', 'bottle', 'sand', 25],
    ['Glossing Hair Serum', 'A few drops for a smooth, luminous finish', 'dropper', 'amber', 31],
    ['Daily Detangling Milk', 'A light leave-in for easier comb-through', 'bottle', 'mauve', 22],
  ],
  bodycare: [
    ['Silk Body Cleanser', 'A gentle, comforting everyday cleanse', 'bottle', 'ivory', 19],
    ['Cloud Nine Body Cream', 'A rich cream with a soft, cushiony feel', 'jar', 'rose', 32],
    ['Polishing Sugar Scrub', 'A smoothing body polish for weekly rituals', 'jar', 'amber', 27],
    ['Velvet Hand Treatment', 'A nourishing pocket-sized hand cream', 'tube', 'mauve', 16],
    ['Daily Body Lotion', 'An easy layer of lightweight moisture', 'bottle', 'sand', 24],
    ['Rest & Reset Bath Soak', 'A considered addition to a slower evening', 'jar', 'blue', 22],
    ['Soft Touch Body Oil', 'A silky finishing oil for after bathing', 'bottle', 'amber', 33],
    ['Comforting Foot Balm', 'A rich balm for hardworking feet', 'tube', 'ivory', 18],
    ['Fresh Start Deodorant', 'A gentle everyday freshness essential', 'tube', 'blue', 20],
    ['Smoothing Body Serum', 'A lightweight serum for supple-feeling skin', 'dropper', 'rose', 29],
  ],
  fragrance: [
    ['Still Morning Eau de Parfum', 'Bergamot, tea leaves and pale woods', 'perfume', 'sand', 82],
    ['Amber Chapter Eau de Parfum', 'Warm amber, iris and soft vanilla', 'perfume', 'amber', 96],
    ['Petal Archive Eau de Toilette', 'Peony, rosewater and clean musk', 'perfume', 'rose', 58],
    ['After Rain Eau de Parfum', 'Green stems, cedar and mineral air', 'perfume', 'blue', 88],
    ['Quiet Garden Hair & Body Mist', 'A sheer floral veil for everyday wear', 'spray', 'ivory', 42],
    ['Golden Hour Eau de Parfum', 'Mandarin, neroli and warm sandalwood', 'perfume', 'amber', 105],
    ['Soft Linen Eau de Toilette', 'Cotton flower, musk and gentle woods', 'perfume', 'ivory', 64],
    ['Nocturne Eau de Parfum', 'Black tea, plum and smoky vanilla', 'perfume', 'mauve', 112],
    ['Coastal Light Eau de Toilette', 'Sea salt, citrus peel and driftwood', 'perfume', 'blue', 59],
    ['Fig & Cedar Fragrance Oil', 'Green fig and smooth cedarwood', 'dropper', 'amber', 48],
  ],
}

const variantNames = ['', ' — Travel Size', ' — Refill']
const baseLaunchDates = ['2026-01-18', '2026-03-06', '2026-05-22', '2026-07-14', '2026-09-02', '2026-10-21']
const generatedProducts = []
let nextSku = 9

categories.forEach((category, categoryIndex) => {
  const alreadyUsed = featuredProducts.filter((product) => product.category === category.id).length
  const needed = 30 - alreadyUsed
  const templates = catalogueTemplates[category.id]
  let added = 0

  for (let templateIndex = 0; templateIndex < templates.length && added < needed; templateIndex += 1) {
    const [baseName, descriptor, shape, tone, basePrice] = templates[templateIndex]
    for (let variantIndex = 0; variantIndex < variantNames.length && added < needed; variantIndex += 1) {
      const name = `${baseName}${variantNames[variantIndex]}`
      if (featuredProducts.some((product) => product.category === category.id && product.name === name)) continue

      const skuNumber = nextSku
      const id = `LB-${String(skuNumber).padStart(3, '0')}`
      const brand = brands[(added + categoryIndex * 2) % brands.length]
      const price = Number((basePrice + variantIndex * 4 + (templateIndex % 3) * 2).toFixed(2))
      const stock = skuNumber % 23 === 0 ? 0 : skuNumber % 9 === 0 ? 3 : 6 + ((skuNumber * 7) % 42)
      const isNew = skuNumber >= 126
      const bestseller = skuNumber <= 24 || skuNumber % 17 === 0
      const costRatio = 0.29 + ((skuNumber * 13) % 15) / 100

      generatedProducts.push({
        id,
        sku: id,
        name,
        brand,
        category: category.id,
        price,
        cost: Number((price * costRatio).toFixed(2)),
        stock,
        reorderLevel: 5,
        stockStatus: stock === 0 ? 'out-of-stock' : stock <= 5 ? 'low-stock' : 'in-stock',
        shape,
        tone,
        bestseller,
        isNew,
        descriptor,
        size: variantIndex === 1 ? 'Travel Size' : variantIndex === 2 ? 'Refill' : 'Standard Size',
        launchDate: baseLaunchDates[(skuNumber + categoryIndex) % baseLaunchDates.length],
        rating: Number((4.1 + ((skuNumber * 7) % 9) / 10).toFixed(1)),
        reviewCount: 12 + ((skuNumber * 19) % 240),
      })
      nextSku += 1
      added += 1
    }
  }
})

export const products = [...featuredProducts, ...generatedProducts]
export const productCount = products.length

export const getStockLabel = (product) => {
  if (product.stock === 0) return 'Out of stock'
  if (product.stock <= product.reorderLevel) return `Only ${product.stock} left`
  return 'In stock'
}
