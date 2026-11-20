const ACCESS_FLAG = 'trackerSettingsAuthorized';
import { SafetyApiClient } from '../../api/safety-api-client.js';

function retentionToHours(retention) {
  if (retention === '7d') {
    return 168;
  }
  if (retention === '30d') {
    return 720;
  }
  return 24;
}

function readFormValue(form, name, fallback = '') {
  return String(new FormData(form).get(name) || fallback).trim();
}

export function initLocationTrackerModule(apiClient = new SafetyApiClient()) {
  const gateForm = document.getElementById('tracker-pin-form');
  const gateStatus = document.getElementById('tracker-gate-status');
  const settingsPanel = document.getElementById('tracker-settings-panel');
  const lockBanner = document.getElementById('tracker-locked-banner');
  const lockButton = document.getElementById('tracker-lock-button');
  const settingsForm = document.getElementById('tracker-settings-form');
  const settingsStatus = document.getElementById('tracker-settings-status');
  const resultsPanel = document.getElementById('tracker-results');
  const savePolicyButton = document.getElementById('tracker-save-policy');
  const loadHistoryButton = document.getElementById('tracker-load-history');
  const createExportButton = document.getElementById('tracker-create-export');
  const loadExportButton = document.getElementById('tracker-load-export');
  const loadAuditButton = document.getElementById('tracker-load-audit');

  if (!gateForm || !gateStatus || !settingsPanel || !lockBanner || !lockButton || !settingsForm || !settingsStatus || !resultsPanel || !savePolicyButton || !loadHistoryButton || !createExportButton || !loadExportButton || !loadAuditButton) {
    return;
  }

  function updateSettingsStatus(text, statusClass = 'status') {
    settingsStatus.textContent = text;
    settingsStatus.className = statusClass;
  }

  function renderResult(title, payload) {
    resultsPanel.textContent = `${title}\n${JSON.stringify(payload, null, 2)}`;
  }

  async function savePolicy() {
    const profileId = readFormValue(settingsForm, 'profileId', 'dependent-profile');
    const trackingMode = readFormValue(settingsForm, 'trackingMode', 'emergency-only');
    const retention = readFormValue(settingsForm, 'retention', '24h');
    const precision = readFormValue(settingsForm, 'precision', 'high-emergency');
    const allowAuthorityExport = new FormData(settingsForm).get('allowAuthorityExport') === 'on';

    updateSettingsStatus('Saving tracker policy...');
    const result = await apiClient.setTrackerPolicy({
      profileId,
      mode: trackingMode,
      retentionHours: retentionToHours(retention),
      precisionMode: precision,
      allowAuthorityExport,
      allowedViewers: ['guardian', ...(allowAuthorityExport ? ['authority'] : [])],
    });
    updateSettingsStatus('Tracker policy saved.', 'status success');
    renderResult('Policy', result);
  }

  async function loadHistory() {
    const profileId = readFormValue(settingsForm, 'profileId', 'dependent-profile');
    updateSettingsStatus('Loading tracker history...');
    const result = await apiClient.getTrackerHistory(profileId, 'guardian');
    updateSettingsStatus(`Loaded ${result.eventCount} tracker events.`, 'status success');
    renderResult('History', result);
  }

  async function createExport() {
    const profileId = readFormValue(settingsForm, 'profileId', 'dependent-profile');
    const requestedBy = readFormValue(settingsForm, 'requestedBy', 'guardian-admin');
    const scope = readFormValue(settingsForm, 'scope', 'last-24h');
    const expiresInMinutes = Number.parseInt(readFormValue(settingsForm, 'expiresInMinutes', '60'), 10);

    updateSettingsStatus('Generating authority export...');
    const result = await apiClient.exportTrackerHistory(profileId, {
      requestedBy,
      role: 'authority',
      scope,
      expiresInMinutes: Number.isNaN(expiresInMinutes) ? 60 : expiresInMinutes,
    });
    const exportIdInput = settingsForm.elements.namedItem('exportId');
    if (exportIdInput && 'value' in exportIdInput) {
      exportIdInput.value = result.exportId;
    }
    updateSettingsStatus('Export generated with signature.', 'status success');
    renderResult('Export', result);
  }

  async function loadExport() {
    const exportId = readFormValue(settingsForm, 'exportId', '');
    if (!exportId) {
      throw new Error('Missing export id');
    }

    updateSettingsStatus('Loading signed export bundle...');
    const result = await apiClient.getTrackerExport(exportId);
    updateSettingsStatus('Export bundle retrieved.', 'status success');
    renderResult('Export Bundle', result);
  }

  async function loadAudit() {
    const profileId = readFormValue(settingsForm, 'profileId', 'dependent-profile');
    updateSettingsStatus('Loading tracker audit...');
    const result = await apiClient.getTrackerAudit(profileId);
    updateSettingsStatus(`Loaded ${result.count} audit entries.`, 'status success');
    renderResult('Audit', result);
  }

  function setAuthorizedState(isAuthorized) {
    if (isAuthorized) {
      settingsPanel.classList.remove('hidden');
      lockBanner.classList.add('hidden');
      gateStatus.textContent = 'Guardian access enabled for this session.';
      gateStatus.className = 'status success';
      sessionStorage.setItem(ACCESS_FLAG, 'true');
      return;
    }

    settingsPanel.classList.add('hidden');
    lockBanner.classList.remove('hidden');
    gateStatus.textContent = '';
    gateStatus.className = 'status';
    sessionStorage.removeItem(ACCESS_FLAG);
  }

  lockButton.addEventListener('click', () => {
    setAuthorizedState(false);
    gateForm.reset();
    updateSettingsStatus('');
    resultsPanel.textContent = '';
  });

  savePolicyButton.addEventListener('click', async () => {
    try {
      await savePolicy();
    } catch (_error) {
      updateSettingsStatus('Unable to save tracker policy.', 'status error');
    }
  });

  loadHistoryButton.addEventListener('click', async () => {
    try {
      await loadHistory();
    } catch (_error) {
      updateSettingsStatus('Unable to load tracker history.', 'status error');
    }
  });

  createExportButton.addEventListener('click', async () => {
    try {
      await createExport();
    } catch (_error) {
      updateSettingsStatus('Unable to create tracker export.', 'status error');
    }
  });

  loadExportButton.addEventListener('click', async () => {
    try {
      await loadExport();
    } catch (_error) {
      updateSettingsStatus('Unable to load export bundle.', 'status error');
    }
  });

  loadAuditButton.addEventListener('click', async () => {
    try {
      await loadAudit();
    } catch (_error) {
      updateSettingsStatus('Unable to load tracker audit.', 'status error');
    }
  });

  gateForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(gateForm);
    const pin = String(formData.get('pin') || '').trim();

    gateStatus.textContent = 'Verifying guardian PIN...';
    gateStatus.className = 'status';

    try {
      const response = await fetch('/api/tracker/access/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin })
      });

      if (!response.ok) {
        throw new Error('Invalid PIN');
      }

      const result = await response.json();
      if (!result.authorized) {
        throw new Error('Invalid PIN');
      }

      setAuthorizedState(true);
      gateForm.reset();
    } catch (_error) {
      gateStatus.textContent = 'PIN verification failed.';
      gateStatus.className = 'status error';
      setAuthorizedState(false);
    }
  });

  const hasAccess = sessionStorage.getItem(ACCESS_FLAG) === 'true';
  setAuthorizedState(hasAccess);
}
