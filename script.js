// ===== СТАН ДОДАТКУ =====
let currentMode = 'generate';
let arr = [];
let steps = [];
let currentStepIdx = 0;
let correctCount = 0;
let wrongCount = 0;
let isLastCorrect = false;
let currentAlgo = 'insertion';
let currentRunMode = 'quiz';
let demoTimer = null;
let arrayOrder = [];

// ===== НАЛАШТУВАННЯ АЛГОРИТМІВ =====
const ALGORITHMS = {
    insertion: {
        name: 'Сортування вставками (Insertion Sort)',
        time: 'O(N²)', space: 'O(1)',
        code: `void insertionSort(vector<int>& arr) {
  int n = arr.size();
  for (int i = 1; i < n; i++) {
    int key = arr[i];
    int j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
}`,
        generator: genInsertion
    },
    selection: {
        name: 'Сортування вибором (Selection Sort)',
        time: 'O(N²)', space: 'O(1)',
        code: `void selectionSort(vector<int>& arr) {
  int n = arr.size();
  for (int i = 0; i < n - 1; i++) {
    int min_idx = i;
    for (int j = i + 1; j < n; j++) {
      if (arr[j] < arr[min_idx]) {
        min_idx = j;
      }
    }
    swap(arr[i], arr[min_idx]);
  }
}`,
        generator: genSelection
    },
    bubble: {
        name: 'Сортування бульбашкою (Bubble Sort)',
        time: 'O(N²)', space: 'O(1)',
        code: `void bubbleSort(vector<int>& arr) {
  int n = arr.size();
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        swap(arr[j], arr[j + 1]);
      }
    }
  }
}`,
        generator: genBubble
    },
    shell: {
        name: 'Сортування Шелла (Shell Sort)',
        time: 'O(N log N)', space: 'O(1)',
        code: `void shellSort(vector<int>& arr) {
  int n = arr.size();
  for (int gap = n / 2; gap > 0; gap /= 2) {
    for (int i = gap; i < n; i++) {
      int temp = arr[i];
      int j;
      for (j = i; j >= gap && arr[j - gap] > temp; j -= gap) {
        arr[j] = arr[j - gap];
      }
      arr[j] = temp;
    }
  }
}`,
        generator: genShell
    },
    quick: {
        name: 'Швидке сортування (схема Хоара)',
        time: 'O(N log N)', space: 'O(log N)',
        code: `int partition(vector<int>& arr, int low, int high) {
  int pivot = arr[(low + high) / 2];
  int i = low - 1, j = high + 1;
  while (true) {
    do { i++; } while (arr[i] < pivot);
    do { j--; } while (arr[j] > pivot);
    if (i >= j) return j;
    swap(arr[i], arr[j]);
  }
}`,
        generator: genQuick
    }
};

// ===== ІНІЦІАЛІЗАЦІЯ UI =====
function selectMode(m) {
    currentMode = m;
    document.getElementById('btn-manual').classList.toggle('active', m === 'manual');
    document.getElementById('btn-generate').classList.toggle('active', m === 'generate');
    document.getElementById('count-group').style.display = 'block';
    document.getElementById('elements-group').style.display = (m === 'manual') ? 'block' : 'none';
}

function initSimulation(runMode = 'quiz') {
    stopDemo();
    currentRunMode = runMode;
    currentAlgo = document.getElementById('algo-select').value;
    const countVal = parseInt(document.getElementById('count-input').value);
    
    if (isNaN(countVal) || countVal < 3 || countVal > 10) {
        alert('Введіть кількість елементів від 3 до 10.');
        return;
    }

    arr = [];
    if (currentMode === 'generate') {
        for (let i = 0; i < countVal; i++) arr.push(Math.floor(Math.random() * 90) + 10);
    } else {
        const text = document.getElementById('elements-input').value;
        const parts = text.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (parts.length !== countVal) {
            alert(`Введено ${parts.length} елементів замість ${countVal}.`);
            return;
        }
        arr = parts;
    }

    correctCount = 0;
    wrongCount = 0;
    currentStepIdx = 0;
    isLastCorrect = false;
    arrayOrder = arr.map((_, idx) => idx);
    
    // Підготовка екрану
    const algoData = ALGORITHMS[currentAlgo];
    document.getElementById('algo-title').innerText = algoData.name;
    document.getElementById('comp-time').innerText = algoData.time;
    document.getElementById('comp-space').innerText = algoData.space;
    renderCode(algoData.code);
    
    // Генерація кроків
    steps = algoData.generator([...arr]);
    prepareStepsForAnimation();
    
    switchScreen('sim-screen');
    renderStep();

    if (currentRunMode === 'demo') {
        scheduleDemoAdvance();
    }
}

