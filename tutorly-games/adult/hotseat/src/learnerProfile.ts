// ─── Learner Profile Types ─────────────────────────────────────────────────
export interface LearnerProfile {
  name: string;
  country: string;
  currency: string;
  currencySymbol: string;
  exchangeRate: number; // 1 USD = X local currency
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  interests: string[];
  age?: 'child' | 'teen' | 'adult';
}

// Default profile
export const DEFAULT_LEARNER: LearnerProfile = {
  name: 'Student',
  country: 'United States',
  currency: 'USD',
  currencySymbol: '$',
  exchangeRate: 1,
  cefrLevel: 'B1',
  interests: ['travel', 'technology', 'food'],
  age: 'adult',
};

// ─── Country Presets ───────────────────────────────────────────────────────
export const COUNTRY_PRESETS: Record<string, Partial<LearnerProfile>> = {
  'United States': { currency: 'USD', currencySymbol: '$', exchangeRate: 1 },
  'United Kingdom': { currency: 'GBP', currencySymbol: '£', exchangeRate: 0.79 },
  'European Union': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
  'Japan': { currency: 'JPY', currencySymbol: '¥', exchangeRate: 154 },
  'China': { currency: 'CNY', currencySymbol: '¥', exchangeRate: 7.24 },
  'South Korea': { currency: 'KRW', currencySymbol: '₩', exchangeRate: 1380 },
  'India': { currency: 'INR', currencySymbol: '₹', exchangeRate: 83.5 },
  'Brazil': { currency: 'BRL', currencySymbol: 'R$', exchangeRate: 5.1 },
  'Mexico': { currency: 'MXN', currencySymbol: 'MX$', exchangeRate: 17.2 },
  'Canada': { currency: 'CAD', currencySymbol: 'CA$', exchangeRate: 1.36 },
  'Australia': { currency: 'AUD', currencySymbol: 'A$', exchangeRate: 1.53 },
  'Russia': { currency: 'RUB', currencySymbol: '₽', exchangeRate: 92 },
  'Turkey': { currency: 'TRY', currencySymbol: '₺', exchangeRate: 32 },
  'Saudi Arabia': { currency: 'SAR', currencySymbol: 'SR', exchangeRate: 3.75 },
  'UAE': { currency: 'AED', currencySymbol: 'AED', exchangeRate: 3.67 },
  'Iran': { currency: 'IRR', currencySymbol: 'IRR', exchangeRate: 42000 },
  'Thailand': { currency: 'THB', currencySymbol: '฿', exchangeRate: 36 },
  'Vietnam': { currency: 'VND', currencySymbol: '₫', exchangeRate: 25000 },
  'Indonesia': { currency: 'IDR', currencySymbol: 'Rp', exchangeRate: 15800 },
  'Philippines': { currency: 'PHP', currencySymbol: '₱', exchangeRate: 56 },
  'Malaysia': { currency: 'MYR', currencySymbol: 'RM', exchangeRate: 4.7 },
  'Singapore': { currency: 'SGD', currencySymbol: 'S$', exchangeRate: 1.35 },
  'Egypt': { currency: 'EGP', currencySymbol: 'E£', exchangeRate: 31 },
  'South Africa': { currency: 'ZAR', currencySymbol: 'R', exchangeRate: 18.5 },
  'Nigeria': { currency: 'NGN', currencySymbol: '₦', exchangeRate: 1550 },
  'Pakistan': { currency: 'PKR', currencySymbol: 'Rs', exchangeRate: 278 },
  'Bangladesh': { currency: 'BDT', currencySymbol: '৳', exchangeRate: 110 },
  'Argentina': { currency: 'ARS', currencySymbol: 'AR$', exchangeRate: 870 },
  'Colombia': { currency: 'COP', currencySymbol: 'COL$', exchangeRate: 4000 },
  'Poland': { currency: 'PLN', currencySymbol: 'zł', exchangeRate: 4 },
  'Ukraine': { currency: 'UAH', currencySymbol: '₴', exchangeRate: 41 },
  'Israel': { currency: 'ILS', currencySymbol: '₪', exchangeRate: 3.7 },
  'Switzerland': { currency: 'CHF', currencySymbol: 'CHF', exchangeRate: 0.88 },
  'Sweden': { currency: 'SEK', currencySymbol: 'kr', exchangeRate: 10.5 },
  'Norway': { currency: 'NOK', currencySymbol: 'kr', exchangeRate: 10.8 },
  'Denmark': { currency: 'DKK', currencySymbol: 'kr', exchangeRate: 6.9 },
  'Czech Republic': { currency: 'CZK', currencySymbol: 'Kč', exchangeRate: 23 },
  'Romania': { currency: 'RON', currencySymbol: 'lei', exchangeRate: 4.6 },
  'Hungary': { currency: 'HUF', currencySymbol: 'Ft', exchangeRate: 360 },
  'Greece': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
  'Portugal': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
  'Spain': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
  'Italy': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
  'France': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
  'Germany': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
  'Netherlands': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
  'Belgium': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
  'Austria': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
  'Ireland': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
  'Finland': { currency: 'EUR', currencySymbol: '€', exchangeRate: 0.92 },
};

