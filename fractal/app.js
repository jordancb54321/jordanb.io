const PRESETS = {
  mandelbrot: [
    { name: "Classic", centerX: -0.5, centerY: 0, scale: 3.2, iterations: 500 },
    { name: "Seahorse Valley", centerX: -0.74543, centerY: 0.11301, scale: 0.012, iterations: 900 },
    { name: "Elephant Valley", centerX: 0.282, centerY: 0.008, scale: 0.008, iterations: 1000 }
  ],
  julia: [
    { name: "Dust", centerX: 0, centerY: 0, scale: 3.2, iterations: 500, juliaReal: -0.8, juliaImag: 0.156 },
    { name: "Spiral", centerX: 0, centerY: 0, scale: 3.2, iterations: 700, juliaReal: -0.4, juliaImag: 0.6 },
    { name: "Lightning", centerX: 0, centerY: 0, scale: 3.2, iterations: 700, juliaReal: 0.285, juliaImag: 0.01 }
  ],
  burningShip: [
    { name: "Classic", centerX: -0.45, centerY: -0.5, scale: 3.2, iterations: 500 },
    { name: "Harbor", centerX: -1.76, centerY: -0.03, scale: 0.035, iterations: 900 },
    { name: "Turbulence", centerX: -1.72, centerY: -0.0185, scale: 0.0065, iterations: 1300 }
  ],
  tricorn: [
    { name: "Classic", centerX: 0, centerY: 0, scale: 3.2, iterations: 500 },
    { name: "Needle Wing", centerX: -0.029, centerY: 0.023, scale: 0.018, iterations: 950 },
    { name: "Crown", centerX: -0.55, centerY: 0.55, scale: 0.085, iterations: 800 }
  ],
  multibrot3: [
    { name: "Classic", centerX: 0, centerY: 0, scale: 3.2, iterations: 500 },
    { name: "Cubic Bloom", centerX: -0.12, centerY: 0.74, scale: 0.25, iterations: 850 },
    { name: "Petal Rift", centerX: 0.38, centerY: -0.22, scale: 0.09, iterations: 1000 }
  ],
  celtic: [
    { name: "Classic", centerX: -0.5, centerY: 0, scale: 3.2, iterations: 500 },
    { name: "Braided Core", centerX: -0.72, centerY: 0.0, scale: 0.05, iterations: 850 },
    { name: "Ribbon Fold", centerX: -0.41, centerY: -0.26, scale: 0.08, iterations: 950 }
  ],
  buffalo: [
    { name: "Classic", centerX: -0.2, centerY: 0, scale: 3.2, iterations: 500 },
    { name: "Horn Field", centerX: -0.98, centerY: 0.33, scale: 0.06, iterations: 900 },
    { name: "Storm Front", centerX: -0.24, centerY: -0.92, scale: 0.07, iterations: 1000 }
  ]
};

const PALETTES = {
  ember: [[4, 9, 18], [91, 27, 81], [255, 92, 54], [255, 223, 125]],
  lagoon: [[2, 9, 18], [14, 55, 92], [67, 170, 139], [221, 255, 221]],
  ice: [[6, 13, 24], [48, 87, 144], [148, 222, 255], [255, 255, 255]],
  neon: [[8, 5, 18], [101, 32, 155], [255, 77, 109], [255, 205, 86]],
  mono: [[0, 0, 0], [70, 70, 70], [160, 160, 160], [255, 255, 255]],
  sunset: [[17, 11, 44], [104, 45, 122], [227, 102, 72], [255, 207, 115]],
  aurora: [[3, 15, 26], [7, 82, 91], [63, 195, 128], [211, 255, 185]],
  lava: [[12, 6, 4], [101, 17, 0], [214, 68, 0], [255, 205, 79]],
  forest: [[4, 15, 7], [19, 71, 36], [73, 140, 76], [214, 242, 178]],
  royal: [[10, 8, 35], [38, 43, 118], [122, 85, 214], [243, 221, 255]],
  candy: [[24, 4, 34], [132, 18, 117], [255, 102, 163], [255, 229, 247]],
  oceanic: [[3, 15, 39], [17, 78, 127], [62, 160, 196], [214, 246, 255]]
};

const canvas = document.getElementById("fractalCanvas");
const canvasFrame = canvas.parentElement;
const ctx = canvas.getContext("2d", { alpha: false });

