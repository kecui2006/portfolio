console.log('IT’S ALIVE!');

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

// global.js lives in the site root, so this works on localhost and /portfolio/.
const BASE_URL = new URL('./', import.meta.url);
const pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'resume/', title: 'Resume' },
    { url: 'https://github.com/kecui2006', title: 'GitHub' },
];

const nav = document.createElement('nav');
nav.setAttribute('aria-label', 'Main navigation');
document.body.prepend(nav);

// Treat /projects/ and /projects/index.html as the same page.
function normalizePath(path) {
    return path.replace(/\/index\.html$/, '/').replace(/\/$/, '');
}

for (const page of pages) {
    const a = document.createElement('a');
    a.href = new URL(page.url, BASE_URL).href;
    a.textContent = page.title;

    if (a.host === location.host &&
        normalizePath(a.pathname) === normalizePath(location.pathname)) {
        a.classList.add('current');
        a.setAttribute('aria-current', 'page');
    }

    if (a.host !== location.host) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
    }

    nav.append(a);
}

// Create the same labeled theme control on every page.
document.body.insertAdjacentHTML('afterbegin', `
    <label class="color-scheme">
        Theme:
        <select aria-label="Color scheme">
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
`);

const select = $$('.color-scheme select')[0];
const colorSchemes = ['light dark', 'light', 'dark'];

function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty('color-scheme', colorScheme);
    select.value = colorScheme;
}

// Storage may be unavailable in browsers that block saved site data.
let savedColorScheme;
try {
    savedColorScheme = localStorage.getItem('colorScheme');
} catch (error) {
    console.warn('Theme preference could not be read.', error);
}
setColorScheme(colorSchemes.includes(savedColorScheme) ? savedColorScheme : 'light dark');

select.addEventListener('input', (event) => {
    const colorScheme = event.target.value;
    setColorScheme(colorScheme);
    try {
        localStorage.setItem('colorScheme', colorScheme);
    } catch (error) {
        console.warn('Theme preference could not be saved.', error);
    }
});

// Optional Lab 03 step: preserve spaces, newlines, and punctuation in email.
const form = document.querySelector('form[action^="mailto:"]');
form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const parameters = [];
    for (const [name, value] of data) {
        parameters.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
    }
    location.href = `${form.action}?${parameters.join('&')}`;
});
