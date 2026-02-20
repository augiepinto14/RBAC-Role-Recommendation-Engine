/* ===================================================================
   RBAC Role Mining Tool — Optimization Engine
   Weighted Greedy Set Cover with Multi-Strategy Composition
   =================================================================== */

(function () {
    'use strict';

    // ─── State ───────────────────────────────────────────────────────
    let hrData = [];
    let entitlementData = [];
    let entByEmployee = {};
    let hrByEmployee = {};
    let uploadedUserIds = [];
    let optimizedSolutions = [];
    let selectedOptionIndex = 0;

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

    // ─── Grouping Strategies ─────────────────────────────────────────
    const strategies = [
        // Single-attribute
        { name: 'Business Line', key: u => u.hr['Business Line'], attrCount: 1 },
        { name: 'Job Family', key: u => u.hr['Job Family'], attrCount: 1 },
        { name: 'Cost Center', key: u => u.hr['Cost Center Name'], attrCount: 1 },
        { name: 'Region', key: u => u.hr['Region'], attrCount: 1 },
        // Two-attribute
        { name: 'Business Line + Job Family', key: u => `${u.hr['Business Line']}|${u.hr['Job Family']}`, attrCount: 2 },
        { name: 'Business Line + Job Grade', key: u => `${u.hr['Business Line']}|${u.hr['Job Grade / Band']}`, attrCount: 2 },
        { name: 'Business Line + Region', key: u => `${u.hr['Business Line']}|${u.hr['Region']}`, attrCount: 2 },
        { name: 'Job Family + Job Grade', key: u => `${u.hr['Job Family']}|${u.hr['Job Grade / Band']}`, attrCount: 2 },
        { name: 'SNODE L3 + L4', key: u => `${u.hr['SNODE L3']}|${u.hr['SNODE L4']}`, attrCount: 2 },
        { name: 'Cost Center + Job Family', key: u => `${u.hr['Cost Center Name']}|${u.hr['Job Family']}`, attrCount: 2 },
        // Three-attribute
        { name: 'SNODE L3 + L4 + L5', key: u => `${u.hr['SNODE L3']}|${u.hr['SNODE L4']}|${u.hr['SNODE L5']}`, attrCount: 3 },
        { name: 'Region + Job Family + Job Grade', key: u => `${u.hr['Region']}|${u.hr['Job Family']}|${u.hr['Job Grade / Band']}`, attrCount: 3 },
        { name: 'Business Line + Job Family + Job Grade', key: u => `${u.hr['Business Line']}|${u.hr['Job Family']}|${u.hr['Job Grade / Band']}`, attrCount: 3 },
    ];

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
                entByEmployee[eid].add(`${row['Entitlement ID']}|${row['Application']}|${row['Application ID']}|${row['Application Business Unit']}|${row['Entitlement Name']}`);
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
        const idCol = Object.keys(rows[0] || {}).find(k =>
            k.trim().toLowerCase().replace(/[\s_-]/g, '') === 'employeeid'
        );
        if (!idCol) {
            alert('CSV must contain an "Employee ID" column.');
            return;
        }
        uploadedUserIds = rows.map(r => r[idCol].trim()).filter(Boolean);

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

    // ─── Utilities ───────────────────────────────────────────────────
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

    function escHtml(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
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

    // ═══════════════════════════════════════════════════════════════════
    //  OPTIMIZATION ENGINE
    // ═══════════════════════════════════════════════════════════════════

    analyzeBtn.addEventListener('click', runOptimizedAnalysis);

    async function runOptimizedAnalysis() {
        const threshold = parseInt(thresholdSlider.value) / 100;
        const minGroup = parseInt(minGroupSlider.value);

        progressPanel.hidden = false;
        resultsPanel.hidden = true;
        analyzeBtn.disabled = true;
        progressBar.style.width = '0%';
        progressText.textContent = 'Preparing analysis...';
        await sleep(50);

        // Build user objects
        const users = uploadedUserIds.map(id => ({
            id,
            hr: hrByEmployee[id],
            entitlements: entByEmployee[id] || new Set()
        }));
        const allUserIds = new Set(users.map(u => u.id));

        // ─── PHASE 1: Generate raw candidate pool ────────────────
        // Also build org-wide groupings to measure "overspill" — how many
        // employees from the full HR master file match each criteria but
        // are NOT in the uploaded target list.
        progressText.textContent = 'Phase 1: Building org-wide index...';
        progressBar.style.width = '5%';
        await sleep(30);

        // Build full org user objects (lightweight — just HR + key functions)
        const allOrgUsers = hrData.map(row => ({
            id: row['Employee ID'],
            hr: row
        }));

        // Pre-compute org-wide group counts for every strategy
        const orgGroupCounts = {};  // "strategyName::groupKey" → count of ALL org employees
        for (const strat of strategies) {
            const orgGroups = groupBy(allOrgUsers, strat.key);
            for (const [groupKey, orgMembers] of Object.entries(orgGroups)) {
                orgGroupCounts[`${strat.name}::${groupKey}`] = orgMembers.length;
            }
        }

        progressText.textContent = 'Phase 1: Generating candidate groups...';
        progressBar.style.width = '10%';
        await sleep(30);

        const rawGroupData = [];

        for (let i = 0; i < strategies.length; i++) {
            const strat = strategies[i];
            progressText.textContent = `Phase 1: Analyzing ${strat.name}...`;
            progressBar.style.width = `${10 + (i / strategies.length) * 35}%`;
            await sleep(15);

            const groups = groupBy(users, strat.key);

            for (const [groupKey, members] of Object.entries(groups)) {
                if (members.length < 2) continue;

                // Count entitlement frequency
                const entCounts = {};
                for (const user of members) {
                    for (const ent of user.entitlements) {
                        entCounts[ent] = (entCounts[ent] || 0) + 1;
                    }
                }

                // Build criteria
                const criteriaValues = groupKey.split('|');
                const criteriaLabels = strat.name.split(' + ');
                const criteria = {};
                criteriaLabels.forEach((label, idx) => {
                    criteria[label.trim()] = criteriaValues[idx] ? criteriaValues[idx].trim() : '';
                });

                // Overspill analysis: how many org-wide employees match this criteria?
                const candidateId = `${strat.name}::${groupKey}`;
                const orgTotal = orgGroupCounts[candidateId] || members.length;
                const overspill = orgTotal - members.length;
                // Precision: what % of the org-wide match are actually in our target list
                const precision = members.length / orgTotal;

                rawGroupData.push({
                    id: candidateId,
                    strategyName: strat.name,
                    attrCount: strat.attrCount,
                    groupKey,
                    memberIds: new Set(members.map(m => m.id)),
                    members,
                    memberCount: members.length,
                    criteria,
                    roleName: criteriaValues.map(v => v.trim()).join(' - '),
                    entCounts,
                    orgTotal,
                    overspill,
                    precision
                });
            }
        }

        // ─── PHASE 2+3: Generate 5 variant solutions ─────────────
        progressText.textContent = 'Phase 2: Optimizing role assignments...';
        progressBar.style.width = '50%';
        await sleep(30);

        const variantConfigs = [
            {
                name: 'Recommended (Fewest Roles, Best Precision)',
                description: 'Optimized to assign all users into the fewest possible roles while minimizing overspill — extra org employees pulled into the role who are not in your target list.',
                weights: { coverage: 0.35, commonality: 0.20, richness: 0.10, groupSize: 0.05, precision: 0.30 },
                thresholdAdjust: 0, minGroupAdjust: 0
            },
            {
                name: 'Maximum Precision (Minimal Overspill)',
                description: 'Prioritizes the tightest possible role criteria so that virtually no unintended employees are scoped in. May produce more roles to achieve precision.',
                weights: { coverage: 0.20, commonality: 0.15, richness: 0.05, groupSize: 0.05, precision: 0.55 },
                thresholdAdjust: 0, minGroupAdjust: 0,
                preferGranular: true
            },
            {
                name: 'Maximum Commonality',
                description: 'Prioritizes the highest possible entitlement alignment within each role, with moderate overspill control.',
                weights: { coverage: 0.20, commonality: 0.45, richness: 0.10, groupSize: 0.05, precision: 0.20 },
                thresholdAdjust: 0.05, minGroupAdjust: 0
            },
            {
                name: 'Broad Coverage',
                description: 'Focuses on covering every user with minimal gaps, accepting slightly lower commonality and precision to reduce ungrouped users.',
                weights: { coverage: 0.50, commonality: 0.15, richness: 0.10, groupSize: 0.05, precision: 0.20 },
                thresholdAdjust: -0.05, minGroupAdjust: 0
            },
            {
                name: 'Simple Grouping',
                description: 'Favors broad, single-attribute groupings (e.g., Business Line or Job Family alone) for easier organizational mapping. May have higher overspill.',
                weights: { coverage: 0.35, commonality: 0.20, richness: 0.10, groupSize: 0.15, precision: 0.20 },
                thresholdAdjust: 0, minGroupAdjust: 0,
                preferSimple: true
            }
        ];

        optimizedSolutions = [];

        for (let v = 0; v < variantConfigs.length; v++) {
            const config = variantConfigs[v];
            progressText.textContent = `Phase 2: Computing Option ${v + 1} — ${config.name}...`;
            progressBar.style.width = `${50 + (v / variantConfigs.length) * 40}%`;
            await sleep(25);

            const adjThreshold = Math.max(0.50, Math.min(1.0, threshold + config.thresholdAdjust));
            const adjMinGroup = Math.max(2, minGroup + config.minGroupAdjust);

            // Filter candidates for this variant
            const candidates = filterCandidatesForThreshold(rawGroupData, adjThreshold, adjMinGroup);

            // Apply granularity/simplicity bonuses
            for (const c of candidates) {
                if (config.preferGranular) {
                    c.bonus = c.attrCount * 0.10;
                } else if (config.preferSimple) {
                    c.bonus = (1 / c.attrCount) * 0.15;
                } else {
                    c.bonus = 0;
                }
            }

            const solution = greedySetCover(candidates, allUserIds, config.weights, adjMinGroup);
            solution.optionIndex = v + 1;
            solution.optionName = config.name;
            solution.optionDescription = config.description;
            solution.weights = config.weights;
            solution.compositeScore = scoreSolution(solution);

            optimizedSolutions.push(solution);
        }

        progressBar.style.width = '100%';
        progressText.textContent = 'Analysis complete!';
        await sleep(300);
        progressPanel.hidden = true;
        analyzeBtn.disabled = false;

        renderOptionCards(optimizedSolutions);
    }

    // ─── Filter candidates for a given threshold ─────────────────────
    function filterCandidatesForThreshold(rawGroupData, threshold, minGroup) {
        const candidates = [];
        for (const raw of rawGroupData) {
            if (raw.memberCount < minGroup) continue;

            const sharedEnts = [];
            const outlierEnts = [];

            for (const [ent, count] of Object.entries(raw.entCounts)) {
                const commonality = count / raw.memberCount;
                const parts = ent.split('|');
                const entObj = {
                    entitlementId: parts[0],
                    application: parts[1],
                    applicationId: parts[2],
                    applicationBU: parts[3],
                    entitlementName: parts[4],
                    commonality,
                    userCount: count,
                    totalUsers: raw.memberCount
                };
                if (commonality >= threshold) {
                    sharedEnts.push(entObj);
                } else if (commonality < 0.2) {
                    outlierEnts.push(entObj);
                }
            }

            if (sharedEnts.length === 0) continue;

            const avgCommonality = sharedEnts.reduce((s, e) => s + e.commonality, 0) / sharedEnts.length;

            // Per-user outliers
            const userOutliers = {};
            for (const user of raw.members) {
                const uniqueToUser = [];
                for (const ent of user.entitlements) {
                    if (raw.entCounts[ent] === 1) {
                        const parts = ent.split('|');
                        uniqueToUser.push({
                            entitlementId: parts[0],
                            application: parts[1],
                            applicationId: parts[2],
                            applicationBU: parts[3],
                            entitlementName: parts[4]
                        });
                    }
                }
                if (uniqueToUser.length > 0) userOutliers[user.id] = uniqueToUser;
            }

            candidates.push({
                id: raw.id,
                strategyName: raw.strategyName,
                attrCount: raw.attrCount,
                groupKey: raw.groupKey,
                memberIds: new Set(raw.memberIds),
                members: raw.members,
                memberCount: raw.memberCount,
                criteria: raw.criteria,
                roleName: raw.roleName,
                sharedEntitlements: sharedEnts.sort((a, b) => b.commonality - a.commonality),
                outlierEntitlements: outlierEnts.sort((a, b) => a.commonality - b.commonality),
                userOutliers,
                avgCommonality,
                orgTotal: raw.orgTotal,
                overspill: raw.overspill,
                precision: raw.precision,
                bonus: 0
            });
        }
        return candidates;
    }

    // ─── Greedy Set Cover ────────────────────────────────────────────
    function greedySetCover(candidates, allUserIds, weights, minGroup) {
        const uncovered = new Set(allUserIds);
        const solution = [];
        const usedCandidateIds = new Set();

        while (uncovered.size > 0) {
            let bestCandidate = null;
            let bestScore = -Infinity;

            for (const candidate of candidates) {
                if (usedCandidateIds.has(candidate.id)) continue;

                // Count newly covered users
                let newlyCoveredCount = 0;
                for (const mid of candidate.memberIds) {
                    if (uncovered.has(mid)) newlyCoveredCount++;
                }

                if (newlyCoveredCount < Math.min(minGroup, uncovered.size)) continue;

                const score =
                    weights.coverage * (newlyCoveredCount / uncovered.size) +
                    weights.commonality * candidate.avgCommonality +
                    weights.richness * Math.min(candidate.sharedEntitlements.length / 50, 1) +
                    weights.groupSize * Math.min(candidate.memberCount / allUserIds.size, 1) +
                    (weights.precision || 0) * (candidate.precision || 0) +
                    (candidate.bonus || 0);

                if (score > bestScore) {
                    bestScore = score;
                    bestCandidate = candidate;
                }
            }

            if (!bestCandidate) break;

            usedCandidateIds.add(bestCandidate.id);

            // Remove covered users from uncovered set
            for (const mid of bestCandidate.memberIds) {
                uncovered.delete(mid);
            }

            solution.push(bestCandidate);
        }

        const ungroupedUsers = Array.from(uncovered);
        const totalCovered = allUserIds.size - uncovered.size;

        const avgPrecision = solution.length > 0
            ? solution.reduce((s, r) => s + (r.precision || 0), 0) / solution.length
            : 0;
        const totalOverspill = solution.reduce((s, r) => s + (r.overspill || 0), 0);

        return {
            roles: solution,
            ungroupedUsers,
            totalRoles: solution.length,
            totalUsersCovered: totalCovered,
            totalUsers: allUserIds.size,
            coveragePercent: allUserIds.size > 0 ? totalCovered / allUserIds.size : 0,
            avgCommonality: solution.length > 0
                ? solution.reduce((s, r) => s + r.avgCommonality, 0) / solution.length
                : 0,
            avgPrecision,
            totalOverspill,
            totalSharedEntitlements: solution.reduce((s, r) => s + r.sharedEntitlements.length, 0),
            strategiesUsed: [...new Set(solution.map(r => r.strategyName))]
        };
    }

    // ─── Solution Scoring ────────────────────────────────────────────
    function scoreSolution(solution) {
        const normalizedRoleCount = solution.totalUsers > 0 ? solution.totalRoles / solution.totalUsers : 1;
        return (
            solution.coveragePercent * 30 +
            (1 - Math.min(normalizedRoleCount, 1)) * 25 +
            solution.avgCommonality * 15 +
            (solution.avgPrecision || 0) * 20 +
            Math.min(solution.totalSharedEntitlements / (Math.max(solution.totalRoles, 1) * 40), 1) * 10
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    //  RENDERING
    // ═══════════════════════════════════════════════════════════════════

    function renderOptionCards(solutions) {
        resultsPanel.hidden = false;
        const detailPanel = $('option-detail-panel');
        detailPanel.hidden = true;

        $('results-subtitle').textContent =
            `5 options generated for ${uploadedUserIds.length} users \u2022 ` +
            `${thresholdSlider.value}% commonality threshold \u2022 ` +
            `min group size ${minGroupSlider.value}`;

        const grid = $('options-grid');
        grid.innerHTML = '';
        grid.style.display = 'grid';

        solutions.forEach((sol, idx) => {
            const card = document.createElement('div');
            card.className = 'option-card' + (idx === 0 ? ' recommended' : '');

            const badgeHtml = idx === 0
                ? '<span class="option-badge recommended">Recommended</span>'
                : '';

            const stratChips = sol.strategiesUsed
                .map(s => `<span class="strategy-chip">${escHtml(s)}</span>`)
                .join('');

            const avgEntPerRole = sol.totalRoles > 0
                ? Math.round(sol.totalSharedEntitlements / sol.totalRoles)
                : 0;

            card.innerHTML = `
                <div class="option-card-header">
                    <div class="option-title-row">
                        <span class="option-number">Option ${sol.optionIndex}</span>
                        ${badgeHtml}
                    </div>
                    <h3 class="option-name">${escHtml(sol.optionName)}</h3>
                    <p class="option-description">${escHtml(sol.optionDescription)}</p>
                </div>
                <div class="option-stats-row">
                    <div class="option-stat">
                        <span class="option-stat-value">${sol.totalRoles}</span>
                        <span class="option-stat-label">Roles</span>
                    </div>
                    <div class="option-stat">
                        <span class="option-stat-value">${sol.totalUsersCovered}/${sol.totalUsers}</span>
                        <span class="option-stat-label">Users Covered</span>
                    </div>
                    <div class="option-stat">
                        <span class="option-stat-value">${Math.round(sol.avgCommonality * 100)}%</span>
                        <span class="option-stat-label">Avg Commonality</span>
                    </div>
                    <div class="option-stat ${sol.totalOverspill === 0 ? 'precision-perfect' : sol.avgPrecision >= 0.8 ? 'precision-good' : 'precision-warn'}">
                        <span class="option-stat-value">${sol.totalOverspill}</span>
                        <span class="option-stat-label">Overspill Users</span>
                    </div>
                    <div class="option-stat">
                        <span class="option-stat-value">${Math.round((sol.avgPrecision || 0) * 100)}%</span>
                        <span class="option-stat-label">Avg Precision</span>
                    </div>
                </div>
                <div class="option-strategies-preview">${stratChips}</div>
                <div class="option-actions">
                    <button class="btn btn-primary btn-sm option-expand-btn">View Roles</button>
                    <button class="btn btn-secondary btn-sm option-csv-btn">Export CSV</button>
                    <button class="btn btn-secondary btn-sm option-json-btn">Export JSON</button>
                </div>
            `;

            card.querySelector('.option-expand-btn').addEventListener('click', () => expandOption(idx));
            card.querySelector('.option-csv-btn').addEventListener('click', () => exportOptionCsv(idx));
            card.querySelector('.option-json-btn').addEventListener('click', () => exportOptionJson(idx));

            grid.appendChild(card);
        });
    }

    // ─── Expand option detail ────────────────────────────────────────
    function expandOption(idx) {
        selectedOptionIndex = idx;
        const sol = optimizedSolutions[idx];

        // Hide grid, show detail
        $('options-grid').style.display = 'none';
        const detailPanel = $('option-detail-panel');
        detailPanel.hidden = false;

        // Back button
        $('back-to-options-btn').onclick = () => {
            detailPanel.hidden = true;
            $('options-grid').style.display = 'grid';
        };

        // Title + stats
        $('detail-option-name').textContent = `Option ${sol.optionIndex}: ${sol.optionName}`;
        const avgEntPerRole = sol.totalRoles > 0
            ? Math.round(sol.totalSharedEntitlements / sol.totalRoles)
            : 0;
        const precisionClass = sol.totalOverspill === 0 ? 'precision-perfect' : sol.avgPrecision >= 0.8 ? 'precision-good' : 'precision-warn';
        $('detail-stats').innerHTML = `
            <span class="option-detail-stat"><strong>${sol.totalRoles}</strong> roles</span>
            <span class="option-detail-stat"><strong>${sol.totalUsersCovered}/${sol.totalUsers}</strong> users covered</span>
            <span class="option-detail-stat"><strong>${Math.round(sol.avgCommonality * 100)}%</strong> avg commonality</span>
            <span class="option-detail-stat ${precisionClass}"><strong>${Math.round((sol.avgPrecision || 0) * 100)}%</strong> avg precision</span>
            <span class="option-detail-stat ${precisionClass}"><strong>${sol.totalOverspill}</strong> overspill users</span>
            <span class="option-detail-stat"><strong>${sol.totalSharedEntitlements}</strong> total entitlements</span>
            <span class="option-detail-stat"><strong>${sol.strategiesUsed.length}</strong> strategies used</span>
        `;

        // Export buttons in detail view
        $('detail-csv-btn').onclick = () => exportOptionCsv(idx);
        $('detail-json-btn').onclick = () => exportOptionJson(idx);

        // Ungrouped users
        const ungroupedWarn = $('ungrouped-warning');
        if (sol.ungroupedUsers.length > 0) {
            ungroupedWarn.hidden = false;
            $('ungrouped-count').textContent = `${sol.ungroupedUsers.length} user${sol.ungroupedUsers.length > 1 ? 's' : ''}`;
            const ungroupedList = $('ungrouped-list');
            ungroupedList.hidden = true;
            ungroupedList.innerHTML = sol.ungroupedUsers.map(uid => {
                const emp = hrByEmployee[uid];
                const label = emp ? `${uid} (${emp['Employee First Name']} ${emp['Employee Last Name']})` : uid;
                return `<span class="member-tag">${escHtml(label)}</span>`;
            }).join('');
            $('show-ungrouped-btn').onclick = () => {
                ungroupedList.hidden = !ungroupedList.hidden;
            };
        } else {
            ungroupedWarn.hidden = true;
        }

        // Render role cards
        const container = $('option-role-cards');
        container.innerHTML = '';

        for (const role of sol.roles) {
            container.appendChild(buildRoleCard(role));
        }
    }

    // ─── Build a single role card ────────────────────────────────────
    function buildRoleCard(role) {
        const card = document.createElement('div');
        card.className = 'role-card';

        // Header — now includes strategy badge
        const header = document.createElement('div');
        header.className = 'role-card-header';
        const overspillBadgeClass = role.overspill === 0 ? 'precision-perfect' : role.precision >= 0.8 ? 'precision-good' : 'precision-warn';
        const overspillLabel = role.overspill === 0
            ? 'No overspill'
            : `+${role.overspill} overspill`;
        header.innerHTML = `
            <span class="role-name">${escHtml(role.roleName)}</span>
            <div class="role-meta">
                <span class="role-strategy-label">${escHtml(role.strategyName)}</span>
                <span class="role-badge users">${role.memberCount} target users</span>
                <span class="role-badge ${overspillBadgeClass}">${overspillLabel} (${role.orgTotal} org total)</span>
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

        // Overspill / precision section
        let overspillHtml = '<div class="role-section"><h4>Scope Analysis (Overspill)</h4>';
        overspillHtml += '<div class="overspill-detail">';
        overspillHtml += `<div class="overspill-row"><span class="overspill-label">Target users in role:</span><span class="overspill-val">${role.memberCount}</span></div>`;
        overspillHtml += `<div class="overspill-row"><span class="overspill-label">Total org employees matching criteria:</span><span class="overspill-val">${role.orgTotal}</span></div>`;
        overspillHtml += `<div class="overspill-row"><span class="overspill-label">Overspill (extra employees auto-added):</span><span class="overspill-val ${role.overspill === 0 ? 'precision-perfect' : role.overspill <= 5 ? 'precision-good' : 'precision-warn'}">${role.overspill}</span></div>`;
        overspillHtml += `<div class="overspill-row"><span class="overspill-label">Precision:</span><span class="overspill-val ${role.precision === 1 ? 'precision-perfect' : role.precision >= 0.8 ? 'precision-good' : 'precision-warn'}">${Math.round(role.precision * 100)}%</span></div>`;
        if (role.overspill > 0) {
            overspillHtml += `<p class="overspill-note">⚠ ${role.overspill} additional employee${role.overspill > 1 ? 's' : ''} in the organization match${role.overspill === 1 ? 'es' : ''} this role's HR criteria and would be automatically assigned to this role under RBAC.</p>`;
        } else {
            overspillHtml += `<p class="overspill-note overspill-perfect">✓ This role's criteria perfectly scope only the target users — no unintended employees would be added.</p>`;
        }
        overspillHtml += '</div></div>';

        // Shared entitlements table
        let entHtml = '<div class="role-section"><h4>Recommended Role Entitlements</h4>';
        entHtml += '<table class="ent-table"><thead><tr><th>App Business Unit</th><th>Application</th><th>Entitlement</th><th>Entitlement ID</th><th>Commonality</th></tr></thead><tbody>';
        for (const ent of role.sharedEntitlements) {
            const pct = Math.round(ent.commonality * 100);
            const barW = pct * 0.6;
            entHtml += `<tr>
                <td>${escHtml(ent.applicationBU || '')}</td>
                <td>${escHtml(ent.application)}</td>
                <td>${escHtml(ent.entitlementName)}</td>
                <td><code>${escHtml(ent.entitlementId)}</code></td>
                <td><span class="commonality-bar" style="width:${barW}px"></span>${pct}% (${ent.userCount}/${ent.totalUsers})</td>
            </tr>`;
        }
        entHtml += '</tbody></table></div>';

        // Members section
        let membersHtml = '<div class="role-section"><h4>Group Members</h4><div class="member-list">';
        const memberIds = Array.from(role.memberIds);
        for (const mid of memberIds) {
            const emp = hrByEmployee[mid];
            const label = emp ? `${mid} (${emp['Employee First Name']} ${emp['Employee Last Name']})` : mid;
            membersHtml += `<span class="member-tag">${escHtml(label)}</span>`;
        }
        membersHtml += '</div></div>';

        // Outliers section
        let outliersHtml = '';
        const outlierUsers = Object.keys(role.userOutliers || {});
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

        body.innerHTML = criteriaHtml + overspillHtml + entHtml + membersHtml + outliersHtml;

        card.appendChild(header);
        card.appendChild(body);
        return card;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  EXPORT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function exportOptionCsv(optionIdx) {
        const sol = optimizedSolutions[optionIdx];
        if (!sol) return;

        const csvRows = [
            ['Option', 'Option Name', 'Role Name', 'Strategy', 'Criteria',
             'Member Count', 'Org Total Match', 'Overspill', 'Precision %',
             'Avg Commonality %',
             'App Business Unit', 'Application', 'Application ID',
             'Entitlement Name', 'Entitlement ID',
             'Entitlement Commonality %', 'Members']
        ];

        for (const role of sol.roles) {
            const criteriaStr = Object.entries(role.criteria)
                .map(([k, v]) => `${k}=${v}`).join('; ');
            const membersStr = Array.from(role.memberIds).join('; ');

            for (const ent of role.sharedEntitlements) {
                csvRows.push([
                    sol.optionIndex,
                    sol.optionName,
                    role.roleName,
                    role.strategyName,
                    criteriaStr,
                    role.memberCount,
                    role.orgTotal || role.memberCount,
                    role.overspill || 0,
                    Math.round((role.precision || 1) * 100),
                    Math.round(role.avgCommonality * 100),
                    ent.applicationBU || '',
                    ent.application,
                    ent.applicationId || '',
                    ent.entitlementName,
                    ent.entitlementId,
                    Math.round(ent.commonality * 100),
                    membersStr
                ]);
            }
        }

        // Ungrouped users row
        if (sol.ungroupedUsers.length > 0) {
            csvRows.push([
                sol.optionIndex, sol.optionName,
                'UNGROUPED', 'N/A', 'N/A',
                sol.ungroupedUsers.length, 'N/A', 'N/A', 'N/A',
                'N/A',
                'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A',
                sol.ungroupedUsers.join('; ')
            ]);
        }

        const csv = csvRows.map(row => row.map(cell => {
            const s = String(cell);
            return s.includes(',') || s.includes('"') || s.includes('\n')
                ? '"' + s.replace(/"/g, '""') + '"'
                : s;
        }).join(',')).join('\n');

        const safeName = sol.optionName.replace(/[^a-zA-Z0-9]/g, '_');
        downloadFile(csv, `rbac_option${sol.optionIndex}_${safeName}.csv`, 'text/csv');
    }

    function exportOptionJson(optionIdx) {
        const sol = optimizedSolutions[optionIdx];
        if (!sol) return;

        const exportData = {
            option: sol.optionIndex,
            name: sol.optionName,
            description: sol.optionDescription,
            summary: {
                totalRoles: sol.totalRoles,
                totalUsersCovered: sol.totalUsersCovered,
                totalUsers: sol.totalUsers,
                coveragePercent: Math.round(sol.coveragePercent * 100),
                avgCommonality: Math.round(sol.avgCommonality * 100),
                avgPrecision: Math.round((sol.avgPrecision || 0) * 100),
                totalOverspill: sol.totalOverspill || 0,
                strategiesUsed: sol.strategiesUsed
            },
            roles: sol.roles.map(role => ({
                roleName: role.roleName,
                strategy: role.strategyName,
                criteria: role.criteria,
                memberCount: role.memberCount,
                orgTotalMatch: role.orgTotal || role.memberCount,
                overspill: role.overspill || 0,
                precision: Math.round((role.precision || 1) * 100),
                members: Array.from(role.memberIds),
                avgCommonality: Math.round(role.avgCommonality * 100),
                sharedEntitlements: role.sharedEntitlements,
                outlierEntitlements: role.outlierEntitlements,
                userOutliers: role.userOutliers
            })),
            ungroupedUsers: sol.ungroupedUsers
        };

        const json = JSON.stringify(exportData, null, 2);
        const safeName = sol.optionName.replace(/[^a-zA-Z0-9]/g, '_');
        downloadFile(json, `rbac_option${sol.optionIndex}_${safeName}.json`, 'application/json');
    }

    // ─── Boot ────────────────────────────────────────────────────────
    init();
})();