// ─── Things You Can Buy with Money (by price range in USD) ─────────────────
export interface PurchaseItem {
  name: string;
  emoji: string;
  minPrice: number; // USD
  maxPrice: number; // USD
  category: 'food' | 'tech' | 'travel' | 'vehicle' | 'house' | 'luxury' | 'education' | 'experience';
  childFriendly?: boolean;
}

export const PURCHASE_ITEMS: PurchaseItem[] = [
  // Small money ($100-$1000)
  { name: 'fancy dinner for two', emoji: '🍽️', minPrice: 100, maxPrice: 300, category: 'food', childFriendly: true },
  { name: 'new smartphone', emoji: '📱', minPrice: 300, maxPrice: 1200, category: 'tech', childFriendly: true },
  { name: 'gaming console', emoji: '🎮', minPrice: 400, maxPrice: 600, category: 'tech', childFriendly: true },
  { name: 'designer sneakers', emoji: '👟', minPrice: 150, maxPrice: 500, category: 'luxury', childFriendly: true },
  { name: 'weekend getaway', emoji: '🏨', minPrice: 300, maxPrice: 800, category: 'travel', childFriendly: true },
  { name: 'high-end headphones', emoji: '🎧', minPrice: 200, maxPrice: 500, category: 'tech', childFriendly: true },
  { name: 'online course', emoji: '📚', minPrice: 100, maxPrice: 500, category: 'education', childFriendly: true },
  { name: 'spa day', emoji: '💆', minPrice: 150, maxPrice: 400, category: 'experience' },
  { name: 'concert tickets', emoji: '🎵', minPrice: 100, maxPrice: 500, category: 'experience', childFriendly: true },
  
  // Medium money ($1000-$10,000)
  { name: 'laptop', emoji: '💻', minPrice: 800, maxPrice: 3000, category: 'tech', childFriendly: true },
  { name: 'vacation to Europe', emoji: '✈️', minPrice: 2000, maxPrice: 8000, category: 'travel', childFriendly: true },
  { name: 'used motorcycle', emoji: '🏍️', minPrice: 3000, maxPrice: 8000, category: 'vehicle' },
  { name: 'home theater system', emoji: '🎬', minPrice: 2000, maxPrice: 10000, category: 'tech', childFriendly: true },
  { name: 'Rolex watch', emoji: '⌚', minPrice: 5000, maxPrice: 15000, category: 'luxury' },
  { name: 'semester of university', emoji: '🎓', minPrice: 5000, maxPrice: 20000, category: 'education' },
  { name: 'designer handbag', emoji: '👜', minPrice: 2000, maxPrice: 10000, category: 'luxury' },
  { name: 'safari trip', emoji: '🦁', minPrice: 5000, maxPrice: 15000, category: 'travel', childFriendly: true },
  { name: 'home gym', emoji: '💪', minPrice: 2000, maxPrice: 10000, category: 'experience' },
  
  // Big money ($10,000-$100,000)
  { name: 'brand new car', emoji: '🚗', minPrice: 25000, maxPrice: 60000, category: 'vehicle', childFriendly: true },
  { name: 'world cruise', emoji: '🛳️', minPrice: 15000, maxPrice: 50000, category: 'travel', childFriendly: true },
  { name: 'full university degree', emoji: '🎓', minPrice: 40000, maxPrice: 150000, category: 'education' },
  { name: 'Tesla Model S', emoji: '⚡', minPrice: 80000, maxPrice: 120000, category: 'vehicle', childFriendly: true },
  { name: 'down payment on a house', emoji: '🏠', minPrice: 30000, maxPrice: 100000, category: 'house', childFriendly: true },
  { name: 'luxury watch collection', emoji: '⌚', minPrice: 30000, maxPrice: 100000, category: 'luxury' },
  { name: 'small business startup', emoji: '🏪', minPrice: 20000, maxPrice: 100000, category: 'experience' },
  { name: 'private pilot license', emoji: '✈️', minPrice: 10000, maxPrice: 20000, category: 'education' },
  
  // Huge money ($100,000-$1,000,000)
  { name: 'luxury apartment', emoji: '🏢', minPrice: 200000, maxPrice: 800000, category: 'house', childFriendly: true },
  { name: 'Ferrari', emoji: '🏎️', minPrice: 250000, maxPrice: 500000, category: 'vehicle', childFriendly: true },
  { name: 'yacht', emoji: '🛥️', minPrice: 100000, maxPrice: 500000, category: 'luxury' },
  { name: 'beach house', emoji: '🏖️', minPrice: 300000, maxPrice: 1000000, category: 'house', childFriendly: true },
  { name: 'trip to space (suborbital)', emoji: '🚀', minPrice: 250000, maxPrice: 500000, category: 'travel', childFriendly: true },
  { name: 'art collection', emoji: '🖼️', minPrice: 100000, maxPrice: 1000000, category: 'luxury' },
  { name: 'vineyard', emoji: '🍷', minPrice: 300000, maxPrice: 2000000, category: 'luxury' },
  
  // Mega money ($1,000,000+)
  { name: 'mansion', emoji: '🏰', minPrice: 1000000, maxPrice: 10000000, category: 'house', childFriendly: true },
  { name: 'private jet', emoji: '✈️', minPrice: 3000000, maxPrice: 50000000, category: 'luxury' },
  { name: 'private island', emoji: '🏝️', minPrice: 1000000, maxPrice: 50000000, category: 'luxury', childFriendly: true },
  { name: 'Lamborghini Aventador', emoji: '🏎️', minPrice: 400000, maxPrice: 600000, category: 'vehicle', childFriendly: true },
  { name: 'tech startup funding', emoji: '💼', minPrice: 1000000, maxPrice: 10000000, category: 'experience' },
  { name: 'space tourism package', emoji: '🌙', minPrice: 5000000, maxPrice: 50000000, category: 'travel', childFriendly: true },
  { name: 'sports team', emoji: '🏆', minPrice: 10000000, maxPrice: 5000000000, category: 'luxury' },
  { name: 'charitable foundation', emoji: '❤️', minPrice: 1000000, maxPrice: 100000000, category: 'experience', childFriendly: true },
];

