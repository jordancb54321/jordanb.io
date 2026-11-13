(() => {
  const choices = [...document.querySelectorAll("[data-project-select]")];
  const pictures = [...document.querySelectorAll("[data-project-picture]")];
  const projects = [...document.querySelectorAll("[data-project]")];
  const choose = (index) => {
    for (const choice of choices) {
      choice.setAttribute(
        "aria-pressed",
        String(choice.dataset.projectSelect === index),
      );
    }
    for (const picture of pictures) {
      const active = picture.dataset.projectPicture === index;
      picture.classList.toggle("is-active", active);
      picture.setAttribute("aria-hidden", String(!active));
    }
    for (const project of projects) {
      project.classList.toggle(
        "is-selected",
        project.dataset.project === index,
      );
    }
  };
  for (const choice of choices) {
    choice.addEventListener("click", () =>
      choose(choice.dataset.projectSelect),
    );
    choice.addEventListener("focus", () =>
      choose(choice.dataset.projectSelect),
    );
    choice.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") choose(choice.dataset.projectSelect);
    });
  }
  choose("0");

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
