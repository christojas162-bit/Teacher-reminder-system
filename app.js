/**
 * Teacher Reminder & Acknowledgement Automation Web Hub
 * Client-side Controller for CrewAI AMP Cloud Deployments
 */

// Configuration Constants & Storage Keys
const CONFIG_KEYS = {
  BASE_URL: 'crewai_teacher_base_url',
  BEARER_TOKEN: 'crewai_teacher_bearer_token',
  HISTORY: 'crewai_teacher_run_history'
};

const DEFAULTS = {
  BASE_URL: 'https://teacher-reminder-acknowledgement-system-v1--be296410.crewai.com',
  BEARER_TOKEN: '9f387117896f'
};

// Preset Templates for Fast-Fill
const TEMPLATES = {
  grades: {
    title: 'Mid-Term Grade Submission Reminder',
    text: `Subject: URGENT - Mid-Term Grade Submission Deadline & Acknowledgement

Dear Faculty Members,

This is an automated reminder regarding the upcoming deadline for submitting mid-term evaluation grades.
- Deadline: Friday, 5:00 PM EST
- Portal: Faculty Grading Dashboard
- Required Action: Please acknowledge receipt of this reminder by replying to this notice or confirming through the portal link.

Please verify that all incomplete grades are flagged for administrative follow-up. Thank you for your prompt cooperation.`
  },
  meeting: {
    title: 'Faculty Meeting Attendance Confirmation',
    text: `Subject: Mandatory Departmental Faculty Meeting & Agenda Acknowledgement

Dear Teachers and Department Staff,

Please review the details for our upcoming monthly planning session:
- Date & Time: Tomorrow at 3:30 PM (Conference Hall B / Virtual Stream)
- Agenda: Curriculum assessment updates, term schedule, and new attendance policies.
- Required Action: Confirm your attendance or submit an advance excused absence notice with your department chair.`
  },
  'lesson-plans': {
    title: 'Weekly Lesson Plan Follow-up',
    text: `Subject: Weekly Lesson Plan Submission Follow-Up

Dear Teachers,

This is a gentle reminder to submit your weekly instructional lesson plans for the upcoming school week.
- Due: Every Monday by 8:00 AM
- Format: Submit via the shared curriculum drive or portal.
- Required Action: Ensure all accommodations for IEP/504 students are documented.`
  },
  training: {
    title: 'Professional Development Acknowledgement',
    text: `Subject: Compliance Training & Professional Development Module Confirmation

Dear Educators,

Please ensure completion of the annual mandatory compliance modules (Student Safety & Digital Privacy).
- Completion Window Closes: End of this month
- Required Action: Submit your certificate or acknowledge completion via reply.`
  }
};

// Application State
const state = {
  baseUrl: localStorage.getItem(CONFIG_KEYS.BASE_URL) || DEFAULTS.BASE_URL,
  bearerToken: localStorage.getItem(CONFIG_KEYS.BEARER_TOKEN) || DEFAULTS.BEARER_TOKEN,
  isPolling: false,
  pollIntervalId: null,
  activeKickoffId: null,
  activeInputs: null,
  startTime: null,
  timerIntervalId: null,
  logCount: 0,
  latestResult: null
};

