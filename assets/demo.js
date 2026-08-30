const sampleFeedback = `We could not finish setup because the onboarding checklist disappeared.
The CSV export times out whenever we include more than six months of data.
Our new team members do not understand what to do after connecting the workspace.
Please add a HubSpot integration so our success team can see account context.
Export failed again this morning and the report is due today.
The dashboard is useful, but loading the account view has become very slow.
I am considering cancelling because implementation has taken three weeks.
Can you support Salesforce fields in the next release?
The setup guide sends us in circles and nobody knows which step is complete.
Support was helpful, but the app freezes when we open a large customer account.`;

const themes = [
  { name: 'Cancellation intent', keywords: ['cancel', 'cancelling', 'leave', 'switch', 'renew'], action: 'Route to customer success for immediate review.' },
  { name: 'Onboarding friction', keywords: ['setup', 'onboarding', 'implementation', 'checklist', 'getting started'], action: 'Investigate the path to first value and clarify ownership.' },
  { name: 'Export reliability', keywords: ['csv', 'export', 'report', 'download'], action: 'Reproduce with larger datasets and define failure thresholds.' },
  { name: 'Performance', keywords: ['slow', 'loading', 'freezes', 'timeout', 'times out'], action: 'Capture affected workflows and profile high-volume accounts.' },
  { name: 'Integration request', keywords: ['hubspot', 'salesforce', 'integration', 'connect'], action: 'Validate the account context and frequency before roadmap commitment.' },
  { name: 'Support experience', keywords: ['support', 'helpful', 'response'], action: 'Share service feedback with the support lead.' }
];

const riskTerms = ['cancel', 'cancelling', 'leave', 'failed', 'failure', 'cannot', 'could not', 'again', 'today', 'freezes', 'timeout', 'times out'];
const input = document.querySelector('[data-feedback-input]');
const runButton = document.querySelector('[data-run-analysis]');
const clearButton = document.querySelector('[data-clear-input]');
const sampleButton = document.querySelector('[data-load-sample]');
const exportButton = document.querySelector('[data-export]');
const resultsPanel = document.querySelector('[data-results-panel]');
const resultsContainer = document.querySelector('[data-theme-results]');
const loadingState = document.querySelector('[data-loading-state]');
const emptyState = document.querySelector('[data-empty-state]');
const errorMessage = document.querySelector('[data-demo-error]');
let latestResults = [];
let analysisTimer;
let hasAnalysisState = false;

const initialEmptyTitle = emptyState.querySelector('h3').textContent;
const initialEmptyCopy = emptyState.querySelector('p').textContent;

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function getMessages() {
  return input.value.split(/\n+/).map((message) => message.trim()).filter(Boolean);
}

function analyse(messages) {
  return themes.map((theme) => {
    const matches = messages.filter((message) => theme.keywords.some((keyword) => message.toLowerCase().includes(keyword)));
    const riskHits = matches.reduce((total, message) => total + riskTerms.filter((term) => message.toLowerCase().includes(term)).length, 0);
    const score = matches.length * 2 + riskHits;
    return { ...theme, matches, riskHits, score };
  }).filter((theme) => theme.matches.length).sort((first, second) => second.score - first.score || second.matches.length - first.matches.length);
}

function priorityFor(theme, index) {
  if (theme.riskHits >= 2 || index === 0 && theme.score >= 5) return { label: 'Review now', className: 'priority-high' };
  if (theme.score >= 3) return { label: 'Investigate', className: 'priority-medium' };
  return { label: 'Monitor', className: 'priority-low' };
}

function updateSummary(messages = [], results = []) {
  document.querySelector('[data-message-count]').textContent = String(messages.length);
  document.querySelector('[data-theme-count]').textContent = String(results.length);
  document.querySelector('[data-risk-count]').textContent = String(messages.filter((message) => riskTerms.some((term) => message.toLowerCase().includes(term))).length);
}

function resetResults() {
  window.clearTimeout(analysisTimer);
  analysisTimer = undefined;
  hasAnalysisState = false;
  latestResults = [];
  resultsPanel.setAttribute('aria-busy', 'false');
  resultsContainer.innerHTML = '';
  loadingState.hidden = true;
  emptyState.hidden = false;
  emptyState.querySelector('h3').textContent = initialEmptyTitle;
  emptyState.querySelector('p').textContent = initialEmptyCopy;
  exportButton.disabled = true;
  updateSummary();
}

function renderResults(messages, results) {
  updateSummary(messages, results);
  resultsContainer.innerHTML = results.map((theme, index) => {
    const priority = priorityFor(theme, index);
    const evidence = theme.matches.map((message) => `<li>${escapeHtml(message)}</li>`).join('');
    return `<article class="theme-card">
      <div class="theme-card-heading"><div><span class="theme-rank">${String(index + 1).padStart(2, '0')}</span><h3>${theme.name}</h3></div><span class="theme-priority ${priority.className}">${priority.label}</span></div>
      <p class="theme-reason">${theme.matches.length} matching ${theme.matches.length === 1 ? 'message' : 'messages'} · ${theme.riskHits} explicit risk ${theme.riskHits === 1 ? 'signal' : 'signals'}</p>
      <p><strong>Suggested next step:</strong> ${theme.action}</p>
      <details><summary>Show supporting messages</summary><ul>${evidence}</ul></details>
    </article>`;
  }).join('');
  emptyState.hidden = true;
  exportButton.disabled = false;
  latestResults = results;
}

function runAnalysis() {
  const messages = getMessages();
  errorMessage.textContent = '';
  if (messages.length < 2) {
    resetResults();
    errorMessage.textContent = 'Enter at least two customer messages on separate lines.';
    input.focus();
    return;
  }
  window.clearTimeout(analysisTimer);
  hasAnalysisState = true;
  resultsPanel.setAttribute('aria-busy', 'true');
  resultsContainer.innerHTML = '';
  emptyState.hidden = true;
  loadingState.hidden = false;
  exportButton.disabled = true;
  analysisTimer = window.setTimeout(() => {
    analysisTimer = undefined;
    const results = analyse(messages);
    loadingState.hidden = true;
    resultsPanel.setAttribute('aria-busy', 'false');
    updateSummary(messages, results);
    if (!results.length) {
      latestResults = [];
      emptyState.hidden = false;
      emptyState.querySelector('h3').textContent = 'No known themes were found.';
      emptyState.querySelector('p').textContent = 'Try adding more context or words related to onboarding, exports, performance, integrations, or cancellation intent.';
      return;
    }
    renderResults(messages, results);
    document.querySelector('#results-title').focus({ preventScroll: true });
  }, 450);
}

function exportCsv() {
  if (!latestResults.length) return;
  const rows = [['priority', 'theme', 'message_count', 'risk_signals', 'suggested_action']];
  latestResults.forEach((theme, index) => rows.push([priorityFor(theme, index).label, theme.name, theme.matches.length, theme.riskHits, theme.action]));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'churnintercept-demo-priorities.csv';
  link.click();
  URL.revokeObjectURL(url);
}

runButton?.addEventListener('click', runAnalysis);
input?.addEventListener('input', () => {
  errorMessage.textContent = '';
  if (hasAnalysisState) resetResults();
});
clearButton?.addEventListener('click', () => {
  input.value = '';
  errorMessage.textContent = '';
  resetResults();
  input.focus();
});
sampleButton?.addEventListener('click', () => {
  input.value = sampleFeedback;
  errorMessage.textContent = '';
  resetResults();
  input.focus();
});
exportButton?.addEventListener('click', exportCsv);
