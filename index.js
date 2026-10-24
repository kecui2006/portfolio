import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const projectsContainer = document.querySelector('.projects');
async function loadLatestProjects() {
    try {
        const projects = await fetchJSON(new URL('./lib/projects.json', import.meta.url));
        renderProjects(projects.slice(0, 3), projectsContainer, 'h3');
    } catch (error) {
        if (projectsContainer) projectsContainer.textContent = 'Projects could not be loaded. Please reload to try again.';
    } finally {
        projectsContainer?.setAttribute('aria-busy', 'false');
    }
}

const profileStats = document.querySelector('#profile-stats');
const refreshButton = document.querySelector('#refresh-stats');
async function loadGitHubStats() {
    if (!profileStats) return;
    profileStats.setAttribute('aria-busy', 'true');
    if (refreshButton) refreshButton.disabled = true;
    try {
        const githubData = await fetchGitHubData('kecui2006');
        // Only numeric API fields are inserted into this template.
        const count = (value) => Number.isFinite(value) ? value : 0;
        profileStats.innerHTML = `
            <dl>
                <dt>Public Repos</dt><dd>${count(githubData.public_repos)}</dd>
                <dt>Public Gists</dt><dd>${count(githubData.public_gists)}</dd>
                <dt>Followers</dt><dd>${count(githubData.followers)}</dd>
                <dt>Following</dt><dd>${count(githubData.following)}</dd>
            </dl>`;
    } catch (error) {
        profileStats.textContent = 'GitHub stats are temporarily unavailable. Please try Refresh stats again later.';
    } finally {
        profileStats.setAttribute('aria-busy', 'false');
        if (refreshButton) refreshButton.disabled = false;
    }
}
refreshButton?.addEventListener('click', loadGitHubStats);
// Run independently so an API failure cannot prevent the projects from loading.
loadLatestProjects();
loadGitHubStats();
