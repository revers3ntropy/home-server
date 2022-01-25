const now = + new Date();

function timeDifference(time) {

	const msPerMinute = 60 * 1000;
	const msPerHour = msPerMinute * 60;
	const msPerDay = msPerHour * 24;
	const msPerMonth = msPerDay * 30;
	const msPerYear = msPerDay * 365;

	const elapsed = now - time;

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

async function show (data) {
    // amount donated
	let erin = 0, joseph = 0, ben = 0, beth = 0;

    let causes = {};

	for (let trans of data) {
        const donation = trans.out * (trans.google_doubled ? 2 : 1);
		switch (trans['person'].toLowerCase()) {
			case 'erin': erin += donation; break;
			case 'joseph': joseph += donation; break;
			case 'ben': ben += donation; break;
			case 'beth': beth += donation; break;
		}
        causes[trans.to] += donation;
	}

	let me;
	switch (localStorage.me.toLowerCase()) {
		case 'erin': me = erin.toString(); break;
		case 'joseph': me = joseph.toString(); break;
		case 'ben': me = ben.toString(); break;
		case 'beth': me = beth.toString(); break;
		default: return;
	}

	let myDonated = parseInt(me);
    const total = ben + erin + joseph + beth


	document.getElementById('data').innerHTML = `
        <h2>£${total} Donated In Total</h2>
        <h3>You have donated £${myDonated}</h3>

        <div> Beth has donated £${beth}</div>
        <div> Ben has donated £${ben}</div>
        <div> Joseph has donated £${joseph}</div>
        <div> Erin has donated £${erin}</div>

        <h2> Top Causes <h2>
        ${Object.keys(causes)
		.sort((a, b) => causes[a] - causes[b])
		.map(c => `
                <div class="cause">
                    ${c}: ${causes[c]}
                </div>
            `).join('')
		}
    `;
}

async function reload () {
	const res = await (await fetch(`http://192.168.0.64/transactions.csv`)).text();
	const transactions = parse(res);

	await show(transactions);
}

reload();
