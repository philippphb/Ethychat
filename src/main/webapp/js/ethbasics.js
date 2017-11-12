// web3 provider addresses
var ipaddr_prov_local = "http://localhost:8545";
//var ipaddr_prov_rinkeby = "http://35.196.72.186:8545";
var ipaddr_prov_rinkeby = "http://35.185.16.215:8545";
//var ipaddr_prov_main = "http://104.197.142.219:8545";
var ipaddr_prov_main = "http://104.197.142.219:17348";
var ipaddr_prov;

var Web3 = require('web3');
var web3 = new Web3();


function initEth() {
    web3.setProvider(new web3.providers.HttpProvider(ipaddr_prov));
};