// DOM Element References
const elements = {
  connectionPill: document.getElementById('connectionPill'),
  connectionText: document.getElementById('connectionText'),
  latencyBadge: document.getElementById('latencyBadge'),
  activeEndpointTag: document.getElementById('activeEndpointTag'),

  workflowForm: document.getElementById('workflowForm'),
  spreadsheetIdInput: document.getElementById('spreadsheetIdInput'),
  reminderInput: document.getElementById('reminderInput'),
  charCount: document.getElementById('charCount'),
  executeBtn: document.getElementById('executeBtn'),
  executeBtnText: document.getElementById('executeBtnText'),
  resetFormBtn: document.getElementById('resetFormBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),

  executionBadge: document.getElementById('executionBadge'),
  executionStatusLabel: document.getElementById('executionStatusLabel'),
  activeKickoffId: document.getElementById('activeKickoffId'),
  elapsedTimer: document.getElementById('elapsedTimer'),
  activeTaskLabel: document.getElementById('activeTaskLabel'),
  progressBar: document.getElementById('progressBar'),

  tabOutput: document.getElementById('tabOutput'),
  tabLogs: document.getElementById('tabLogs'),
  tabRaw: document.getElementById('tabRaw'),
  tabContentOutput: document.getElementById('tabContentOutput'),
  tabContentLogs: document.getElementById('tabContentLogs'),
  tabContentRaw: document.getElementById('tabContentRaw'),
  outputPlaceholder: document.getElementById('outputPlaceholder'),
  outputContainer: document.getElementById('outputContainer'),
  terminalBody: document.getElementById('terminalBody'),
  logCounter: document.getElementById('logCounter'),
  rawJsonView: document.getElementById('rawJsonView'),
  clearLogsBtn: document.getElementById('clearLogsBtn'),
  copyResultBtn: document.getElementById('copyResultBtn'),
  downloadResultBtn: document.getElementById('downloadResultBtn'),

  historyTableBody: document.getElementById('historyTableBody'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),

  openSettingsBtn: document.getElementById('openSettingsBtn'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  settingBaseUrl: document.getElementById('settingBaseUrl'),
  settingBearerToken: document.getElementById('settingBearerToken'),
  toggleTokenVisibility: document.getElementById('toggleTokenVisibility'),
  modalTestConnBtn: document.getElementById('modalTestConnBtn'),
  modalTestResult: document.getElementById('modalTestResult'),
  modalResetDefaultsBtn: document.getElementById('modalResetDefaultsBtn'),
  modalSaveSettingsBtn: document.getElementById('modalSaveSettingsBtn'),

  openDocsBtn: document.getElementById('openDocsBtn'),
  closeDocsBtn: document.getElementById('closeDocsBtn'),
  closeDocsBtn2: document.getElementById('closeDocsBtn2'),
  docsModal: document.getElementById('docsModal'),

  footerTestConn: document.getElementById('footerTestConn'),
  footerResetStorage: document.getElementById('footerResetStorage'),
  toastContainer: document.getElementById('toastContainer')
};

/**
 * Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initEventListeners();
  renderHistory();
  checkApiHealth();
});

/**
 * Initialize UI States
 */
function initUI() {
  updateEndpointTag();
  elements.settingBaseUrl.value = state.baseUrl;
  elements.settingBearerToken.value = state.bearerToken;
}

function updateEndpointTag() {
  try {
    const url = new URL(state.baseUrl);
    const subdomain = url.hostname.split('.')[0];
    elements.activeEndpointTag.textContent = subdomain || url.hostname;
  } catch (e) {
    elements.activeEndpointTag.textContent = state.baseUrl;
  }
}

/**
 * Event Listeners Binding
 */
function initEventListeners() {
  // Form submission
  elements.workflowForm.addEventListener('submit', handleFormSubmit);
  elements.resetFormBtn.addEventListener('click', handleFormReset);
  elements.loadSampleBtn.addEventListener('click', handleLoadSample);

  // Auto-extract Google Sheet ID when pasting URL
  elements.spreadsheetIdInput.addEventListener('input', (e) => {
    const extracted = extractGoogleSheetId(e.target.value);
    if (extracted && extracted !== e.target.value) {
      e.target.value = extracted;
      showToast('Extracted Google Spreadsheet ID from link!', 'info');
    }
  });

  // Character counter for prompt
  elements.reminderInput.addEventListener('input', (e) => {
    elements.charCount.textContent = `${e.target.value.length} characters`;
  });

  // Template chips
  document.querySelectorAll('.template-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const templateKey = chip.getAttribute('data-template');
      if (TEMPLATES[templateKey]) {
        elements.reminderInput.value = TEMPLATES[templateKey].text;
        elements.charCount.textContent = `${elements.reminderInput.value.length} characters`;
        showToast(`Loaded "${TEMPLATES[templateKey].title}" template`, 'info');
        elements.reminderInput.focus();
      }
    });
  });

  // Tabs
  elements.tabOutput.addEventListener('click', () => switchTab('tabContentOutput', elements.tabOutput));
  elements.tabLogs.addEventListener('click', () => switchTab('tabContentLogs', elements.tabLogs));
  elements.tabRaw.addEventListener('click', () => switchTab('tabContentRaw', elements.tabRaw));

  // Copy & Download
  elements.copyResultBtn.addEventListener('click', handleCopyResult);
  elements.downloadResultBtn.addEventListener('click', handleDownloadResult);
  elements.clearLogsBtn.addEventListener('click', handleClearLogs);

  // History Actions
  elements.clearHistoryBtn.addEventListener('click', handleClearHistory);

  // Settings Modal
  elements.openSettingsBtn.addEventListener('click', () => openModal(elements.settingsModal));
  elements.closeSettingsBtn.addEventListener('click', () => closeModal(elements.settingsModal));
  elements.modalSaveSettingsBtn.addEventListener('click', handleSaveSettings);
  elements.modalResetDefaultsBtn.addEventListener('click', handleResetSettingsDefaults);
  elements.modalTestConnBtn.addEventListener('click', handleTestConnectionModal);
  elements.toggleTokenVisibility.addEventListener('click', () => {
    const isPassword = elements.settingBearerToken.type === 'password';
    elements.settingBearerToken.type = isPassword ? 'text' : 'password';
  });

  // Documentation Modal
  elements.openDocsBtn.addEventListener('click', () => openModal(elements.docsModal));
  elements.closeDocsBtn.addEventListener('click', () => closeModal(elements.docsModal));
  elements.closeDocsBtn2.addEventListener('click', () => closeModal(elements.docsModal));

  // Footer Actions
  elements.footerTestConn.addEventListener('click', checkApiHealth);
  elements.footerResetStorage.addEventListener('click', handleHardResetStorage);

  // Close modals on clicking outside backdrop
  [elements.settingsModal, elements.docsModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
}

