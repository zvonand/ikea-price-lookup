// Browser API compatibility - use chrome or browser depending on what's available
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Detect current country from URL (e.g., /us/en/ -> 'us')
function getCurrentCountry() {
    const match = window.location.pathname.match(/^\/([a-z]{2})\//);
    return match ? match[1] : null;
}

const currentCountry = getCurrentCountry();

// Extract the article number from the current product page and remove dots
// Support old (pip-) and new (pipcom-, pipf-) class naming
function getArticleNumber() {
    // Try DOM elements first
    const articleElement = document.querySelector('.pip-product-identifier__value, .pipcom-product-identifier__value, .pipf-product-identifier__value');
    if (articleElement) {
        return articleElement.textContent.trim().replace(/\./g, '');
    }
    
    // Fallback: extract from URL (e.g., /p/product-name-12345678/)
    const urlMatch = window.location.pathname.match(/\/p\/[^\/]+-(\d{8})\/?$/);
    if (urlMatch) {
        return urlMatch[1];
    }
    
    // Try another URL pattern (some countries use different formats)
    const urlMatch2 = window.location.pathname.match(/[-\/](\d{8})\/?$/);
    if (urlMatch2) {
        return urlMatch2[1];
    }
    
    return null;
}

const articleNumber = getArticleNumber();

// Active countries based on user settings (loaded from config.js)
let countryBaseUrls = {};

// Load user settings
async function loadSettings() {
    try {
        const result = await browserAPI.storage.sync.get('selectedCountries');
        const selectedCountries = result.selectedCountries || defaultCountries;
    
        // Filter countryBaseUrls based on selected countries
        countryBaseUrls = {};
        for (const code of selectedCountries) {
            if (allCountryBaseUrls[code]) {
                countryBaseUrls[code] = allCountryBaseUrls[code];
            }
        }
    } catch (e) {
        console.error('Failed to load settings, using defaults', e);
        // Use default countries on error
        countryBaseUrls = {};
        for (const code of defaultCountries) {
            countryBaseUrls[code] = allCountryBaseUrls[code];
        }
    }
}

// Cache to store fetched prices keyed by article number
const priceCache = {};

// Store cart items data: { articleNumber, quantity, pricesByCountry }
const cartItemsData = [];

// Fetch the product price for each country and store it
async function fetchPrices(articleNumber) {
    // Return cached prices if available
    if (priceCache[articleNumber]) {
        // console.log(`Using cached prices for ${articleNumber}`);
        return priceCache[articleNumber];
    }
    
    // console.log(`Fetching prices for article ${articleNumber}`);
    const pricesByCountry = {};
    const promises = Object.entries(countryBaseUrls).map(async ([code, baseUrl]) => {
        try {
            const response = await fetch(`${baseUrl}p/${articleNumber}/`);
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            // Support old (pip-) and new (pipcom-, pipf-) class naming
            const priceIntegerElement = doc.querySelector('.pip-price__integer, .pipcom-price__integer, .pipf-price__integer');
            const priceDecimalElement = doc.querySelector('.pip-price__decimal, .pipcom-price__decimal, .pipf-price__decimal');
            const currencyElement = doc.querySelector('.pip-price__currency, .pipcom-price__currency, .pipf-price__currency');
        
            if (priceIntegerElement) {
                const integerPart = parseFloat(priceIntegerElement.textContent.trim().replace(/\s/g, ''));
                let decimalPart = 0;
                
                // Extract decimal value if present (e.g., ",99" or ".99")
                if (priceDecimalElement) {
                    const decimalText = priceDecimalElement.textContent.trim();
                    // Skip if it contains only ",-" or "-" (used in some countries to indicate no decimals)
                    if (!decimalText.match(/^[,.\\s\-–]+$/)) {
                        const cleanedDecimal = decimalText.replace(/[,.\\s\-–]/g, '');
                        if (cleanedDecimal) {
                            decimalPart = parseFloat('0.' + cleanedDecimal) || 0;
                        }
                    }
                }
            
                const price = integerPart + decimalPart;
                
                // Always use international currency code from fallback for clarity
                // This avoids confusion between different dollars ($) and other ambiguous symbols
                let currency = fallbackCurrencies[code] || '';
                
                // If no fallback defined, try to get from page as last resort
                if (!currency && currencyElement) {
                    currency = currencyElement.textContent.trim() || '';
                    // Check if currency is only punctuation/dashes - if so, clear it
                    if (currency && currency.match(/^[,.\\s\-–$€£]+$/)) {
                        currency = '';
                    }
                }
                
                pricesByCountry[code] = { price, currency };
            }
        } catch (e) {
            console.error(`Failed to fetch price for ${code}`, e);
            pricesByCountry[code] = { price: null, currency: '' };
        }
    });

    await Promise.all(promises);

    // Cache the results
    priceCache[articleNumber] = pricesByCountry;
    // console.log(`Cached prices for ${articleNumber}:`, pricesByCountry);
    return pricesByCountry;
}

// Inject loading spinner CSS if not already present
function injectSpinnerStyles() {
    if (document.getElementById('ikea-price-lookup-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ikea-price-lookup-styles';
    style.textContent = `
        @keyframes ikea-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .ikea-loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #e5e5e5;
            border-top-color: #0058a3;
            border-radius: 50%;
            animation: ikea-spin 0.8s linear infinite;
        }
        .ikea-loading-container {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            color: #666;
        }
        .ikea-price-tooltip,
        .ikea-total-price-tooltip {
            position: fixed !important;
            z-index: 2147483647 !important;
            overflow: visible !important;
            clip: auto !important;
            clip-path: none !important;
        }
    `;
    document.head.appendChild(style);
}

// Create and inject the tooltip
function createPriceTooltip(priceElement, articleNum) {
    // Ensure spinner styles are injected
    injectSpinnerStyles();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'ikea-price-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        background: white;
        border: 2px solid #0058a3;
        border-radius: 8px;
        padding: 12px 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 100000;
        display: none;
        width: max-content;
        min-width: 180px;
        max-width: 400px;
        font-family: 'Noto IKEA', 'Noto Sans', sans-serif;
        font-size: 14px;
        line-height: 1.5;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        font-weight: bold;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e5e5;
        color: #0058a3;
        white-space: nowrap;
    `;
    header.textContent = 'Prices in other countries:';
    tooltip.appendChild(header);

    const priceList = document.createElement('div');
    priceList.className = 'ikea-price-list';
    priceList.style.cssText = `
        display: grid;
        grid-template-columns: auto auto;
        gap: 2px 24px;
        align-items: center;
    `;
    
    // Add loading indicator by default
    priceList.innerHTML = `
        <div class="ikea-loading-container" style="grid-column: 1 / -1;">
            <div class="ikea-loading-spinner"></div>
            <span>Loading prices...</span>
        </div>
    `;
    tooltip.appendChild(priceList);

    // Store article number for later use
    tooltip.dataset.articleNumber = articleNum;

    // Append tooltip to body for fixed positioning
    document.body.appendChild(tooltip);

    return tooltip;
}

// Update tooltip content with prices
function updateTooltipContent(tooltip, pricesByCountry, articleNum) {
    const priceList = tooltip.querySelector('.ikea-price-list');
    priceList.innerHTML = '';

    if (!pricesByCountry || Object.keys(pricesByCountry).length === 0) {
        priceList.innerHTML = `
            <div class="ikea-loading-container" style="grid-column: 1 / -1;">
                <div class="ikea-loading-spinner"></div>
                <span>Loading prices...</span>
            </div>
        `;
        return;
    }

    for (const [code, data] of Object.entries(pricesByCountry)) {
        // Skip the current country - user already sees that price
        if (code === currentCountry) {
            continue;
        }
        
        const row = document.createElement('a');
        row.href = `${countryBaseUrls[code]}p/${articleNum}/`;
        row.target = '_blank';
        row.rel = 'noopener noreferrer';
        row.style.cssText = `
            display: grid;
            grid-template-columns: 1fr auto;
            grid-column: 1 / -1;
            gap: 24px;
            padding: 6px 8px;
            color: #111;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s;
            cursor: pointer;
        `;

        // Add hover effect
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = '#f5f5f5';
        });
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = 'transparent';
        });

        const countryName = document.createElement('span');
        countryName.style.cssText = 'white-space: nowrap;';
        countryName.textContent = countryNames[code];

        const priceValue = document.createElement('span');
        priceValue.style.cssText = 'font-weight: bold; white-space: nowrap; text-align: right;';

        if (data.price === null) {
            priceValue.textContent = 'N/A';
        } else {
            priceValue.textContent = `${data.price.toFixed(2)} ${data.currency}`;
        }

        row.appendChild(countryName);
        row.appendChild(priceValue);
        priceList.appendChild(row);
    }
}

// Store last mouse position for tooltip positioning
let lastMouseX = 0;
let lastMouseY = 0;

document.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

// Position tooltip near the mouse cursor
function positionTooltip(tooltip, priceElement) {
    // Make tooltip visible temporarily to measure it
    const wasHidden = tooltip.style.display === 'none';
    if (wasHidden) {
        tooltip.style.visibility = 'hidden';
        tooltip.style.display = 'block';
    }
    
    const tooltipRect = tooltip.getBoundingClientRect();
    
    if (wasHidden) {
        tooltip.style.display = 'none';
        tooltip.style.visibility = 'visible';
    }
    
    // Position below and slightly to the right of mouse cursor
    let top = lastMouseY + 15;
    let left = lastMouseX + 10;
    
    // Make sure tooltip doesn't go off screen to the right
    if (left + tooltipRect.width > window.innerWidth - 20) {
        left = lastMouseX - tooltipRect.width - 10;
    }
    
    // Make sure tooltip doesn't go off screen to the left
    if (left < 20) {
        left = 20;
    }
    
    // If tooltip would go below viewport, show it above the cursor instead
    if (top + tooltipRect.height > window.innerHeight - 20) {
        top = lastMouseY - tooltipRect.height - 15;
    }
    
    // Make sure it doesn't go above viewport
    if (top < 20) {
        top = 20;
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

// Attach hover listeners to a price element
function attachPriceHoverListeners(priceElement, articleNum) {
    if (!priceElement || priceElement.dataset.tooltipAttached) {
        return;
    }
    
    // Mark as processed
    priceElement.dataset.tooltipAttached = 'true';
    
    const tooltip = createPriceTooltip(priceElement, articleNum);
    let hideTimeout = null;
    
    const showTooltip = async () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        tooltip.style.display = 'block';
        positionTooltip(tooltip, priceElement);
        
        // Fetch prices if not already fetched
        const pricesByCountry = await fetchPrices(articleNum);
        updateTooltipContent(tooltip, pricesByCountry, articleNum);
    };
    
    const hideTooltip = () => {
        hideTimeout = setTimeout(() => {
            tooltip.style.display = 'none';
        }, 200);
    };
    
    priceElement.style.cursor = 'pointer';
    
    // Price element events
    priceElement.addEventListener('mouseenter', showTooltip);
    priceElement.addEventListener('mouseleave', hideTooltip);
    
    // Tooltip events
    tooltip.addEventListener('mouseenter', () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    });
    
    tooltip.addEventListener('mouseleave', hideTooltip);
}

// Handle product detail page
function handleProductPage() {
    if (!articleNumber) return;

    // Find both regular price and discounted price elements (support old and new class names)
    const priceElements = document.querySelectorAll('.pip-temp-price__integer, .pip-price__integer, .pipcom-temp-price__integer, .pipcom-price__integer, .pipf-temp-price__integer, .pipf-price__integer');
    
    if (priceElements.length > 0) {
        // Attach to all price elements (handles both old and new prices)
        priceElements.forEach(priceElement => {
            attachPriceHoverListeners(priceElement, articleNumber);
        });
    
        // Pre-fetch prices in the background
        fetchPrices(articleNumber).then(() => {
            // console.log('Fetched prices for product:', articleNumber);
        });
    }
}

// Extract article number and quantity from cart item
function extractCartItemData(item) {
    // Extract article number from product identifier or product-id attribute
    let articleNumber = null;
    
    // Try product-id attribute first (used in Colombia, Chile, etc.)
    const productIdAttr = item.getAttribute('product-id') || item.closest('[product-id]')?.getAttribute('product-id');
    if (productIdAttr) {
        articleNumber = productIdAttr.replace(/\./g, '');
    }
    
    // Fallback to identifier element (used in Germany, etc.)
    if (!articleNumber) {
        const identifierElement = item.querySelector('.cart-ingka-product-identifier__value');
        if (identifierElement) {
            articleNumber = identifierElement.textContent.trim().replace(/\./g, '');
        }
    }
    
    // Extract quantity from quantity stepper input (support both class naming conventions)
    let quantity = 1;
    const quantityInput = item.querySelector('.cart-ingka-quantity-stepper__input, .cart-quantity-stepper__input');
    if (quantityInput) {
        quantity = parseInt(quantityInput.value) || 1;
    }
    
    return { articleNumber, quantity };
}

// Handle shopping cart page
async function handleCartPage() {
    // Clear previous cart data
    cartItemsData.length = 0;

    // Find all cart items using various selectors for different country sites
    let cartItems = document.querySelectorAll('[class*="_productList"] > li [itemtype="http://schema.org/Product"]');

    // Try alternative selector for Colombia/Chile style carts (items with product-id attribute)
    if (cartItems.length === 0) {
        cartItems = document.querySelectorAll('[product-id]');
    }
    
    // Try cart item wrapper class
    if (cartItems.length === 0) {
        cartItems = document.querySelectorAll('[class*="_cartItem"]');
    }

    if (cartItems.length === 0) {
        // Fallback selector for German-style carts
        const fallbackItems = document.querySelectorAll('.cart-ingka-product-identifier__value');

        for (const identifierElement of fallbackItems) {
            const item = identifierElement.closest('[itemtype="http://schema.org/Product"]') || identifierElement.closest('li');
            if (item) {
                await processCartItem(item);
            }
        }
    } else {
        // Process each cart item
        for (const item of cartItems) {
            await processCartItem(item);
        }
    }

    // Store globally for total calculation
    window.ikeaCartItemsData = cartItemsData;

    // Attach hover listener to cart total
    attachTotalPriceHoverListener();
}

// Process a single cart item
async function processCartItem(item) {
    const { articleNumber, quantity } = extractCartItemData(item);
    
    if (!articleNumber) {
        return;
    }

    // Find the price container to attach tooltip to
    // Try multiple selectors for different cart formats
    const priceContainer = item.querySelector(
        '.cart-ingka-price-module__price, .cart-price-module__price, ' +
        '.cart-ingka-price-module, .cart-price-module'
    );
    
    if (!priceContainer) {
        return;
    }
    
    // Attach hover tooltip to the price container
    attachPriceHoverListeners(priceContainer, articleNumber);
    
    // Fetch prices for this item
    const pricesByCountry = await fetchPrices(articleNumber);
    
    // Get product name - try multiple selectors for different cart formats
    let productName = '';
    const productNameElement = item.querySelector(
        '.cart-ingka-price-module__name-decorator .cart-ingka-link .cart-ingka-text, ' +
        '.cart-price-module__name-decorator a, ' +
        '.cart-price-module__name-decorator .cart-link'
    );
    if (productNameElement) {
        productName = productNameElement.textContent.trim();
    }

    // Store in cart data
    cartItemsData.push({
        articleNumber,
        productName,
        quantity,
        pricesByCountry
    });
}

// Calculate total prices for all cart items by country
function calculateTotalsByCountry() {
    const totalsByCountry = {};
    
    // Initialize all countries
    for (const code of Object.keys(countryBaseUrls)) {
        totalsByCountry[code] = {
            total: 0,
            currency: '',
            hasUnavailableItems: false,
            unavailableItems: []
        };
    }

    for (const item of cartItemsData) {
        const { articleNumber, quantity, pricesByCountry } = item;
    
        if (!pricesByCountry) continue;
    
        // Check each country
        for (const code of Object.keys(countryBaseUrls)) {
            const data = pricesByCountry[code];
            
            // If country data exists and has valid price
            if (data && data.price !== null && data.price > 0) {
                totalsByCountry[code].total += data.price * quantity;
                if (!totalsByCountry[code].currency) {
                    totalsByCountry[code].currency = data.currency;
                }
            } else {
                // Country is missing or has invalid price - mark as unavailable
                // console.log(`Item unavailable in ${code}: ${data ? `price = ${data.price}` : 'no data'}`);
                totalsByCountry[code].hasUnavailableItems = true;
                totalsByCountry[code].unavailableItems.push(articleNumber);
            }
        }
    }

    // Round to 2 decimal places
    for (const code in totalsByCountry) {
        totalsByCountry[code].total = Math.round(totalsByCountry[code].total * 100) / 100;
    }

    return totalsByCountry;
}

// Create tooltip for cart total
function createTotalPriceTooltip(totalElement) {
    // Ensure spinner styles are injected
    injectSpinnerStyles();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'ikea-total-price-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        background: white;
        border: 2px solid #0058a3;
        border-radius: 8px;
        padding: 12px 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 100000;
        display: none;
        width: max-content;
        min-width: 180px;
        max-width: 400px;
        font-family: 'Noto IKEA', 'Noto Sans', sans-serif;
        font-size: 14px;
        line-height: 1.5;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        font-weight: bold;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e5e5;
        color: #0058a3;
        white-space: nowrap;
    `;
    header.textContent = 'Total in other countries:';
    tooltip.appendChild(header);

    const priceList = document.createElement('div');
    priceList.className = 'ikea-total-price-list';
    priceList.style.cssText = `
        display: grid;
        grid-template-columns: auto auto;
        gap: 2px 24px;
        align-items: center;
    `;
    
    // Add loading indicator by default
    priceList.innerHTML = `
        <div class="ikea-loading-container" style="grid-column: 1 / -1;">
            <div class="ikea-loading-spinner"></div>
            <span>Calculating totals...</span>
        </div>
    `;
    tooltip.appendChild(priceList);

    // Append tooltip to body for fixed positioning
    document.body.appendChild(tooltip);
    
    // Store reference to the element for positioning
    tooltip.dataset.targetElement = 'total';

    return tooltip;
}

// Update total tooltip content
function updateTotalTooltipContent(tooltip, totalsByCountry) {
    const priceList = tooltip.querySelector('.ikea-total-price-list');
    priceList.innerHTML = '';

    if (!totalsByCountry || Object.keys(totalsByCountry).length === 0) {
        priceList.innerHTML = `
            <div class="ikea-loading-container" style="grid-column: 1 / -1;">
                <div class="ikea-loading-spinner"></div>
                <span>Calculating totals...</span>
            </div>
        `;
        return;
    }

    for (const [code, data] of Object.entries(totalsByCountry)) {
        // Skip the current country - user already sees that total
        if (code === currentCountry) {
            continue;
        }
        
        const row = document.createElement('a');
        row.href = `${countryBaseUrls[code]}shoppingcart/`;
        row.target = '_blank';
        row.rel = 'noopener noreferrer';
        row.style.cssText = `
            display: grid;
            grid-template-columns: 1fr auto;
            grid-column: 1 / -1;
            gap: 24px;
            align-items: center;
            padding: 6px 8px;
            color: #111;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s;
            cursor: pointer;
        `;

        // Add hover effect
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = '#f5f5f5';
        });
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = 'transparent';
        });

        const countryName = document.createElement('span');
        countryName.style.cssText = 'white-space: nowrap;';
        countryName.textContent = countryNames[code];

        const priceContainer = document.createElement('span');
        priceContainer.style.cssText = 'display: flex; align-items: center; gap: 6px; justify-content: flex-end; white-space: nowrap;';

        // Add warning triangle if there are unavailable items (before price)
        if (data.hasUnavailableItems) {
            const warningIcon = document.createElement('span');
            warningIcon.textContent = '⚠️';

            // Build tooltip text with product names and article numbers
            const unavailableList = data.unavailableItems.map(articleNum => {
                const item = cartItemsData.find(i => i.articleNumber === articleNum);
                const name = item?.productName || 'Unknown';
                return `${name} ${articleNum}`;
            }).join('\n');

            warningIcon.title = `Some items are not available in this country:\n${unavailableList}`;
            warningIcon.style.cssText = `
                font-size: 16px;
                cursor: help;
            `;
            priceContainer.appendChild(warningIcon);
        }

        const priceValue = document.createElement('span');
        priceValue.style.cssText = 'font-weight: bold; white-space: nowrap;';

        if (data.total === null || isNaN(data.total)) {
            priceValue.textContent = 'N/A';
        } else {
            priceValue.textContent = `${data.total.toFixed(2)} ${data.currency}`;
        }

        priceContainer.appendChild(priceValue);

        row.appendChild(countryName);
        row.appendChild(priceContainer);
        priceList.appendChild(row);
    }
}

