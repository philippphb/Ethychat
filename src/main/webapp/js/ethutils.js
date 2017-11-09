
// Value of the nonce of the last transaction
var lastnonce = 0;

// Method and duration of validity of authentication
var authmethod = "";
var authduration = -1;

// Authentication parameters
var mypwd = "";
var keyfileObject = "";
var pkey = "";

// Size and position of a ring buffer for transactions to be carried out 
var ringbufsize = 100;
var rdidx = 0;
var wridx = 0;

// Ring buffer for collecting transactions to be carried out and their callbacks 
var txbuf = Array(ringbufsize);
var tx_callback = Array(ringbufsize);

// true if transactions are being processed, false if transaction processing idle
var txProcessing = false;

// Currently processed transaction and its callback
var curtx = undefined;
var curtx_callback = undefined;


// Returns undefined if the passed string is not a number
function verifyNumStr(str) {

	for (var p=0; p<str.length; p++) {
        var c = str.charCodeAt(p);
        if (!((c >= 48 && c <= 57) || (c == 46) || (c == 44))) return undefined;
	}

	return str;
}

// Returns undefined if the passed string is not a hexadecimal value
function verifyHexStr(str) {

	if (str === undefined) return undefined;
	
	for (var p=0; p<str.length; p++) {
        var c = str.charCodeAt(p);
        if (!((c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102) || c === 120)) return undefined;
	}
	
	return str;
}

// Returns undefined if the passed string does not have the length of en Ethereum address
function lightVerifyAddress(addr) {
	if (addr.length != 42) return undefined;
	return addr;
}

// Returns undefined if the passed string is not an Ethereum address
function fullVerifyAddress(addr) {
	return verifyHexStr(lightVerifyAddress(addr));
}

function cleanupText(str) {

	if (str === undefined) return undefined;

	var cleanstr = "";
	
	var istag = false;
	var tagstr = "";
	
	for (var p=0; p<str.length; p++) {
		
		var curchar = str.charAt(p);
		
		if (curchar === "<") istag = true;		
		
		if (istag) tagstr += curchar;
		else cleanstr += curchar;
		
		if (curchar === ">") {
			
			if (tagstr.startsWith("<a ") || tagstr === "</a>"
					|| tagstr === "<b>" || tagstr === "</b>"
					|| tagstr === "<p>" || tagstr === "</p>"
					|| tagstr.startsWith("<h") || tagstr.startsWith("</h")
					|| tagstr === "<ul>" || tagstr === "</ul>"
					|| tagstr === "<ol>" || tagstr === "</ol>"
					|| tagstr.startsWith("<img ")) {
				cleanstr += tagstr;
			}
			
			istag = false;
			tagstr = "";
		}
	}
	
	return cleanstr;
}

// Converts the passed string into UTF-8 encoding
function getUTF8HexString(str) {

    var hexstr = "0x";
    var tmpchar;

    for (var p=0; p<str.length; p++) {

        var curchar = str.charCodeAt(p);

        // Handle ASCII characters
        if (curchar < 128) {

            // Replace LF/CR by <br>
            if (curchar === 10 ||  curchar === 13) {
                tmpchar = 60;
                hexstr += tmpchar.toString(16);
                tmpchar = 98;
                hexstr += tmpchar.toString(16);
                tmpchar = 114;
                hexstr += tmpchar.toString(16);
                tmpchar = 62;
                hexstr += tmpchar.toString(16);
            }

            // Replace every other control cgaracter by a space
            if (curchar < 32) {
                tmpchar = 32;
                hexstr += tmpchar.toString(16);
            }

            // Pass on every readable/displayable character
            else hexstr += curchar.toString(16);
        }

        // Handle two byte UTF characters
        else if (curchar < 2048) {
            hexstr += (0xc0 | (curchar >>> 6)).toString(16);
            hexstr += (0x80 | (curchar & 0x3F)).toString(16);
        }

        // Handle three byte UTF characters
        else {
            hexstr += (0xE0 | (curchar >>> 12)).toString(16);
            hexstr += (0x80 | ((curchar >>> 6) & 0x3F)).toString(16);
            hexstr += (0x80 | (curchar & 0x3F)).toString(16);
        }
    }
    
    return hexstr;
};

// Returns an Ethereum encoding of an integer for the data part of a transaction
function intEnc(intnum) {

    var encstr = "";

    // A 32 byte string with all zeros to fill unused spaces
    var zerostr = "0000000000000000000000000000000000000000000000000000000000000000";

    // Encode passed integer intnum. Numbers have leading zeros for unused spaces.
    var intnumstr = intnum.toString(16);
    encstr += zerostr.substring(0,zerostr.length-intnumstr.length);
    encstr += intnumstr;

    return encstr;
};

//Returns an Ethereum encoding of a string for the data part of a transaction
function stringEnc(str) {

    var encstr = "";

    // A 32 byte string with all zeros to fill unused spaces
    var zerostr = "0000000000000000000000000000000000000000000000000000000000000000";

    // Convert input string to UTF8
    //var hexstr = web3.fromAscii(str);
    var hexstr = getUTF8HexString(str);

    // Encode length of the input string and add to encoded string. Numbers have
    // leading zeros for unused spaces.
    encstr += intEnc(hexstr.length);

    // Encode input string and add to output. Consider that all data is sent in blocks
    // of 32 bytes (length of zerostr). Strings have trailing zeros for unused spaces.
    hexstr = hexstr.substring(2,hexstr.length);
    encstr += hexstr;
    encstr += zerostr.substring(0,zerostr.length-(hexstr.length%zerostr.length));

    return encstr;
};