const elements = {
  controls: document.getElementById("controls"),
  fractalType: document.getElementById("fractalType"),
  presetSelect: document.getElementById("presetSelect"),
  iterations: document.getElementById("iterations"),
  iterationsValue: document.getElementById("iterationsValue"),
  escapeRadius: document.getElementById("escapeRadius"),
  escapeRadiusValue: document.getElementById("escapeRadiusValue"),
  colorCycles: document.getElementById("colorCycles"),
  colorCyclesValue: document.getElementById("colorCyclesValue"),
  resolutionScale: document.getElementById("resolutionScale"),
  resolutionScaleValue: document.getElementById("resolutionScaleValue"),
  palette: document.getElementById("palette"),
  smoothColoring: document.getElementById("smoothColoring"),
  juliaReal: document.getElementById("juliaReal"),
  juliaImag: document.getElementById("juliaImag"),
  renderButton: document.getElementById("renderButton"),
  autoZoomButton: document.getElementById("autoZoomButton"),
  resetViewButton: document.getElementById("resetViewButton"),
  downloadButton: document.getElementById("downloadButton"),
  fitViewButton: document.getElementById("fitViewButton"),
  centerValue: document.getElementById("centerValue"),
  zoomValue: document.getElementById("zoomValue"),
  renderStatus: document.getElementById("renderStatus"),
  canvasInfo: document.getElementById("canvasInfo")
};

const state = {
  fractalType: "mandelbrot",
  centerX: -0.5,
  centerY: 0,
  scale: 3.2,
  iterations: 500,
  escapeRadius: 4,
  colorCycles: 1.6,
  resolutionScale: 1,
  palette: "ember",
  smoothColoring: true,
  juliaReal: -0.8,
  juliaImag: 0.156,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragCenterX: 0,
  dragCenterY: 0,
  renderToken: 0,
  autoZooming: false,
  autoZoomTimer: null,
  autoZoomStep: 0
};

const AUTO_ZOOM = {
  samplesAcross: 9,
  samplesDown: 7,
  localRadius: 0.075,
  zoomFactor: 0.68,
  delay: 260,
  maxSteps: 90,
  minimumScale: 1e-12
};

function updatePresetOptions() {
  const presets = PRESETS[state.fractalType];
  elements.presetSelect.innerHTML = "";
  presets.forEach((preset, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = preset.name;
    elements.presetSelect.append(option);
  });
}

function applyPreset(index) {
  const preset = PRESETS[state.fractalType][index];
  if (!preset) {
    return;
  }

  state.centerX = preset.centerX;
  state.centerY = preset.centerY;
  state.scale = preset.scale;
  state.iterations = preset.iterations ?? state.iterations;
  state.juliaReal = preset.juliaReal ?? state.juliaReal;
  state.juliaImag = preset.juliaImag ?? state.juliaImag;
  syncControlsFromState();
  renderFractal();
}

function syncControlsFromState() {
  elements.fractalType.value = state.fractalType;
  elements.iterations.value = String(state.iterations);
  elements.iterationsValue.textContent = String(state.iterations);
  elements.escapeRadius.value = String(state.escapeRadius);
  elements.escapeRadiusValue.textContent = state.escapeRadius.toFixed(1);
  elements.colorCycles.value = String(state.colorCycles);
  elements.colorCyclesValue.textContent = state.colorCycles.toFixed(1);
  elements.resolutionScale.value = String(state.resolutionScale);
  elements.resolutionScaleValue.textContent = `${state.resolutionScale.toFixed(2)}x`;
  elements.palette.value = state.palette;
  elements.smoothColoring.checked = state.smoothColoring;
  elements.juliaReal.value = String(state.juliaReal);
  elements.juliaImag.value = String(state.juliaImag);
  updateStatus();
  toggleJuliaFields();
}

function syncStateFromControls() {
  state.fractalType = elements.fractalType.value;
  state.iterations = Number(elements.iterations.value);
  state.escapeRadius = Number(elements.escapeRadius.value);
  state.colorCycles = Number(elements.colorCycles.value);
  state.resolutionScale = Number(elements.resolutionScale.value);
  state.palette = elements.palette.value;
  state.smoothColoring = elements.smoothColoring.checked;
  state.juliaReal = Number(elements.juliaReal.value);
  state.juliaImag = Number(elements.juliaImag.value);
  syncControlsFromState();
}

function toggleJuliaFields() {
  const enabled = state.fractalType === "julia";
  for (const element of document.querySelectorAll(".julia-fields input")) {
    element.disabled = !enabled;
  }
  document.querySelector(".julia-fields").style.opacity = enabled ? "1" : "0.55";
}