// Attach hover listener to cart total price
function attachTotalPriceHoverListener() {
    // Find the total price element - support both cart formats
    const totalPriceElement = document.querySelector(
        '#order-summary-total .cart-ingka-price, ' +
        '#order-summary-total .cart-price, ' +
        '[data-testid="text-total-price"], ' +
        '._totalPrice_hcu5x_77'
    );
    
    if (!totalPriceElement) {
        console.warn('Could not find total price element');
        return;
    }
    
    if (totalPriceElement.dataset.tooltipAttached) {
        return; // Already processed
    }

    totalPriceElement.dataset.tooltipAttached = 'true';
    
    const tooltip = createTotalPriceTooltip(totalPriceElement);
    let hideTimeout = null;
    
    const showTooltip = () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        tooltip.style.display = 'block';
        positionTooltip(tooltip, totalPriceElement);
        
        // Calculate totals from cart items data
        const totalsByCountry = calculateTotalsByCountry();
        updateTotalTooltipContent(tooltip, totalsByCountry);
    };
    
    const hideTooltip = () => {
        hideTimeout = setTimeout(() => {
            tooltip.style.display = 'none';
        }, 200);
    };
    
    totalPriceElement.style.cursor = 'pointer';
    
    // Total price element events
    totalPriceElement.addEventListener('mouseenter', showTooltip);
    totalPriceElement.addEventListener('mouseleave', hideTooltip);
    
    // Tooltip events
    tooltip.addEventListener('mouseenter', () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    });
    
    tooltip.addEventListener('mouseleave', hideTooltip);
}

