export type ProductRecord = {
  id: string
  sku: string
  title: string
  make: string
  model: string
  years: string
  category: string
  stock: number
  image: string
  description: string
  tags: string[]
}

const makeOrder = ['Ford', 'Chevrolet', 'GMC', 'Ram']
const categoryOrder = ['Lighting', 'Mirrors', 'Interior', 'Seats', 'Steering', 'Wheels', 'Exterior']

export const productCatalog: ProductRecord[] = [
  {
    id: 'ford-led-headlight-set',
    sku: 'TWC-F150-LGT-101',
    title: 'OEM LED Headlight Set',
    make: 'Ford',
    model: 'F-150',
    years: '2021 to 2026',
    category: 'Lighting',
    stock: 4,
    image: '/headlights.jpg',
    description: 'Factory style LED lighting upgrade with a cleaner front end signature and modern output.',
    tags: ['headlights', 'lighting', 'led', 'front end', 'oem'],
  },
  {
    id: 'ford-power-fold-mirrors',
    sku: 'TWC-F150-MIR-204',
    title: 'Power Folding Mirror Upgrade',
    make: 'Ford',
    model: 'F-150',
    years: '2021 to 2026',
    category: 'Mirrors',
    stock: 2,
    image: '/Product-Image-4.jpeg',
    description: 'OEM mirror upgrade with premium styling, clean fitment, and higher trim functionality.',
    tags: ['mirrors', 'power fold', 'blind spot', 'tow mirrors'],
  },
  {
    id: 'ford-digital-cluster',
    sku: 'TWC-F150-INT-118',
    title: 'Digital Cluster Upgrade',
    make: 'Ford',
    model: 'F-150',
    years: '2021 to 2026',
    category: 'Interior',
    stock: 1,
    image: '/Product-Image-1.jpeg',
    description: 'Higher trim digital cluster package designed for a factory style interior refresh.',
    tags: ['cluster', 'digital cluster', 'interior', 'screen'],
  },
  {
    id: 'ford-center-console-kit',
    sku: 'TWC-F150-CNS-145',
    title: 'Center Console Conversion Kit',
    make: 'Ford',
    model: 'F-150',
    years: '2021 to 2026',
    category: 'Interior',
    stock: 3,
    image: '/consoles.jpg',
    description: 'Console swap kit with the brackets, trim, and hardware needed for a cleaner cabin layout.',
    tags: ['console', 'interior', 'storage', 'charging'],
  },
  {
    id: 'ford-premium-seat-set',
    sku: 'TWC-F150-SEA-122',
    title: 'Premium Seat Set',
    make: 'Ford',
    model: 'F-150',
    years: '2021 to 2026',
    category: 'Seats',
    stock: 2,
    image: '/seats.jpeg',
    description: 'Premium seating package for builders chasing a higher trim interior look and feel.',
    tags: ['seats', 'heated seats', 'cooled seats', 'leather'],
  },
  {
    id: 'ford-steering-wheel-upgrade',
    sku: 'TWC-F150-STR-137',
    title: 'Raptor Style Steering Wheel',
    make: 'Ford',
    model: 'F-150',
    years: '2021 to 2026',
    category: 'Steering',
    stock: 5,
    image: '/steering%20wheel.jpg',
    description: 'Performance inspired steering wheel upgrade that keeps the cabin looking factory correct.',
    tags: ['steering wheel', 'wheel', 'controls', 'raptor'],
  },
  {
    id: 'ford-wheel-package',
    sku: 'TWC-F150-WHL-214',
    title: 'OEM Wheel and Tire Package',
    make: 'Ford',
    model: 'F-150',
    years: '2021 to 2026',
    category: 'Wheels',
    stock: 7,
    image: '/wheels.avif',
    description: 'Factory wheel package for builders wanting a stronger stance without losing OEM fitment.',
    tags: ['wheels', 'stance', 'tire package', 'suspension'],
  },
  {
    id: 'chevy-oem-mirror-upgrade',
    sku: 'TWC-SLV-MIR-208',
    title: 'OEM Mirror Upgrade',
    make: 'Chevrolet',
    model: 'Silverado',
    years: '2020 to 2024',
    category: 'Mirrors',
    stock: 6,
    image: '/Product-Image-4.jpeg',
    description: 'Mirror refresh package for Silverado builds that need a cleaner and more premium exterior finish.',
    tags: ['mirrors', 'silverado', 'oem', 'exterior'],
  },
  {
    id: 'chevy-front-seat-refresh',
    sku: 'TWC-SLV-SEA-113',
    title: 'Front Seat Refresh Kit',
    make: 'Chevrolet',
    model: 'Silverado',
    years: '2020 to 2024',
    category: 'Seats',
    stock: 3,
    image: '/seats.jpeg',
    description: 'Seat refresh package designed to bring Silverado interiors closer to premium trim expectations.',
    tags: ['seats', 'silverado', 'interior', 'front seats'],
  },
  {
    id: 'gmc-grille-conversion',
    sku: 'TWC-SIR-EXT-109',
    title: 'Factory Style Grille Conversion',
    make: 'GMC',
    model: 'Sierra',
    years: '2019 to 2024',
    category: 'Exterior',
    stock: 2,
    image: '/Product-Image-2.jpeg',
    description: 'Grille conversion package that sharpens the front end while staying close to OEM design language.',
    tags: ['grille', 'exterior', 'sierra', 'front end'],
  },
  {
    id: 'gmc-console-swap',
    sku: 'TWC-SIR-CNS-141',
    title: 'Center Console Swap Kit',
    make: 'GMC',
    model: 'Sierra',
    years: '2020 to 2024',
    category: 'Interior',
    stock: 2,
    image: '/consoles.jpg',
    description: 'Interior conversion kit with trim and hardware for a cleaner console layout and better storage.',
    tags: ['console', 'sierra', 'interior', 'storage'],
  },
  {
    id: 'ram-led-lighting-package',
    sku: 'TWC-RAM-LGT-117',
    title: 'OEM LED Lighting Package',
    make: 'Ram',
    model: '1500',
    years: '2019 to 2025',
    category: 'Lighting',
    stock: 4,
    image: '/headlights.jpg',
    description: 'LED lighting package for Ram builds that need brighter output and a more premium front end.',
    tags: ['lighting', 'ram', 'headlights', 'led'],
  },
]

export const productMakes = makeOrder.filter((make) =>
  productCatalog.some((product) => product.make === make),
)

export const productCategories = categoryOrder.filter((category) =>
  productCatalog.some((product) => product.category === category),
)

export const productModelsByMake = productCatalog.reduce<Record<string, string[]>>((accumulator, product) => {
  if (!accumulator[product.make]) {
    accumulator[product.make] = []
  }

  if (!accumulator[product.make].includes(product.model)) {
    accumulator[product.make].push(product.model)
  }

  return accumulator
}, {})

export const productCatalogBySku = productCatalog.reduce<Record<string, ProductRecord>>((accumulator, product) => {
  accumulator[product.sku] = product
  return accumulator
}, {})

export const productInventoryTotal = productCatalog.reduce((total, product) => total + product.stock, 0)
