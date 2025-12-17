// Shared configuration for country data

// Mapping of all available country codes to their IKEA base URLs
const allCountryBaseUrls = {
    us: 'https://www.ikea.com/us/en/',
    ca: 'https://www.ikea.com/ca/en/',
    mx: 'https://www.ikea.com/mx/es/',
    cl: 'https://www.ikea.com/cl/es/',
    co: 'https://www.ikea.com/co/es/',
    de: 'https://www.ikea.com/de/de/',
    fr: 'https://www.ikea.com/fr/fr/',
    it: 'https://www.ikea.com/it/it/',
    es: 'https://www.ikea.com/es/es/',
    nl: 'https://www.ikea.com/nl/nl/',
    pl: 'https://www.ikea.com/pl/pl/',
    cz: 'https://www.ikea.com/cz/cs/',
    pt: 'https://www.ikea.com/pt/pt/',
    ch: 'https://www.ikea.com/ch/de/',
    at: 'https://www.ikea.com/at/de/',
    sk: 'https://www.ikea.com/sk/sk/',
    si: 'https://www.ikea.com/si/sl/',
    hu: 'https://www.ikea.com/hu/hu/',
    ro: 'https://www.ikea.com/ro/ro/',
    fi: 'https://www.ikea.com/fi/fi/',
    se: 'https://www.ikea.com/se/sv/',
    no: 'https://www.ikea.com/no/no/',
    dk: 'https://www.ikea.com/dk/da/',
    hr: 'https://www.ikea.com/hr/hr/',
    eg: 'https://www.ikea.com/eg/en/',
    ie: 'https://www.ikea.com/ie/en/',
    rs: 'https://www.ikea.com/rs/sr/'
};

// Country names for better display
const countryNames = {
    us: '🇺🇸 USA',
    ca: '🇨🇦 Canada',
    mx: '🇲🇽 Mexico',
    cl: '🇨🇱 Chile',
    co: '🇨🇴 Colombia',
    de: '🇩🇪 Germany',
    fr: '🇫🇷 France',
    it: '🇮🇹 Italy',
    es: '🇪🇸 Spain',
    nl: '🇳🇱 Netherlands',
    pl: '🇵🇱 Poland',
    cz: '🇨🇿 Czechia',
    pt: '🇵🇹 Portugal',
    ch: '🇨🇭 Switzerland',
    at: '🇦🇹 Austria',
    sk: '🇸🇰 Slovakia',
    si: '🇸🇮 Slovenia',
    hu: '🇭🇺 Hungary',
    ro: '🇷🇴 Romania',
    fi: '🇫🇮 Finland',
    se: '🇸🇪 Sweden',
    no: '🇳🇴 Norway',
    dk: '🇩🇰 Denmark',
    hr: '🇭🇷 Croatia',
    eg: '🇪🇬 Egypt',
    ie: '🇮🇪 Ireland',
    rs: '🇷🇸 Serbia'
};

// Fallback currencies for countries where currency is not displayed on website
// Using international currency codes to avoid confusion between different dollars/pesos
// Euro uses € symbol as it's universally recognized
const fallbackCurrencies = {
    us: 'USD',     // USA - US Dollar
    ca: 'CAD',     // Canada - Canadian Dollar
    mx: 'MXN',     // Mexico - Mexican Peso
    cl: 'CLP',     // Chile - Chilean Peso
    co: 'COP',     // Colombia - Colombian Peso
    se: 'SEK',     // Sweden - Swedish Krona
    dk: 'DKK',     // Denmark - Danish Krone
    cz: 'CZK',     // Czechia - Czech Koruna
    fi: '€',       // Finland - Euro
    no: 'NOK',     // Norway - Norwegian Krone
    pl: 'PLN',     // Poland - Polish Zloty
    hr: '€',       // Croatia - Euro
    hu: 'HUF',     // Hungary - Hungarian Forint
    ro: 'RON',     // Romania - Romanian Leu
    rs: 'RSD',     // Serbia - Serbian Dinar
    eg: 'EGP',     // Egypt - Egyptian Pound
    ie: '€',       // Ireland - Euro
    ch: 'CHF',     // Switzerland - Swiss Franc
    sk: '€',       // Slovakia - Euro
    si: '€',       // Slovenia - Euro
    de: '€',       // Germany - Euro
    fr: '€',       // France - Euro
    it: '€',       // Italy - Euro
    es: '€',       // Spain - Euro
    nl: '€',       // Netherlands - Euro
    pt: '€',       // Portugal - Euro
    at: '€'        // Austria - Euro
};

// Default countries (original 5)
const defaultCountries = ['de', 'fr', 'it', 'es', 'nl'];
