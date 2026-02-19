/* ===================================================================
   RBAC Role Mining Tool — Client-Side Analysis Engine
   =================================================================== */

(function () {
    'use strict';

    // ─── State ───────────────────────────────────────────────────────
    let hrData = [];           // Array of HR row objects keyed by header names
    let entitlementData = [];  // Array of {employeeId, application, entitlementName, entitlementId, accessLevel}
    let entByEmployee = {};    // employeeId → Set of "entId|app|name|level" composite keys
    let hrByEmployee = {};     // employeeId → HR row object
    let uploadedUserIds = [];  // User-uploaded list of employee IDs
    let analysisResults = {};  // strategyName → array of role recommendations
    let currentStrategy = null;

    // ─── DOM refs ────────────────────────────────────────────────────
    const $ = id => document.getElementById(id);
    const hrIcon = $('hr-icon');
    const hrCount = $('hr-count');
    const entIcon = $('ent-icon');
    const entCount = $('ent-count');
    const uploadArea = $('upload-area');
    const fileInput = $('file-input');
    const sampleBtn = $('sample-btn');
    const fileName = $('file-name');
    const thresholdSlider = $('threshold-slider');
    const thresholdValue = $('threshold-value');
    const minGroupSlider = $('min-group');
    const minGroupValue = $('min-group-value');
    const analyzeBtn = $('analyze-btn');
    const progressPanel = $('progress-panel');
    const progressBar = $('progress-bar');
    const progressText = $('progress-text');
    const resultsPanel = $('results-panel');
    const strategyTabs = $('strategy-tabs');
    const roleCardsContainer = $('role-cards-container');

    // ─── Init: Load bundled data ─────────────────────────────────────
    async function init() {
        try {
            await Promise.all([loadHRData(), loadEntitlementData()]);
        } catch (e) {
            console.error('Data loading failed:', e);
        }
    }

    async function loadHRData() {
        try {
            const resp = await fetch('data/commercial_bank_hr_data.csv');
            const text = await resp.text();
            const result = Papa.parse(text, { header: true, skipEmptyLines: true });
            hrData = result.data;
            hrByEmployee = {};
            for (const row of hrData) {
                hrByEmployee[row['Employee ID']] = row;
            }
            hrIcon.textContent = '\u2713';
            hrIcon.className = 'status-icon success';
            hrCount.textContent = `${hrData.length} employees loaded`;
        } catch (e) {
            hrIcon.textContent = '\u2717';
            hrIcon.className = 'status-icon error';
            hrCount.textContent = 'Failed to load';
            throw e;
        }
    }

    async function loadEntitlementData() {
        try {
            const resp = await fetch('data/entitlements.csv');
            const text = await resp.text();
            const result = Papa.parse(text, { header: true, skipEmptyLines: true });
            entitlementData = result.data;
            entByEmployee = {};
            for (const row of entitlementData) {
                const eid = row['Employee ID'];
                if (!entByEmployee[eid]) entByEmployee[eid] = new Set();
                // Composite key: entId|app|entName|level
                entByEmployee[eid].add(`${row['Entitlement ID']}|${row['Application']}|${row['Entitlement Name']}|${row['Access Level']}`);
            }
            entIcon.textContent = '\u2713';
            entIcon.className = 'status-icon success';
            entCount.textContent = `${entitlementData.length} entitlement records loaded`;
        } catch (e) {
            entIcon.textContent = '\u2717';
            entIcon.className = 'status-icon error';
            entCount.textContent = 'Failed to load';
            throw e;
        }
    }

    // ─── File Upload Handling ────────────────────────────────────────
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
    });

    sampleBtn.addEventListener('click', async () => {
        try {
            const resp = await fetch('data/sample_user_list.csv');
            const text = await resp.text();
            const result = Papa.parse(text, { header: true, skipEmptyLines: true });
            processUserIds(result.data);
            fileName.textContent = 'sample_user_list.csv (50 users)';
        } catch (e) {
            alert('Could not load sample data. Make sure data/sample_user_list.csv exists.');
        }
    });

    function handleFile(file) {
        if (!file.name.endsWith('.csv')) {
            alert('Please upload a CSV file.');
            return;
        }
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: result => {
                processUserIds(result.data);
                fileName.textContent = `${file.name} (${uploadedUserIds.length} users)`;
            }
        });
    }

    function processUserIds(rows) {
        // Try to find the Employee ID column (flexible naming)
        const idCol = Object.keys(rows[0] || {}).find(k =>
            k.trim().toLowerCase().replace(/[\s_-]/g, '') === 'employeeid'
        );
        if (!idCol) {
            alert('CSV must contain an "Employee ID" column.');
            return;
        }
        uploadedUserIds = rows.map(r => r[idCol].trim()).filter(Boolean);

        // Validate against HR data
        const valid = uploadedUserIds.filter(id => hrByEmployee[id]);
        const invalid = uploadedUserIds.filter(id => !hrByEmployee[id]);
        if (invalid.length > 0) {
            console.warn(`${invalid.length} IDs not found in HR data:`, invalid);
        }
        uploadedUserIds = valid;

        if (uploadedUserIds.length < 2) {
            alert('Need at least 2 valid employee IDs found in HR data.');
            return;
        }

        analyzeBtn.disabled = false;
        resultsPanel.hidden = true;
    }

    // ─── Configuration ───────────────────────────────────────────────
    thresholdSlider.addEventListener('input', () => {
        thresholdValue.textContent = thresholdSlider.value + '%';
    });
    minGroupSlider.addEventListener('input', () => {
        minGroupValue.textContent = minGroupSlider.value;
    });

    // ─── Analysis Engine ─────────────────────────────────────────────
    analyzeBtn.addEventListener('click', runAnalysis);

    async function runAnalysis() {
        const threshold = parseInt(thresholdSlider.value) / 100;
        const minGroup = parseInt(minGroupSlider.value);

        progressPanel.hidden = false;
        resultsPanel.hidden = true;
        analyzeBtn.disabled = true;
        progressBar.style.width = '0%';
        progressText.textContent = 'Preparing analysis...';

        // Yield to UI
        await sleep(50);

        // Gather HR + entitlement data for uploaded users
        const users = uploadedUserIds.map(id => ({
            id,
            hr: hrByEmployee[id],
            entitlements: entByEmployee[id] || new Set()
        }));

        // Define grouping strategies
        const strategies = [
            {
                name: 'Business Line',
                key: u => u.hr['Business Line']
            },
            {
                name: 'Business Line + Job Family',
                key: u => `${u.hr['Business Line']} | ${u.hr['Job Family']}`
            },
            {
                name: 'Business Line + Job Grade',
                key: u => `${u.hr['Business Line']} | ${u.hr['Job Grade / Band']}`
            },
            {
                name: 'Business Line + Region',
                key: u => `${u.hr['Business Line']} | ${u.hr['Region']}`
            },
            {
                name: 'Job Family + Job Grade',
                key: u => `${u.hr['Job Family']} | ${u.hr['Job Grade / Band']}`
            },
            {
                name: 'Cost Center',
                key: u => u.hr['Cost Center Name']
            },
            {
                name: 'SNODE L3 + L4',
                key: u => `${u.hr['SNODE L3']} | ${u.hr['SNODE L4']}`
            },
            {
                name: 'SNODE L3 + L4 + L5',
                key: u => `${u.hr['SNODE L3']} | ${u.hr['SNODE L4']} | ${u.hr['SNODE L5']}`
            },
            {
                name: 'Region + Job Family + Job Grade',
                key: u => `${u.hr['Region']} | ${u.hr['Job Family']} | ${u.hr['Job Grade / Band']}`
            },
        ];

        analysisResults = {};
        const totalSteps = strategies.length;

        for (let i = 0; i < strategies.length; i++) {
            const strat = strategies[i];
            progressText.textContent = `Analyzing: ${strat.name}...`;
            progressBar.style.width = `${((i + 1) / totalSteps) * 100}%`;
            await sleep(30); // yield to UI

            const groups = groupBy(users, strat.key);
            const roles = [];

            for (const [groupKey, members] of Object.entries(groups)) {
                if (members.length < minGroup) continue;

                // Count entitlement frequency across group
                const entCounts = {};
                for (const user of members) {
                    for (const ent of user.entitlements) {
                        entCounts[ent] = (entCounts[ent] || 0) + 1;
                    }
                }

                // Find entitlements meeting threshold
                const sharedEnts = [];
                const outlierEnts = [];
                for (const [ent, count] of Object.entries(entCounts)) {
                    const commonality = count / members.length;
                    const parts = ent.split('|');
                    const entObj = {
                        entitlementId: parts[0],
                        application: parts[1],
                        entitlementName: parts[2],
                        accessLevel: parts[3],
                        commonality,
                        userCount: count,
                        totalUsers: members.length
                    };
                    if (commonality >= threshold) {
                        sharedEnts.push(entObj);
                    } else if (commonality < 0.2) {
                        outlierEnts.push(entObj);
                    }
                }

                if (sharedEnts.length === 0) continue;

                // Calculate role score
                const avgCommonality = sharedEnts.reduce((s, e) => s + e.commonality, 0) / sharedEnts.length;
                const score = members.length * avgCommonality * sharedEnts.length;

                // Build criteria map from the group key
                const criteriaValues = groupKey.split(' | ');
                const criteriaLabels = strat.name.split(' + ');
                const criteria = {};
                criteriaLabels.forEach((label, idx) => {
                    criteria[label.trim()] = criteriaValues[idx] ? criteriaValues[idx].trim() : '';
                });

                // Auto-generate role name
                const roleName = criteriaValues.map(v => v.trim()).join(' - ');

                // Find per-user outliers (entitlements unique to specific users)
                const userOutliers = {};
                for (const user of members) {
                    const uniqueToUser = [];
                    for (const ent of user.entitlements) {
                        if (entCounts[ent] === 1) {
                            const parts = ent.split('|');
                            uniqueToUser.push({
                                entitlementId: parts[0],
                                application: parts[1],
                                entitlementName: parts[2],
                                accessLevel: parts[3],
                            });
                        }
                    }
                    if (uniqueToUser.length > 0) {
                        userOutliers[user.id] = uniqueToUser;
                    }
                }

                roles.push({
                    roleName,
                    strategy: strat.name,
                    criteria,
                    sharedEntitlements: sharedEnts.sort((a, b) => b.commonality - a.commonality),
                    outlierEntitlements: outlierEnts.sort((a, b) => a.commonality - b.commonality),
                    userOutliers,
                    members: members.map(m => m.id),
                    memberCount: members.length,
                    avgCommonality,
                    score
                });
            }

            // Sort roles by score descending
            roles.sort((a, b) => b.score - a.score);
            if (roles.length > 0) {
                analysisResults[strat.name] = roles;
            }
        }

        progressBar.style.width = '100%';
        progressText.textContent = 'Analysis complete!';
        await sleep(300);
        progressPanel.hidden = true;
        analyzeBtn.disabled = false;

        renderResults();
    }

    function groupBy(arr, keyFn) {
        const groups = {};
        for (const item of arr) {
            const key = keyFn(item);
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        }
        return groups;
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // ─── Results Rendering ───────────────────────────────────────────
    function renderResults() {
        resultsPanel.hidden = false;

        const strategyNames = Object.keys(analysisResults);
        if (strategyNames.length === 0) {
            roleCardsContainer.innerHTML = '<p style="color:#6b7280; text-align:center; padding:2rem;">No role groupings found meeting the configured thresholds. Try lowering the commonality threshold or minimum group size.</p>';
            strategyTabs.innerHTML = '';
            updateSummaryStats([]);
            return;
        }

        // Render tabs
        strategyTabs.innerHTML = '';
        strategyNames.forEach((name, i) => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn' + (i === 0 ? ' active' : '');
            btn.textContent = `${name} (${analysisResults[name].length})`;
            btn.addEventListener('click', () => selectStrategy(name, btn));
            strategyTabs.appendChild(btn);
        });

        selectStrategy(strategyNames[0], strategyTabs.querySelector('.tab-btn'));
    }

    function selectStrategy(name, tabBtn) {
        currentStrategy = name;
        // Update tab active state
        strategyTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');

        const roles = analysisResults[name];
        updateSummaryStats(roles);
        renderRoleCards(roles);
    }

    function updateSummaryStats(roles) {
        $('stat-roles').textContent = roles.length;

        const allUsers = new Set();
        roles.forEach(r => r.members.forEach(m => allUsers.add(m)));
        $('stat-users').textContent = allUsers.size;

        const avgEnt = roles.length > 0
            ? Math.round(roles.reduce((s, r) => s + r.sharedEntitlements.length, 0) / roles.length)
            : 0;
        $('stat-avg-ent').textContent = avgEnt;

        const avgCommon = roles.length > 0
            ? Math.round(roles.reduce((s, r) => s + r.avgCommonality * 100, 0) / roles.length)
            : 0;
        $('stat-avg-common').textContent = avgCommon + '%';
    }

    function renderRoleCards(roles) {
        roleCardsContainer.innerHTML = '';

        for (const role of roles) {
            const card = document.createElement('div');
            card.className = 'role-card';

            // Header
            const header = document.createElement('div');
            header.className = 'role-card-header';
            header.innerHTML = `
                <span class="role-name">${escHtml(role.roleName)}</span>
                <div class="role-meta">
                    <span class="role-badge users">${role.memberCount} users</span>
                    <span class="role-badge commonality">${Math.round(role.avgCommonality * 100)}% avg</span>
                    <span class="role-badge entitlements">${role.sharedEntitlements.length} entitlements</span>
                    <span class="role-chevron">&#9660;</span>
                </div>
            `;
            header.addEventListener('click', () => card.classList.toggle('expanded'));

            // Body
            const body = document.createElement('div');
            body.className = 'role-card-body';

            // Criteria section
            let criteriaHtml = '<div class="role-section"><h4>Grouping Criteria</h4><div class="criteria-list">';
            for (const [label, value] of Object.entries(role.criteria)) {
                criteriaHtml += `<span class="criteria-tag">${escHtml(label)}: ${escHtml(value)}</span>`;
            }
            criteriaHtml += '</div></div>';

            // Shared entitlements table
            let entHtml = '<div class="role-section"><h4>Recommended Role Entitlements</h4>';
            entHtml += '<table class="ent-table"><thead><tr><th>Application</th><th>Entitlement</th><th>ID</th><th>Access Level</th><th>Commonality</th></tr></thead><tbody>';
            for (const ent of role.sharedEntitlements) {
                const pct = Math.round(ent.commonality * 100);
                const barW = pct * 0.6; // max 60px
                entHtml += `<tr>
                    <td>${escHtml(ent.application)}</td>
                    <td>${escHtml(ent.entitlementName)}</td>
                    <td><code>${escHtml(ent.entitlementId)}</code></td>
                    <td>${escHtml(ent.accessLevel)}</td>
                    <td><span class="commonality-bar" style="width:${barW}px"></span>${pct}% (${ent.userCount}/${ent.totalUsers})</td>
                </tr>`;
            }
            entHtml += '</tbody></table></div>';

            // Members section
            let membersHtml = '<div class="role-section"><h4>Group Members</h4><div class="member-list">';
            for (const mid of role.members) {
                const emp = hrByEmployee[mid];
                const label = emp ? `${mid} (${emp['Employee First Name']} ${emp['Employee Last Name']})` : mid;
                membersHtml += `<span class="member-tag">${escHtml(label)}</span>`;
            }
            membersHtml += '</div></div>';

            // Outliers section
            let outliersHtml = '';
            const outlierUsers = Object.keys(role.userOutliers);
            if (outlierUsers.length > 0) {
                outliersHtml = '<div class="role-section outlier-section"><h4>Exception / Individual Entitlements</h4>';
                outliersHtml += '<p style="font-size:0.82rem;color:#92400e;margin-bottom:0.5rem;">These entitlements are unique to individual users and should be reviewed for individual access grants, not included in the role.</p>';
                for (const uid of outlierUsers) {
                    const emp = hrByEmployee[uid];
                    const uname = emp ? `${emp['Employee First Name']} ${emp['Employee Last Name']}` : uid;
                    outliersHtml += `<div class="outlier-item"><strong>${escHtml(uid)} (${escHtml(uname)})</strong>: `;
                    outliersHtml += role.userOutliers[uid].map(e =>
                        `${escHtml(e.application)} / ${escHtml(e.entitlementName)}`
                    ).join(', ');
                    outliersHtml += '</div>';
                }
                outliersHtml += '</div>';
            }

            body.innerHTML = criteriaHtml + entHtml + membersHtml + outliersHtml;

            card.appendChild(header);
            card.appendChild(body);
            roleCardsContainer.appendChild(card);
        }
    }

    function escHtml(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    // ─── Export Functions ─────────────────────────────────────────────
    $('export-csv-btn').addEventListener('click', exportCsv);
    $('export-json-btn').addEventListener('click', exportJson);

    function exportCsv() {
        if (!currentStrategy || !analysisResults[currentStrategy]) return;
        const roles = analysisResults[currentStrategy];

        const csvRows = [
            ['Role Name', 'Strategy', 'Criteria', 'Member Count', 'Avg Commonality %',
             'Entitlement Application', 'Entitlement Name', 'Entitlement ID', 'Access Level',
             'Entitlement Commonality %', 'Members']
        ];

        for (const role of roles) {
            const criteriaStr = Object.entries(role.criteria).map(([k, v]) => `${k}=${v}`).join('; ');
            const membersStr = role.members.join('; ');

            for (const ent of role.sharedEntitlements) {
                csvRows.push([
                    role.roleName,
                    role.strategy,
                    criteriaStr,
                    role.memberCount,
                    Math.round(role.avgCommonality * 100),
                    ent.application,
                    ent.entitlementName,
                    ent.entitlementId,
                    ent.accessLevel,
                    Math.round(ent.commonality * 100),
                    membersStr
                ]);
            }
        }

        const csv = csvRows.map(row => row.map(cell => {
            const s = String(cell);
            return s.includes(',') || s.includes('"') || s.includes('\n')
                ? '"' + s.replace(/"/g, '""') + '"'
                : s;
        }).join(',')).join('\n');

        downloadFile(csv, `rbac_roles_${currentStrategy.replace(/\s+/g, '_')}.csv`, 'text/csv');
    }

    function exportJson() {
        if (!currentStrategy || !analysisResults[currentStrategy]) return;
        const roles = analysisResults[currentStrategy];
        const json = JSON.stringify(roles, null, 2);
        downloadFile(json, `rbac_roles_${currentStrategy.replace(/\s+/g, '_')}.json`, 'application/json');
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ─── Boot ────────────────────────────────────────────────────────
    init();
})();