/**
 * Utility: Extract Spreadsheet ID from standard Google Sheets URL
 * Example: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 */
function extractGoogleSheetId(input) {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * API: Check Health & Inputs Endpoint
 */
async function checkApiHealth() {
  setConnectionStatus('checking', 'Connecting to CrewAI...');
  const startPing = performance.now();

  try {
    const normalizedUrl = state.baseUrl.replace(/\/+$/, '');
    const response = await fetch(`${normalizedUrl}/inputs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${state.bearerToken}`,
        'Accept': 'application/json'
      }
    });

    const latency = Math.round(performance.now() - startPing);
    elements.latencyBadge.textContent = `${latency} ms`;

    if (response.ok) {
      const data = await response.json();
      setConnectionStatus('online', 'CrewAI Live', `${latency} ms`);
      logTerminal('system', `Connected to CrewAI API (${latency}ms). Discovered inputs: ${JSON.stringify(data.inputs || [])}`);
      return { success: true, latency, data };
    } else {
      setConnectionStatus('offline', `HTTP ${response.status}`);
      logTerminal('error', `Connection error: Received status ${response.status} ${response.statusText}`);
      return { success: false, status: response.status };
    }
  } catch (err) {
    setConnectionStatus('offline', 'Offline / Unreachable');
    logTerminal('error', `Network error contacting CrewAI: ${err.message}`);
    return { success: false, error: err.message };
  }
}

function setConnectionStatus(status, label, latencyText) {
  elements.connectionPill.className = `status-pill status-${status}`;
  elements.connectionText.textContent = label;
  if (latencyText) {
    elements.latencyBadge.textContent = latencyText;
  }
}