function resetTxHandling() {

    lastnonce = 0;

    authmethod = "";
    mypwd = "";
    keyfileObject = "";
    pkey = "";

    txbuf = Array(ringbufsize);
    tx_callback = Array(ringbufsize);

    txProcessing = false;
    rdidx = 0;
    wridx = 0;

    resetAuth();
};
/*
function selectauthduration(evt){
//    authduration = parseInt(evt.target.value);
};
*/
function resetAuth() {
    authmethod = "";
    mypwd = "";
    pkey = "";
};

function removeCurTransaction() {
    curtx = undefined;    
    curtx_callback = undefined;
};

function sendTransaction(tx, callback) {

	// Put the passed transaction into transaction ring buffer
    txbuf[wridx] = tx;
    tx_callback[wridx] = callback;
    wridx++;
    if (wridx >= ringbufsize) wridx = 0;

    // Trigger transaction processing
    processTransactions();
};

function processTransactions() {

	// No action if a transaction is being processed
    if (txProcessing) return;

    // No action if transaction ring buffer is empty
    if (rdidx == wridx) return;

    txProcessing = true;

    // Take next transaction from ring buffer
    curtx = txbuf[rdidx];
    curtx_callback = tx_callback[rdidx];

    txbuf[rdidx] = undefined;
    tx_callback[rdidx] = undefined;

    rdidx++;
    if (rdidx >= ringbufsize) rdidx = 0;

    // Trigger authentication if required
    if (authmethod === "") $("#authentication").show();
    else sendAuthenticatedTransaction();
};

function sendAuthenticatedTransaction() {

	// Trigger confirmation of sending ether if required
    if (curtx.amount.greaterThan(new BigNumber("0"))) {
        document.getElementById('pop_sendethvalue').innerHTML = " " + curtx.amount.toString(10) + " ETH ";
        document.getElementById('pop_sendethtarget').innerHTML = " " + curtx.receiver + " ";
        $("#confirmsendeth").show();
    }
    else sendSignedTransaction();
};

function sendSignedTransaction() {

	// Get params of current transaction
    var sender = curtx.sender;
    var receiver = curtx.receiver;
    var data = curtx.data;
    var amount = "0x" + curtx.amount.times(new BigNumber("1000000000000000000")).toString(16);    
    var callback = curtx_callback;

    removeCurTransaction();

    // Extract provate key if required
	if (authmethod === "keyfile" && pkey === "") {	
	    pkey = keythereum.recover(mypwd, keyfileObject);
	}

    let privateKey = new EthJS.Buffer.Buffer(pkey, 'hex')

    // Reset authentication parameters if validity was for a single transaction only
    if (authduration < 0) resetAuth();

    // Make sure that nonce increases to avoid replacement transactions and thus to enable
    // several messages that are sent within less than a block time 
    var curnonce = web3.eth.getTransactionCount(sender);
    while (curnonce <= lastnonce) curnonce++;
    lastnonce = curnonce;

    // Adapt to current gas price
    var curgasprice = web3.eth.gasPrice;
    console.log("gas price: " + curgasprice.toString(10) + "/" + curgasprice.toString(16));

    // Create transaction
    const txParams = {
    		nonce: curnonce,
    		gasPrice: "0x" + curgasprice.toString(16),
    		gasLimit: '0x3d090',
    		to: receiver,
    		value: amount, 
    		data: data,
    		chainId: 3
    };

	// Sign and send transactrion
    try {
        let tx = new EthJS.Tx(txParams);
        tx.sign(privateKey);
        let serializedTx = "0x" + tx.serialize().toString('hex');
        web3.eth.sendRawTransaction(serializedTx, callback);
    }
    catch(err) {
    	showError(err);
    }

    txProcessing = false;
    processTransactions();
};


function handleFileSelect(evt) {

    var reader = new FileReader();

    // Load keyfile
    reader.onload = function(e) {
    	var keyfilestr = reader.result;
    	keyfileObject = JSON.parse(keyfilestr);
    }

    reader.readAsText(evt.target.files[0]);
};

function selectauthmethod(evt) {

    if (evt.target.value == "pkey") {
        $("#li_pkey").show();
        $("#li_keyfile").hide();
        $("#li_pwd").hide();
    }
    else if (evt.target.value == "keyfile") {
        $("#li_pkey").hide();
        $("#li_keyfile").show();
        $("#li_pwd").show();
    }
};


function cancelauth() {

    $("#authentication").hide();

    removeCurTransaction();

    resetAuth();

    txProcessing = false;
    processTransactions();
};

function acceptauth() {

    resetAuth();

    // Get duration of validity of authentication
    authduration = -1;
    var authdurbutton;
    authdurbutton = document.getElementById('rad_1hr');
    if (!authdurbutton.checked) authdurbutton = document.getElementById('rad_10min');
    if (authdurbutton.checked) authduration = parseInt(authdurbutton.value);

    // Get method of authentication and authentication parameters
    if (document.getElementById('rad_keyfile').checked) {
        authmethod = "keyfile";
        mypwd = document.getElementById('inp_pwd').value;
    }
    else if (document.getElementById('rad_pkey').checked) {
        authmethod = "pkey";
        pkey = document.getElementById('inp_pkey').value;
    }

    initSec();

    // automatically reset authentication parameters after expiration of authentication
    if (authduration >= 0) authTimer = setTimeout(resetAuth, authduration*1000);

    $("#authentication").hide();

    sendAuthenticatedTransaction();
};

function cancelsendeth() {
    $("#confirmsendeth").hide();

    removeCurTransaction();
    
    txProcessing = false;
    processTransactions();
};

function acceptsendeth() {
    $("#confirmsendeth").hide();
    sendSignedTransaction();
};
