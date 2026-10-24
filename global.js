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


// Shared Lab 4 data helpers: the same functions serve both project lists.
export async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch JSON (${response.status} ${response.statusText})`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
        // Let each page show a useful message instead of silently rendering nothing.
        throw error;
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    if (!(containerElement instanceof Element)) {
        throw new TypeError('A valid project container is required.');
    }
    if (!Array.isArray(projects)) {
        throw new TypeError('Projects must be an array.');
    }
    if (!/^h[1-6]$/.test(headingLevel)) {
        throw new TypeError('Heading level must be h1 through h6.');
    }
    containerElement.replaceChildren();
    if (projects.length === 0) {
        const message = document.createElement('p');
        message.textContent = 'No projects to display yet.';
        containerElement.append(message);
        return;
    }
    for (const project of projects) {
        const article = document.createElement('article');
        const heading = document.createElement(headingLevel);
        heading.textContent = project.title || 'Untitled project';
        const image = document.createElement('img');
        // Resolve image paths from the site root, including on /projects/.
        image.src = new URL(project.image || 'images/project-placeholder.svg', BASE_URL);
        image.alt = project.title ? `Illustration for ${project.title}` : 'Project illustration';
        image.width = 600;
        image.height = 400;
        image.loading = 'lazy';
        image.addEventListener('error', () => {
            image.src = new URL('images/project-placeholder.svg', BASE_URL);
        }, { once: true });
        const description = document.createElement('p');
        description.textContent = project.description || 'Description coming soon.';
        if (project.year != null) {
            const year = document.createElement('span');
            year.className = 'project-year';
            year.textContent = ` · ${project.year}`;
            description.append(year);
        }
        article.append(heading, image, description);
        containerElement.append(article);
    }
}

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}
