import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const TIME_ZONE = 'America/Los_Angeles';
const REPO_URL = 'https://github.com/kecui2006/portfolio';
const tooltip = document.querySelector('#commit-tooltip');
const clearButton = document.querySelector('#clear-selection');
const number = d3.format(',');
const languageNames = { js: 'JavaScript', css: 'CSS', html: 'HTML', json: 'JSON', md: 'Markdown' };
let tooltipTimer;

async function loadData() {
    const rows = await d3.csv(new URL('loc.csv', import.meta.url), (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(`${row.date}T00:00:00${row.timezone}`),
        datetime: new Date(row.datetime),
    }));
    if (!rows.length) throw new Error('The code analysis contains no lines.');
    if (rows.some((row) => !Number.isFinite(+row.datetime) || !Number.isFinite(row.length))) {
        throw new Error('The code analysis contains invalid dates or numbers.');
    }
    return rows;
}

function processCommits(data) {
    const timeFormat = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    return d3.groups(data, (d) => d.commit).map(([id, lines]) => {
        const first = lines[0];
        const [hour, minute, second] = timeFormat.format(first.datetime).split(':').map(Number);
        const commit = {
            id,
            url: `${REPO_URL}/commit/${id}`,
            author: first.author,
            date: first.date,
            time: first.time,
            timezone: first.timezone,
            datetime: first.datetime,
            hourFrac: hour + minute / 60 + second / 3600,
            totalLines: lines.length,
        };
        Object.defineProperty(commit, 'lines', {
            value: lines, enumerable: false, writable: false, configurable: false,
        });
        return commit;
    });
}

function renderCommitInfo(data, commits) {
    const fileLengths = d3.rollups(data, (lines) => lines.length, (d) => d.file);
    const stats = [
        ['Lines of code', number(data.length)],
        ['Commits', number(commits.length)],
        ['Source files', number(fileLengths.length)],
        ['Avg. file lines', d3.format('.1f')(d3.mean(fileLengths, (d) => d[1]))],
        ['Longest line', `${number(d3.max(data, (d) => d.length))} chars`],
        ['Max. indentation', number(d3.max(data, (d) => d.depth))],
    ];
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
    const items = dl.selectAll('div').data(stats).join('div');
    items.append('dt').text((d) => d[0]);
    items.append('dd').text((d) => d[1]);
}

