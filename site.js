(() => {
  const canvas = document.querySelector('#project-preview');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const projects = {
    fractal: {
      title: 'Fractal renderer',
      category: 'Interactive / Fractals',
      href: 'fractal/',
      label: 'A dot-matrix rendering of the Mandelbrot set'
    },
    sorting: {
      title: 'Sorting visualiser',
      category: 'Interactive / Algorithms',
      href: 'sorting',
      label: 'An array of values represented by columns of white dots'
    },
    chess: {
      title: 'Chess',
      category: 'Interactive / Game AI',
      href: 'chess',
      label: 'A dot-matrix chess board with a knight'
    },
    study: {
      title: 'Study deck',
      category: 'Interactive / Learning',
      href: 'learn',
      label: 'HTML tags on a stack of flashcards'
    }
  };
  let selected = 'fractal';
  const w = canvas.width,
    h = canvas.height;
  const dot = (x, y, r, color = '#deded7') => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  function draw() {
    ctx.fillStyle = '#171717';
    ctx.fillRect(0, 0, w, h);
    // A quiet registration grid remains behind every project representation.
    for (let y = 90; y < h - 90; y += 12)
      for (let x = 36; x < w - 36; x += 12) dot(x, y, .65, '#363633');
    if (selected === 'fractal') {
      for (let y = 120; y < h - 115; y += 4)
        for (let x = 70; x < w - 70; x += 4) {
          const a = (x - w * .54) / (w * .235),
            b = (y - h * .49) / (w * .235);
          let re = 0,
            im = 0,
            n = 0;
          while (re * re + im * im < 100 && n < 90) {
            const next = re * re - im * im + a;
            im = 2 * re * im + b;
            re = next;
            n++;
          }
          if (n < 90 && n > 2) {
            const shade = Math.round(70 + 185 * Math.pow(n / 90, .38));
            dot(x, y, n > 15 ? 1.35 : .8, `rgb(${shade},${shade},${shade-5})`);
          }
        }
      // The two red registration marks echo the site's single accent.
      ctx.strokeStyle = '#e02b31';
      ctx.lineWidth = 2;
      for (const [x, y] of [
          [155, 160],
          [745, 540]
        ]) {
        ctx.beginPath();
        ctx.moveTo(x - 9, y);
        ctx.lineTo(x + 9, y);
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x, y + 9);
        ctx.stroke();
      }
    } else if (selected === 'sorting') {
      for (let i = 0; i < 26; i++) {
        const height = 75 + ((i * 67 + 29) % 290);
        for (let y = 0; y < height; y += 10)
          for (let x = 0; x < 12; x += 6) dot(145 + i * 24 + x, 515 - y, 2, i === 13 || i === 14 ? '#e02b31' : '#deded7');
      }
    } else if (selected === 'chess') {
      const unit = 46,
        left = 266,
        top = 155;
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 8; col++)
          for (let dy = 5; dy < unit; dy += 7)
            for (let dx = 5; dx < unit; dx += 7) dot(left + col * unit + dx, top + row * unit + dy, 1.5, (row + col) % 2 ? '#5c5c56' : '#c9c9c0');
      ctx.fillStyle = '#171717';
      ctx.fillRect(330, 220, 240, 240);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ededdf';
      ctx.font = '230px Georgia,serif';
      ctx.fillText('♞', 450, 425);
      dot(510, 252, 5, '#e02b31');
    } else {
      ctx.strokeStyle = '#6d6d65';
      ctx.lineWidth = 2;
      for (let i = 2; i >= 0; i--) {
        const x = 215 + i * 18,
          y = 180 - i * 18;
        ctx.fillStyle = '#171717';
        ctx.fillRect(x, y, 440, 300);
        ctx.strokeRect(x, y, 440, 300);
      }
      ctx.textAlign = 'center';
      ctx.font = '600 100px monospace';
      ctx.fillStyle = '#e8e8df';
      ctx.fillText('</>', 435, 362);
      dot(610, 219, 5, '#e02b31');
    }
  }
  const switcher = document.querySelector('.preview-switcher');
  switcher.hidden = false;
  switcher.addEventListener('click', event => {
    const button = event.target.closest('[data-preview]');
    if (!button) return;
    selected = button.dataset.preview;
    const project = projects[selected];
    switcher.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelector('#preview-title').textContent = project.title;
    document.querySelector('#preview-category').textContent = project.category;
    document.querySelector('#preview-link').href = project.href;
    canvas.setAttribute('aria-label', project.label);
    document.querySelector('#preview-announcement').textContent = `${project.title} preview selected.`;
    draw();
  });
  draw();
})();
