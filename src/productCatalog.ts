export type ProductVehicleRecord = {
  id: string
  year: string
  make: string
  model: string
  label: string
}

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
  vehicles: ProductVehicleRecord[]
  makes: string[]
  models: string[]
  compatibility: string
  manufacturer: string
  price: number | null
  positions: string[]
  otherNames: string[]
  replaces: string
}

export type ProductCatalogMeta = {
  productMakes: string[]
  productCategories: string[]
  productModelsByMake: Record<string, string[]>
  productCatalogBySku: Record<string, ProductRecord>
  productInventoryTotal: number
}

type SeedProductInput = {
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
  manufacturer?: string
  price?: number | null
  positions?: string[]
  otherNames?: string[]
  replaces?: string
}

const makeOrder = ['Ford', 'Chevrolet', 'GMC', 'Ram']
const categoryOrder = ['Lighting', 'Mirrors', 'Interior', 'Seats', 'Steering', 'Wheels', 'Exterior', 'Body part']

const createVehicleLabel = (year: string, make: string, model: string) =>
  [year, make, model].filter(Boolean).join(' ')

const createSeedRecord = (seed: SeedProductInput): ProductRecord => {
  const vehicle = {
    id: `${seed.id}-fitment-1`,
    year: seed.years,
    make: seed.make,
    model: seed.model,
    label: createVehicleLabel(seed.years, seed.make, seed.model),
  }

  return {
    ...seed,
    vehicles: [vehicle],
    makes: [seed.make],
    models: [seed.model],
    compatibility: `Fits ${seed.make} ${seed.model}`,
    manufacturer: seed.manufacturer || 'OEM',
    price: seed.price ?? null,
    positions: seed.positions || [],
    otherNames: seed.otherNames || [],
    replaces: seed.replaces || '',
  }
}

export const createCompatibilitySummary = (vehicles: ProductVehicleRecord[]) => {
  if (!vehicles.length) {
    return 'Fitment details in progress'
  }

  if (vehicles.length === 1) {
    return `Fits ${vehicles[0].label}`
  }

  const labels = vehicles.slice(0, 2).map((vehicle) => vehicle.label)
  const remaining = vehicles.length - labels.length
  const visibleLabel = labels.join(' and ')

  return remaining > 0
    ? `Fits ${visibleLabel}, plus ${remaining} more`
    : `Fits ${visibleLabel}`
}

export const createYearsSummary = (vehicles: ProductVehicleRecord[]) => {
  const years = Array.from(new Set(vehicles.map((vehicle) => vehicle.year).filter(Boolean)))

  if (!years.length) {
    return 'Fitment in progress'
  }

  return years.join(', ')
}

export const createPrimaryVehicleSummary = (vehicles: ProductVehicleRecord[]) => {
  if (!vehicles.length) {
    return {
      make: 'Multiple makes',
      model: 'Fitment list',
    }
  }

  if (vehicles.length === 1) {
    return {
      make: vehicles[0].make,
      model: vehicles[0].model,
    }
  }

  return {
    make: vehicles[0].make,
    model: `${vehicles[0].model} +${vehicles.length - 1}`,
  }
}

const seedCatalogInput: SeedProductInput[] = [
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

export const productCatalog: ProductRecord[] = seedCatalogInput.map(createSeedRecord)

export const createProductCatalogMeta = (products: ProductRecord[]): ProductCatalogMeta => {
  const vehicleEntries = products.flatMap((product) =>
    product.vehicles.length
      ? product.vehicles
      : [{
        id: `${product.id}-fallback`,
        year: product.years,
        make: product.make,
        model: product.model,
        label: createVehicleLabel(product.years, product.make, product.model),
      }],
  )

  const availableMakes = Array.from(new Set(vehicleEntries.map((vehicle) => vehicle.make).filter(Boolean)))
  const availableCategories = Array.from(new Set(products.map((product) => product.category).filter(Boolean)))
  const productMakes = makeOrder
    .filter((make) => availableMakes.includes(make))
    .concat(availableMakes.filter((make) => !makeOrder.includes(make)).sort())

  const productCategories = categoryOrder
    .filter((category) => availableCategories.includes(category))
    .concat(availableCategories.filter((category) => !categoryOrder.includes(category)).sort())

  const productModelsByMake = vehicleEntries.reduce<Record<string, string[]>>((accumulator, vehicle) => {
    if (!accumulator[vehicle.make]) {
      accumulator[vehicle.make] = []
    }

    if (!accumulator[vehicle.make].includes(vehicle.model)) {
      accumulator[vehicle.make].push(vehicle.model)
      accumulator[vehicle.make].sort()
    }

    return accumulator
  }, {})

  const productCatalogBySku = products.reduce<Record<string, ProductRecord>>((accumulator, product) => {
    accumulator[product.sku] = product
    return accumulator
  }, {})

  const productInventoryTotal = products.reduce((total, product) => total + product.stock, 0)

  return {
    productMakes,
    productCategories,
    productModelsByMake,
    productCatalogBySku,
    productInventoryTotal,
  }
}

export const {
  productMakes,
  productCategories,
  productModelsByMake,
  productCatalogBySku,
  productInventoryTotal,
} = createProductCatalogMeta(productCatalog)
