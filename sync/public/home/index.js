const ERROR = document.getElementById('error');
const entries = document.getElementById('entries');

const SEARCH = document.getElementById('search');

const ALERT_BANNER = document.getElementById('alert');

if (!ERROR || !entries || !SEARCH || !ALERT_BANNER) {
    throw 'document not loaded';
}

ALERT_BANNER.style.display = 'none';

function alertBanner(msg) {
    ALERT_BANNER.style.display = 'flex';
    ALERT_BANNER.innerHTML = `
            ${msg}
            <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span>
        `;
    setTimeout(() => {
        ALERT_BANNER.style.display = "none";
    }, 3000);
}

// src: https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        alertBanner(successful ? 'Copied Successfully!' : 'Copy failed');
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}
function copy(text) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function() {
        alertBanner('Copied Successfully!');
    }, (err) => {
        alertBanner('Copy failed: ' + err);
    });
}

function search () {
    sessionStorage.setItem('redirects-search', SEARCH.value);
    render(SEARCH.value, true);
}

async function handleServerResponse (res) {
    res = await res.text();
    res = JSON.parse(res);
    if (!res.ok) {
        ERROR.innerHTML = res.error || 'An error has occurred';
        return;
    }
    render();
}

function deleteOfName (name) {
    if (!confirm(`Are you sure you want to delete '${name}'`)) {
        return;
    }
    fetch('http://coppin/delete-redirect', {
        method: 'POST',
        body: JSON.stringify({
            from: name
        })
    }).then(handleServerResponse);
}

function toggleOfName (name, value) {
    console.log(JSON.stringify({
        from: name,
        value
    }));
    fetch('http://coppin/toggle-redirect', {
        method: 'POST',
        body: JSON.stringify({
            from: name,
            value
        })
    }).then(handleServerResponse);
}

let CACHE;

async function loadData (search, useCache) {
    if (!useCache || !CACHE) {
        const data = await fetch(
            'http://192.168.86.54/redirects.csv?cachebust=' + (Math.random() * 100000).toFixed(0));
        CACHE = parseCSV(await data.text());
        document.getElementById('number-of-total').innerHTML = CACHE.length;
    }

    if (search) {
        const res = CACHE.filter(r =>
            new RegExp(search.toLowerCase()).test(r[0].toLowerCase()) ||
            new RegExp(search.toLowerCase()).test(r[1].toLowerCase())
        );
        document.getElementById('number-of').innerHTML = res.length;
        return res;
    }

    document.getElementById('number-of').innerHTML = CACHE.length;

    return CACHE;
}

async function render (search=SEARCH.value, useCache=false) {

    const rows = await loadData(search, useCache);

    // reset after data is loaded
    entries.innerHTML = '';
    ERROR.innerHTML = '';
    document.getElementById('from').value = '';
    document.getElementById('to').value = '';

    for (let row of rows) {
        let url = row[1];
        if (row[1].length > 70) {
            url = row[1].substr(0, 70) + '...';
        }
        entries.innerHTML += `
                <div class="entry">
                    <a href="http://coppin/${row[0]}" style="margin: 4px" target="_blank">
                        ${row[0]}
                    </a>
                    <a href="${row[1]}" style="margin: 4px" target="_blank">${url}</a>
                    <div style="display: flex; justify-content: center; align-items: center">
                        <label class="switch">
                            <input
                                type="checkbox" ${row[2] === '1' ? 'checked' : ''}
                                onclick="toggleOfName('${row[0]}', Number(!${row[2]}).toString())"
                                name="toggle ${row[0]}"
                            >
                            <span class="slider"></span>
                        </label>
                        <button onclick="deleteOfName('${row[0]}')" class="icon" name="delete ${row[0]}">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000" class="delete-bin">
                                <path d="M0 0h24v24H0V0z" fill="none"/>
                                <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/>
                            </svg>
                        </button>
                        <button onclick="copy('http://to/${row[0]}')" class="icon" name="copy ${row[0]}">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000" class="delete-bin">
                                <path d="M0 0h24v24H0V0z" fill="none"/>
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                        </button>
                        <span style="min-width: 25px">
                            ${row[3]}
                        </span>
                    </div>
                </div>
            `;
    }
}

document.getElementById('go').addEventListener('click', () => {
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;

    if (!/^(ftp|http|https):\/\/[^ "]+$/.test(to)) {
        ERROR.innerHTML = 'Not a valid URl, please try again. Make sure to include https://';
        return;
    }

    if (!/^[a-zA-Z1-9_-]+$/.test(from)) {
        ERROR.innerHTML = 'Not a valid name, please try again. Make sure it is only letters, numbers, _ and -';
        return;
    }

    fetch('http://192.168.86.54/add-redirect', {
        method: 'POST',
        body: JSON.stringify({ from, to })
    }).then(handleServerResponse);
});

let storedSearchValue = sessionStorage.getItem('redirects-search');
if (storedSearchValue) {
    SEARCH.value = storedSearchValue;
}

render();
