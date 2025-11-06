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

// Cache to store fetched prices keyed by article number
const priceCache = {};

// Store cart items data: { articleNumber, quantity, pricesByCountry }
const cartItemsData = [];

// Fetch the product price for each country and store it
async function fetchPrices(articleNumber) {
    // Return cached prices if available
    if (priceCache[articleNumber]) {
        console.log(`Using cached prices for ${articleNumber}`);
        return priceCache[articleNumber];
    }
    
    console.log(`Fetching prices for article ${articleNumber}`);
    const pricesByCountry = {};
    const promises = Object.entries(countryBaseUrls).map(async ([code, baseUrl]) => {
        try {
            const response = await fetch(`${baseUrl}${articleNumber}/`);
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const priceElement = doc.querySelector('.pip-price__integer');
            const currencyElement = doc.querySelector('.pip-price__currencymarker');
            
            if (priceElement) {
                const price = parseFloat(priceElement.textContent.trim().replace(/\s/g, ''));
                const currency = currencyElement?.textContent.trim() || '';
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
    console.log(`Cached prices for ${articleNumber}:`, pricesByCountry);
    return pricesByCountry;
}

// Create and inject the tooltip
function createPriceTooltip(priceElement, articleNum) {
    const tooltip = document.createElement('div');
    tooltip.className = 'ikea-price-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        background: white;
        border: 2px solid #0058a3;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: none;
        width: max-content;
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
        white-space: nowrap;
    `;
    header.textContent = 'Prices in other countries:';
    tooltip.appendChild(header);

    const priceList = document.createElement('div');
    priceList.className = 'ikea-price-list';
    tooltip.appendChild(priceList);

    // Store article number for later use
    tooltip.dataset.articleNumber = articleNum;

    // Position tooltip relative to price element
    const container = priceElement.closest('.pip-temp-price, .pip-price, .cart-ingka-price') || priceElement.parentElement;
    container.style.position = 'relative';
    container.appendChild(tooltip);

    return tooltip;
}

// Update tooltip content with prices
function updateTooltipContent(tooltip, pricesByCountry, articleNum) {
    const priceList = tooltip.querySelector('.ikea-price-list');
    priceList.innerHTML = '';

    if (!pricesByCountry || Object.keys(pricesByCountry).length === 0) {
        priceList.innerHTML = '<div style="color: #666; font-style: italic;">Loading prices...</div>';
        return;
    }

    for (const [code, data] of Object.entries(pricesByCountry)) {
        const priceRow = document.createElement('a');
        priceRow.href = `${countryBaseUrls[code]}${articleNum}/`;
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
            white-space: nowrap;
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
    
        if (data.price === null) {
            priceValue.textContent = 'N/A';
        } else {
            priceValue.textContent = `${data.price} ${data.currency}`;
        }
    
        priceRow.appendChild(countryName);
        priceRow.appendChild(priceValue);
        priceList.appendChild(priceRow);
    }
}

// Position tooltip below the price element
function positionTooltip(tooltip, priceElement) {
    tooltip.style.left = '0';
    tooltip.style.top = '100%';
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
    
    const priceElement = document.querySelector('.pip-temp-price__integer, .pip-price__integer');
    if (priceElement) {
        attachPriceHoverListeners(priceElement, articleNumber);
        
        // Pre-fetch prices in the background
        fetchPrices(articleNumber).then(() => {
            console.log('Fetched prices for product:', articleNumber);
        });
    }
}

// Extract article number and quantity from cart item
function extractCartItemData(item) {
    // Extract article number from product identifier
    let articleNumber = null;
    const identifierElement = item.querySelector('.cart-ingka-product-identifier__value');
    if (identifierElement) {
        articleNumber = identifierElement.textContent.trim().replace(/\./g, '');
    }
    
    // Extract quantity from quantity stepper input
    let quantity = 1;
    const quantityInput = item.querySelector('.cart-ingka-quantity-stepper__input');
    if (quantityInput) {
        quantity = parseInt(quantityInput.value) || 1;
    }
    
    return { articleNumber, quantity };
}

// Handle shopping cart page
async function handleCartPage() {
    console.log('Processing cart page...');

    // Clear previous cart data
    cartItemsData.length = 0;

    // Find all cart items using the list structure
    const cartItems = document.querySelectorAll('[class*="_productList"] > li [itemtype="http://schema.org/Product"]');

    console.log(`Found ${cartItems.length} cart items`);

    if (cartItems.length === 0) {
        console.warn('No cart items found. Trying alternative selector...');
        // Fallback selector
        const fallbackItems = document.querySelectorAll('.cart-ingka-product-identifier__value');
        console.log(`Found ${fallbackItems.length} items with fallback selector`);
    
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

    console.log('Cart items data collected:', cartItemsData);

    // Store globally for total calculation
    window.ikeaCartItemsData = cartItemsData;

    // Attach hover listener to cart total
    attachTotalPriceHoverListener();
}

// Process a single cart item
async function processCartItem(item) {
    const { articleNumber, quantity } = extractCartItemData(item);
    
    if (!articleNumber) {
        console.warn('Could not extract article number from cart item:', item);
        return;
    }
    
    console.log(`Processing cart item: Article ${articleNumber}, Quantity ${quantity}`);
    
    // Find the price element - the span that contains the screen reader text
    const priceElement = item.querySelector('.cart-ingka-price__sr-text');
    
    if (!priceElement) {
        console.warn('Could not find price element for cart item:', item);
        return;
    }
    
    // Attach hover tooltip to the visible price container
    const visiblePriceContainer = priceElement.closest('.cart-ingka-price');
    if (visiblePriceContainer) {
        attachPriceHoverListeners(visiblePriceContainer, articleNumber);
    }
    
    // Fetch prices for this item
    const pricesByCountry = await fetchPrices(articleNumber);
    
    // Get product name - it's in the link within the price module
    let productName = '';
    const productNameElement = item.querySelector('.cart-ingka-price-module__name-decorator .cart-ingka-link .cart-ingka-text');
    if (productNameElement) {
        productName = productNameElement.textContent.trim();
    }
    
    console.log(`Product name for ${articleNumber}: ${productName}`);

    // Store in cart data
    cartItemsData.push({
        articleNumber,
        productName,
        quantity,
        pricesByCountry
    });

    console.log(`Stored data for article ${articleNumber}:`, { productName, quantity, pricesByCountry });
}

// Generate shopping cart URL for a specific country with all items
function getCartUrlForCountry(countryCode) {
    // Map country codes to their cart base URLs
    const cartBaseUrls = {
        de: 'https://www.ikea.com/de/de/shoppingcart/',
        fr: 'https://www.ikea.com/fr/fr/shoppingcart/',
        it: 'https://www.ikea.com/it/it/shoppingcart/',
        es: 'https://www.ikea.com/es/es/shoppingcart/',
        nl: 'https://www.ikea.com/nl/nl/shoppingcart/'
    };
    
    // Build query string with all cart items
    const itemParams = cartItemsData
        .map(item => `${item.articleNumber}:${item.quantity}`)
        .join(',');
    
    return `${cartBaseUrls[countryCode]}?items=${itemParams}`;
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
                console.log(`Item unavailable in ${code}: ${data ? `price = ${data.price}` : 'no data'}`);
                totalsByCountry[code].hasUnavailableItems = true;
                totalsByCountry[code].unavailableItems.push(articleNumber);
            }
        }
    }

    // Round to 2 decimal places
    for (const code in totalsByCountry) {
        totalsByCountry[code].total = Math.round(totalsByCountry[code].total * 100) / 100;
    }

    console.log('Totals by country:', totalsByCountry);
    return totalsByCountry;
}

// Create tooltip for cart total
function createTotalPriceTooltip(totalElement) {
    const tooltip = document.createElement('div');
    tooltip.className = 'ikea-total-price-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        background: white;
        border: 2px solid #0058a3;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: none;
        width: max-content;
        font-family: 'Noto IKEA', 'Noto Sans', sans-serif;
        font-size: 14px;
        line-height: 1.5;
        margin-top: 8px;
        right: 0;
        top: 100%;
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
    tooltip.appendChild(priceList);

    // Position tooltip relative to total price element
    totalElement.style.position = 'relative';
    totalElement.appendChild(tooltip);

    return tooltip;
}

// Update total tooltip content
function updateTotalTooltipContent(tooltip, totalsByCountry) {
    const priceList = tooltip.querySelector('.ikea-total-price-list');
    priceList.innerHTML = '';

    if (!totalsByCountry || Object.keys(totalsByCountry).length === 0) {
        priceList.innerHTML = '<div style="color: #666; font-style: italic;">Calculating totals...</div>';
        return;
    }

    // Map country codes to their cart URLs
    const cartUrls = {
        de: 'https://www.ikea.com/de/de/shoppingcart/',
        fr: 'https://www.ikea.com/fr/fr/shoppingcart/',
        it: 'https://www.ikea.com/it/it/shoppingcart/',
        es: 'https://www.ikea.com/es/es/shoppingcart/',
        nl: 'https://www.ikea.com/nl/nl/shoppingcart/'
    };

    for (const [code, data] of Object.entries(totalsByCountry)) {
        const priceRow = document.createElement('a');
        priceRow.href = cartUrls[code];
        priceRow.target = '_blank';
        priceRow.rel = 'noopener noreferrer';
        priceRow.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 8px;
            color: #111;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s;
            cursor: pointer;
            margin: 2px 0;
            white-space: nowrap;
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

        const priceContainer = document.createElement('span');
        priceContainer.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    
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
        priceValue.style.fontWeight = 'bold';

        if (data.total === null || isNaN(data.total)) {
            priceValue.textContent = 'N/A';
        } else {
            priceValue.textContent = `${data.total.toFixed(2)} ${data.currency}`;
        }
    
        priceContainer.appendChild(priceValue);

        priceRow.appendChild(countryName);
        priceRow.appendChild(priceContainer);
        priceList.appendChild(priceRow);
    }
}

// Attach hover listener to cart total price
function attachTotalPriceHoverListener() {
    // Find the total price element
    const totalPriceElement = document.querySelector('#order-summary-total .cart-ingka-price');
    
    if (!totalPriceElement) {
        console.warn('Could not find total price element');
        return;
    }
    
    if (totalPriceElement.dataset.tooltipAttached) {
        return; // Already processed
    }
    
    console.log('Attaching hover listener to total price');
    
    totalPriceElement.dataset.tooltipAttached = 'true';
    
    const tooltip = createTotalPriceTooltip(totalPriceElement);
    let hideTimeout = null;
    
    const showTooltip = () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        tooltip.style.display = 'block';
        
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
function initialize() {
    const isProductPage = document.querySelector('.pip-product-identifier__value');
    const isCartPage = window.location.pathname.includes('/shoppingcart') || 
                       window.location.pathname.includes('/cart') ||
                       document.querySelector('.cart-ingka-product-identifier__value');
    
    if (isProductPage) {
        console.log('Detected product page');
        handleProductPage();
    } else if (isCartPage) {
        console.log('Detected cart page');
        // Wait a bit for dynamic content to load
        setTimeout(handleCartPage, 1000);
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