const LISTS = document.getElementById('lists');

async function loadData () {
    const raw = await fetch('http://to/todolists.csv');
    const data = parseCSV(await raw.text());
}