/**
 * Workflow Execution Handler (Kickoff)
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  if (state.isPolling) {
    showToast('A workflow is currently executing. Please wait for it to complete.', 'info');
    return;
  }

  const rawSpreadsheet = elements.spreadsheetIdInput.value.trim();
  const spreadsheetId = extractGoogleSheetId(rawSpreadsheet);
  const reminderInput = elements.reminderInput.value.trim();

  if (!spreadsheetId) {
    showToast('Please provide a valid Google Spreadsheet ID or URL.', 'error');
    elements.spreadsheetIdInput.focus();
    return;
  }

  if (!reminderInput) {
    showToast('Please provide reminder input instructions.', 'error');
    elements.reminderInput.focus();
    return;
  }

  // Update inputs object matching CrewAI /inputs spec
  const inputsPayload = {
    inputs: {
      spreadsheet_id: spreadsheetId,
      reminder_input: reminderInput
    }
  };

  state.activeInputs = inputsPayload.inputs;
  startExecutionUI();

  logTerminal('info', `Dispatching workflow execution to ${state.baseUrl}/kickoff`);
  logTerminal('system', `Inputs: spreadsheet_id="${spreadsheetId}", reminder_length=${reminderInput.length} chars`);

  try {
    const normalizedUrl = state.baseUrl.replace(/\/+$/, '');
    const response = await fetch(`${normalizedUrl}/kickoff`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.bearerToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(inputsPayload)
    });

    if (!response.ok) {
      let errDetail = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errDetail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch (_) {}

      throw new Error(`Kickoff rejected: ${errDetail}`);
    }

    const kickoffData = await response.json();
    const kickoffId = kickoffData.kickoff_id || kickoffData.id;

    if (!kickoffId) {
      throw new Error('No kickoff_id returned from API response.');
    }

    state.activeKickoffId = kickoffId;
    elements.activeKickoffId.textContent = kickoffId;
    logTerminal('success', `Workflow registered with Kickoff ID: ${kickoffId}`);
    showToast(`Execution started: ID ${kickoffId}`, 'success');

    // Begin Polling Loop
    startPolling(kickoffId);
  } catch (err) {
    handleExecutionError(err.message);
  }
}

/**
 * UI State Management During Execution
 */
