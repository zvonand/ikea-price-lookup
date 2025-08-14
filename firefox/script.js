

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

// Object to store fetched prices keyed by country code
const pricesByCountry = {};

// Fetch the product price for each country and store it
async function fetchPrices(articleNumber) {
    for (const [code, baseUrl] of Object.entries(countryBaseUrls)) {
        try {
            const response = await fetch(`${baseUrl}${articleNumber}/`);
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const priceElement = doc.querySelector('.pip-price__integer');
            if (priceElement) {
                pricesByCountry[code] = priceElement.textContent.trim();
            }
        } catch (e) {
            console.error(`Failed to fetch price for ${code}`, e);
        }
    }
}

if (articleNumber) {
    fetchPrices(articleNumber).then(() => {
        console.log('Fetched prices:', pricesByCountry);
    });
}