// ─── Generate Personalized Prize Message ───────────────────────────────────
export const getPrizeMessage = (
  prizeUSD: number,
  learner: LearnerProfile,
  forSuspense = false
): { message: string; items: PurchaseItem[]; localAmount: string } => {
  const localAmount = prizeUSD * learner.exchangeRate;
  const formattedLocal = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(localAmount);
  
  const localAmountStr = `${learner.currencySymbol}${formattedLocal}`;
  
  // Find suitable items for this prize amount
  const suitableItems = PURCHASE_ITEMS.filter(item => {
    const affordable = prizeUSD >= item.minPrice && prizeUSD <= item.maxPrice * 2;
    const ageOk = learner.age === 'child' ? item.childFriendly : true;
    return affordable && ageOk;
  });
  
  // Pick 1-3 random items
  const shuffled = suitableItems.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(3, shuffled.length));
  
  // Build message
  let message = '';
  
  if (forSuspense) {
    // Suspense messages (during reveal)
    const suspenseTemplates = [
      `${learner.name}, that's ${localAmountStr} in ${learner.country}!`,
      `In ${learner.country}, ${localAmountStr} could change your life!`,
      `${localAmountStr}! Think of the possibilities, ${learner.name}!`,
      `With ${localAmountStr}, you could...`,
      `${learner.name}, imagine holding ${localAmountStr} right now!`,
    ];
    message = suspenseTemplates[Math.floor(Math.random() * suspenseTemplates.length)];
    
    if (selected.length > 0) {
      const itemNames = selected.map(i => `${i.emoji} ${i.name}`);
      if (itemNames.length === 1) {
        message += ` You could buy a ${itemNames[0]}!`;
      } else if (itemNames.length === 2) {
        message += ` That's enough for a ${itemNames[0]} or a ${itemNames[1]}!`;
      } else {
        message += ` That's ${itemNames[0]}, ${itemNames[1]}, or even ${itemNames[2]}!`;
      }
    }
  } else {
    // Regular prize messages (after winning)
    const regularTemplates = [
      `Congratulations ${learner.name}! In ${learner.country}, you've just won ${localAmountStr}!`,
      `${learner.name} wins ${localAmountStr}!`,
      `That's ${localAmountStr} for ${learner.name}! Incredible!`,
    ];
    message = regularTemplates[Math.floor(Math.random() * regularTemplates.length)];
    
    if (selected.length > 0) {
      const itemName = selected[0];
      message += ` You could buy ${itemName.emoji} ${itemName.name}!`;
    }
  }
  
  return { message, items: selected, localAmount: localAmountStr };
};

// ─── Money Background Images (from Unsplash, free to use) ──────────────────
export const MONEY_IMAGES = [
  'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&q=80', // Stack of bills
  'https://images.unsplash.com/photo-1621981386829-9b458a2cddde?w=1200&q=80', // Dollar bills
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80', // Money spread
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&q=80', // Cash in hand
  'https://images.unsplash.com/photo-1565373679580-c0de6dd1e3da?w=1200&q=80', // Flying money
  'https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=1200&q=80', // Gold coins
];

export const getRandomMoneyImage = () => MONEY_IMAGES[Math.floor(Math.random() * MONEY_IMAGES.length)];