// ===== ВІДОБРАЖЕННЯ =====
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function toggleComplexity() {
    const p = document.getElementById('complexity-panel');
    p.classList.toggle('hidden');
}

function normalizeAnswer(value) {
    return String(value).trim().toLowerCase();
}

function getDisplayAnswer(step) {
    if (step.t === 'bool') {
        return normalizeAnswer(step.a) === 'так' ? 'Так' : 'Ні';
    }
    return step.a;
}

function clearFeedback() {
    document.getElementById('feedback-overlay').classList.remove('active');
}

function stopDemo() {
    if (demoTimer) {
        clearTimeout(demoTimer);
        demoTimer = null;
    }
}

function prepareStepsForAnimation() {
    const previousOrder = new Map();
    steps.forEach((step, stepIndex) => {
        const prevState = stepIndex > 0 ? steps[stepIndex - 1].arr : null;
        const localUsage = new Map();
        const nextOrder = step.arr.map((item, idx) => {
            const valueKey = String(item.v);
            const usedCount = localUsage.get(valueKey) || 0;
            localUsage.set(valueKey, usedCount + 1);

            let matchedId = null;
            for (const [id, meta] of previousOrder.entries()) {
                if (!meta.used && meta.value === item.v) {
                    meta.used = true;
                    matchedId = id;
                    break;
                }
            }

            if (matchedId === null) {
                matchedId = `${stepIndex}-${idx}-${valueKey}-${usedCount}`;
            }

            return matchedId;
        });

        step.order = nextOrder;
        previousOrder.clear();
        nextOrder.forEach((id, idx) => previousOrder.set(id, { value: step.arr[idx].v, used: false }));

        if (prevState) {
            previousOrder.forEach(meta => { meta.used = false; });
        }
    });
}

function renderCode(codeStr) {
    const lines = codeStr.split('\n');
    let html = '';
    lines.forEach((line, idx) => {
        let fmtLine = line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        fmtLine = fmtLine.replace(/\b(void|int|for|while|if|return)\b/g, '<span class="code-keyword">$1</span>');
        fmtLine = fmtLine.replace(/\b(vector)\b/g, '<span class="code-type">$1</span>');
        fmtLine = fmtLine.replace(/\b(swap)\b/g, '<span class="code-func">$1</span>');
        
        html += `<div class="code-line" id="line-${idx+1}">
            <span class="line-num">${idx+1}</span>
            <span class="code-text">${fmtLine}</span>
        </div>`;
    });
    document.getElementById('code-panel').innerHTML = html;
}

function renderArray(stateArr, order = []) {
    const container = document.getElementById('array-container');
    const previousNodes = new Map(Array.from(container.children).map(node => [node.dataset.id, node]));

    let html = stateArr.map((item, idx) => {
        let cls = 'neutral';
        if (item.c === 'compare') cls = 'compare';
        if (item.c === 'sorted') cls = 'sorted';
        if (item.c === 'active') cls = 'active';
        const id = order[idx] || `${idx}-${item.v}`;
        return `<div class="array-cell ${cls}" data-id="${id}">${item.v}</div>`;
    }).join('');
    container.innerHTML = html;

    Array.from(container.children).forEach(node => {
        const oldNode = previousNodes.get(node.dataset.id);
        if (!oldNode) {
            node.classList.add('entering');
            requestAnimationFrame(() => node.classList.remove('entering'));
            return;
        }

        const oldRect = oldNode.getBoundingClientRect();
        const newRect = node.getBoundingClientRect();
        const deltaX = oldRect.left - newRect.left;
        const deltaY = oldRect.top - newRect.top;

        if (deltaX || deltaY) {
            node.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            requestAnimationFrame(() => {
                node.style.transform = '';
            });
        }
    });
}

