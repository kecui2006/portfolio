import { fetchJSON, renderProjects } from '../global.js';

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
try {
    const projects = await fetchJSON(new URL('../lib/projects.json', import.meta.url));
    renderProjects(projects, projectsContainer, 'h2');
    if (projectsTitle) projectsTitle.textContent = `Projects (${projects.length})`;
} catch (error) {
    if (projectsContainer) projectsContainer.textContent = 'Projects could not be loaded. Please reload to try again.';
} finally {
    projectsContainer?.setAttribute('aria-busy', 'false');
}
