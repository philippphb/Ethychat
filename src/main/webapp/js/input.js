
function loginButtonPressed() {
    myaddress = fullVerifyAddress(document.getElementById('from').value);
    login();
}

function retroTimeSelected() {
    numLookBackBlocks = parseInt($("#sel_retrotime").val());
    startBlockNo = web3.eth.blockNumber - numLookBackBlocks;

    setupGeneralWatchers();
    setupContactWatchers();
}

function networkSelected(evt) {

	// Use testnet by default
    ipaddr_prov = ipaddr_prov_rinkeby;
    contractAddress = contractAddress_rinkeby;

    if (evt.target.value == "mainnet") {
    	ipaddr_prov = ipaddr_prov_main;
    	contractAddress = contractAddress_main;
    }

    initEth();
    connectBlockchain();
    
    login();
}

function addContactButtonPressed(evt) {
	var targetaddr = fullVerifyAddress(evt.target.value);
	connect(targetaddr);
}

function sendMsgButtonPressed() {
    var msgtext = document.getElementById('message').value;
    sendMsgWithParams(msgtext);
}