function renderTooltipContent(commit) {
    const link = document.querySelector('#commit-link');
    link.href = commit.url;
    link.textContent = commit.id.slice(0, 7);
    document.querySelector('#commit-date').textContent = commit.datetime.toLocaleDateString('en-US', {
        timeZone: TIME_ZONE, year: 'numeric', month: 'short', day: 'numeric',
    });
    document.querySelector('#commit-time').textContent = commit.datetime.toLocaleTimeString('en-US', {
        timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
    document.querySelector('#commit-author').textContent = commit.author;
    document.querySelector('#commit-lines').textContent = `${number(commit.totalLines)} attributed lines`;
}

function updateTooltipPosition(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Number.isFinite(event.clientX) ? event.clientX : rect.right;
    const y = Number.isFinite(event.clientY) ? event.clientY : rect.top;
    const gap = 14;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    tooltip.style.left = `${Math.max(8, Math.min(x + gap, window.innerWidth - width - 8))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(y + gap, window.innerHeight - height - 8))}px`;
}

function showTooltip(event, commit) {
    clearTimeout(tooltipTimer);
    renderTooltipContent(commit);
    tooltip.hidden = false;
    updateTooltipPosition(event);
}

function hideTooltip() {
    // Leave enough time to move from a dot to the commit link.
    tooltipTimer = setTimeout(() => { tooltip.hidden = true; }, 200);
}
tooltip.addEventListener('mouseenter', () => clearTimeout(tooltipTimer));
tooltip.addEventListener('mouseleave', hideTooltip);
tooltip.addEventListener('focusin', () => clearTimeout(tooltipTimer));
tooltip.addEventListener('focusout', hideTooltip);

function renderLanguageBreakdown(selectedCommits) {
    const lines = selectedCommits.flatMap((commit) => commit.lines);
    const counts = d3.rollups(lines, (group) => group.length, (d) => d.type)
        .sort((a, b) => d3.descending(a[1], b[1]));
    const items = d3.select('#language-breakdown').selectAll('div').data(counts, (d) => d[0]).join('div');
    items.selectAll('dt').data((d) => [d]).join('dt').text((d) => languageNames[d[0]] || d[0]);
    items.selectAll('dd').data((d) => [d]).join('dd')
        .text((d) => `${number(d[1])} lines (${d3.format('.1%')(d[1] / lines.length)})`);
    document.querySelector('#language-help').hidden = selectedCommits.length > 0;
}

function renderScatterPlot(commits) {
    const width = 1000;
    const height = 420;
    const margin = { top: 26, right: 38, bottom: 52, left: 66 };
    const area = {
        left: margin.left, right: width - margin.right,
        top: margin.top, bottom: height - margin.bottom,
    };
    let [first, last] = d3.extent(commits, (d) => d.datetime);
    // A single date still needs a nonzero domain so its dot can be explored.
    if (+first === +last) {
        first = new Date(+first - 86400000);
        last = new Date(+last + 86400000);
    }
    const xScale = d3.scaleTime().domain([first, last]).nice().range([area.left + 18, area.right - 18]);
    const yScale = d3.scaleLinear().domain([0, 24]).range([area.bottom, area.top]);
    // A zero baseline makes circle AREA proportional to the attributed line count.
    const rScale = d3.scaleSqrt().domain([0, d3.max(commits, (d) => d.totalLines)]).range([0, 27]);
    const svg = d3.select('#chart').append('svg').attr('viewBox', `0 0 ${width} ${height}`)
        .attr('role', 'group').attr('aria-labelledby', 'chart-heading').attr('aria-describedby', 'chart-instructions');
    svg.append('g').attr('class', 'gridlines').attr('transform', `translate(${area.left},0)`)
        .call(d3.axisLeft(yScale).tickValues(d3.range(0, 25, 4)).tickSize(-(area.right - area.left)).tickFormat(''));
    const dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, month: 'short', day: 'numeric' });
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${area.bottom})`)
        .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => dateLabel.format(d)));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${area.left},0)`)
        .call(d3.axisLeft(yScale).tickValues(d3.range(0, 25, 4))
            .tickFormat((d) => `${String(d).padStart(2, '0')}:00`));
    svg.append('text').attr('class', 'axis-label').attr('x', (area.left + area.right) / 2)
        .attr('y', height - 6).attr('text-anchor', 'middle').text('Commit date');
    svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
        .attr('x', -(area.top + area.bottom) / 2).attr('y', 15)
        .attr('text-anchor', 'middle').text('Time of day (Pacific)');

    // The overlay stays below the dots: brushing and hover details both work.
    const brushLayer = svg.append('g').attr('class', 'brush');
    const dots = svg.append('g').attr('class', 'dots').selectAll('circle')
        .data(d3.sort(commits, (d) => -d.totalLines), (d) => d.id).join('circle')
        .attr('cx', (d) => xScale(d.datetime)).attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines)).attr('tabindex', 0)
        .attr('role', 'button').attr('aria-pressed', 'false')
        .attr('aria-label', (d) => `Commit ${d.id.slice(0, 7)}, ${dateLabel.format(d.datetime)}, ${d.totalLines} lines. Press Enter to select.`)
        .on('mouseenter', showTooltip).on('mousemove', updateTooltipPosition).on('mouseleave', hideTooltip)
        .on('focus', showTooltip).on('blur', hideTooltip)
        .on('keydown', (event, commit) => {
            if (event.key === 'Escape') {
                brushLayer.call(brush.move, null);
                tooltip.hidden = true;
            }
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                // A keyboard alternative for exploring one commit.
                brushLayer.call(brush.move, null);
                updateSelection([commit]);
            }
        });

    function isCommitSelected(selection, commit) {
        if (!selection) return false;
        const [[x0, y0], [x1, y1]] = selection;
        const x = xScale(commit.datetime);
        const y = yScale(commit.hourFrac);
        return x >= x0 && x <= x1 && y >= y0 && y <= y1;
    }
    function updateSelection(selected) {
        const ids = new Set(selected.map((d) => d.id));
        dots.classed('selected', (d) => ids.has(d.id))
            .classed('muted', (d) => ids.size > 0 && !ids.has(d.id))
            .attr('aria-pressed', (d) => String(ids.has(d.id)));
        document.querySelector('#selection-count').textContent = selected.length
            ? `${selected.length} ${selected.length === 1 ? 'commit' : 'commits'} selected · ${number(d3.sum(selected, (d) => d.totalLines))} attributed lines`
            : 'No commits selected';
        renderLanguageBreakdown(selected);
    }
    const brush = d3.brush().extent([[area.left, area.top], [area.right, area.bottom]])
        .on('start brush end', (event) => {
            tooltip.hidden = true;
            updateSelection(commits.filter((d) => isCommitSelected(event.selection, d)));
            clearButton.disabled = event.selection === null;
        });
    brushLayer.call(brush);
    clearButton.addEventListener('click', () => {
        brushLayer.call(brush.move, null);
        updateSelection([]);
    });
    // Enable clearing a keyboard selection, even though no rectangle was drawn.
    dots.on('keydown.clear', (event) => {
        if (event.key === 'Enter' || event.key === ' ') clearButton.disabled = false;
    });
}

try {
    const data = await loadData();
    const commits = processCommits(data);
    renderCommitInfo(data, commits);
    renderScatterPlot(commits);
} catch (error) {
    const message = document.querySelector('#load-error');
    message.hidden = false;
    message.textContent = `Could not load the code analysis. ${error.message} Please reload the page.`;
} finally {
    document.querySelector('#stats').setAttribute('aria-busy', 'false');
    document.querySelector('#chart').setAttribute('aria-busy', 'false');
}
