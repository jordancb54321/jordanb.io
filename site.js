(() => {
  // The project wall uses normal links, including without JavaScript.

  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  if ("IntersectionObserver" in window) {
    const entrances = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!calm.matches) entry.target.classList.add("arriving");
          entrances.unobserve(entry.target);
        }
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll("[data-enter]")
      .forEach((element) => entrances.observe(element));
  }

  const film = document.querySelector("#fractal-film");
  const toggle = document.querySelector("#film-toggle");
  if (!film || !toggle || !("IntersectionObserver" in window)) return;
  let inView = false;
  let pausedByVisitor = false;
  toggle.hidden = false;
  const updateButton = () => {
    const playing = !film.paused;
    toggle.textContent = playing ? "Pause motion" : "Play motion";
    toggle.setAttribute("aria-pressed", String(playing));
  };
  const sync = () => {
    if (!inView || document.hidden || calm.matches || pausedByVisitor) {
      film.pause();
    } else {
      film.play().catch(updateButton);
    }
    updateButton();
  };
  toggle.addEventListener("click", () => {
    if (film.paused) {
      pausedByVisitor = false;
      film.play().catch(updateButton);
    } else {
      pausedByVisitor = true;
      film.pause();
    }
    updateButton();
  });
  film.addEventListener("play", updateButton);
  film.addEventListener("pause", updateButton);
  calm.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      sync();
    },
    { threshold: 0.15 },
  ).observe(film);
})();
