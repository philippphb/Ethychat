// web3 provider addresses
var ipaddr_prov_local = "http://localhost:8545";
var ipaddr_prov_rinkeby = "http://35.185.16.215:8545";
var ipaddr_prov_main = "http://104.197.142.219:17348";
var ipaddr_prov;

// True if the injected web3 provider is used
var isinjected = false;

// Holds the custom web3 provider
var ownweb3;

// Holds the injected web3 provider
var injectedweb3;

// Holds the actually used web3 provider
var web3;


function initEth() {

	isinjected = false;
	
	// Using the injected web3 provider
	if (typeof web3 !== 'undefined') {
		injectedweb3 = new Web3(web3.currentProvider);
		useInjectedProvider();
	
		// Create a custom web3 provider
	} else {
		ownweb3 = new Web3(new Web3.providers.HttpProvider(ipaddr_prov));
		useOwnProvider();
	}
	
	// Get network id, depends on settings of the injected provider or
	// on the ipaddr of the custom provider
    networkid = web3.version.network;
};

function isInjectedProvider() {
	return isinjected;
}

function useInjectedProvider() {
	web3 = injectedweb3;
	isinjected = true;
}

function useOwnProvider() {
	isinjected = false;
    web3 = ownweb3;
}
