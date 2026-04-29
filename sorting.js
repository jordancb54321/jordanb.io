(function () {
  var algorithms = ["bubble", "selection", "insertion", "merge", "quick", "heap", "shell", "radix"];
  var sizeInput = document.getElementById("array-size");
  var sizeValue = document.getElementById("array-size-value");
  var speedInput = document.getElementById("speed");
  var speedValue = document.getElementById("speed-value");
  var soundToggle = document.getElementById("sound-toggle");
  var performanceWarning = document.getElementById("performance-warning");
  var shuffleButton = document.getElementById("shuffle");
  var runSelectedButton = document.getElementById("run-selected");
  var algorithmButtons = Array.prototype.slice.call(document.querySelectorAll(".algorithm-button"));
  var codeToggleButtons = Array.prototype.slice.call(document.querySelectorAll(".code-toggle"));

  var sharedArray = [];
  var delayMs = parseInt(speedInput.value, 10);
  var activeRuns = 0;
  var runToken = 0;
  var audioContext = null;
  var soundEnabled = false;
  var lastToneAt = 0;
  var selectedAlgorithms = {
    bubble: true,
    selection: true,
    insertion: true,
    merge: true,
    quick: false,
    heap: false,
    shell: false,
    radix: false
  };
  var codeSnippets = {
    bubble: [
      "for (let end = values.length - 1; end > 0; end--) {",
      "  for (let i = 0; i < end; i++) {",
      "    if (values[i] > values[i + 1]) {",
      "      [values[i], values[i + 1]] = [values[i + 1], values[i]];",
      "    }",
      "  }",
      "}"
    ],
    selection: [
      "for (let start = 0; start < values.length; start++) {",
      "  let minIndex = start;",
      "  for (let i = start + 1; i < values.length; i++) {",
      "    if (values[i] < values[minIndex]) minIndex = i;",
      "  }",
      "  [values[start], values[minIndex]] = [values[minIndex], values[start]];",
      "}"
    ],
    insertion: [
      "for (let i = 1; i < values.length; i++) {",
      "  const current = values[i];",
      "  let j = i - 1;",
      "  while (j >= 0 && values[j] > current) {",
      "    values[j + 1] = values[j];",
      "    j--;",
      "  }",
      "  values[j + 1] = current;",
      "}"
    ],
    merge: [
      "function mergeSort(values) {",
      "  const mid = Math.floor(values.length / 2);",
      "  const left = mergeSort(values.slice(0, mid));",
      "  const right = mergeSort(values.slice(mid));",
      "  while (left.length && right.length) out.push(left[0] <= right[0] ? left.shift() : right.shift());",
      "  return out.concat(left, right);",
      "}"
    ],
    quick: [
      "function quickSort(values, low, high) {",
      "  const pivot = values[high];",
      "  for (let i = low; i < high; i++) {",
      "    if (values[i] <= pivot) swap(values, i, smaller++);",
      "  }",
      "  swap(values, smaller, high);",
      "  quickSort(values, low, smaller - 1);",
      "  quickSort(values, smaller + 1, high);",
      "}"
    ],
    heap: [
      "buildMaxHeap(values);",
      "if (left < size && values[left] > values[largest]) largest = left;",
      "if (right < size && values[right] > values[largest]) largest = right;",
      "if (largest !== root) {",
      "  swap(values, root, largest);",
      "  heapify(values, size, largest);",
      "}",
      "swap(values, 0, end);"
    ],
    shell: [
      "for (let gap = Math.floor(values.length / 2); gap > 0; gap = Math.floor(gap / 2)) {",
      "  for (let i = gap; i < values.length; i++) {",
      "    const current = values[i];",
      "    while (j >= gap && values[j - gap] > current) values[j] = values[j - gap];",
      "    values[j] = current;",
      "  }",
      "}"
    ],
    radix: [
      "let exp = 1;",
      "while (Math.floor(max / exp) > 0) {",
      "  countDigits(values, exp, count);",
      "  accumulateCounts(count);",
      "  placeIntoOutput(values, output, count, exp);",
      "  copyOutput(values, output);",
      "  exp *= 10;",
      "}"
    ]
  };

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function setControlsDisabled(disabled) {
    sizeInput.disabled = disabled;
    speedInput.disabled = disabled;
    soundToggle.disabled = disabled;
    shuffleButton.disabled = disabled;
    runSelectedButton.disabled = disabled;

    algorithmButtons.forEach(function (button) {
      button.disabled = disabled;
    });
  }

  function buildArray(size) {
    var next = [];

    for (var i = 0; i < size; i += 1) {
      next.push(randomInt(12, 100));
    }

    return next;
  }

  function cloneArray() {
    return sharedArray.slice();
  }

  function resetMetrics(name) {
    document.getElementById("time-" + name).textContent = "Time: --";
    document.getElementById("memory-" + name).textContent = "Memory: --";
  }

  function updateMetrics(name, elapsedMs, peakMemoryUnits) {
    document.getElementById("time-" + name).textContent = "Time: " + elapsedMs.toFixed(1) + " ms";
    document.getElementById("memory-" + name).textContent = "Memory: ~" + peakMemoryUnits + " items";
  }

  function ensureAudioContext() {
    if (!audioContext) {
      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) {
        audioContext = new AudioCtor();
      }
    }

    return audioContext;
  }

  function playTone(value, kind) {
    if (!soundEnabled) {
      return;
    }

    var context = ensureAudioContext();

    if (!context) {
      return;
    }

    var now = performance.now();

    if (now - lastToneAt < Math.max(18, delayMs / 2)) {
      return;
    }

    lastToneAt = now;

    if (context.state === "suspended") {
      context.resume();
    }

    var oscillator = context.createOscillator();
    var gain = context.createGain();
    var frequency = 180 + value * 4 + (kind === "write" ? 50 : 0);
    var startAt = context.currentTime;

    oscillator.type = kind === "write" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.035, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.08);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.09);
  }

  function createStats() {
    return {
      startTime: performance.now(),
      peakMemory: 0
    };
  }

  function trackMemory(stats, amount) {
    stats.peakMemory = Math.max(stats.peakMemory, amount);
  }

  function renderPanel(name, values, state) {
    var container = document.getElementById("bars-" + name);
    var status = document.getElementById("status-" + name);
    var active = state && state.active ? state.active : [];
    var compare = state && state.compare ? state.compare : [];
    var sortedFrom = state && typeof state.sortedFrom === "number" ? state.sortedFrom : values.length;
    var sortedSet = state && state.sortedSet ? state.sortedSet : {};

    container.innerHTML = "";

    values.forEach(function (value, index) {
      var bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = value + "%";

      if (active.indexOf(index) !== -1) {
        bar.classList.add("is-active");
      }

      if (compare.indexOf(index) !== -1) {
        bar.classList.add("is-compare");
      }

      if (index >= sortedFrom || sortedSet[index]) {
        bar.classList.add("is-sorted");
      }

      container.appendChild(bar);
    });

    status.textContent = state && state.label ? state.label : "Ready";
    renderCodeHighlight(name, state && state.codeLines ? state.codeLines : []);
  }

  function setupCodePanels() {
    Object.keys(codeSnippets).forEach(function (name) {
      var list = document.getElementById("code-" + name);

      if (!list) {
        return;
      }

      list.innerHTML = "";
      codeSnippets[name].forEach(function (line) {
        var item = document.createElement("li");
        item.textContent = line;
        list.appendChild(item);
      });
    });
  }

  function renderCodeHighlight(name, codeLines) {
    var list = document.getElementById("code-" + name);

    if (!list) {
      return;
    }

    Array.prototype.forEach.call(list.children, function (item, index) {
      item.classList.toggle("is-highlighted", codeLines.indexOf(index + 1) !== -1);
    });
  }

  function renderAllReady() {
    algorithms.forEach(function (name) {
      renderPanel(name, cloneArray(), { label: selectedAlgorithms[name] ? "Ready" : "Not selected" });
      resetMetrics(name);
    });
    syncCardVisibility();
  }

  function resetStatuses(label) {
    algorithms.forEach(function (name) {
      var statusLabel = selectedAlgorithms[name] ? (label || "Ready") : "Not selected";
      renderPanel(name, cloneArray(), { label: statusLabel });
      resetMetrics(name);
    });
    syncCardVisibility();
  }

  function getSelectedAlgorithms() {
    return algorithms.filter(function (name) {
      return selectedAlgorithms[name];
    });
  }

  function updateRunButtonState() {
    runSelectedButton.disabled = activeRuns > 0 || getSelectedAlgorithms().length === 0;
  }

  function syncCardVisibility() {
    algorithms.forEach(function (name) {
      var card = document.querySelector('[data-panel="' + name + '"]');

      if (card) {
        card.hidden = !selectedAlgorithms[name];
      }
    });
  }

  function updatePerformanceWarning() {
    var barCount = parseInt(sizeInput.value, 10);
    var speed = parseInt(speedInput.value, 10);
    var warn = barCount >= 72 || speed <= 8;
    performanceWarning.hidden = !warn;
  }

  async function animateBubble(values, token, stats) {
    for (var end = values.length - 1; end > 0; end -= 1) {
      for (var i = 0; i < end; i += 1) {
        if (token !== runToken) {
          return;
        }

        renderPanel("bubble", values, {
          label: "Comparing",
          compare: [i, i + 1],
          sortedFrom: end + 1,
          codeLines: [1, 2, 3]
        });
        playTone(Math.max(values[i], values[i + 1]), "compare");
        await sleep(delayMs);

        if (values[i] > values[i + 1]) {
          var temp = values[i];
          values[i] = values[i + 1];
          values[i + 1] = temp;

          renderPanel("bubble", values, {
            label: "Swapping",
            active: [i, i + 1],
            sortedFrom: end + 1,
            codeLines: [3, 4]
          });
          playTone(Math.max(values[i], values[i + 1]), "write");
          await sleep(delayMs);
        }
      }
    }

    renderPanel("bubble", values, { label: "Sorted", sortedFrom: 0 });
  }

  async function animateSelection(values, token, stats) {
    for (var start = 0; start < values.length; start += 1) {
      var minIndex = start;

      for (var i = start + 1; i < values.length; i += 1) {
        if (token !== runToken) {
          return;
        }

        renderPanel("selection", values, {
          label: "Scanning",
          active: [minIndex],
          compare: [start, i],
          sortedSet: buildSortedSet(start),
          codeLines: [1, 2, 3, 4]
        });
        playTone(Math.max(values[minIndex], values[i]), "compare");
        await sleep(delayMs);

        if (values[i] < values[minIndex]) {
          minIndex = i;
        }
      }

      if (minIndex !== start) {
        var temp = values[start];
        values[start] = values[minIndex];
        values[minIndex] = temp;

        renderPanel("selection", values, {
          label: "Placing minimum",
          active: [start, minIndex],
          sortedSet: buildSortedSet(start),
          codeLines: [5, 6]
        });
        playTone(Math.max(values[start], values[minIndex]), "write");
        await sleep(delayMs);
      }
    }

    renderPanel("selection", values, { label: "Sorted", sortedFrom: 0 });
  }

  async function animateInsertion(values, token, stats) {
    for (var i = 1; i < values.length; i += 1) {
      var current = values[i];
      var j = i - 1;

      renderPanel("insertion", values, {
        label: "Picking value",
        active: [i],
        sortedSet: buildSortedSet(i),
        codeLines: [1, 2, 3]
      });
      playTone(current, "compare");
      await sleep(delayMs);

      while (j >= 0 && values[j] > current) {
        if (token !== runToken) {
          return;
        }

        values[j + 1] = values[j];
        renderPanel("insertion", values, {
          label: "Shifting",
          compare: [j, j + 1],
          sortedSet: buildSortedSet(i),
          codeLines: [4, 5, 6]
        });
        playTone(values[j], "write");
        await sleep(delayMs);
        j -= 1;
      }

      values[j + 1] = current;
      renderPanel("insertion", values, {
        label: "Inserting",
        active: [j + 1],
        sortedSet: buildSortedSet(i + 1),
        codeLines: [7]
      });
      playTone(current, "write");
      await sleep(delayMs);
    }

    renderPanel("insertion", values, { label: "Sorted", sortedFrom: 0 });
  }

  function buildSortedSet(count) {
    var sorted = {};

    for (var i = 0; i < count; i += 1) {
      sorted[i] = true;
    }

    return sorted;
  }

  async function animateMerge(values, token, stats) {
    var aux = values.slice();
    trackMemory(stats, aux.length);
    await mergeSort(values, aux, 0, values.length - 1, token);

    if (token === runToken) {
      renderPanel("merge", values, { label: "Sorted", sortedFrom: 0 });
    }
  }

  async function mergeSort(values, aux, left, right, token) {
    if (left >= right || token !== runToken) {
      return;
    }

    var mid = Math.floor((left + right) / 2);
    await mergeSort(values, aux, left, mid, token);
    await mergeSort(values, aux, mid + 1, right, token);
    await merge(values, aux, left, mid, right, token);
  }

  async function merge(values, aux, left, mid, right, token) {
    for (var i = left; i <= right; i += 1) {
      aux[i] = values[i];
    }

    var leftIndex = left;
    var rightIndex = mid + 1;
    var current = left;

    while (leftIndex <= mid && rightIndex <= right) {
      if (token !== runToken) {
        return;
      }

      renderPanel("merge", values, {
        label: "Merging",
        compare: [leftIndex, rightIndex],
        sortedSet: rangeSet(left, current - 1),
        codeLines: [1, 2, 3, 4]
      });
      playTone(Math.max(aux[leftIndex], aux[rightIndex]), "compare");
      await sleep(delayMs);

      if (aux[leftIndex] <= aux[rightIndex]) {
        values[current] = aux[leftIndex];
        leftIndex += 1;
      } else {
        values[current] = aux[rightIndex];
        rightIndex += 1;
      }

      renderPanel("merge", values, {
        label: "Writing back",
        active: [current],
        sortedSet: rangeSet(left, current),
        codeLines: [5]
      });
      playTone(values[current], "write");
      await sleep(delayMs);
      current += 1;
    }

    while (leftIndex <= mid) {
      if (token !== runToken) {
        return;
      }

      values[current] = aux[leftIndex];
      renderPanel("merge", values, {
        label: "Writing back",
        active: [current],
        sortedSet: rangeSet(left, current),
        codeLines: [6]
      });
      playTone(values[current], "write");
      await sleep(delayMs);
      leftIndex += 1;
      current += 1;
    }

    while (rightIndex <= right) {
      if (token !== runToken) {
        return;
      }

      values[current] = aux[rightIndex];
      renderPanel("merge", values, {
        label: "Writing back",
        active: [current],
        sortedSet: rangeSet(left, current),
        codeLines: [6]
      });
      playTone(values[current], "write");
      await sleep(delayMs);
      rightIndex += 1;
      current += 1;
    }
  }

  function rangeSet(start, end) {
    var set = {};

    for (var i = start; i <= end; i += 1) {
      set[i] = true;
    }

    return set;
  }

  async function animateQuick(values, token, stats) {
    await quickSort(values, 0, values.length - 1, token, stats, 1);

    if (token === runToken) {
      renderPanel("quick", values, { label: "Sorted", sortedFrom: 0 });
    }
  }

  async function quickSort(values, low, high, token, stats, depth) {
    if (low >= high || token !== runToken) {
      return;
    }

    trackMemory(stats, depth);
    var pivotIndex = await partition(values, low, high, token);
    await quickSort(values, low, pivotIndex - 1, token, stats, depth + 1);
    await quickSort(values, pivotIndex + 1, high, token, stats, depth + 1);
  }

  async function partition(values, low, high, token) {
    var pivot = values[high];
    var smaller = low;

    for (var i = low; i < high; i += 1) {
      if (token !== runToken) {
        return high;
      }

      renderPanel("quick", values, {
        label: "Partitioning",
        active: [high],
        compare: [i, high],
        codeLines: [1, 2, 3]
      });
      playTone(Math.max(values[i], pivot), "compare");
      await sleep(delayMs);

      if (values[i] <= pivot) {
        swap(values, i, smaller);
        renderPanel("quick", values, {
          label: "Swapping into partition",
          active: [i, smaller, high],
          codeLines: [3, 4]
        });
        playTone(values[smaller], "write");
        await sleep(delayMs);
        smaller += 1;
      }
    }

    swap(values, smaller, high);
    renderPanel("quick", values, {
      label: "Pivot placed",
      active: [smaller],
      codeLines: [5, 6, 7]
    });
    playTone(values[smaller], "write");
    await sleep(delayMs);
    return smaller;
  }

  async function animateHeap(values, token, stats) {
    var length = values.length;
    trackMemory(stats, 1);

    for (var i = Math.floor(length / 2) - 1; i >= 0; i -= 1) {
      await heapify(values, length, i, token);
    }

    for (var end = length - 1; end > 0; end -= 1) {
      if (token !== runToken) {
        return;
      }

      swap(values, 0, end);
      renderPanel("heap", values, {
        label: "Extracting max",
        active: [0, end],
        sortedFrom: end,
        codeLines: [5, 6]
      });
      playTone(values[end], "write");
      await sleep(delayMs);
      await heapify(values, end, 0, token, end);
    }

    renderPanel("heap", values, { label: "Sorted", sortedFrom: 0 });
  }

  async function heapify(values, length, root, token, sortedFrom) {
    var largest = root;
    var left = 2 * root + 1;
    var right = 2 * root + 2;

    if (left < length) {
      renderPanel("heap", values, {
        label: "Heapifying",
        active: [root],
        compare: [left, largest],
        sortedFrom: typeof sortedFrom === "number" ? sortedFrom : values.length,
        codeLines: [1, 2, 3]
      });
      playTone(Math.max(values[left], values[largest]), "compare");
      await sleep(delayMs);
      if (values[left] > values[largest]) {
        largest = left;
      }
    }

    if (right < length) {
      renderPanel("heap", values, {
        label: "Heapifying",
        active: [root],
        compare: [right, largest],
        sortedFrom: typeof sortedFrom === "number" ? sortedFrom : values.length,
        codeLines: [1, 2, 3]
      });
      playTone(Math.max(values[right], values[largest]), "compare");
      await sleep(delayMs);
      if (values[right] > values[largest]) {
        largest = right;
      }
    }

    if (largest !== root && token === runToken) {
      swap(values, root, largest);
      renderPanel("heap", values, {
        label: "Swapping in heap",
        active: [root, largest],
        sortedFrom: typeof sortedFrom === "number" ? sortedFrom : values.length,
        codeLines: [3, 4]
      });
      playTone(Math.max(values[root], values[largest]), "write");
      await sleep(delayMs);
      await heapify(values, length, largest, token, sortedFrom);
    }
  }

  async function animateShell(values, token, stats) {
    var gap = Math.floor(values.length / 2);
    trackMemory(stats, 1);

    while (gap > 0) {
      for (var i = gap; i < values.length; i += 1) {
        if (token !== runToken) {
          return;
        }

        var temp = values[i];
        var j = i;

        renderPanel("shell", values, {
          label: "Gap " + gap,
          active: [i],
          codeLines: [1, 2, 3]
        });
        playTone(temp, "compare");
        await sleep(delayMs);

        while (j >= gap && values[j - gap] > temp) {
          if (token !== runToken) {
            return;
          }

          values[j] = values[j - gap];
          renderPanel("shell", values, {
            label: "Shifting by gap",
            compare: [j, j - gap],
            codeLines: [4]
          });
          playTone(values[j], "write");
          await sleep(delayMs);
          j -= gap;
        }

        values[j] = temp;
        renderPanel("shell", values, {
          label: "Inserted with gap",
          active: [j],
          codeLines: [5, 6]
        });
        playTone(temp, "write");
        await sleep(delayMs);
      }

      gap = Math.floor(gap / 2);
    }

    renderPanel("shell", values, { label: "Sorted", sortedFrom: 0 });
  }

  async function animateRadix(values, token, stats) {
    var max = Math.max.apply(null, values);
    var exp = 1;
    var output = new Array(values.length);
    trackMemory(stats, output.length + 10);

    while (Math.floor(max / exp) > 0) {
      if (token !== runToken) {
        return;
      }

      var count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      for (var i = 0; i < values.length; i += 1) {
        count[Math.floor(values[i] / exp) % 10] += 1;
        renderPanel("radix", values, {
          label: "Counting digits",
          active: [i],
          codeLines: [1, 2, 3]
        });
        playTone(values[i], "compare");
        await sleep(Math.max(10, delayMs / 2));
      }

      for (var countIndex = 1; countIndex < 10; countIndex += 1) {
        count[countIndex] += count[countIndex - 1];
      }

      for (var j = values.length - 1; j >= 0; j -= 1) {
        var digit = Math.floor(values[j] / exp) % 10;
        output[count[digit] - 1] = values[j];
        count[digit] -= 1;
      }

      for (var writeIndex = 0; writeIndex < values.length; writeIndex += 1) {
        if (token !== runToken) {
          return;
        }

        values[writeIndex] = output[writeIndex];
        renderPanel("radix", values, {
          label: "Writing pass " + exp,
          active: [writeIndex],
          codeLines: [4, 5, 6, 7]
        });
        playTone(values[writeIndex], "write");
        await sleep(delayMs);
      }

      exp *= 10;
    }

    renderPanel("radix", values, { label: "Sorted", sortedFrom: 0 });
  }

  function swap(values, a, b) {
    var temp = values[a];
    values[a] = values[b];
    values[b] = temp;
  }

  function runMetricsPass(name, values) {
    var copy = values.slice();
    var startedAt = performance.now();
    var estimatedMemory = 1;

    if (name === "merge") {
      estimatedMemory = copy.length;
      mergeSortSync(copy, new Array(copy.length), 0, copy.length - 1);
    } else if (name === "quick") {
      estimatedMemory = quickSortSync(copy, 0, copy.length - 1, 1);
    } else if (name === "heap") {
      heapSortSync(copy);
    } else if (name === "shell") {
      shellSortSync(copy);
    } else if (name === "radix") {
      estimatedMemory = copy.length + 10;
      radixSortSync(copy);
    } else if (name === "bubble") {
      bubbleSortSync(copy);
    } else if (name === "selection") {
      selectionSortSync(copy);
    } else if (name === "insertion") {
      insertionSortSync(copy);
    }

    return {
      elapsedMs: performance.now() - startedAt,
      peakMemory: estimatedMemory
    };
  }

  function bubbleSortSync(values) {
    for (var end = values.length - 1; end > 0; end -= 1) {
      for (var i = 0; i < end; i += 1) {
        if (values[i] > values[i + 1]) {
          swap(values, i, i + 1);
        }
      }
    }
  }

  function selectionSortSync(values) {
    for (var start = 0; start < values.length; start += 1) {
      var minIndex = start;

      for (var i = start + 1; i < values.length; i += 1) {
        if (values[i] < values[minIndex]) {
          minIndex = i;
        }
      }

      if (minIndex !== start) {
        swap(values, start, minIndex);
      }
    }
  }

  function insertionSortSync(values) {
    for (var i = 1; i < values.length; i += 1) {
      var current = values[i];
      var j = i - 1;

      while (j >= 0 && values[j] > current) {
        values[j + 1] = values[j];
        j -= 1;
      }

      values[j + 1] = current;
    }
  }

  function mergeSortSync(values, aux, left, right) {
    if (left >= right) {
      return;
    }

    var mid = Math.floor((left + right) / 2);
    mergeSortSync(values, aux, left, mid);
    mergeSortSync(values, aux, mid + 1, right);
    mergeSync(values, aux, left, mid, right);
  }

  function mergeSync(values, aux, left, mid, right) {
    for (var i = left; i <= right; i += 1) {
      aux[i] = values[i];
    }

    var leftIndex = left;
    var rightIndex = mid + 1;
    var current = left;

    while (leftIndex <= mid && rightIndex <= right) {
      if (aux[leftIndex] <= aux[rightIndex]) {
        values[current] = aux[leftIndex];
        leftIndex += 1;
      } else {
        values[current] = aux[rightIndex];
        rightIndex += 1;
      }

      current += 1;
    }

    while (leftIndex <= mid) {
      values[current] = aux[leftIndex];
      leftIndex += 1;
      current += 1;
    }

    while (rightIndex <= right) {
      values[current] = aux[rightIndex];
      rightIndex += 1;
      current += 1;
    }
  }

  function quickSortSync(values, low, high, depth) {
    if (low >= high) {
      return depth;
    }

    var peakDepth = depth;
    var pivot = values[high];
    var smaller = low;

    for (var i = low; i < high; i += 1) {
      if (values[i] <= pivot) {
        swap(values, i, smaller);
        smaller += 1;
      }
    }

    swap(values, smaller, high);
    peakDepth = Math.max(peakDepth, quickSortSync(values, low, smaller - 1, depth + 1));
    peakDepth = Math.max(peakDepth, quickSortSync(values, smaller + 1, high, depth + 1));
    return peakDepth;
  }

  function heapSortSync(values) {
    for (var i = Math.floor(values.length / 2) - 1; i >= 0; i -= 1) {
      heapifySync(values, values.length, i);
    }

    for (var end = values.length - 1; end > 0; end -= 1) {
      swap(values, 0, end);
      heapifySync(values, end, 0);
    }
  }

  function heapifySync(values, length, root) {
    var largest = root;
    var left = 2 * root + 1;
    var right = 2 * root + 2;

    if (left < length && values[left] > values[largest]) {
      largest = left;
    }

    if (right < length && values[right] > values[largest]) {
      largest = right;
    }

    if (largest !== root) {
      swap(values, root, largest);
      heapifySync(values, length, largest);
    }
  }

  function shellSortSync(values) {
    for (var gap = Math.floor(values.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
      for (var i = gap; i < values.length; i += 1) {
        var temp = values[i];
        var j = i;

        while (j >= gap && values[j - gap] > temp) {
          values[j] = values[j - gap];
          j -= gap;
        }

        values[j] = temp;
      }
    }
  }

  function radixSortSync(values) {
    var max = Math.max.apply(null, values);
    var exp = 1;
    var output = new Array(values.length);

    while (Math.floor(max / exp) > 0) {
      var count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      for (var i = 0; i < values.length; i += 1) {
        count[Math.floor(values[i] / exp) % 10] += 1;
      }

      for (var countIndex = 1; countIndex < 10; countIndex += 1) {
        count[countIndex] += count[countIndex - 1];
      }

      for (var j = values.length - 1; j >= 0; j -= 1) {
        var digit = Math.floor(values[j] / exp) % 10;
        output[count[digit] - 1] = values[j];
        count[digit] -= 1;
      }

      for (var writeIndex = 0; writeIndex < values.length; writeIndex += 1) {
        values[writeIndex] = output[writeIndex];
      }

      exp *= 10;
    }
  }

  async function runAlgorithm(name) {
    var localArray = cloneArray();
    var token = runToken;
    var metrics = runMetricsPass(name, localArray);
    var stats = createStats();
    stats.startTime = performance.now();
    stats.peakMemory = metrics.peakMemory;
    activeRuns += 1;
    setControlsDisabled(true);
    updateMetrics(name, metrics.elapsedMs, metrics.peakMemory);

    try {
      if (name === "bubble") {
        await animateBubble(localArray, token, stats);
      } else if (name === "selection") {
        await animateSelection(localArray, token, stats);
      } else if (name === "insertion") {
        await animateInsertion(localArray, token, stats);
      } else if (name === "merge") {
        await animateMerge(localArray, token, stats);
      } else if (name === "quick") {
        await animateQuick(localArray, token, stats);
      } else if (name === "heap") {
        await animateHeap(localArray, token, stats);
      } else if (name === "shell") {
        await animateShell(localArray, token, stats);
      } else if (name === "radix") {
        await animateRadix(localArray, token, stats);
      }
    } finally {
      activeRuns -= 1;

      if (activeRuns <= 0) {
        activeRuns = 0;
        setControlsDisabled(false);
      }

      updateRunButtonState();
    }
  }

  function rebuildArray() {
    runToken += 1;
    activeRuns = 0;
    sharedArray = buildArray(parseInt(sizeInput.value, 10));
    setControlsDisabled(false);
    renderAllReady();
    updateRunButtonState();
  }

  sizeInput.addEventListener("input", function (event) {
    sizeValue.textContent = event.target.value + " bars";
    updatePerformanceWarning();
  });

  sizeInput.addEventListener("change", rebuildArray);

  speedInput.addEventListener("input", function (event) {
    delayMs = parseInt(event.target.value, 10);
    speedValue.textContent = delayMs + " ms";
    updatePerformanceWarning();
  });

  soundToggle.addEventListener("change", function (event) {
    soundEnabled = event.target.checked;

    if (soundEnabled) {
      ensureAudioContext();
    }
  });

  shuffleButton.addEventListener("click", rebuildArray);

  runSelectedButton.addEventListener("click", function () {
    var selected = getSelectedAlgorithms();

    if (selected.length === 0) {
      return;
    }

    runToken += 1;
    activeRuns = 0;
    resetStatuses("Queued");

    selected.forEach(function (name) {
      runAlgorithm(name);
    });
  });

  algorithmButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var algorithm = button.getAttribute("data-algorithm");
      selectedAlgorithms[algorithm] = !selectedAlgorithms[algorithm];
      button.classList.toggle("is-selected", selectedAlgorithms[algorithm]);
      button.setAttribute("aria-pressed", selectedAlgorithms[algorithm] ? "true" : "false");
      renderPanel(algorithm, cloneArray(), {
        label: selectedAlgorithms[algorithm] ? "Ready" : "Not selected"
      });
      resetMetrics(algorithm);
      syncCardVisibility();
      updateRunButtonState();
    });
  });

  codeToggleButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var algorithm = button.getAttribute("data-code-toggle");
      var panel = document.getElementById("code-panel-" + algorithm);
      var expanded = button.getAttribute("aria-expanded") === "true";

      button.setAttribute("aria-expanded", expanded ? "false" : "true");
      button.textContent = expanded ? "Show code" : "Hide code";
      panel.hidden = expanded;
    });
  });

  setupCodePanels();
  sizeValue.textContent = sizeInput.value + " bars";
  speedValue.textContent = delayMs + " ms";
  updatePerformanceWarning();
  rebuildArray();
})();
