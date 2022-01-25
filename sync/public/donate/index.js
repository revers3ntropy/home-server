let now = + new Date();

const myCanvas = document.createElement('canvas');
document.body.appendChild(myCanvas);
myCanvas.width = window.innerWidth || document.body.clientWidth;
myCanvas.height = window.innerHeight || document.body.clientHeight;

const myConfetti = confetti.create(myCanvas, {
	resize: true,
	useWorker: true
});

function doConfetti () {
	myConfetti({
		particleCount: 100,
		spread: 160
	});
}

function timeDifference(time) {
	const msPerMinute = 60 * 1000;
	const msPerHour = msPerMinute * 60;
	const msPerDay = msPerHour * 24;
	const msPerMonth = msPerDay * 30;
	const msPerYear = msPerDay * 365;

	const elapsed = now - time;

	if (elapsed < msPerMinute) {
		return Math.round(elapsed/1000) + ' seconds ago';
	} else if (elapsed < msPerHour) {
		return Math.round(elapsed/msPerMinute) + ' minutes ago';
	} else if (elapsed < msPerDay ) {
		return Math.round(elapsed/msPerHour ) + ' hours ago';
	} else if (elapsed < msPerMonth) {
		return '~' + Math.round(elapsed/msPerDay) + ' days ago';
	} else if (elapsed < msPerYear) {
		return '~' + Math.round(elapsed/msPerMonth) + ' months ago';
	} else {
		return '~' + Math.round(elapsed/msPerYear ) + ' years ago';
	}
}

/**
 * @param {string} person
 * @param {string|number} amount
 * @param {string} time
 * @param {string} to
 * @param {string} detail
 * @returns {string} HTML
 */
function transaction ({person, amount, time, to, detail}) {
	const timeAgo = timeDifference(time * 1000);
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

	spendingPower = parseInt(me);

	myBalance.innerHTML = `
		<div style="font-size: 30px; text-align: center; margin: 20px;">
			Your balance: <span style="font-size: 40px">£${me}</span>
		</div>
	`;
}

const DONATE_AMOUNT = document.getElementById('donate-amount');
const DONATE_TO = document.getElementById('donate-to');
const DONATE_DETAIL = document.getElementById('donate-detail');

/**
 * Donates an amount
 * @returns {Promise<string>} error message
 */
async function donate () {
	let me = localStorage.me.toLowerCase();
	if (!['ben', 'erin', 'joseph', 'beth'].includes(me)) {
		return 'invalid user';
	}

	const amount = DONATE_AMOUNT.value;
	const to = DONATE_TO.value;
	const detail = DONATE_DETAIL.value;

	if (amount > spendingPower) {
		return 'not enough balance in your account';
	}

	const res = JSON.parse(await (await fetch('http://192.168.0.64/make-transaction', {
		method: 'POST',
		body: JSON.stringify({
			in: '0',
			out: amount,
			to,
			detail,
			person: me,
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

const ERROR = document.getElementById('error');

async function doTransaction () {
	ERROR.innerHTML = await donate();
}

document.getElementById('go').onclick = doTransaction;


async function reload () {
	now = + new Date();
	const res = await (await fetch(`http://192.168.0.64/transactions.csv`)).text();
	const transactions = parse(res);

	const ledger = document.getElementById('ledger');
	ledger.innerHTML = '';

	for (const trans of transactions) {
		let amount = parseFloat(trans.in) - parseFloat(trans.out);
		ledger.innerHTML += transaction({...trans, amount});
	}

	await updateBalance(transactions);
}

reload();