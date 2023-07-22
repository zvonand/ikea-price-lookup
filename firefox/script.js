

// document.body.style.border = "5px solid red";

var symbolToCurrencyName = {
    "$": "USD",
    "€": "EUR",
    "₽": "RUB",
    "₴": "UAH",
}
var currencySymbols = "$€₽₴"


localPriceWithCurrency = document.getElementsByClassName("pip-temp-price__sr-text")[0].textContent;

localPriceInLocalCurrency = localPriceWithCurrency.match(/\d+(?:\.\d+)?/g);

const myRe = new RegExp(currencySymbols, "g");


console.log("Local currency is: " + localPriceWithCurrency.match(myRe));
console.log("Local price is: " + localPriceInLocalCurrency);