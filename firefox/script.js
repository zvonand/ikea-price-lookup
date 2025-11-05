

// document.body.style.border = "5px solid red";

// var symbolToCurrencyName = {
//     "$": "USD",
//     "€": "EUR",
//     "₽": "RUB",
//     "₴": "UAH",
// }
// var currencySymbols = "$€₽₴"
//
//
// localPriceWithCurrency = document.getElementsByClassName("pip-temp-price__sr-text")[0].textContent;
//
// localPriceInLocalCurrency = localPriceWithCurrency.match(/\d+(?:\.\d+)?/g);
//
// const myRe = new RegExp(currencySymbols, "g");
//
//
// console.log("Local currency is: " + localPriceWithCurrency.match(myRe));
// console.log("Local price is: " + localPriceInLocalCurrency);


// Extract the article number from the current product page and remove dots
const articleElement = document.querySelector('.pip-product-identifier__value');
const rawArticleNumber = articleElement?.textContent.trim();
const articleNumber = rawArticleNumber?.replace(/\./g, '');

// Mapping of EU country codes to their IKEA product base URLs
const countryBaseUrls = {
    de: 'https://www.ikea.com/de/de/p/',
    fr: 'https://www.ikea.com/fr/fr/p/',
    it: 'https://www.ikea.com/it/it/p/',
    es: 'https://www.ikea.com/es/es/p/',
    nl: 'https://www.ikea.com/nl/nl/p/'
};

// Country names for better display
const countryNames = {
    de: '🇩🇪 Germany',
    fr: '🇫🇷 France',
    it: '🇮🇹 Italy',
    es: '🇪🇸 Spain',
    nl: '🇳🇱 Netherlands'
};

// Object to store fetched prices keyed by country code
const pricesByCountry = {};

// Fetch the product price for each country and store it
async function fetchPrices(articleNumber) {
    const promises = Object.entries(countryBaseUrls).map(async ([code, baseUrl]) => {
        try {
            const response = await fetch(`${baseUrl}${articleNumber}/`);
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const priceElement = doc.querySelector('.pip-price__integer');
            const currencyElement = doc.querySelector('.pip-price__currencymarker');
            
            if (priceElement) {
                const price = priceElement.textContent.trim();
                const currency = currencyElement?.textContent.trim() || '';
                pricesByCountry[code] = { price, currency };
            }
        } catch (e) {
            console.error(`Failed to fetch price for ${code}`, e);
            pricesByCountry[code] = { price: 'N/A', currency: '' };
        }
    });
    
    await Promise.all(promises);
}

// Create and inject the tooltip
function createPriceTooltip(priceElement) {
    const tooltip = document.createElement('div');
    tooltip.id = 'ikea-price-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        background: white;
        border: 2px solid #0058a3;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: none;
        min-width: 220px;
        font-family: 'Noto IKEA', 'Noto Sans', sans-serif;
        font-size: 14px;
        line-height: 1.5;
        margin-top: 8px;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `
        font-weight: bold;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e5e5;
        color: #0058a3;
    `;
    header.textContent = 'Prices in other countries:';
    tooltip.appendChild(header);
    
    const priceList = document.createElement('div');
    priceList.id = 'ikea-price-list';
    tooltip.appendChild(priceList);
    
    // Position tooltip relative to price element
    const container = priceElement.closest('.pip-temp-price, .pip-price') || priceElement.parentElement;
    container.style.position = 'relative';
    container.appendChild(tooltip);
    
    return tooltip;
}

// Update tooltip content with prices
function updateTooltipContent(tooltip) {
    const priceList = tooltip.querySelector('#ikea-price-list');
    priceList.innerHTML = '';
    
    if (Object.keys(pricesByCountry).length === 0) {
        priceList.innerHTML = '<div style="color: #666; font-style: italic;">Loading prices...</div>';
        return;
    }
    
    for (const [code, data] of Object.entries(pricesByCountry)) {
        const priceRow = document.createElement('a');
        priceRow.href = `${countryBaseUrls[code]}${articleNumber}/`;
        priceRow.target = '_blank';
        priceRow.rel = 'noopener noreferrer';
        priceRow.style.cssText = `
            display: flex;
            justify-content: space-between;
            padding: 6px 8px;
            color: #111;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s;
            cursor: pointer;
            margin: 2px 0;
        `;
        
        // Add hover effect
        priceRow.addEventListener('mouseenter', () => {
            priceRow.style.backgroundColor = '#f5f5f5';
        });
        priceRow.addEventListener('mouseleave', () => {
            priceRow.style.backgroundColor = 'transparent';
        });
        
        const countryName = document.createElement('span');
        countryName.textContent = countryNames[code];
        
        const priceValue = document.createElement('span');
        priceValue.style.fontWeight = 'bold';
        priceValue.textContent = data.price === 'N/A' ? 'N/A' : `${data.price} ${data.currency}`;
        
        priceRow.appendChild(countryName);
        priceRow.appendChild(priceValue);
        priceList.appendChild(priceRow);
    }
}

// Position tooltip below the price element
function positionTooltip(tooltip, priceElement) {
    const rect = priceElement.getBoundingClientRect();
    
    // Position below the price element
    tooltip.style.left = '0';
    tooltip.style.top = '100%';
}

// Attach hover listeners to price element
function attachPriceHoverListeners() {
    const priceElement = document.querySelector('.pip-temp-price__integer, .pip-price__integer');
    
    if (!priceElement) {
        console.log('Price element not found');
        return;
    }
    
    const tooltip = createPriceTooltip(priceElement);
    let hideTimeout = null;
    
    const showTooltip = () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        tooltip.style.display = 'block';
        positionTooltip(tooltip, priceElement);
        updateTooltipContent(tooltip);
    };
    
    const hideTooltip = () => {
        hideTimeout = setTimeout(() => {
            tooltip.style.display = 'none';
        }, 200); // 200ms delay before hiding
    };
    
    priceElement.style.cursor = 'pointer';
    
    // Price element events
    priceElement.addEventListener('mouseenter', showTooltip);
    priceElement.addEventListener('mouseleave', hideTooltip);
    
    // Tooltip events - cancel hiding when hovering over tooltip
    tooltip.addEventListener('mouseenter', () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    });
    
    tooltip.addEventListener('mouseleave', hideTooltip);
}

// Main execution
if (articleNumber) {
    // First, attach the hover listeners
    attachPriceHoverListeners();
    
    // Then fetch prices in the background
    fetchPrices(articleNumber).then(() => {
        console.log('Fetched prices:', pricesByCountry);
    });
}