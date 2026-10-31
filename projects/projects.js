import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');
const status = document.querySelector('#filter-status');
const clearButton = document.querySelector('#clear-filters');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
const arcGenerator = d3.arc().innerRadius(0).outerRadius(49);
const sliceGenerator = d3.pie().sort(null).value((d) => d.value);
let projects = [];
let query = '';
// Store a year rather than a slice index: indices can change after a search.
let selectedYear = null;
const colors = d3.scaleOrdinal(d3.schemeTableau10);

function toggleYear(year) {
    selectedYear = selectedYear === year ? null : year;
    updateView();
}

function renderPieChart(projectsGiven) {
    const data = d3.rollups(projectsGiven, (group) => group.length, (d) => String(d.year))
        .map(([year, count]) => ({ label: year, value: count }))
        .sort((a, b) => d3.descending(a.label, b.label));

    // Keyed joins update existing elements and remove old ones after each search.
    const slices = svg.selectAll('path').data(sliceGenerator(data), (d) => d.data.label)
        .join('path')
        .attr('d', arcGenerator)
        .attr('fill', (d) => colors(d.data.label))
        .attr('class', (d) => d.data.label === selectedYear ? 'selected' : null)
        .attr('role', 'button')
        .attr('tabindex', 0)
        .attr('aria-label', (d) => `${d.data.label}: ${d.data.value} projects. Filter by this year`)
        .attr('aria-pressed', (d) => String(d.data.label === selectedYear))
        .on('click', (event, d) => toggleYear(d.data.label))
        .on('keydown', (event, d) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleYear(d.data.label);
            }
        });
    slices.selectAll('title').data((d) => [d]).join('title')
        .text((d) => `${d.data.label}: ${d.data.value} projects`);

    const items = legend.selectAll('li').data(data, (d) => d.label).join('li')
        .attr('class', (d) => `legend-item${d.label === selectedYear ? ' selected' : ''}`)
        .style('--color', (d) => colors(d.label));
    const buttons = items.selectAll('button').data((d) => [d]).join('button')
        .attr('type', 'button')
        .attr('aria-pressed', (d) => String(d.label === selectedYear))
        .attr('aria-label', (d) => `${d.label}: ${d.value} projects. Filter by this year`)
        .on('click', (event, d) => toggleYear(d.label));
    buttons.selectAll('.swatch').data((d) => [d]).join('span')
        .attr('class', 'swatch').attr('aria-hidden', 'true');
    buttons.selectAll('.legend-label').data((d) => [d]).join('span')
        .attr('class', 'legend-label').text((d) => d.label);
    buttons.selectAll('em').data((d) => [d]).join('em').text((d) => `(${d.value})`);
    document.querySelector('.chart-empty').hidden = data.length > 0;
    svg.attr('hidden', data.length === 0 ? '' : null);
}

// EXTRA CREDIT: both event handlers use this single filter pipeline.
function updateView() {
    // Apply the query first; the chart describes all search matches by year.
    const searchedProjects = projects.filter((project) =>
        Object.values(project).join('\n').toLowerCase().includes(query)
    );
    // Apply the selected year to those same matches, never to the original list.
    const visibleProjects = searchedProjects.filter((project) =>
        selectedYear === null || String(project.year) === selectedYear
    );
    renderPieChart(searchedProjects);
    renderProjects(visibleProjects, projectsContainer, 'h2');
    projectsTitle.textContent = `Projects (${visibleProjects.length})`;
    status.textContent = `Showing ${visibleProjects.length} of ${projects.length} projects`
        + (selectedYear === null ? '.' : ` · Year: ${selectedYear}.`);
    clearButton.hidden = !query && selectedYear === null;
}

searchInput.addEventListener('input', (event) => {
    query = event.target.value.trim().toLowerCase();
    updateView();
});
clearButton.addEventListener('click', () => {
    query = '';
    selectedYear = null;
    searchInput.value = '';
    updateView();
    searchInput.focus();
});

try {
    projects = await fetchJSON(new URL('../lib/projects.json', import.meta.url));
    // Fix the color domain once, so a year keeps its color when others disappear.
    colors.domain([...new Set(projects.map((p) => String(p.year)))].sort(d3.descending));
    updateView();
} catch (error) {
    projectsContainer.textContent = 'Projects could not be loaded. Please reload to try again.';
    status.textContent = 'Project data is unavailable.';
} finally {
    projectsContainer.setAttribute('aria-busy', 'false');
}
