// iACT Klinisk Portal - Kjerneapplikasjon
(function() {
  'use strict';

  // =========================================================================
  // 1. TILSTANDSHÅNDTERING & LAGRING
  // =========================================================================
  const STORAGE_KEY = 'iact_clinical_portal_no_v2';
  
  function getDefaultState() {
    return {
      patientId: '',
      assessments: {
        phq9: [],
        gad7: [],
        madrs: [],
        aaq2: []
      },
      creativeHopelessness: [],
      valuesCompass: {
        selectedValues: ['Relasjoner', 'Vekst', 'Vitalitet'],
        intentionStatement: ''
      },
      turningTheMind: [],
      integrationJournal: [],
      selfAsContextLogs: [],
      committedGoals: [
        { id: 1, text: 'Gå en 20-minutters oppmerksom tur i naturen uten skjermer', value: 'Vitalitet', frequency: 'Daglig', done: false },
        { id: 2, text: 'Ha en rolig og uforstyrret samtale med en nær person', value: 'Relasjoner', frequency: '3 ganger i uken', done: false }
      ],
      dbtDiaryCards: [],
      relapsePlan: {
        warningSigns: '',
        actionPlan: '',
        contacts: ''
      }
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? Object.assign(getDefaultState(), JSON.parse(data)) : getDefaultState();
    } catch (e) {
      console.warn('Kunne ikke laste tilstand:', e);
      return getDefaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Kunne ikke lagre tilstand:', e);
    }
  }

  // Varsling (Toast)
  function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + (type ? type : '');
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // =========================================================================
  // 2. NAVIGASJON & FANER
  // =========================================================================
  const navTabs = document.getElementById('navTabs');
  if (navTabs) {
    navTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-tab');
      if (!btn) return;

      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');

      // Oppdater faseindikator i topptekst
      const phasePrep = document.getElementById('phaseIndicatorPrep');
      const phaseInteg = document.getElementById('phaseIndicatorInteg');
      if (targetId === 'tab-intake' || targetId === 'tab-act-prep') {
        if (phasePrep) phasePrep.classList.add('active');
        if (phaseInteg) phaseInteg.classList.remove('active');
      } else {
        if (phasePrep) phasePrep.classList.remove('active');
        if (phaseInteg) phaseInteg.classList.add('active');
      }
    });
  }

  // Skalaverdi-oppdatering
  function bindRangeDisplay(sliderId, displayId, suffix = ' / 10') {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    if (slider && display) {
      slider.addEventListener('input', (e) => {
        display.textContent = e.target.value + suffix;
      });
    }
  }

  bindRangeDisplay('shortTermEffect', 'shortTermEffectVal');
  bindRangeDisplay('longTermCost', 'longTermCostVal');
  bindRangeDisplay('dbtMood', 'dbtMoodVal');
  bindRangeDisplay('dbtUrge', 'dbtUrgeVal');
  bindRangeDisplay('dbtAlignment', 'dbtAlignmentVal');

  // =========================================================================
  // 3. MODUL 1: INNTAK & PSYKOMETRISK BATTERI (PHQ-9, GAD-7, MADRS-S)
  // =========================================================================
  const SCALES = {
    phq9: {
      name: 'PHQ-9 (Pasienthelsespørreskjema for depresjon)',
      maxScore: 27,
      options: ['0 - Ikke i det hele tatt', '1 - Flere dager', '2 - Mer enn halve tiden', '3 - Nesten hver dag'],
      items: [
        '1. Liten interesse for eller glede ved å gjøre ting.',
        '2. Følt deg nedfor, deprimert eller håpløs.',
        '3. Vansker med å sovne eller sove urolig, eller sovet for mye.',
        '4. Følt deg trett eller hatt lite energi.',
        '5. Dårlig appetitt eller overspising.',
        '6. Følt deg dårlig med deg selv – at du er mislykket eller har skuffet deg selv eller familien din.',
        '7. Vansker med å konsentrere deg om ting, som å lese eller se på TV.',
        '8. Beveget deg eller snakket så langsomt at andre har lagt merke til det, eller vært så urolig at du har vandret omkring.',
        '9. Tanker om at det ville være bedre om du var død, eller om å skade deg selv.'
      ],
      evaluate: function(score) {
        if (score <= 4) return { tag: 'Minimal / Ingen', cls: 'flex-high', note: 'Minimal eller ingen depresjonssymptomer.' };
        if (score <= 9) return { tag: 'Mild', cls: 'flex-moderate', note: 'Milde depressive symptomer.' };
        if (score <= 14) return { tag: 'Moderat', cls: 'flex-moderate', note: 'Moderat depresjonsnivå.' };
        if (score <= 19) return { tag: 'Moderat alvorlig', cls: 'flex-low', note: 'Moderat alvorlig depresjonsbilde.' };
        return { tag: 'Alvorlig', cls: 'flex-low', note: 'Alvorlig depresjonsnivå.' };
      }
    },
    gad7: {
      name: 'GAD-7 (Kartlegging av generalisert angst)',
      maxScore: 21,
      options: ['0 - Ikke i det hele tatt', '1 - Flere dager', '2 - Mer enn halve tiden', '3 - Nesten hver dag'],
      items: [
        '1. Følt deg nervøs, engstelig eller på tuppa.',
        '2. Ikke klart å slutte å bekymre deg eller kontrollere bekymringene.',
        '3. Bekymret deg for mye om ulike ting.',
        '4. Hatt vansker med å slappe av.',
        '5. Vært så rastløs at det har vært vanskelig å sitte stille.',
        '6. Blitt lett irritert eller ergerlig.',
        '7. Følt deg redd som om noe forferdelig kan skje.'
      ],
      evaluate: function(score) {
        if (score <= 4) return { tag: 'Minimal', cls: 'flex-high', note: 'Minimalt angstnivå.' };
        if (score <= 9) return { tag: 'Mild', cls: 'flex-moderate', note: 'Mildt angstbilde.' };
        if (score <= 14) return { tag: 'Moderat', cls: 'flex-moderate', note: 'Moderat klinisk angst.' };
        return { tag: 'Alvorlig', cls: 'flex-low', note: 'Alvorlig angstnivå.' };
      }
    },
    madrs: {
      name: 'MADRS-S (Montgomery-Åsberg Depresjonsskala)',
      maxScore: 54,
      options: ['0 - Normal / Ingen', '2 - Mild', '4 - Moderat', '6 - Alvorlig'],
      items: [
        '1. Opplevd tristhet og nedstemthet.',
        '2. Følelse av indre ubehag eller håpløshet.',
        '3. Indre spenning og uro.',
        '4. Redusert nattesøvn eller søvnforstyrrelser.',
        '5. Redusert appetitt.',
        '6. Konsentrasjonsvansker i hverdagen.',
        '7. Initiativløshet og treghet med å starte gjøremål.',
        '8. Følelsesmessig nummenhet / vansker med å kjenne glede.',
        '9. Dystre tanker og livslede.'
      ],
      evaluate: function(score) {
        if (score <= 12) return { tag: 'Normal / Frisk', cls: 'flex-high', note: 'Normalt eller remisjonstilstand.' };
        if (score <= 19) return { tag: 'Mild depresjon', cls: 'flex-moderate', note: 'Milde depressive plager.' };
        if (score <= 34) return { tag: 'Moderat depresjon', cls: 'flex-low', note: 'Moderat klinisk depresjon.' };
        return { tag: 'Alvorlig depresjon', cls: 'flex-low', note: 'Alvorlig klinisk depresjon.' };
      }
    }
  };

  let currentScaleKey = 'phq9';

  function renderCurrentScale() {
    const scale = SCALES[currentScaleKey];
    const container = document.getElementById('scaleContainer');
    if (!container || !scale) return;

    container.innerHTML = scale.items.map((q, i) => `
      <div class="scale-item" data-qindex="${i}">
        <div class="scale-q-text">${escHtml(q)}</div>
        <div class="scale-options">
          ${scale.options.map((opt, optIndex) => {
            const val = currentScaleKey === 'madrs' ? optIndex * 2 : optIndex;
            return `<button type="button" class="scale-opt-btn" data-qindex="${i}" data-val="${val}">${escHtml(opt)}</button>`;
          }).join('')}
        </div>
      </div>
    `).join('');

    const banner = document.getElementById('scaleResultBanner');
    if (banner) banner.style.display = 'none';
  }

  // Håndter klikk på skala-alternativ
  const scaleContainer = document.getElementById('scaleContainer');
  if (scaleContainer) {
    scaleContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.scale-opt-btn');
      if (!btn) return;
      const qIndex = btn.dataset.qindex;
      scaleContainer.querySelectorAll(`.scale-opt-btn[data-qindex="${qIndex}"]`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  }

  // Bytte av kartleggingsskjema
  const batterySelector = document.querySelector('.battery-selector');
  if (batterySelector) {
    batterySelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn || !btn.dataset.scale) return;
      batterySelector.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScaleKey = btn.dataset.scale;
      renderCurrentScale();
    });
  }

  // Lagre og beregne skår
  const btnSubmitScale = document.getElementById('btnSubmitScale');
  if (btnSubmitScale) {
    btnSubmitScale.addEventListener('click', () => {
      const scale = SCALES[currentScaleKey];
      const items = document.querySelectorAll('.scale-item');
      const answers = [];

      for (let i = 0; i < items.length; i++) {
        const sel = items[i].querySelector('.scale-opt-btn.selected');
        if (!sel) {
          showToast(`Vennligst besvar alle ${items.length} spørsmålene.`, 'error');
          return;
        }
        answers.push(parseInt(sel.dataset.val, 10));
      }

      const totalScore = answers.reduce((a, b) => a + b, 0);
      const evalResult = scale.evaluate(totalScore);

      state.assessments[currentScaleKey].push({
        timestamp: new Date().toISOString(),
        score: totalScore,
        maxScore: scale.maxScore,
        answers: answers,
        severity: evalResult.tag
      });
      saveState();

      // Oppdater resultatbanner
      const banner = document.getElementById('scaleResultBanner');
      const scoreNum = document.getElementById('scaleScoreNum');
      const scoreMax = document.getElementById('scaleScoreMax');
      const tag = document.getElementById('scaleSeverityTag');
      const expl = document.getElementById('scaleExplanation');

      if (banner && scoreNum && tag && expl) {
        scoreNum.textContent = totalScore;
        scoreMax.textContent = `/ ${scale.maxScore}`;
        tag.textContent = evalResult.tag;
        tag.className = 'result-severity-tag';
        expl.textContent = evalResult.note;
        banner.style.display = 'flex';
      }

      updateMetricsSummary();
      showToast(`${scale.name} er registrert!`, 'success');
    });
  }

  const btnResetScale = document.getElementById('btnResetScale');
  if (btnResetScale) {
    btnResetScale.addEventListener('click', () => {
      renderCurrentScale();
    });
  }

  // =========================================================================
  // 4. MODUL 3: KREATIV HÅPLØSHET & VERDIKOMPASS
  // =========================================================================
  const btnAddStrategy = document.getElementById('btnAddStrategy');
  if (btnAddStrategy) {
    btnAddStrategy.addEventListener('click', () => {
      const input = document.getElementById('strategyInput');
      const shortTerm = document.getElementById('shortTermEffect');
      const longTerm = document.getElementById('longTermCost');

      const strategyText = input ? input.value.trim() : '';
      if (!strategyText) {
        showToast('Vennligst beskriv en unngåelses- eller kontrollstrategi.', 'error');
        return;
      }

      state.creativeHopelessness.push({
        timestamp: new Date().toISOString(),
        strategy: strategyText,
        shortTerm: parseInt(shortTerm.value, 10),
        longTerm: parseInt(longTerm.value, 10)
      });
      saveState();
      renderAuditList();
      input.value = '';
      showToast('Strategi lagt til i kartleggingen.', 'success');
    });
  }

  function renderAuditList() {
    const list = document.getElementById('auditList');
    if (!list) return;
    if (state.creativeHopelessness.length === 0) {
      list.innerHTML = `<p style="font-size:0.83rem; color:var(--text-muted); font-style:italic;">Ingen strategier registrert ennå. Legg til over.</p>`;
      return;
    }

    list.innerHTML = state.creativeHopelessness.slice().reverse().map(item => `
      <div class="audit-item">
        <div class="audit-info">"${escHtml(item.strategy)}"</div>
        <div class="audit-metrics">
          <span class="badge-cost">Kostnad: ${item.longTerm}/10</span>
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600; padding:0.15rem 0.5rem;">Lindring: ${item.shortTerm}/10</span>
        </div>
      </div>
    `).join('');
  }

  // Kjerneverdier for verdikompass
  const CORE_VALUES = [
    'Relasjoner', 'Vekst', 'Vitalitet', 'Mening',
    'Medfølelse', 'Mot', 'Nærvær', 'Kreativitet',
    'Ektehet', 'Familie', 'Fellesskap', 'Åndelighet'
  ];

  function renderValuesChips() {
    const container = document.getElementById('valuesChipGrid');
    if (!container) return;
    container.innerHTML = CORE_VALUES.map(val => {
      const isSel = state.valuesCompass.selectedValues.includes(val);
      return `<button type="button" class="value-chip ${isSel ? 'selected' : ''}" data-value="${val}">${escHtml(val)}</button>`;
    }).join('');

    const textarea = document.getElementById('valuesIntentionText');
    if (textarea && state.valuesCompass.intentionStatement) {
      textarea.value = state.valuesCompass.intentionStatement;
    }
  }

  const valuesChipGrid = document.getElementById('valuesChipGrid');
  if (valuesChipGrid) {
    valuesChipGrid.addEventListener('click', (e) => {
      const chip = e.target.closest('.value-chip');
      if (!chip) return;
      const val = chip.dataset.value;
      if (state.valuesCompass.selectedValues.includes(val)) {
        state.valuesCompass.selectedValues = state.valuesCompass.selectedValues.filter(v => v !== val);
        chip.classList.remove('selected');
      } else {
        state.valuesCompass.selectedValues.push(val);
        chip.classList.add('selected');
      }
    });
  }

  const btnSaveValuesCompass = document.getElementById('btnSaveValuesCompass');
  if (btnSaveValuesCompass) {
    btnSaveValuesCompass.addEventListener('click', () => {
      const textarea = document.getElementById('valuesIntentionText');
      if (textarea) state.valuesCompass.intentionStatement = textarea.value.trim();
      saveState();
      showToast('Verdier og intensjon er forankret.', 'success');
    });
  }

  // =========================================================================
  // 5. MODUL 4: SOMATISK PUSTING & Å SNU SINNET
  // =========================================================================
  let breathInterval = null;
  let breathRunning = false;
  let breathPhase = 0; // 0: Pust inn, 1: Hold, 2: Pust ut, 3: Hold

  const btnStartBreath = document.getElementById('btnStartBreath');
  const btnStopBreath = document.getElementById('btnStopBreath');
  const breathCircle = document.getElementById('breathCircle');
  const breathInstruction = document.getElementById('breathInstruction');

  function startBreathwork() {
    if (breathRunning) return;
    breathRunning = true;
    if (btnStartBreath) btnStartBreath.disabled = true;
    if (btnStopBreath) btnStopBreath.disabled = false;

    runBreathCycle();
    breathInterval = setInterval(runBreathCycle, 4000);
  }

  function stopBreathwork() {
    breathRunning = false;
    clearInterval(breathInterval);
    if (btnStartBreath) btnStartBreath.disabled = false;
    if (btnStopBreath) btnStopBreath.disabled = true;
    if (breathCircle) breathCircle.className = 'breath-circle';
    if (breathInstruction) breathInstruction.textContent = 'Øvelse fullført';
  }

  function runBreathCycle() {
    if (!breathRunning) return;
    const phases = [
      { text: 'Pust inn (4s)', class: 'breath-circle inhale' },
      { text: 'Hold pusten (4s)', class: 'breath-circle hold' },
      { text: 'Pust rolig ut (4s)', class: 'breath-circle exhale' },
      { text: 'Hold pusten (4s)', class: 'breath-circle hold' }
    ];

    const current = phases[breathPhase % 4];
    if (breathInstruction) breathInstruction.textContent = current.text;
    if (breathCircle) breathCircle.className = current.class;
    breathPhase++;
  }

  if (btnStartBreath) btnStartBreath.addEventListener('click', startBreathwork);
  if (btnStopBreath) btnStopBreath.addEventListener('click', stopBreathwork);

  const btnSaveTurningMind = document.getElementById('btnSaveTurningMind');
  if (btnSaveTurningMind) {
    btnSaveTurningMind.addEventListener('click', () => {
      const input = document.getElementById('turningRealityInput');
      const val = input ? input.value.trim() : '';
      if (!val) {
        showToast('Vennligst beskriv virkeligheten du vender deg mot.', 'error');
        return;
      }
      state.turningTheMind.push({
        timestamp: new Date().toISOString(),
        reality: val
      });
      saveState();
      if (input) input.value = '';
      showToast('Villighetsforpliktelse registrert.', 'success');
    });
  }

  // =========================================================================
  // 6. MODUL 5: INTEGRERINGSJOURNAL
  // =========================================================================
  const btnSaveJournal = document.getElementById('btnSaveJournal');
  if (btnSaveJournal) {
    btnSaveJournal.addEventListener('click', () => {
      const themes = document.getElementById('journalThemes');
      const insights = document.getElementById('journalInsights');
      const nextSteps = document.getElementById('journalNextSteps');

      const entry = {
        timestamp: new Date().toISOString(),
        themes: themes ? themes.value.trim() : '',
        insights: insights ? insights.value.trim() : '',
        nextSteps: nextSteps ? nextSteps.value.trim() : ''
      };

      if (!entry.themes && !entry.insights) {
        showToast('Vennligst fyll inn noen refleksjoner eller opplevelser før du lagrer.', 'error');
        return;
      }

      state.integrationJournal.push(entry);
      saveState();
      renderJournalHistory();
      if (themes) themes.value = '';
      if (insights) insights.value = '';
      if (nextSteps) nextSteps.value = '';
      showToast('Journalnotat er lagret.', 'success');
    });
  }

  const btnClearJournal = document.getElementById('btnClearJournal');
  if (btnClearJournal) {
    btnClearJournal.addEventListener('click', () => {
      const themes = document.getElementById('journalThemes');
      const insights = document.getElementById('journalInsights');
      const nextSteps = document.getElementById('journalNextSteps');
      if (themes) themes.value = '';
      if (insights) insights.value = '';
      if (nextSteps) nextSteps.value = '';
    });
  }

  function renderJournalHistory() {
    const list = document.getElementById('journalHistoryList');
    if (!list) return;
    if (state.integrationJournal.length === 0) {
      list.innerHTML = `<p style="font-size:0.83rem; color:var(--text-muted); font-style:italic;">Ingen journalnotater registrert ennå.</p>`;
      return;
    }

    list.innerHTML = state.integrationJournal.slice().reverse().map(j => `
      <div class="journal-item">
        <div class="journal-date">📅 ${new Date(j.timestamp).toLocaleString('nb-NO')}</div>
        ${j.themes ? `<div class="journal-body" style="margin-bottom:0.4rem;"><strong>Temaer & fornemmelser:</strong> ${escHtml(j.themes)}</div>` : ''}
        ${j.insights ? `<div class="journal-body" style="margin-bottom:0.4rem;"><strong>Innsikt & skifter:</strong> ${escHtml(j.insights)}</div>` : ''}
        ${j.nextSteps ? `<div class="journal-body"><strong>48t handling:</strong> ${escHtml(j.nextSteps)}</div>` : ''}
      </div>
    `).join('');
  }

  // =========================================================================
  // 7. MODUL 6: BLADER PÅ EN BEKK & SELV-SOM-KONTEKST
  // =========================================================================
  const btnPlaceOnStream = document.getElementById('btnPlaceOnStream');
  const streamThoughtInput = document.getElementById('streamThoughtInput');
  const streamLeavesLayer = document.getElementById('streamLeavesLayer');

  if (btnPlaceOnStream && streamThoughtInput && streamLeavesLayer) {
    btnPlaceOnStream.addEventListener('click', () => {
      const thought = streamThoughtInput.value.trim();
      if (!thought) {
        showToast('Vennligst skriv inn en tanke du vil plassere på bladet.', 'error');
        return;
      }

      const leaf = document.createElement('div');
      leaf.className = 'stream-leaf';
      leaf.textContent = `🍂 ${thought}`;
      const randomTop = Math.floor(Math.random() * 50) + 20;
      leaf.style.top = randomTop + '%';
      streamLeavesLayer.appendChild(leaf);

      streamThoughtInput.value = '';
      showToast('Tanken er lagt på bladet – se den flyte forbi.', 'success');

      setTimeout(() => {
        if (leaf.parentNode) leaf.parentNode.removeChild(leaf);
      }, 14000);
    });
  }

  const btnSaveSelfContext = document.getElementById('btnSaveSelfContext');
  if (btnSaveSelfContext) {
    btnSaveSelfContext.addEventListener('click', () => {
      const input = document.getElementById('selfContextInput');
      const val = input ? input.value.trim() : '';
      if (!val) {
        showToast('Vennligst skriv inn en observasjon.', 'error');
        return;
      }
      state.selfAsContextLogs.push({
        timestamp: new Date().toISOString(),
        observation: val
      });
      saveState();
      if (input) input.value = '';
      showToast('Observasjon fra det observerende selv er loggført.', 'success');
    });
  }

  // =========================================================================
  // 8. MODUL 7 & 8: FORPLIKTET HANDLING & DBT-DAGBOKKORT
  // =========================================================================
  const btnAddGoal = document.getElementById('btnAddGoal');
  if (btnAddGoal) {
    btnAddGoal.addEventListener('click', () => {
      const descInput = document.getElementById('goalDescription');
      const valSelect = document.getElementById('goalValueSelect');
      const freqSelect = document.getElementById('goalFrequency');

      const desc = descInput ? descInput.value.trim() : '';
      if (!desc) {
        showToast('Vennligst skriv inn en handlingsbeskrivelse.', 'error');
        return;
      }

      state.committedGoals.push({
        id: Date.now(),
        text: desc,
        value: valSelect ? valSelect.value : 'Vekst',
        frequency: freqSelect ? freqSelect.value : 'Daglig',
        done: false
      });
      saveState();
      renderGoalsList();
      if (descInput) descInput.value = '';
      showToast('Handlingsmål er lagt til.', 'success');
    });
  }

  function renderGoalsList() {
    const list = document.getElementById('goalsList');
    if (!list) return;
    if (state.committedGoals.length === 0) {
      list.innerHTML = `<p style="font-size:0.83rem; color:var(--text-muted); font-style:italic;">Ingen mål registrert ennå.</p>`;
      return;
    }

    list.innerHTML = state.committedGoals.map(g => `
      <div class="goal-card ${g.done ? 'completed' : ''}">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <input type="checkbox" data-goalid="${g.id}" ${g.done ? 'checked' : ''} style="cursor:pointer; width:18px; height:18px;">
          <div>
            <div class="goal-title" style="${g.done ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${escHtml(g.text)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${escHtml(g.frequency)}</div>
          </div>
        </div>
        <span class="goal-tag">${escHtml(g.value)}</span>
      </div>
    `).join('');
  }

  const goalsList = document.getElementById('goalsList');
  if (goalsList) {
    goalsList.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const id = parseInt(e.target.dataset.goalid, 10);
        const goal = state.committedGoals.find(g => g.id === id);
        if (goal) {
          goal.done = e.target.checked;
          saveState();
          renderGoalsList();
          showToast(goal.done ? 'Mål fullført!' : 'Mål gjenåpnet.', 'success');
        }
      }
    });
  }

  // DBT-dagbokkort
  const btnSaveDbtCard = document.getElementById('btnSaveDbtCard');
  if (btnSaveDbtCard) {
    btnSaveDbtCard.addEventListener('click', () => {
      const mood = document.getElementById('dbtMood');
      const urge = document.getElementById('dbtUrge');
      const align = document.getElementById('dbtAlignment');
      const notes = document.getElementById('dbtNotes');

      const checkedSkills = [];
      document.querySelectorAll('.skills-checkbox-grid input[type="checkbox"]:checked').forEach(c => {
        checkedSkills.push(c.value);
      });

      const entry = {
        timestamp: new Date().toISOString(),
        mood: parseInt(mood.value, 10),
        urge: parseInt(urge.value, 10),
        alignment: parseInt(align.value, 10),
        skills: checkedSkills,
        notes: notes ? notes.value.trim() : ''
      };

      state.dbtDiaryCards.push(entry);
      saveState();
      renderDbtHistory();
      updateMetricsSummary();

      document.querySelectorAll('.skills-checkbox-grid input[type="checkbox"]').forEach(c => { c.checked = false; });
      if (notes) notes.value = '';
      showToast('Dagbokkortet er lagret.', 'success');
    });
  }

  function renderDbtHistory() {
    const list = document.getElementById('dbtHistoryList');
    if (!list) return;
    if (state.dbtDiaryCards.length === 0) {
      list.innerHTML = `<p style="font-size:0.83rem; color:var(--text-muted); font-style:italic;">Ingen dagbokkort registrert ennå.</p>`;
      return;
    }

    list.innerHTML = state.dbtDiaryCards.slice().reverse().map(d => `
      <div class="diary-item">
        <div class="journal-date">📅 ${new Date(d.timestamp).toLocaleString('nb-NO')}</div>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin:0.35rem 0;">
          <span class="goal-tag">Humør: ${d.mood}/10</span>
          <span class="goal-tag">Unngåelsestrang: ${d.urge}/10</span>
          <span class="goal-tag">Verdisamsvar: ${d.alignment}/10</span>
        </div>
        ${d.skills.length > 0 ? `<div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.25rem;"><strong>Ferdigheter:</strong> ${escHtml(d.skills.join(', '))}</div>` : ''}
        ${d.notes ? `<div style="font-size:0.85rem; color:var(--text-primary); font-style:italic;">"${escHtml(d.notes)}"</div>` : ''}
      </div>
    `).join('');
  }

  // =========================================================================
  // 9. MODUL 9: PSYKOMETRI (AAQ-2), TILBAKEFALLSPLAN & EKSPORT
  // =========================================================================
  const AAQ2_ITEMS = [
    '1. Mine smertefulle opplevelser og minner gjør det vanskelig for meg å leve et liv jeg verdsetter.',
    '2. Jeg er redd for følelsene mine.',
    '3. Jeg bekymrer meg for at jeg ikke klarer å kontrollere mine bekymringer og følelser.',
    '4. Mine vonde minner hindrer meg i å ha et meningsfullt liv.',
    '5. Følelser skaper problemer i livet mitt.',
    '6. Det virker som de fleste andre mestrer livene sine bedre enn jeg gjør.',
    '7. Bekymringer står i veien for mine mål.'
  ];

  function renderAAQ2() {
    const container = document.getElementById('aaq2Container');
    if (!container) return;

    container.innerHTML = AAQ2_ITEMS.map((q, i) => `
      <div class="scale-item" data-aaqidx="${i}">
        <div class="scale-q-text">${escHtml(q)}</div>
        <div class="scale-options">
          ${[1, 2, 3, 4, 5, 6, 7].map(v => `
            <button type="button" class="scale-opt-btn" data-aaqidx="${i}" data-val="${v}">
              ${v} ${v === 1 ? '(Aldri sant)' : v === 7 ? '(Alltid sant)' : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  const aaq2Container = document.getElementById('aaq2Container');
  if (aaq2Container) {
    aaq2Container.addEventListener('click', (e) => {
      const btn = e.target.closest('.scale-opt-btn');
      if (!btn) return;
      const idx = btn.dataset.aaqidx;
      aaq2Container.querySelectorAll(`.scale-opt-btn[data-aaqidx="${idx}"]`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  }

  const btnScoreAaq2 = document.getElementById('btnScoreAaq2');
  if (btnScoreAaq2) {
    btnScoreAaq2.addEventListener('click', () => {
      const items = document.querySelectorAll('#aaq2Container .scale-item');
      const answers = [];

      for (let i = 0; i < items.length; i++) {
        const sel = items[i].querySelector('.scale-opt-btn.selected');
        if (!sel) {
          showToast('Vennligst besvar alle 7 AAQ-2-spørsmålene.', 'error');
          return;
        }
        answers.push(parseInt(sel.dataset.val, 10));
      }

      const total = answers.reduce((a, b) => a + b, 0);
      let classification = 'Høy psykologisk fleksibilitet';
      if (total > 28) classification = 'Lavere fleksibilitet / Høyere erfaringsmessig unngåelse';
      else if (total > 24) classification = 'Moderat psykologisk fleksibilitet';

      state.assessments.aaq2.push({
        timestamp: new Date().toISOString(),
        score: total,
        maxScore: 49,
        classification: classification,
        answers: answers
      });
      saveState();
      updateMetricsSummary();
      showToast(`AAQ-2 registrert: ${total}/49 (${classification})`, 'success');
    });
  }

  function updateMetricsSummary() {
    const phqEl = document.getElementById('metricPhq9');
    const gadEl = document.getElementById('metricGad7');
    const aaqEl = document.getElementById('metricAaq2');
    const diaryEl = document.getElementById('metricDiaryCount');

    if (phqEl) {
      const list = state.assessments.phq9;
      phqEl.textContent = list.length > 0 ? list[list.length - 1].score + '/27' : '—';
    }
    if (gadEl) {
      const list = state.assessments.gad7;
      gadEl.textContent = list.length > 0 ? list[list.length - 1].score + '/21' : '—';
    }
    if (aaqEl) {
      const list = state.assessments.aaq2;
      aaqEl.textContent = list.length > 0 ? list[list.length - 1].score + '/49' : '—';
    }
    if (diaryEl) {
      diaryEl.textContent = state.dbtDiaryCards.length;
    }
  }

  // Tilbakefallsforebygging
  const btnSaveRelapsePlan = document.getElementById('btnSaveRelapsePlan');
  if (btnSaveRelapsePlan) {
    btnSaveRelapsePlan.addEventListener('click', () => {
      const warning = document.getElementById('relapseWarningSigns');
      const action = document.getElementById('relapseActionPlan');
      const contacts = document.getElementById('relapseContacts');

      state.relapsePlan = {
        warningSigns: warning ? warning.value.trim() : '',
        actionPlan: action ? action.value.trim() : '',
        contacts: contacts ? contacts.value.trim() : ''
      };
      saveState();
      showToast('Tiltaksplan for tilbakefallsforebygging er lagret.', 'success');
    });
  }

  function populateRelapsePlan() {
    const warning = document.getElementById('relapseWarningSigns');
    const action = document.getElementById('relapseActionPlan');
    const contacts = document.getElementById('relapseContacts');
    if (warning && state.relapsePlan.warningSigns) warning.value = state.relapsePlan.warningSigns;
    if (action && state.relapsePlan.actionPlan) action.value = state.relapsePlan.actionPlan;
    if (contacts && state.relapsePlan.contacts) contacts.value = state.relapsePlan.contacts;
  }

  // Eksportfunksjon
  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const btnExportJson = document.getElementById('btnExportJson');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const exportObject = {
        exportDate: new Date().toISOString(),
        patientId: state.patientId || 'ANONYM',
        data: state
      };
      downloadBlob(JSON.stringify(exportObject, null, 2), `iact_klinisk_eksport_${Date.now()}.json`, 'application/json');
      showToast('JSON-fil er lastet ned.', 'success');
    });
  }

  const btnExportCsv = document.getElementById('btnExportCsv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      let csv = 'Post_Type,Tidsstempel,Metrikk_1,Metrikk_2,Detaljer\n';

      // PHQ-9
      state.assessments.phq9.forEach(a => {
        csv += `PHQ-9,${a.timestamp},Skår:${a.score}/${a.maxScore},${a.severity},"Svar: ${a.answers.join(';')}"\n`;
      });
      // GAD-7
      state.assessments.gad7.forEach(a => {
        csv += `GAD-7,${a.timestamp},Skår:${a.score}/${a.maxScore},${a.severity},"Svar: ${a.answers.join(';')}"\n`;
      });
      // AAQ-2
      state.assessments.aaq2.forEach(a => {
        csv += `AAQ-2,${a.timestamp},Skår:${a.score}/${a.maxScore},${a.classification},"Svar: ${a.answers.join(';')}"\n`;
      });
      // Integreringsjournal
      state.integrationJournal.forEach(j => {
        csv += `Journal,${j.timestamp},Temaer:"${(j.themes||'').replace(/"/g, '""')}",Innsikt:"${(j.insights||'').replace(/"/g, '""')}",NesteSteg:"${(j.nextSteps||'').replace(/"/g, '""')}"\n`;
      });
      // DBT-dagbok
      state.dbtDiaryCards.forEach(d => {
        csv += `DBT_Dagbok,${d.timestamp},Humør:${d.mood};Trang:${d.urge};Samsvar:${d.alignment},Ferdigheter:"${d.skills.join(';')}",Notater:"${(d.notes||'').replace(/"/g, '""')}"\n`;
      });

      downloadBlob(csv, `iact_klinisk_eksport_${Date.now()}.csv`, 'text/csv;charset=utf-8');
      showToast('CSV-regneark er lastet ned.', 'success');
    });
  }

  const btnClearAllData = document.getElementById('btnClearAllData');
  if (btnClearAllData) {
    btnClearAllData.addEventListener('click', () => {
      if (!confirm('Er du sikker på at du vil slette alle lokale kliniske data? Denne handlingen kan ikke angres.')) return;
      localStorage.removeItem(STORAGE_KEY);
      state = getDefaultState();
      saveState();
      initApp();
      showToast('Alle lokale data er nullstilt.', 'success');
    });
  }

  // Pasient-ID modal
  const modal = document.getElementById('patientModal');
  const btnEditPatientId = document.getElementById('btnEditPatientId');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnConfirmPatientId = document.getElementById('btnConfirmPatientId');
  const modalPatientInput = document.getElementById('modalPatientInput');
  const patientIdDisplay = document.getElementById('patientIdDisplay');

  if (btnEditPatientId && modal) {
    btnEditPatientId.addEventListener('click', () => {
      if (modalPatientInput) modalPatientInput.value = state.patientId;
      modal.showModal();
    });
  }

  if (btnCancelModal && modal) {
    btnCancelModal.addEventListener('click', () => {
      modal.close();
    });
  }

  if (btnConfirmPatientId && modal) {
    btnConfirmPatientId.addEventListener('click', () => {
      if (modalPatientInput) {
        state.patientId = modalPatientInput.value.trim();
        saveState();
        if (patientIdDisplay) {
          patientIdDisplay.textContent = state.patientId ? `Pasient-ID: ${state.patientId}` : 'Pasient-ID: Ikke angitt';
        }
      }
      modal.close();
      showToast('Pasient-ID lagret.', 'success');
    });
  }

  // =========================================================================
  // 10. APPLIKASJONSINITIERING
  // =========================================================================
  function initApp() {
    if (patientIdDisplay) {
      patientIdDisplay.textContent = state.patientId ? `Pasient-ID: ${state.patientId}` : 'Pasient-ID: Ikke angitt';
    }
    renderCurrentScale();
    renderAuditList();
    renderValuesChips();
    renderJournalHistory();
    renderGoalsList();
    renderDbtHistory();
    renderAAQ2();
    updateMetricsSummary();
    populateRelapsePlan();
  }

  initApp();
})();