function arraysDiffer(left = [], right = []) {
    if (!left || !right || left.length !== right.length) {
        return true;
    }

    for (let i = 0; i < left.length; i++) {
        if (left[i].v !== right[i].v || left[i].c !== right[i].c) {
            return true;
        }
    }

    return false;
}

function getDemoDisplayStep(stepIndex) {
    const step = steps[stepIndex];
    const nextStep = steps[stepIndex + 1];

    if (step && step.t === 'text' && nextStep && arraysDiffer(step.arr, nextStep.arr)) {
        return nextStep;
    }

    return step;
}

function highlightLine(lineNum) {
    document.querySelectorAll('.code-line').forEach(el => el.classList.remove('highlight'));
    if (lineNum > 0) {
        const line = document.getElementById('line-' + lineNum);
        if (line) {
            line.classList.add('highlight');
            line.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
}

function renderStep() {
    if (currentStepIdx >= steps.length) {
        showDone();
        return;
    }

    const prevBtn = document.getElementById('prev-step-btn');
    if (prevBtn) {
        if (currentStepIdx === 0) {
            prevBtn.setAttribute('disabled', 'true');
            prevBtn.style.opacity = '0.5';
            prevBtn.style.cursor = 'not-allowed';
        } else {
            prevBtn.removeAttribute('disabled');
            prevBtn.style.opacity = '1';
            prevBtn.style.cursor = 'pointer';
        }
    }

    const step = steps[currentStepIdx];
    const visualStep = currentRunMode === 'demo' ? getDemoDisplayStep(currentStepIdx) : step;

    highlightLine(step.l);
    renderArray(visualStep.arr, visualStep.order || []);

    document.getElementById('question-text').innerText = step.q;
    document.getElementById('stats-text').innerText = `Крок ${currentStepIdx + 1}/${steps.length}`;
    
    const progress = ((currentStepIdx) / steps.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;

    const input = document.getElementById('answer-input');
    const boolBtns = document.getElementById('bool-buttons');
    const btn = document.getElementById('answer-btn');
    const demoBanner = document.getElementById('demo-banner');
    const demoAnswer = document.getElementById('demo-answer');

    demoBanner.classList.toggle('hidden', currentRunMode !== 'demo');
    demoAnswer.classList.toggle('hidden', currentRunMode !== 'demo');

    if (currentRunMode === 'demo') {
        input.style.display = 'none';
        btn.style.display = 'none';
        boolBtns.style.display = 'none';
        document.getElementById('answer-hint').innerText = 'Автоматичне пояснення кроку:';
        demoAnswer.innerHTML = `Правильна відповідь: <strong>${getDisplayAnswer(step)}</strong>`;
        return;
    }

    if (step.t === 'bool') {
        input.style.display = 'none';
        btn.style.display = 'none';
        boolBtns.style.display = 'flex';
        demoAnswer.innerText = '';
        document.getElementById('answer-hint').innerText = 'Оберіть правильний варіант:';
    } else {
        input.style.display = 'block';
        btn.style.display = 'flex';
        boolBtns.style.display = 'none';
        demoAnswer.innerText = '';
        document.getElementById('answer-hint').innerText = 'Введіть значення:';
        input.value = '';
        input.focus();
    }
}

// ===== ВЗАЄМОДІЯ =====
function answerBool(val) { processAnswer(val); }

function submitAnswer() {
    const val = document.getElementById('answer-input').value.trim();
    if (val !== '') processAnswer(val);
}

document.getElementById('answer-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAnswer();
});

function prevStep() {
    if (currentRunMode === 'demo') {
        stopDemo();
    }
    if (currentStepIdx > 0) {
        currentStepIdx--;
        renderStep();
        if (currentRunMode === 'demo') {
            scheduleDemoAdvance();
        }
    }
}

function scheduleDemoAdvance() {
    stopDemo();

    if (currentRunMode !== 'demo') {
        return;
    }

    if (currentStepIdx >= steps.length - 1) {
        demoTimer = setTimeout(() => {
            currentStepIdx = steps.length;
            renderStep();
        }, 1700);
        return;
    }

    demoTimer = setTimeout(() => {
        currentStepIdx++;
        renderStep();
        scheduleDemoAdvance();
    }, 2200);
}

function processAnswer(userAnswer) {
    if (currentRunMode === 'demo') {
        return;
    }

    const step = steps[currentStepIdx];
    const correct = normalizeAnswer(userAnswer) === normalizeAnswer(step.a);

    const icon = document.getElementById('feedback-icon');
    const title = document.getElementById('feedback-title');
    const detail = document.getElementById('feedback-detail');

    if (correct) {
        correctCount++;
        isLastCorrect = true;
        icon.innerHTML = `<svg width="64" height="64" fill="none" stroke="var(--color-success)" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        title.innerText = 'Чудово!';
        title.className = 'dialog-title correct';
        detail.innerText = 'Відповідь правильна. Переходимо до наступного кроку.';
    } else {
        wrongCount++;
        isLastCorrect = false;
        icon.innerHTML = `<svg width="64" height="64" fill="none" stroke="var(--color-danger)" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        title.innerText = 'Помилка';
        title.className = 'dialog-title wrong';
        detail.innerText = step.msg || 'Відповідь неправильна. Спробуйте ще раз.';
    }

    document.getElementById('feedback-overlay').classList.add('active');
}

function closeFeedback() {
    document.getElementById('feedback-overlay').classList.remove('active');
    if (isLastCorrect) {
        currentStepIdx++;
        renderStep();
    }
}

function showDone() {
    stopDemo();
    switchScreen('done-screen');
    const total = correctCount + wrongCount;
    const acc = total > 0 ? Math.round((correctCount/total)*100) : 0;
    const modeLabel = currentRunMode === 'demo' ? 'Режим демонстрації' : 'Режим тренування';
    
    document.getElementById('done-stats').innerHTML = `
        <div class="stat-row">
            <span>Режим:</span>
            <span>${modeLabel}</span>
        </div>
        <div class="stat-row correct">
            <span>Правильних відповідей:</span>
            <span>${correctCount}</span>
        </div>
        <div class="stat-row wrong">
            <span>Помилок:</span>
            <span>${wrongCount}</span>
        </div>
        <div class="stat-row">
            <span>Загальна точність:</span>
            <span>${acc}%</span>
        </div>
    `;
}

function restart() {
    stopDemo();
    clearFeedback();
    switchScreen('setup-screen');
    document.getElementById('complexity-panel').classList.add('hidden');
}

// ===== ГЕНЕРАТОРИ КРОКІВ (ПОКРОКОВІ) =====

function makeState(arr, comp1=-1, comp2=-1, sorted=[], active=-1) {
    return arr.map((v, i) => {
        let c = 'neutral';
        if (sorted.includes(i)) c = 'sorted';
        if (i === comp1 || i === comp2) c = 'compare';
        if (i === active) c = 'active';
        return { v, c };
    });
}

function genBubble(arr) {
    let s = [];
    let n = arr.length;
    let sorted = [];
    
    s.push({q: `Рядок 2: Чому дорівнює змінна n (розмір масиву)?`, a: n.toString(), l: 2, t: 'text', arr: makeState(arr)});
    
    for (let i = 0; i < n - 1; i++) {
        s.push({q: `Рядок 3: Починаємо зовнішній цикл. Яке поточне значення i?`, a: i.toString(), l: 3, t: 'text', arr: makeState(arr, -1,-1, sorted)});
        
        for (let j = 0; j < n - i - 1; j++) {
            s.push({q: `Рядок 4: Внутрішній цикл. Яке поточне значення j?`, a: j.toString(), l: 4, t: 'text', arr: makeState(arr, -1,-1, sorted)});
            
            let isGreater = arr[j] > arr[j+1];
            s.push({
                q: `Рядок 5: Порівнюємо arr[${j}] (${arr[j]}) та arr[${j+1}] (${arr[j+1]}). Чи виконується умова arr[j] > arr[j+1]?`,
                a: isGreater ? 'так' : 'ні',
                l: 5, t: 'bool',
                arr: makeState(arr, j, j+1, sorted)
            });
            
            if (isGreater) {
                s.push({q: `Рядок 6: Виконуємо обмін (swap). Яке значення тепер буде на позиції ${j}?`, a: arr[j+1].toString(), l: 6, t: 'text', arr: makeState(arr, j, j+1, sorted)});
                let temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
            }
        }
        sorted.push(n - i - 1);
        s.push({q: `Внутрішній цикл завершено. Елемент на позиції ${n - i - 1} гарантовано стоїть на своєму місці. Продовжуємо?`, a: 'так', l: 3, t: 'bool', msg: 'Натисніть «Так»', arr: makeState(arr, -1,-1, sorted)});
    }
    sorted.push(0);
    s.push({q: 'Алгоритм завершив роботу. Масив повністю відсортовано!', a: 'так', l: 10, t: 'bool', arr: makeState(arr, -1,-1, sorted)});
    return s;
}

function genSelection(arr) {
    let s = [];
    let n = arr.length;
    let sorted = [];
    
    for (let i = 0; i < n - 1; i++) {
        s.push({q: `Рядок 3: Початок зовнішнього циклу. Яке значення змінної i?`, a: i.toString(), l: 3, t: 'text', arr: makeState(arr, -1, -1, sorted)});
        
        let min_idx = i;
        s.push({q: `Рядок 4: Встановлюємо початковий індекс мінімуму (min_idx). Яке його значення?`, a: min_idx.toString(), l: 4, t: 'text', arr: makeState(arr, -1, -1, sorted, min_idx)});
        
        for (let j = i + 1; j < n; j++) {
            s.push({q: `Рядок 5: Внутрішній цикл. Поточне значення j?`, a: j.toString(), l: 5, t: 'text', arr: makeState(arr, j, min_idx, sorted)});
            
            let isLess = arr[j] < arr[min_idx];
            s.push({
                q: `Рядок 6: Чи виконується умова arr[${j}] (${arr[j]}) < arr[${min_idx}] (${arr[min_idx]})?`,
                a: isLess ? 'так' : 'ні',
                l: 6, t: 'bool',
                arr: makeState(arr, j, min_idx, sorted)
            });
            
            if (isLess) {
                min_idx = j;
                s.push({q: `Рядок 7: Оновлюємо min_idx. Яке тепер його значення?`, a: min_idx.toString(), l: 7, t: 'text', arr: makeState(arr, -1, -1, sorted, min_idx)});
            }
        }
        
        s.push({q: `Рядок 10: Внутрішній цикл завершено. Виконуємо swap(arr[${i}], arr[${min_idx}]). Яке число тепер буде на позиції ${i}?`, a: arr[min_idx].toString(), l: 10, t: 'text', arr: makeState(arr, i, min_idx, sorted)});
        let temp = arr[i];
        arr[i] = arr[min_idx];
        arr[min_idx] = temp;
        sorted.push(i);
    }
    sorted.push(n-1);
    s.push({q: 'Рядок 12: Масив відсортовано алгоритмом сортування вибором!', a: 'так', l: 12, t: 'bool', arr: makeState(arr, -1,-1, sorted)});
    return s;
}

function genInsertion(arr) {
    let s = [];
    let n = arr.length;
    let sorted = [0]; 
    
    s.push({q: `Рядок 3: З якого індексу (i) починається зовнішній цикл?`, a: '1', l: 3, t: 'text', arr: makeState(arr)});
    
    for (let i = 1; i < n; i++) {
        let key = arr[i];
        s.push({q: `Рядок 4: i = ${i}. Яке значення буде записано в змінну key?`, a: key.toString(), l: 4, t: 'text', arr: makeState(arr, -1,-1, sorted, i)});
        
        let j = i - 1;
        s.push({q: `Рядок 5: Яке початкове значення отримає змінна j (i - 1)?`, a: j.toString(), l: 5, t: 'text', arr: makeState(arr, j, i, sorted)});
        
        while (true) {
            let cond = (j >= 0 && arr[j] > key);
            let qStr = j >= 0 ? `Чи виконується умова: j >= 0 та arr[j] (${arr[j]}) > key (${key})?` : `Чи виконується умова j >= 0?`;
            
            s.push({q: `Рядок 6: ${qStr}`, a: cond ? 'так' : 'ні', l: 6, t: 'bool', arr: j>=0 ? makeState(arr, j, -1, sorted, -1) : makeState(arr, -1,-1, sorted)});
            
            if (!cond) break;
            
            s.push({q: `Рядок 7: Зсуваємо arr[${j}] вправо на позицію ${j+1}. Яке значення буде в arr[${j+1}]?`, a: arr[j].toString(), l: 7, t: 'text', arr: makeState(arr, j, j+1, sorted)});
            arr[j + 1] = arr[j];
            
            s.push({q: `Рядок 8: Зменшуємо j (j--). Чому тепер дорівнює j?`, a: (j-1).toString(), l: 8, t: 'text', arr: makeState(arr, -1,-1, sorted)});
            j--;
        }
        
        s.push({q: `Рядок 10: Вставляємо key (${key}) на позицію j+1 (${j+1}). Яке значення туди запишемо?`, a: key.toString(), l: 10, t: 'text', arr: makeState(arr, -1,-1, sorted, j+1)});
        arr[j + 1] = key;
        sorted.push(i);
    }
    s.push({q: 'Масив повністю відсортовано!', a: 'так', l: 12, t: 'bool', arr: makeState(arr, -1,-1, sorted)});
    return s;
}

function genShell(arr) {
    let s = [];
    let n = arr.length;
    
    s.push({q: `Рядок 2: Чому дорівнює n (розмір масиву)?`, a: n.toString(), l: 2, t: 'text', arr: makeState(arr)});
    
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
        s.push({q: `Рядок 3: Який поточний крок (gap)?`, a: gap.toString(), l: 3, t: 'text', arr: makeState(arr)});
        
        for (let i = gap; i < n; i++) {
            s.push({q: `Рядок 4: Цикл по i. Яке поточне значення i?`, a: i.toString(), l: 4, t: 'text', arr: makeState(arr, i, -1)});
            
            let temp = arr[i];
            s.push({q: `Рядок 5: Яке значення зберігаємо в temp (arr[${i}])?`, a: temp.toString(), l: 5, t: 'text', arr: makeState(arr, -1, -1, [], i)});
            
            let j;
            let firstJ = i;
            s.push({q: `Рядок 7: Цикл по j. Яке початкове значення j (дорівнює i)?`, a: firstJ.toString(), l: 7, t: 'text', arr: makeState(arr, firstJ, -1)});
            
            for (j = i; j >= gap && arr[j - gap] > temp; j -= gap) {
                s.push({q: `Рядок 7: arr[${j - gap}] (${arr[j - gap]}) > temp (${temp}). Умова виконується?`, a: 'так', l: 7, t: 'bool', arr: makeState(arr, j-gap, j)});
                s.push({q: `Рядок 8: Зсуваємо елемент на відстань gap. Яке значення запишеться в arr[${j}]?`, a: arr[j - gap].toString(), l: 8, t: 'text', arr: makeState(arr, j-gap, j)});
                arr[j] = arr[j - gap];
            }
            
            if (j >= gap) {
                s.push({q: `Рядок 7: Чи arr[${j - gap}] > temp (${temp})?`, a: 'ні', l: 7, t: 'bool', arr: makeState(arr, j-gap, -1, [], -1)});
            } else {
                s.push({q: `Рядок 7: j (${j}) >= gap (${gap}). Умова хибна?`, a: 'так', l: 7, t: 'bool', msg: 'j стало менше ніж gap', arr: makeState(arr)});
            }
            
            s.push({q: `Рядок 10: Вставляємо temp на знайдене місце arr[${j}]. Яке число туди запишемо?`, a: temp.toString(), l: 10, t: 'text', arr: makeState(arr, -1,-1, [], j)});
            arr[j] = temp;
        }
    }
    s.push({q: 'Масив відсортовано алгоритмом Шелла!', a: 'так', l: 13, t: 'bool', arr: makeState(arr, -1,-1, [...Array(n).keys()])});
    return s;
}

function genQuick(arr) {
    let s = [];
    let n = arr.length;
    
    function partition(low, high) {
        s.push({q: `Розділяємо підмасив від індексу ${low} до ${high}. Продовжуємо?`, a: 'так', l: 1, t: 'bool', msg:'Натисніть «Так»', arr: makeState(arr, low, high)});
        
        let mid = Math.floor((low + high) / 2);
        let pivot = arr[mid];
        s.push({q: `Рядок 2: Визначаємо опорний елемент (pivot = arr[${mid}]). Яке це число?`, a: pivot.toString(), l: 2, t: 'text', arr: makeState(arr, -1, -1, [], mid)});
        
        let i = low - 1;
        let j = high + 1;
        s.push({q: `Рядок 3: Початкові значення індексів i та j. Яке значення j (high + 1)?`, a: j.toString(), l: 3, t: 'text', arr: makeState(arr, -1,-1, [], mid)});
        
        while (true) {
            s.push({q: `Рядок 4: Починаємо нескінченний цикл. Продовжуємо?`, a: 'так', l: 4, t: 'bool', arr: makeState(arr, -1, -1, [], mid)});
            
            do {
                i++;
                s.push({q: `Рядок 5: Збільшуємо i. Поточне i=${i}. Чи виконується умова arr[i] < pivot (${arr[i]} < ${pivot})?`, a: (arr[i] < pivot) ? 'так' : 'ні', l: 5, t: 'bool', arr: makeState(arr, i, -1, [], mid)});
            } while (arr[i] < pivot);

            do {
                j--;
                s.push({q: `Рядок 6: Зменшуємо j. Поточне j=${j}. Чи виконується умова arr[j] > pivot (${arr[j]} > ${pivot})?`, a: (arr[j] > pivot) ? 'так' : 'ні', l: 6, t: 'bool', arr: makeState(arr, i, j, [], mid)});
            } while (arr[j] > pivot);

            s.push({q: `Рядок 7: Перевіряємо умову (i >= j), тобто (${i} >= ${j}). Вона виконується?`, a: (i >= j) ? 'так' : 'ні', l: 7, t: 'bool', arr: makeState(arr, i, j, [], mid)});
            if (i >= j) {
                return j;
            }

            s.push({q: `Рядок 8: Робимо swap(arr[${i}], arr[${j}]). Яке число тепер на позиції i?`, a: arr[j].toString(), l: 8, t: 'text', arr: makeState(arr, i, j, [], mid)});
            let temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
        }
    }

    function quickSortRec(low, high) {
        if (low < high) {
            let p = partition(low, high);
            quickSortRec(low, p);
            quickSortRec(p + 1, high);
        }
    }
    
    quickSortRec(0, n - 1);
    
    s.push({q: 'Масив повністю відсортовано!', a: 'так', l: 10, t: 'bool', arr: makeState(arr, -1,-1, [...Array(n).keys()])});
    return s;
}

// Запуск по замовчуванню (режим)
selectMode('generate');