// Detect page type and initialize
async function initialize() {
    // Load settings first
    await loadSettings();
    
    // Detect product page by multiple indicators
    const isProductPage = document.querySelector('.pip-product-identifier__value, .pipcom-product-identifier__value, .pipf-product-identifier__value, .pipcom-price-module, .pip-price-module, .pipf-price-module') || 
                          window.location.pathname.match(/\/p\/[^\/]+-\d{8}\/?$/);
    const isCartPage = window.location.pathname.includes('/shoppingcart') || 
                       window.location.pathname.includes('/cart') ||
                       document.querySelector('.cart-ingka-product-identifier__value') ||
                       document.querySelector('[product-id]') ||
                       document.querySelector('[class*="_cartList"]');

    if (isProductPage) {
        handleProductPage();
    } else if (isCartPage) {
        // Wait a bit for dynamic content to load
        setTimeout(handleCartPage, 1500);
    }
}

// Run initialization
initialize();

// Also run after DOM changes (for SPA navigation)
const observer = new MutationObserver((mutations) => {
    // Debounce to avoid running too often
    clearTimeout(window.ikeaPriceObserverTimeout);
    window.ikeaPriceObserverTimeout = setTimeout(initialize, 500);
});

observer.observe(document.body, { childList: true, subtree: true });

// Listen for settings changes
browserAPI.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.selectedCountries) {
        // Reload settings and reinitialize
        initialize();
    }
});