function startExecutionUI() {
  state.isPolling = true;
  state.startTime = Date.now();
  elements.executeBtn.disabled = true;
  elements.executeBtn.classList.add('is-loading');
  elements.executeBtnText.textContent = 'Executing...';

  setExecutionBadge('queued', 'Queued');
  elements.activeTaskLabel.textContent = 'Initializing agents...';
  elements.progressBar.parentElement.classList.add('is-active');
  elements.progressBar.style.width = '15%';

  // Reset output and logs
  elements.outputPlaceholder.classList.add('hidden');
  elements.outputContainer.classList.remove('hidden');
  elements.outputContainer.innerHTML = '<div class="loading-shimmer">Processing with CrewAI agents...</div>';
  elements.rawJsonView.textContent = '// Waiting for execution to complete...';

  // Start Elapsed Timer
  if (state.timerIntervalId) clearInterval(state.timerIntervalId);
  elements.elapsedTimer.textContent = '00:00';
  state.timerIntervalId = setInterval(() => {
    const elapsedSec = Math.floor((Date.now() - state.startTime) / 1000);
    const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const secs = String(elapsedSec % 60).padStart(2, '0');
    elements.elapsedTimer.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopExecutionUI() {
  state.isPolling = false;
  elements.executeBtn.disabled = false;
  elements.executeBtn.classList.remove('is-loading');
  elements.executeBtnText.textContent = 'Execute Workflow';

  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
  if (state.pollIntervalId) {
    clearInterval(state.pollIntervalId);
    state.pollIntervalId = null;
  }
  elements.progressBar.parentElement.classList.remove('is-active');
}

function setExecutionBadge(type, label) {
  elements.executionBadge.className = `execution-badge badge-${type}`;
  elements.executionStatusLabel.textContent = label;
}

/**
 * Polling Loop for Execution Status
 */
function startPolling(kickoffId) {
  let pollAttempts = 0;
  const pollIntervalMs = 2000;
  const maxAttempts = 300; // 10 minutes timeout

  state.pollIntervalId = setInterval(async () => {
    pollAttempts++;

    if (pollAttempts > maxAttempts) {
      handleExecutionError('Execution polling timed out after 10 minutes.');
      return;
    }

    try {
      const normalizedUrl = state.baseUrl.replace(/\/+$/, '');
      const res = await fetch(`${normalizedUrl}/status/${kickoffId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${state.bearerToken}`,
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        logTerminal('warning', `Polling status returned HTTP ${res.status}. Retrying...`);
        return;
      }

      const statusData = await res.json();
      handleStatusUpdate(statusData);
    } catch (err) {
      logTerminal('warning', `Transient poll error: ${err.message}`);
    }
  }, pollIntervalMs);
}

/**
 * Handle Status Update from Polling
 */
function handleStatusUpdate(data) {
  const status = (data.status || '').toLowerCase();
  const currentTask = data.current_task || data.last_executed_task || 'Working...';

  elements.activeTaskLabel.textContent = currentTask;

  // Update progress bar
  if (status === 'queued') {
    setExecutionBadge('queued', 'Queued');
    elements.progressBar.style.width = '25%';
    logTerminal('info', `Status: Queued (Task: ${currentTask})`);
  } else if (status === 'running') {
    setExecutionBadge('running', 'Running');
    elements.progressBar.style.width = '65%';
    logTerminal('info', `Status: Running (Task: ${currentTask})`);
  } else if (status === 'awaiting_human_feedback') {
    setExecutionBadge('queued', 'Awaiting Feedback');
    elements.progressBar.style.width = '80%';
    logTerminal('warning', `Status: Workflow paused awaiting human feedback`);
  } else if (status === 'completed' || status === 'success') {
    handleExecutionSuccess(data);
  } else if (status === 'failed' || status === 'error') {
    handleExecutionError(data.error || data.result || 'CrewAI reported execution failure.');
  }
}

/**
 * Handle Successful Workflow Completion
 */
function handleExecutionSuccess(data) {
  stopExecutionUI();
  setExecutionBadge('completed', 'Completed');
  elements.progressBar.style.width = '100%';
  elements.activeTaskLabel.textContent = 'All tasks completed';

  const durationStr = elements.elapsedTimer.textContent;
  logTerminal('success', `Workflow execution successfully completed in ${durationStr}`);
  showToast('Workflow executed successfully!', 'success');

  state.latestResult = data;

  // Render Raw JSON
  elements.rawJsonView.textContent = JSON.stringify(data, null, 2);

  // Render Result Output
  const resultText = data.result || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  renderMarkdownOutput(resultText);

  // Save to Execution History
  saveHistoryEntry({
    timestamp: new Date().toISOString(),
    kickoffId: state.activeKickoffId,
    spreadsheetId: state.activeInputs ? state.activeInputs.spreadsheet_id : 'N/A',
    status: 'Completed',
    duration: durationStr,
    resultSummary: typeof resultText === 'string' ? resultText.slice(0, 200) : 'JSON Output'
  });
}

/**
 * Handle Workflow Failure or Error
 */
function handleExecutionError(errorMessage) {
  stopExecutionUI();
  setExecutionBadge('failed', 'Failed');
  elements.progressBar.style.width = '100%';
  elements.progressBar.style.background = 'var(--danger)';
  elements.activeTaskLabel.textContent = 'Execution failed';

  logTerminal('error', `Execution failed: ${errorMessage}`);
  showToast(`Execution failed: ${errorMessage}`, 'error');

  elements.outputPlaceholder.classList.add('hidden');
  elements.outputContainer.classList.remove('hidden');
  elements.outputContainer.innerHTML = `
    <div style="color: #f87171; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 1.25rem; border-radius: 8px;">
      <h3 style="margin-bottom: 0.5rem; color: #fca5a5;">⚠️ Execution Failed</h3>
      <p>${escapeHtml(errorMessage)}</p>
    </div>
  `;

  saveHistoryEntry({
    timestamp: new Date().toISOString(),
    kickoffId: state.activeKickoffId || 'Error',
    spreadsheetId: state.activeInputs ? state.activeInputs.spreadsheet_id : 'N/A',
    status: 'Failed',
    duration: elements.elapsedTimer.textContent,
    resultSummary: errorMessage
  });
}

/**
 * Safe Markdown-to-HTML Parser for CrewAI outputs
 */
function renderMarkdownOutput(text) {
  if (!text) {
    elements.outputContainer.innerHTML = '<p class="text-muted">No result content returned.</p>';
    return;
  }

  let formatted = escapeHtml(text);

  // Code blocks ```code```
  formatted = formatted.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="code-view"><code>${code.trim()}</code></pre>`;
  });

  // Inline code `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  formatted = formatted.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  formatted = formatted.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  formatted = formatted.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold & Italic
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Blockquotes
  formatted = formatted.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Unordered Lists
  formatted = formatted.replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Line breaks to paragraphs
  const paragraphs = formatted
    .split(/\n\n+/)
    .map(p => p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<ul') || p.startsWith('<block') ? p : `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');

  elements.outputContainer.innerHTML = paragraphs;
}

function escapeHtml(string) {
  const div = document.createElement('div');
  div.textContent = string;
  return div.innerHTML;
}

/**
 * Terminal Logger
 */
function logTerminal(level, message) {
  state.logCount++;
  elements.logCounter.textContent = state.logCount;

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const lineEl = document.createElement('div');
  lineEl.className = `log-line log-${level}`;
  lineEl.innerHTML = `
    <span class="log-time">[${timeStr}]</span>
    <span class="log-msg">${escapeHtml(message)}</span>
  `;

  elements.terminalBody.appendChild(lineEl);
  elements.terminalBody.scrollTop = elements.terminalBody.scrollHeight;
}

function handleClearLogs() {
  elements.terminalBody.innerHTML = '';
  state.logCount = 0;
  elements.logCounter.textContent = '0';
  logTerminal('system', 'Terminal log buffer cleared.');
}

/**
 * Tabs Switching
 */
function switchTab(tabContentId, activeBtn) {
  [elements.tabOutput, elements.tabLogs, elements.tabRaw].forEach(btn => btn.classList.remove('active'));
  [elements.tabContentOutput, elements.tabContentLogs, elements.tabContentRaw].forEach(panel => panel.classList.remove('active'));

  activeBtn.classList.add('active');
  document.getElementById(tabContentId).classList.add('active');
}

/**
 * Copy and Download Output Actions
 */
function handleCopyResult() {
  const text = state.latestResult
    ? (state.latestResult.result || JSON.stringify(state.latestResult, null, 2))
    : elements.outputContainer.innerText;

  if (!text || elements.outputContainer.classList.contains('hidden')) {
    showToast('No output to copy.', 'info');
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showToast('Output copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy to clipboard.', 'error');
  });
}

function handleDownloadResult() {
  const text = state.latestResult
    ? (state.latestResult.result || JSON.stringify(state.latestResult, null, 2))
    : elements.outputContainer.innerText;

  if (!text || elements.outputContainer.classList.contains('hidden')) {
    showToast('No output to download.', 'info');
    return;
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `teacher-reminder-result-${state.activeKickoffId || Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Downloaded output report.', 'success');
}

/**
 * Execution History Management
 */
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEYS.HISTORY)) || [];
  } catch (_) {
    return [];
  }
}

function saveHistoryEntry(entry) {
  const list = getHistory();
  list.unshift(entry);
  if (list.length > 20) list.pop(); // Keep last 20 runs
  localStorage.setItem(CONFIG_KEYS.HISTORY, JSON.stringify(list));
  renderHistory();
}

function renderHistory() {
  const list = getHistory();
  if (list.length === 0) {
    elements.historyTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">No previous executions recorded. Runs will be saved automatically here.</td>
      </tr>
    `;
    return;
  }

  elements.historyTableBody.innerHTML = list.map((item, idx) => {
    const formattedDate = new Date(item.timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isCompleted = item.status === 'Completed';
    const statusClass = isCompleted ? 'ribbon-val-badge badge-green' : 'execution-badge badge-failed';

    return `
      <tr>
        <td>${formattedDate}</td>
        <td><code>${escapeHtml(item.kickoffId || 'N/A')}</code></td>
        <td><code>${escapeHtml(item.spreadsheetId || 'N/A')}</code></td>
        <td><span class="${statusClass}">${escapeHtml(item.status)}</span></td>
        <td>${escapeHtml(item.duration || '--')}</td>
        <td>
          <button class="btn btn-ghost btn-xs" onclick="window.repopulateRun(${idx})" title="Load spreadsheet ID">
            Reuse ID
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.repopulateRun = function(index) {
  const list = getHistory();
  if (list[index]) {
    elements.spreadsheetIdInput.value = list[index].spreadsheetId;
    showToast('Loaded spreadsheet ID from historical execution!', 'info');
    elements.spreadsheetIdInput.focus();
  }
};

function handleClearHistory() {
  if (confirm('Are you sure you want to clear all execution history?')) {
    localStorage.removeItem(CONFIG_KEYS.HISTORY);
    renderHistory();
    showToast('Execution history cleared.', 'info');
  }
}

/**
 * Sample Data Loader
 */
function handleLoadSample() {
  elements.spreadsheetIdInput.value = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  elements.reminderInput.value = TEMPLATES.grades.text;
  elements.charCount.textContent = `${elements.reminderInput.value.length} characters`;
  showToast('Filled form with sample teacher reminder data!', 'success');
}

function handleFormReset() {
  elements.workflowForm.reset();
  elements.charCount.textContent = '0 characters';
  showToast('Form cleared.', 'info');
}

/**
 * Settings Modal Logic
 */
function handleSaveSettings() {
  const newBaseUrl = elements.settingBaseUrl.value.trim().replace(/\/+$/, '');
  const newToken = elements.settingBearerToken.value.trim();

  if (!newBaseUrl) {
    showToast('Please provide a valid Base URL.', 'error');
    return;
  }
  if (!newToken) {
    showToast('Please provide a Bearer Token.', 'error');
    return;
  }

  state.baseUrl = newBaseUrl;
  state.bearerToken = newToken;

  localStorage.setItem(CONFIG_KEYS.BASE_URL, newBaseUrl);
  localStorage.setItem(CONFIG_KEYS.BEARER_TOKEN, newToken);

  updateEndpointTag();
  closeModal(elements.settingsModal);
  showToast('Connection settings saved and applied!', 'success');
  checkApiHealth();
}

function handleResetSettingsDefaults() {
  elements.settingBaseUrl.value = DEFAULTS.BASE_URL;
  elements.settingBearerToken.value = DEFAULTS.BEARER_TOKEN;
  showToast('Reset fields to factory defaults. Click Save to persist.', 'info');
}

async function handleTestConnectionModal() {
  elements.modalTestResult.textContent = 'Testing connection...';
  elements.modalTestResult.style.color = 'var(--text-muted)';

  const testUrl = elements.settingBaseUrl.value.trim().replace(/\/+$/, '');
  const testToken = elements.settingBearerToken.value.trim();

  try {
    const res = await fetch(`${testUrl}/inputs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      elements.modalTestResult.textContent = '✅ Connected successfully!';
      elements.modalTestResult.style.color = 'var(--success)';
    } else {
      elements.modalTestResult.textContent = `❌ Failed with HTTP ${res.status}`;
      elements.modalTestResult.style.color = 'var(--danger)';
    }
  } catch (e) {
    elements.modalTestResult.textContent = `❌ Network error: ${e.message}`;
    elements.modalTestResult.style.color = 'var(--danger)';
  }
}

function handleHardResetStorage() {
  if (confirm('Reset all saved credentials and history in this browser?')) {
    localStorage.clear();
    state.baseUrl = DEFAULTS.BASE_URL;
    state.bearerToken = DEFAULTS.BEARER_TOKEN;
    initUI();
    renderHistory();
    showToast('Local browser storage reset to defaults.', 'info');
    checkApiHealth();
  }
}

/**
 * Modal Open/Close Helpers
 */
function openModal(modalEl) {
  modalEl.classList.add('is-open');
  modalEl.setAttribute('aria-hidden', 'false');
}

function closeModal(modalEl) {
  modalEl.classList.remove('is-open');
  modalEl.setAttribute('aria-hidden', 'true');
  if (elements.modalTestResult) {
    elements.modalTestResult.textContent = '';
  }
}

/**
 * Toast Notification Center
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4000);
}
