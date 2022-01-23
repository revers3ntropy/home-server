const now = + new Date();

function timeDifference(previous) {

	const msPerMinute = 60 * 1000;
	const msPerHour = msPerMinute * 60;
	const msPerDay = msPerHour * 24;
	const msPerMonth = msPerDay * 30;
	const msPerYear = msPerDay * 365;

	const elapsed = now - previous;

	if (elapsed < msPerMinute) {
		return Math.round(elapsed/1000) + ' seconds ago';
	}

	else if (elapsed < msPerHour) {
		return Math.round(elapsed/msPerMinute) + ' minutes ago';
	}

	else if (elapsed < msPerDay ) {
		return Math.round(elapsed/msPerHour ) + ' hours ago';
	}

	else if (elapsed < msPerMonth) {
		return '~' + Math.round(elapsed/msPerDay) + ' days ago';
	}

	else if (elapsed < msPerYear) {
		return '~' + Math.round(elapsed/msPerMonth) + ' months ago';
	}

	else {
		return '~' + Math.round(elapsed/msPerYear ) + ' years ago';
	}
}

/**
 * @param {string} person
 * @param {string|number} amount
 * @param {string} time
 * @returns {string} HTML
 */
function transaction (person, amount, time) {
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
				<span style="font-size: 24px; padding: 4px;">£${+amount}</span>
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

const jBalance = document.getElementById('joseph-balance');
const bethBalance = document.getElementById('beth-balance');
const benBalance = document.getElementById('ben-balance');
const eBalance = document.getElementById('erin-balance');
const myBalance = document.getElementById('my-balance');
async function updateBalance (data) {
	let erin = 0, joseph = 0, ben = 0, beth = 0;

	for (let trans of data) {
		switch (trans['person'].toLowerCase()) {
			case 'erin': erin += trans.in; erin -= trans.out; break;
			case 'joseph': joseph += trans.in; joseph -= trans.out; break;
			case 'ben': ben += trans.in; ben -= trans.out; break;
			case 'beth': beth += trans.in; beth -= trans.out; break;
		}
	}

	jBalance.innerText = joseph.toString();
	eBalance.innerText = erin.toString();
	benBalance.innerText = ben.toString();
	bethBalance.innerText = beth.toString();

	let me;
	switch (localStorage.me.toLowerCase()) {
		case 'erin': me = erin.toString(); break;
		case 'joseph': me = joseph.toString(); break;
		case 'ben': me = ben.toString(); break;
		case 'beth': me = beth.toString(); break;
		default: return;
	}

	myBalance.innerHTML = `
		<div style="font-size: 30px; text-align: center; margin: 20px;">
			Your balance: <span style="font-size: 40px">£${me}</span>
		</div>
	`;
}

async function reload () {
	const res = await (await fetch(`http://192.168.0.64/transactions.csv`)).text();
	const transactions = parse(res);

	const ledger = document.getElementById('ledger');
	ledger.innerHTML = '';

	for (const trans of transactions) {
		let amount;
		if (trans.in) {
			amount = trans.in;
		} else {
			amount = -parseFloat(trans.out);
		}
		ledger.innerHTML += transaction(trans.person, amount, trans.time);
	}

	await updateBalance(transactions);
}

reload();