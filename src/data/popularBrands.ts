interface PopularBrand {
  id: string;
  name: string;
  logo: string;
  color: string;
  category: string;
  description: string;
}

// Interface pour les marques populaires
interface PopularBrand {
  id: string;
  name: string;
  logo: string;
  logoUrl: string;
  color: string;
  category: string;
  description: string;
}

// Marques populaires françaises pour CardBox
const popularBrands: PopularBrand[] = [
  // Supermarchés
  {
    id: 'carrefour',
    name: 'Carrefour',
    logo: '🛒',
    logoUrl: 'https://logo.clearbit.com/carrefour.fr',
    color: 'from-blue-600 to-blue-700',
    category: 'supermarche',
    description: 'Supermarchés et hypermarchés'
  },
  {
    id: 'leclerc',
    name: 'Leclerc',
    logo: '🛒',
    logoUrl: 'https://logo.clearbit.com/e-leclerc.com',
    color: 'from-blue-500 to-blue-600',
    category: 'supermarche',
    description: 'Centres E.Leclerc'
  },
  {
    id: 'auchan',
    name: 'Auchan',
    logo: '🛒',
    logoUrl: 'https://logo.clearbit.com/auchan.fr',
    color: 'from-red-600 to-red-700',
    category: 'supermarche',
    description: 'Hypermarchés Auchan'
  },
  {
    id: 'intermarche',
    name: 'Intermarché',
    logo: '🛒',
    logoUrl: 'https://logo.clearbit.com/intermarche.fr',
    color: 'from-red-500 to-red-600',
    category: 'supermarche',
    description: 'Supermarchés Intermarché'
  },
  {
    id: 'casino',
    name: 'Casino',
    logo: '🛒',
    logoUrl: 'https://logo.clearbit.com/groupe-casino.fr',
    color: 'from-green-600 to-green-700',
    category: 'supermarche',
    description: 'Supermarchés Casino'
  },
  {
    id: 'lidl',
    name: 'Lidl',
    logo: '🛒',
    logoUrl: 'https://logo.clearbit.com/lidl.fr',
    color: 'from-yellow-500 to-yellow-600',
    category: 'supermarche',
    description: 'Supermarchés Lidl'
  },

  // Pharmacies
  {
    id: 'pharmacie',
    name: 'Pharmacie',
    logo: '💊',
    logoUrl: 'https://via.placeholder.com/64/22c55e/white?text=💊',
    color: 'from-green-600 to-green-700',
    category: 'pharmacie',
    description: 'Pharmacies de quartier'
  },

  // Restaurants
  {
    id: 'mcdonalds',
    name: "McDonald's",
    logo: '🍔',
    logoUrl: 'https://logo.clearbit.com/mcdonalds.com',
    color: 'from-yellow-500 to-yellow-600',
    category: 'restaurant',
    description: 'Restauration rapide'
  },
  {
    id: 'kfc',
    name: 'KFC',
    logo: '🍗',
    logoUrl: 'https://logo.clearbit.com/kfc.com',
    color: 'from-red-600 to-red-700',
    category: 'restaurant',
    description: 'Poulet frit'
  },
  {
    id: 'subway',
    name: 'Subway',
    logo: '🥪',
    logoUrl: 'https://logo.clearbit.com/subway.com',
    color: 'from-green-600 to-green-700',
    category: 'restaurant',
    description: 'Sandwichs frais'
  },

  // Magasins de sport
  {
    id: 'decathlon',
    name: 'Decathlon',
    logo: '⚽',
    logoUrl: 'https://logo.clearbit.com/decathlon.fr',
    color: 'from-blue-600 to-blue-700',
    category: 'sport',
    description: 'Équipements sportifs'
  },
  {
    id: 'gosport',
    name: 'Go Sport',
    logo: '🏃‍♂️',
    logoUrl: 'https://logo.clearbit.com/go-sport.com',
    color: 'from-orange-600 to-orange-700',
    category: 'sport',
    description: 'Articles de sport'
  },

  // Mode
  {
    id: 'zara',
    name: 'Zara',
    logo: '👗',
    logoUrl: 'https://logo.clearbit.com/zara.com',
    color: 'from-gray-800 to-gray-900',
    category: 'vetement',
    description: 'Mode et tendances'
  },
  {
    id: 'hm',
    name: 'H&M',
    logo: '👕',
    logoUrl: 'https://logo.clearbit.com/hm.com',
    color: 'from-red-600 to-red-700',
    category: 'vetement',
    description: 'Mode accessible'
  },
  {
    id: 'uniqlo',
    name: 'Uniqlo',
    logo: '🧥',
    logoUrl: 'https://logo.clearbit.com/uniqlo.com',
    color: 'from-red-500 to-red-600',
    category: 'vetement',
    description: 'Vêtements casual'
  },

  // Beauté
  {
    id: 'sephora',
    name: 'Sephora',
    logo: '💄',
    logoUrl: 'https://logo.clearbit.com/sephora.fr',
    color: 'from-pink-600 to-pink-700',
    category: 'beaute',
    description: 'Cosmétiques et parfums'
  },
  {
    id: 'yves-rocher',
    name: 'Yves Rocher',
    logo: '🌿',
    logoUrl: 'https://logo.clearbit.com/yves-rocher.fr',
    color: 'from-green-600 to-green-700',
    category: 'beaute',
    description: 'Cosmétiques naturels'
  },

  // Bricolage
  {
    id: 'leroy-merlin',
    name: 'Leroy Merlin',
    logo: '🔨',
    logoUrl: 'https://logo.clearbit.com/leroymerlin.fr',
    color: 'from-green-600 to-green-700',
    category: 'bricolage',
    description: 'Bricolage et jardinage'
  },
  {
    id: 'castorama',
    name: 'Castorama',
    logo: '🏠',
    logoUrl: 'https://logo.clearbit.com/castorama.fr',
    color: 'from-blue-600 to-blue-700',
    category: 'bricolage',
    description: 'Aménagement maison'
  },

  // Autres
  {
    id: 'fnac',
    name: 'Fnac',
    logo: '📚',
    logoUrl: 'https://logo.clearbit.com/fnac.com',
    color: 'from-yellow-600 to-yellow-700',
    category: 'autre',
    description: 'Culture et high-tech'
  },
  {
    id: 'darty',
    name: 'Darty',
    logo: '📱',
    logoUrl: 'https://logo.clearbit.com/darty.com',
    color: 'from-red-600 to-red-700',
    category: 'autre',
    description: 'Électroménager'
  },

  // Divers - Pour cartes non référencées
  {
    id: 'divers',
    name: 'Autre marque',
    logo: '🏪',
    logoUrl: 'https://via.placeholder.com/64/6b7280/white?text=🏪',
    color: 'from-gray-600 to-gray-700',
    category: 'autre',
    description: 'Marque non référencée'
  }
];

export { popularBrands };