function updateStatus(message = "Ready") {
  elements.centerValue.textContent = `${state.centerX.toFixed(6)}, ${state.centerY.toFixed(6)}`;
  elements.zoomValue.textContent = `${(3.2 / state.scale).toFixed(2)}x`;
  elements.renderStatus.textContent = message;
  elements.canvasInfo.textContent = `${canvas.width} x ${canvas.height}`;
}

function setAutoZoomButtonLabel() {
  elements.autoZoomButton.textContent = state.autoZooming ? "Pause auto zoom" : "Auto zoom";
  elements.autoZoomButton.setAttribute("aria-pressed", String(state.autoZooming));
}

function resizeCanvas() {
  const rect = canvasFrame.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width * state.resolutionScale));
  const height = Math.max(240, Math.floor(rect.height * state.resolutionScale));
  if (canvas.width === width && canvas.height === height) {
    return false;
  }

  canvas.width = width;
  canvas.height = height;
  updateStatus();
  return true;
}

function interpolateColor(stops, t) {
  const scaled = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const localT = scaled - index;
  const a = stops[index];
  const b = stops[index + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * localT),
    Math.round(a[1] + (b[1] - a[1]) * localT),
    Math.round(a[2] + (b[2] - a[2]) * localT)
  ];
}

function getPaletteStops(name) {
  return PALETTES[name] ?? PALETTES.ember;
}

function mapPixelToComplex(px, py) {
  const aspect = canvas.width / canvas.height;
  const x = state.centerX + ((px / canvas.width) - 0.5) * state.scale * aspect;
  const y = state.centerY + ((py / canvas.height) - 0.5) * state.scale;
  return { x, y };
}

function iteratePoint(x0, y0) {
  let x;
  let y;
  let cx;
  let cy;

  if (state.fractalType === "julia") {
    x = x0;
    y = y0;
    cx = state.juliaReal;
    cy = state.juliaImag;
  } else {
    x = 0;
    y = 0;
    cx = x0;
    cy = y0;
  }

  const escapeSquared = state.escapeRadius * state.escapeRadius;
  let iteration = 0;

  while (iteration < state.iterations) {
    let nextX;
    let nextY;

    switch (state.fractalType) {
      case "burningShip": {
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        nextX = absX * absX - absY * absY + cx;
        nextY = 2 * absX * absY + cy;
        break;
      }
      case "tricorn":
        nextX = x * x - y * y + cx;
        nextY = -2 * x * y + cy;
        break;
      case "multibrot3":
        nextX = x * x * x - 3 * x * y * y + cx;
        nextY = 3 * x * x * y - y * y * y + cy;
        break;
      case "celtic":
        nextX = Math.abs(x * x - y * y) + cx;
        nextY = 2 * x * y + cy;
        break;
      case "buffalo": {
        const quadX = x * x - y * y;
        const quadY = 2 * x * y;
        nextX = Math.abs(quadX) + cx;
        nextY = Math.abs(quadY) + cy;
        break;
      }
      default:
        nextX = x * x - y * y + cx;
        nextY = 2 * x * y + cy;
    }

    x = nextX;
    y = nextY;
    iteration += 1;

    const magnitudeSquared = x * x + y * y;
    if (magnitudeSquared > escapeSquared) {
      if (!state.smoothColoring) {
        return iteration;
      }

      const logZn = Math.log(magnitudeSquared) / 2;
      const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
      return iteration + 1 - nu;
    }
  }

  return state.iterations;
}

function getColor(value) {
  if (value >= state.iterations) {
    return [0, 0, 0];
  }

  const normalized = Math.max(0, Math.min(1, (value / state.iterations) * state.colorCycles % 1));
  return interpolateColor(getPaletteStops(state.palette), normalized);
}

