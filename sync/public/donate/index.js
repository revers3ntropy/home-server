let now = + new Date();

const myCanvas = document.createElement('canvas');
document.body.appendChild(myCanvas);
myCanvas.width = document.body.clientWidth;
myCanvas.height = document.body.clientHeight;

const myConfetti = confetti.create(myCanvas, {
	resize: true,
	useWorker: true
});

function doConfetti () {
	myConfetti({
		particleCount: 200,
		spread: 200
	});
}

const ALERT_BANNER = document.getElementById('alert');

if (!ALERT_BANNER) {
	throw 'document not loaded';
}

ALERT_BANNER.style.display = 'none';

function alertBanner (msg) {
	ALERT_BANNER.style.display = 'flex';
	ALERT_BANNER.innerHTML = `
            ${msg}
            <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span>
        `;
	setTimeout(() => {
		ALERT_BANNER.style.display = "none";
	}, 5000);
}

/**
 * @param {string} person
 * @param {string|number} amount
 * @param {string} time
 * @param {string} to
 * @param {string} detail
 * @param {string} id
 * @returns {string} HTML
 */
function transaction ({person, amount, time, to, detail, id}) {
	const timeAgo = timeDifference(time);
	const date = new Date(time * 1000);
	const timeFormatted = date.toLocaleString();
	person = person[0].toUpperCase() + person.substr(1);

	return `
		<div class="transaction">
			<div style="font-size: 20px; display: flex; align-items: center">
				<svg 
					class=svg 
					xmlns="http://www.w3.org/2000/svg" 
					height="24px" 
					viewBox="0 0 24 24" 
					width="24px" 
					fill="#000000"
					style="fill: ${amount > 0 ? 'green' : 'red'}"
				>
					${amount > 0 ? `
						<path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
					` : `
						<path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 13H5v-2h14v2z"/>
					`}
				</svg>

				
				${person} ${amount <= 0 ? 'donated' : 'received'}
				<span style="font-size: 24px; padding: 4px;">£${Math.abs(amount)}</span>
				<span style="font-size: 16px">
					${to ? `to ${to}` : ''}
					${detail ? `(${detail})` : ''} 	
				</span>
			</div>
			<div>
				${timeFormatted} - ${timeAgo}
				<button onclick="deleteTransaction(${id})" class="icon">
					<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000">
					<path d="M0 0h24v24H0V0z" fill="none"/>
					<path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/>
					</svg>
				</button>
			</div>
		</div>
	`;
}

/**
 * @param {string} text
 * @returns {{[key: string]: string}[]}
 */
function parse (text) {
	const lines = text.split("\n");
	const header = lines
		// get first line, and remove it
		.shift()
		.split(',');
	return lines
		.map(c => c.split(","))
		// remove invalid lines
		.filter(c => c.length === header.length)
		.map(row => row.reduce((acc,curr, i) =>
			(acc[header[i]] = row[i], acc), {}))
		.sort((t1, t2) => t2.time - t1.time);
}

let spendingPower = 0;

const jBalance = document.getElementById('joseph-balance');
const bethBalance = document.getElementById('beth-balance');
const benBalance = document.getElementById('ben-balance');
const eBalance = document.getElementById('erin-balance');
const myBalance = document.getElementById('my-balance');

async function updateBalance (data) {
	let erin = 0, joseph = 0, ben = 0, beth = 0;

	for (let trans of data) {

		const val = parseFloat(trans.in) - parseFloat(trans.out);

		switch (trans['person'].toLowerCase()) {
			case 'erin':   erin   += val; break;
			case 'joseph': joseph += val; break;
			case 'ben':    ben    += val; break;
			case 'beth':   beth   += val; break;
		}
	}

	jBalance.innerText = joseph.toString();
	eBalance.innerText = erin.toString();
	benBalance.innerText = ben.toString();
	bethBalance.innerText = beth.toString();


	let me;
	switch (localStorage.me.toLowerCase()) {
		case 'erin':   me = erin.toString(); break;
		case 'joseph': me = joseph.toString(); break;
		case 'ben':    me = ben.toString(); break;
		case 'beth':   me = beth.toString(); break;
		default: return;
	}

	spendingPower = parseFloat(me);

	myBalance.innerHTML = `
		<div style="font-size: 30px; text-align: center; margin: 20px;">
			Your balance: <span style="font-size: 40px">£${me}</span>
		</div>
	`;
}

const DONATE_AMOUNT = document.getElementById('donate-amount');
const DONATE_TO = document.getElementById('donate-to');
const DONATE_DETAIL = document.getElementById('donate-detail');
const DONATE_ALERT = document.getElementById('donate-alert');

/**
 * Donates an amount
 * @returns {Promise<string>} error message
 */
async function donate () {
	let me = localStorage.me.toLowerCase();
	if (!['ben', 'erin', 'joseph', 'beth'].includes(me)) {
		return 'invalid user';
	}

	let amount;
	const to = DONATE_TO.value;
	const detail = DONATE_DETAIL.value;

	if (!DONATE_AMOUNT.value) return 'must specify amount';
	try {
		amount = parseFloat(DONATE_AMOUNT.value);
	} catch (e) {
		return 'Invalid amount';
	}
	if (amount > spendingPower) return 'not enough balance in your account';
	if (amount < 0.01) return 'to small of an amount to donate';

	const res = JSON.parse(await (await fetch('http://192.168.0.64/make-transaction', {
		method: 'POST',
		body: JSON.stringify({
			in: '0', out: amount.toFixed(2),
			to, detail, person: me,
			notify: DONATE_ALERT.checked ? '1' : '0'
		})
	})).text());

	if (res.ok) {
		doConfetti();
		DONATE_AMOUNT.value = '';
		DONATE_TO.value = '';
		DONATE_DETAIL.value = '';
		await reload();
		return '';
	}
	return res.error || 'unknown error';
}

async function doTransaction () {
	let res = await donate();
	if (res) alertBanner(res);
}

async function deleteTransaction (id) {
	if (typeof id !== "number") {
		alertBanner('invalid deletion');
		return;
	}
	if (id < 0) {
		alertBanner('invalid delete id');
		return;
	}
	let trans = transactionByID(id);
	if (!trans) {
		alertBanner('invalid delete id - trans not found');
		return;
	}
	const amount = parseFloat(trans.in) - parseFloat(trans.out);
	if (!confirm(`Are you sure you want to delete the transaction of £${amount} to ${
			trans.to || 'unknown'}? This action is irreversible.`)) {
		return;
	}
	const res = JSON.parse(await (await fetch('http://192.168.0.64/delete-transaction', {
		method: 'POST',
		body: JSON.stringify({
			id: id.toString()
		})
	})).text());
	if (!res.ok) {
		alertBanner(res.error);
	}
	await reload();
}

document.getElementById('go').onclick = doTransaction;

let transactions;

function transactionByID (id) {
	if (!transactions) return false;
	const res = transactions.filter(t => t.id === id.toString());
	if (!res || !res.length) return false;
	return res[0];
}

async function reload () {
	now = + new Date();
	const res = await (await fetch(`http://192.168.0.64/transactions.csv`)).text();
	transactions = parse(res);

	const ledger = document.getElementById('ledger');
	ledger.innerHTML = '';

	for (const trans of transactions) {
		let amount = parseFloat(trans.in) - parseFloat(trans.out);
		ledger.innerHTML += transaction({...trans, amount});
	}
	await updateBalance(transactions);
}

reload();

window.setInterval(reload, 2000);