async function renderFractal() {
  const token = ++state.renderToken;
  syncStateFromControls();
  resizeCanvas();

  elements.renderButton.disabled = true;
  elements.downloadButton.disabled = true;
  updateStatus("Rendering...");

  const imageData = ctx.createImageData(canvas.width, canvas.height);
  const batchRows = 24;

  for (let y = 0; y < canvas.height; y += batchRows) {
    if (token !== state.renderToken) {
      return;
    }

    const endY = Math.min(canvas.height, y + batchRows);

    for (let py = y; py < endY; py += 1) {
      for (let px = 0; px < canvas.width; px += 1) {
        const point = mapPixelToComplex(px, py);
        const value = iteratePoint(point.x, point.y);
        const [r, g, b] = getColor(value);
        const offset = (py * canvas.width + px) * 4;
        imageData.data[offset] = r;
        imageData.data[offset + 1] = g;
        imageData.data[offset + 2] = b;
        imageData.data[offset + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    updateStatus(`Rendering row ${Math.min(endY, canvas.height)} / ${canvas.height}`);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  elements.renderButton.disabled = false;
  elements.downloadButton.disabled = false;
  updateStatus("Complete");

  if (state.autoZooming && token === state.renderToken) {
    queueAutoZoomStep();
  }
}

function zoomAt(canvasX, canvasY, zoomFactor) {
  stopAutoZoom();
  const before = mapPixelToComplex(canvasX, canvasY);
  state.scale *= zoomFactor;
  const after = mapPixelToComplex(canvasX, canvasY);
  state.centerX += before.x - after.x;
  state.centerY += before.y - after.y;
  syncControlsFromState();
  renderFractal();
}

function getComplexAtNormalized(normalizedX, normalizedY) {
  const aspect = canvas.width / canvas.height;
  return {
    x: state.centerX + (normalizedX - 0.5) * state.scale * aspect,
    y: state.centerY + (normalizedY - 0.5) * state.scale
  };
}

function scoreCandidate(point) {
  const aspect = canvas.width / canvas.height;
  const radiusX = state.scale * aspect * AUTO_ZOOM.localRadius;
  const radiusY = state.scale * AUTO_ZOOM.localRadius;
  const offsets = [
    [0, 0],
    [-radiusX, 0],
    [radiusX, 0],
    [0, -radiusY],
    [0, radiusY],
    [-radiusX * 0.62, -radiusY * 0.62],
    [radiusX * 0.62, -radiusY * 0.62],
    [-radiusX * 0.62, radiusY * 0.62],
    [radiusX * 0.62, radiusY * 0.62]
  ];

  const values = offsets.map(([dx, dy]) => iteratePoint(point.x + dx, point.y + dy));
  const normalized = values.map((value) => Math.min(1, value / state.iterations));
  const escapedCount = values.filter((value) => value < state.iterations).length;
  const interiorCount = values.length - escapedCount;

  if (escapedCount === 0 || interiorCount === 0) {
    return -Infinity;
  }

  const average = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
  const variance = normalized.reduce((sum, value) => sum + (value - average) ** 2, 0) / normalized.length;
  const range = Math.max(...normalized) - Math.min(...normalized);
  const boundaryMix = Math.min(escapedCount, interiorCount) / values.length;
  const sweetSpot = 1 - Math.abs(average - 0.55);

  return variance * 8 + range * 2.6 + boundaryMix * 3.2 + sweetSpot;
}

function findInterestingTarget() {
  const candidates = [];

  for (let row = 0; row < AUTO_ZOOM.samplesDown; row += 1) {
    const normalizedY = 0.18 + (row / (AUTO_ZOOM.samplesDown - 1)) * 0.64;

    for (let col = 0; col < AUTO_ZOOM.samplesAcross; col += 1) {
      const normalizedX = 0.16 + (col / (AUTO_ZOOM.samplesAcross - 1)) * 0.68;
      const point = getComplexAtNormalized(normalizedX, normalizedY);
      const centerBias = 1 - Math.hypot(normalizedX - 0.5, normalizedY - 0.5);
      const score = scoreCandidate(point) + centerBias * 0.18;

      if (Number.isFinite(score)) {
        candidates.push({ point, score });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return null;
  }

  const topChoices = candidates.slice(0, Math.min(5, candidates.length));
  return topChoices[Math.floor(Math.random() * topChoices.length)].point;
}

function queueAutoZoomStep() {
  window.clearTimeout(state.autoZoomTimer);

  if (!state.autoZooming) {
    return;
  }

  state.autoZoomTimer = window.setTimeout(runAutoZoomStep, AUTO_ZOOM.delay);
}

function runAutoZoomStep() {
  if (!state.autoZooming) {
    return;
  }

  if (state.scale <= AUTO_ZOOM.minimumScale || state.autoZoomStep >= AUTO_ZOOM.maxSteps) {
    stopAutoZoom("Auto zoom paused at deep zoom");
    return;
  }

  const target = findInterestingTarget();

  if (!target) {
    stopAutoZoom("Auto zoom paused: no detailed edge found");
    return;
  }

  state.centerX = target.x;
  state.centerY = target.y;
  state.scale *= AUTO_ZOOM.zoomFactor;
  state.iterations = Math.min(2500, Math.max(state.iterations, Math.round(state.iterations * 1.035)));
  state.autoZoomStep += 1;
  syncControlsFromState();
  renderFractal();
}

function startAutoZoom() {
  if (state.autoZooming) {
    return;
  }

  state.autoZooming = true;
  state.autoZoomStep = 0;
  setAutoZoomButtonLabel();
  updateStatus("Auto zoom searching...");
  window.clearTimeout(state.autoZoomTimer);
  state.autoZoomTimer = window.setTimeout(runAutoZoomStep, 20);
}

function stopAutoZoom(message = "Auto zoom paused") {
  if (!state.autoZooming && !state.autoZoomTimer) {
    return;
  }

  state.autoZooming = false;
  window.clearTimeout(state.autoZoomTimer);
  state.autoZoomTimer = null;
  setAutoZoomButtonLabel();
  updateStatus(message);
}

function setDefaultView(type = state.fractalType) {
  const preset = PRESETS[type][0];
  state.fractalType = type;
  state.centerX = preset.centerX;
  state.centerY = preset.centerY;
  state.scale = preset.scale;
  state.iterations = preset.iterations;
  if (preset.juliaReal !== undefined) {
    state.juliaReal = preset.juliaReal;
  }
  if (preset.juliaImag !== undefined) {
    state.juliaImag = preset.juliaImag;
  }
  updatePresetOptions();
  elements.presetSelect.value = "0";
  syncControlsFromState();
}

elements.controls.addEventListener("input", (event) => {
  stopAutoZoom();

  if (event.target === elements.fractalType) {
    setDefaultView(elements.fractalType.value);
    renderFractal();
    return;
  }

  syncStateFromControls();
});

elements.controls.addEventListener("change", (event) => {
  stopAutoZoom();

  if (event.target === elements.presetSelect) {
    applyPreset(Number(elements.presetSelect.value));
    return;
  }

  renderFractal();
});

elements.renderButton.addEventListener("click", () => {
  stopAutoZoom();
  renderFractal();
});

elements.autoZoomButton.addEventListener("click", () => {
  if (state.autoZooming) {
    stopAutoZoom();
    return;
  }

  startAutoZoom();
});

elements.resetViewButton.addEventListener("click", () => {
  stopAutoZoom();
  setDefaultView();
  renderFractal();
});

elements.fitViewButton.addEventListener("click", () => {
  stopAutoZoom();
  if (resizeCanvas()) {
    renderFractal();
  }
});

elements.downloadButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${state.fractalType}-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const canvasX = (event.clientX - rect.left) * (canvas.width / rect.width);
  const canvasY = (event.clientY - rect.top) * (canvas.height / rect.height);
  const zoomFactor = event.deltaY < 0 ? 0.82 : 1.22;
  zoomAt(canvasX, canvasY, zoomFactor);
}, { passive: false });

canvas.addEventListener("pointerdown", (event) => {
  stopAutoZoom();
  state.dragging = true;
  state.dragStartX = event.clientX;
  state.dragStartY = event.clientY;
  state.dragCenterX = state.centerX;
  state.dragCenterY = state.centerY;
  canvas.classList.add("is-dragging");
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.dragging) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const dx = (event.clientX - state.dragStartX) * (canvas.width / rect.width);
  const dy = (event.clientY - state.dragStartY) * (canvas.height / rect.height);
  const aspect = canvas.width / canvas.height;
  state.centerX = state.dragCenterX - (dx / canvas.width) * state.scale * aspect;
  state.centerY = state.dragCenterY - (dy / canvas.height) * state.scale;
  updateStatus("Panning...");
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
});

function stopDragging(event) {
  if (!state.dragging) {
    return;
  }

  state.dragging = false;
  canvas.classList.remove("is-dragging");
  if (event) {
    canvas.releasePointerCapture(event.pointerId);
  }
  syncControlsFromState();
  renderFractal();
}

canvas.addEventListener("pointerup", stopDragging);
canvas.addEventListener("pointercancel", stopDragging);
canvas.addEventListener("dblclick", (event) => {
  const rect = canvas.getBoundingClientRect();
  const canvasX = (event.clientX - rect.left) * (canvas.width / rect.width);
  const canvasY = (event.clientY - rect.top) * (canvas.height / rect.height);
  zoomAt(canvasX, canvasY, event.shiftKey ? 1.8 : 0.45);
});

window.addEventListener("resize", () => {
  stopAutoZoom();
  resizeCanvas();
  renderFractal();
});

setDefaultView("mandelbrot");
resizeCanvas();
setAutoZoomButtonLabel();
renderFractal();
