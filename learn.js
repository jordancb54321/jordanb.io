(function () {
  "use strict";

  var STORAGE_KEY = "jordan-html-css-study-v1";
  var DAY = 24 * 60 * 60 * 1000;
  var MINUTE = 60 * 1000;
  var seedCards = Array.isArray(window.HTML_CSS_SEED_CARDS) ? window.HTML_CSS_SEED_CARDS : [];

  var defaultSettings = {
    newLimit: 20,
    reviewLimit: 100,
    dailyGoal: 20,
    newOrder: "deck"
  };

  var elements = {};
  var state;
  var session = null;
  var lastFocusedElement = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function createElement(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined && text !== null) {
      node.textContent = String(text);
    }
    return node;
  }

  function defaultSchedule() {
    return {
      status: "new",
      due: null,
      interval: 0,
      ease: 2.5,
      repetitions: 0,
      lapses: 0,
      reviews: 0,
      correct: 0,
      suspended: false,
      lastReviewed: null
    };
  }

  function normaliseSchedule(value) {
    var base = defaultSchedule();
    var source = value && typeof value === "object" ? value : {};
    Object.keys(base).forEach(function (key) {
      if (source[key] !== undefined) {
        base[key] = source[key];
      }
    });
    if (["new", "learning", "review"].indexOf(base.status) === -1) {
      base.status = "new";
    }
    base.ease = Math.max(1.3, Number(base.ease) || 2.5);
    base.interval = Math.max(0, Number(base.interval) || 0);
    base.repetitions = Math.max(0, Number(base.repetitions) || 0);
    base.lapses = Math.max(0, Number(base.lapses) || 0);
    base.reviews = Math.max(0, Number(base.reviews) || 0);
    base.correct = Math.max(0, Number(base.correct) || 0);
    base.suspended = Boolean(base.suspended);
    return base;
  }

  function normaliseCard(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    var front = String(value.front || "").trim();
    var back = String(value.back || "").trim();
    if (!front || !back) {
      return null;
    }
    return {
      id: String(value.id || ("custom-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8))),
      deck: String(value.deck || "My Cards").trim() || "My Cards",
      topic: String(value.topic || "General").trim() || "General",
      front: front,
      back: back,
      example: String(value.example || ""),
      hint: String(value.hint || ""),
      tags: Array.isArray(value.tags) ? value.tags.map(String).map(function (tag) { return tag.trim(); }).filter(Boolean) : [],
      starter: Boolean(value.starter),
      schedule: normaliseSchedule(value.schedule)
    };
  }

  function seedWithSchedule(seed) {
    var copy = normaliseCard(seed);
    copy.schedule = defaultSchedule();
    return copy;
  }

  function makeInitialState() {
    return {
      version: 1,
      cards: seedCards.map(seedWithSchedule),
      settings: Object.assign({}, defaultSettings),
      activity: []
    };
  }

  function loadState() {
    var loaded = null;
    try {
      loaded = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      loaded = null;
    }

    if (!loaded || !Array.isArray(loaded.cards)) {
      return makeInitialState();
    }

    var cards = loaded.cards.map(normaliseCard).filter(Boolean);
    var ids = new Set(cards.map(function (card) { return card.id; }));
    seedCards.forEach(function (seed) {
      if (!ids.has(seed.id)) {
        cards.push(seedWithSchedule(seed));
      }
    });

    return {
      version: 1,
      cards: cards,
      settings: Object.assign({}, defaultSettings, loaded.settings || {}),
      activity: Array.isArray(loaded.activity) ? loaded.activity.filter(function (item) {
        return item && Number.isFinite(Number(item.timestamp));
      }).slice(-5000) : []
    };
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      announce("Progress could not be saved. Browser storage may be unavailable.");
    }
  }

  function announce(message) {
    elements.announcement.textContent = "";
    window.setTimeout(function () {
      elements.announcement.textContent = message;
    }, 10);
  }

  function localDayKey(value) {
    var date = value instanceof Date ? value : new Date(value);
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function startOfLocalDay(value) {
    var date = value ? new Date(value) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function addDays(value, amount) {
    var date = new Date(value);
    date.setDate(date.getDate() + amount);
    return date;
  }

  function cardById(id) {
    return state.cards.find(function (card) { return card.id === id; }) || null;
  }

  function deckNames() {
    var names = [];
    state.cards.forEach(function (card) {
      if (names.indexOf(card.deck) === -1) {
        names.push(card.deck);
      }
    });
    return names;
  }

  function isDue(card, now) {
    if (card.schedule.suspended || card.schedule.status === "new" || !card.schedule.due) {
      return false;
    }
    return Number(card.schedule.due) <= (now || Date.now());
  }

  function isMastered(card) {
    return !card.schedule.suspended && card.schedule.status === "review" && card.schedule.interval >= 21;
  }

  function activityToday() {
    var today = localDayKey(new Date());
    return state.activity.filter(function (item) {
      return localDayKey(item.timestamp) === today;
    });
  }

  function cardsForDeck(deck) {
    return state.cards.filter(function (card) {
      return deck === "all" || card.deck === deck;
    });
  }

  function shuffle(values) {
    var copy = values.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function calculateSessionCards(deck) {
    var todayActivity = activityToday();
    var reviewedToday = todayActivity.length;
    var introducedToday = todayActivity.filter(function (item) { return item.wasNew; }).length;
    var reviewSlots = Math.max(0, Number(state.settings.reviewLimit) - reviewedToday);
    var newSlots = Math.max(0, Number(state.settings.newLimit) - introducedToday);
    var available = cardsForDeck(deck).filter(function (card) { return !card.schedule.suspended; });
    var due = available.filter(function (card) { return isDue(card); }).sort(function (a, b) {
      return Number(a.schedule.due) - Number(b.schedule.due);
    }).slice(0, reviewSlots);
    var fresh = available.filter(function (card) { return card.schedule.status === "new"; });

    if (state.settings.newOrder === "random") {
      fresh = shuffle(fresh);
    }
    fresh = fresh.slice(0, newSlots);

    return {
      due: due,
      fresh: fresh,
      queue: due.concat(fresh)
    };
  }

  function stateLabel(card) {
    if (card.schedule.suspended) {
      return "Suspended";
    }
    if (isMastered(card)) {
      return "Mastered";
    }
    if (card.schedule.status === "learning") {
      return "Learning";
    }
    if (card.schedule.status === "review") {
      return "Review";
    }
    return "New";
  }

  function dueLabel(card) {
    if (card.schedule.suspended) {
      return "Not in review queue";
    }
    if (card.schedule.status === "new" || !card.schedule.due) {
      return "Available now";
    }
    var delta = Number(card.schedule.due) - Date.now();
    if (delta <= 0) {
      return "Due now";
    }
    if (delta < 60 * MINUTE) {
      return "Due in " + Math.max(1, Math.ceil(delta / MINUTE)) + " min";
    }
    if (delta < DAY) {
      return "Due in " + Math.ceil(delta / (60 * MINUTE)) + " hr";
    }
    return "Due " + new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(card.schedule.due));
  }

  function calculateStreaks() {
    var keys = Array.from(new Set(state.activity.map(function (item) {
      return localDayKey(item.timestamp);
    }))).sort();
    var keySet = new Set(keys);
    var cursor = startOfLocalDay();
    if (!keySet.has(localDayKey(cursor))) {
      cursor = addDays(cursor, -1);
    }
    var current = 0;
    while (keySet.has(localDayKey(cursor))) {
      current += 1;
      cursor = addDays(cursor, -1);
    }

    var longest = 0;
    var run = 0;
    var previous = null;
    keys.forEach(function (key) {
      var date = startOfLocalDay(key + "T12:00:00");
      if (previous && Math.round((date - previous) / DAY) === 1) {
        run += 1;
      } else {
        run = 1;
      }
      longest = Math.max(longest, run);
      previous = date;
    });
    return { current: current, longest: longest };
  }

  function updateDeckInputs() {
    var names = deckNames();
    var selectIds = ["review-deck", "browse-deck-filter"];
    selectIds.forEach(function (id) {
      var select = byId(id);
      var current = select.value || "all";
      while (select.options.length > 1) {
        select.remove(1);
      }
      names.forEach(function (name) {
        var option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });
      if (Array.from(select.options).some(function (option) { return option.value === current; })) {
        select.value = current;
      }
    });

    elements.deckOptions.replaceChildren();
    names.forEach(function (name) {
      var option = document.createElement("option");
      option.value = name;
      elements.deckOptions.appendChild(option);
    });
  }

  function setView(view) {
    var validViews = ["dashboard", "review", "browse", "stats", "settings"];
    if (validViews.indexOf(view) === -1) {
      view = "dashboard";
    }
    document.querySelectorAll("[data-view-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-view-panel") !== view;
    });
    document.querySelectorAll("[data-view]").forEach(function (tab) {
      var active = tab.getAttribute("data-view") === view;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.setAttribute("tabindex", active ? "0" : "-1");
    });
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + view);
    }

    if (view === "dashboard") {
      renderDashboard();
    } else if (view === "review" && !session) {
      renderReviewSetup();
    } else if (view === "browse") {
      renderLibrary();
    } else if (view === "stats") {
      renderStats();
    } else if (view === "settings") {
      renderSettings();
    }
    window.scrollTo({ top: document.querySelector(".learn-workspace").offsetTop - 20, behavior: "auto" });
  }

  function renderDashboard() {
    var due = state.cards.filter(function (card) { return isDue(card); }).length;
    var fresh = state.cards.filter(function (card) { return !card.schedule.suspended && card.schedule.status === "new"; }).length;
    var mastered = state.cards.filter(isMastered).length;
    var streaks = calculateStreaks();
    elements.metricDue.textContent = due;
    elements.metricNew.textContent = fresh;
    elements.metricMastered.textContent = mastered;
    elements.metricStreak.textContent = streaks.current;

    elements.dashboardDecks.replaceChildren();
    deckNames().forEach(function (name) {
      var deckCards = cardsForDeck(name);
      var deckDue = deckCards.filter(function (card) { return isDue(card); }).length;
      var deckNew = deckCards.filter(function (card) { return !card.schedule.suspended && card.schedule.status === "new"; }).length;
      var row = createElement("div", "deck-row");
      var copy = createElement("div");
      copy.appendChild(createElement("h4", "", name));
      copy.appendChild(createElement("p", "", deckCards.length + " cards · " + deckCards.filter(isMastered).length + " mastered"));
      var count = createElement("span", "deck-count", deckDue + " due");
      var button = createElement("button", "deck-study-button", deckDue + deckNew > 0 ? "Study" : "Done");
      button.type = "button";
      button.dataset.deck = name;
      button.disabled = deckDue + deckNew === 0;
      row.append(copy, count, button);
      elements.dashboardDecks.appendChild(row);
    });

    var reviewed = activityToday().length;
    var goal = Math.max(1, Number(state.settings.dailyGoal) || 20);
    var ratio = Math.min(1, reviewed / goal);
    elements.dailyRing.style.setProperty("--progress", Math.round(ratio * 360) + "deg");
    elements.dailyProgress.max = goal;
    elements.dailyProgress.value = Math.min(reviewed, goal);
    elements.dailyProgress.textContent = reviewed + " of " + goal + " reviews";
    elements.dailyReviewed.textContent = reviewed;
    elements.dailyGoalLabel.textContent = "of " + goal;
    if (reviewed === 0) {
      elements.dailyMessage.textContent = "Your first review is ready when you are.";
    } else if (reviewed >= goal) {
      elements.dailyMessage.textContent = "Daily goal complete. Extra reviews are optional.";
    } else {
      elements.dailyMessage.textContent = (goal - reviewed) + " more review" + (goal - reviewed === 1 ? "" : "s") + " to reach today’s goal.";
    }

    renderRecentActivity();
  }

  function renderRecentActivity() {
    elements.recentActivity.replaceChildren();
    var recent = state.activity.slice(-5).reverse();
    if (recent.length === 0) {
      elements.recentActivity.appendChild(createElement("p", "activity-empty", "No reviews yet. Complete a few cards and your history will appear here."));
      return;
    }
    recent.forEach(function (item) {
      var card = cardById(item.cardId);
      var row = createElement("div", "activity-item");
      row.appendChild(createElement("span", "activity-dot"));
      var copy = createElement("div");
      copy.appendChild(createElement("p", "", card ? card.front : "Deleted card"));
      copy.appendChild(createElement("small", "", item.deck + " · " + String(item.rating).replace(/^./, function (value) { return value.toUpperCase(); })));
      row.appendChild(copy);
      row.appendChild(createElement("span", "activity-time", new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(item.timestamp))));
      elements.recentActivity.appendChild(row);
    });
  }

  function renderReviewSetup() {
    elements.reviewSetup.hidden = false;
    elements.reviewSession.hidden = true;
    elements.sessionComplete.hidden = true;
    var counts = calculateSessionCards(elements.reviewDeck.value || "all");
    elements.sessionDueCount.textContent = counts.due.length;
    elements.sessionNewCount.textContent = counts.fresh.length;
    elements.sessionTotalCount.textContent = counts.queue.length;
    elements.startSessionButton.disabled = counts.queue.length === 0;
    elements.startSessionButton.textContent = counts.queue.length ? "Start " + counts.queue.length + " card" + (counts.queue.length === 1 ? "" : "s") : "Nothing due";
  }

  function startSession(deck) {
    if (deck) {
      elements.reviewDeck.value = deck;
    }
    var selection = calculateSessionCards(elements.reviewDeck.value || "all");
    if (selection.queue.length === 0) {
      announce("There are no cards available in this deck right now.");
      renderReviewSetup();
      return;
    }
    session = {
      deck: elements.reviewDeck.value || "all",
      queue: selection.queue.map(function (card) { return card.id; }),
      startingCards: selection.queue.length,
      answers: 0,
      uniqueAnswered: new Set(),
      ratings: { again: 0, hard: 0, good: 0, easy: 0 },
      startedAt: Date.now()
    };
    elements.reviewSetup.hidden = true;
    elements.reviewSession.hidden = false;
    elements.sessionComplete.hidden = true;
    renderCurrentCard();
  }

  function intervalOptions(card) {
    var schedule = card.schedule;
    if (schedule.status === "new" || schedule.status === "learning") {
      return {
        again: { milliseconds: MINUTE, label: "1 min" },
        hard: { milliseconds: 10 * MINUTE, label: "10 min" },
        good: { milliseconds: DAY, days: 1, label: "1 day" },
        easy: { milliseconds: 4 * DAY, days: 4, label: "4 days" }
      };
    }
    var hardDays = Math.max(1, Math.round(schedule.interval * 1.2));
    var goodDays = Math.max(1, Math.round(schedule.interval * schedule.ease));
    var easyDays = Math.max(4, Math.round(schedule.interval * schedule.ease * 1.3));
    return {
      again: { milliseconds: 10 * MINUTE, label: "10 min" },
      hard: { milliseconds: hardDays * DAY, days: hardDays, label: formatDays(hardDays) },
      good: { milliseconds: goodDays * DAY, days: goodDays, label: formatDays(goodDays) },
      easy: { milliseconds: easyDays * DAY, days: easyDays, label: formatDays(easyDays) }
    };
  }

  function formatDays(days) {
    if (days < 7) {
      return days + " day" + (days === 1 ? "" : "s");
    }
    if (days < 60) {
      var weeks = Math.round(days / 7);
      return weeks + " wk";
    }
    if (days < 730) {
      var months = Math.round(days / 30);
      return months + " mo";
    }
    return (Math.round(days / 365 * 10) / 10) + " yr";
  }

  function renderCurrentCard() {
    while (session && session.queue.length && !cardById(session.queue[0])) {
      session.queue.shift();
    }
    if (!session || session.queue.length === 0) {
      finishSession();
      return;
    }

    var card = cardById(session.queue[0]);
    var totalWork = session.answers + session.queue.length;
    var progress = totalWork ? session.answers / totalWork : 1;
    elements.reviewProgressText.textContent = "Review " + (session.answers + 1);
    elements.reviewQueueText.textContent = session.queue.length + " remaining";
    elements.reviewProgressBar.style.width = Math.round(progress * 100) + "%";
    elements.reviewDeckName.textContent = card.deck;
    elements.reviewTopicName.textContent = card.topic;
    elements.reviewFront.textContent = card.front;
    elements.reviewBack.textContent = card.back;
    elements.reviewHint.textContent = card.hint ? "Hint: " + card.hint : "";
    elements.reviewHint.hidden = !card.hint;
    elements.reviewExample.textContent = card.example;
    elements.reviewExampleWrap.hidden = !card.example;
    elements.reviewNote.textContent = card.tags.length ? "Tags: " + card.tags.join(", ") : "";
    elements.reviewNote.hidden = card.tags.length === 0;
    elements.reviewAnswer.hidden = true;
    elements.revealRow.hidden = false;
    elements.ratingGrid.hidden = true;

    var intervals = intervalOptions(card);
    elements.intervalAgain.textContent = intervals.again.label;
    elements.intervalHard.textContent = intervals.hard.label;
    elements.intervalGood.textContent = intervals.good.label;
    elements.intervalEasy.textContent = intervals.easy.label;
    elements.revealAnswerButton.focus();
  }

  function revealAnswer() {
    if (!session || !session.queue.length || !elements.reviewAnswer.hidden) {
      return;
    }
    elements.reviewAnswer.hidden = false;
    elements.revealRow.hidden = true;
    elements.ratingGrid.hidden = false;
    announce("Answer shown. Rate how well you remembered it.");
    var goodButton = elements.ratingGrid.querySelector('[data-rating="good"]');
    if (goodButton) {
      goodButton.focus();
    }
  }

  function applyRating(card, rating) {
    var wasNew = card.schedule.status === "new";
    var choices = intervalOptions(card);
    var choice = choices[rating];
    var now = Date.now();
    card.schedule.reviews += 1;
    card.schedule.lastReviewed = now;

    if (rating === "again") {
      card.schedule.status = "learning";
      card.schedule.interval = 0;
      card.schedule.due = now + choice.milliseconds;
      card.schedule.ease = Math.max(1.3, card.schedule.ease - 0.2);
      card.schedule.lapses += 1;
      card.schedule.repetitions = 0;
    } else if (rating === "hard") {
      card.schedule.correct += 1;
      card.schedule.ease = Math.max(1.3, card.schedule.ease - 0.15);
      if (card.schedule.status === "review") {
        card.schedule.interval = choice.days;
        card.schedule.status = "review";
      } else {
        card.schedule.interval = 0;
        card.schedule.status = "learning";
      }
      card.schedule.due = now + choice.milliseconds;
      card.schedule.repetitions += 1;
    } else {
      card.schedule.correct += 1;
      card.schedule.status = "review";
      card.schedule.interval = choice.days;
      card.schedule.due = now + choice.milliseconds;
      card.schedule.repetitions += 1;
      if (rating === "easy") {
        card.schedule.ease = Math.min(3.2, card.schedule.ease + 0.15);
      }
    }

    state.activity.push({
      timestamp: now,
      cardId: card.id,
      deck: card.deck,
      rating: rating,
      wasNew: wasNew,
      interval: card.schedule.interval
    });
    if (state.activity.length > 5000) {
      state.activity = state.activity.slice(-5000);
    }
    return wasNew;
  }

  function rateCurrent(rating) {
    if (!session || !session.queue.length || elements.reviewAnswer.hidden) {
      return;
    }
    var card = cardById(session.queue[0]);
    if (!card || ["again", "hard", "good", "easy"].indexOf(rating) === -1) {
      return;
    }
    var cardId = session.queue.shift();
    applyRating(card, rating);
    session.answers += 1;
    session.uniqueAnswered.add(cardId);
    session.ratings[rating] += 1;
    if (rating === "again") {
      session.queue.splice(Math.min(2, session.queue.length), 0, cardId);
    }
    saveState();
    announce(card.front + " rated " + rating + ".");
    renderCurrentCard();
  }

  function finishSession() {
    if (!session) {
      renderReviewSetup();
      return;
    }
    var minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / MINUTE));
    var summary = session.uniqueAnswered.size + " unique card" + (session.uniqueAnswered.size === 1 ? "" : "s") + " reviewed in about " + minutes + " minute" + (minutes === 1 ? "" : "s") + ".";
    if (session.ratings.again) {
      summary += " " + session.ratings.again + " answer" + (session.ratings.again === 1 ? "" : "s") + " will come back soon.";
    }
    elements.sessionCompleteSummary.textContent = summary;
    elements.reviewSetup.hidden = true;
    elements.reviewSession.hidden = true;
    elements.sessionComplete.hidden = false;
    session = null;
    saveState();
    renderDashboard();
    announce("Review session complete.");
  }

  function endSession() {
    session = null;
    renderReviewSetup();
    announce("Review session ended. Your completed ratings were saved.");
  }

  function filterStateMatches(card, filter) {
    if (filter === "all") {
      return true;
    }
    if (filter === "mastered") {
      return isMastered(card);
    }
    if (filter === "suspended") {
      return card.schedule.suspended;
    }
    return !card.schedule.suspended && card.schedule.status === filter && (filter !== "review" || !isMastered(card));
  }

  function renderLibrary() {
    var search = elements.cardSearch.value.trim().toLowerCase();
    var deck = elements.browseDeck.value;
    var scheduleState = elements.browseState.value;
    var matches = state.cards.filter(function (card) {
      var haystack = [card.front, card.back, card.deck, card.topic, card.tags.join(" ")].join(" ").toLowerCase();
      return (!search || haystack.indexOf(search) !== -1) &&
        (deck === "all" || card.deck === deck) &&
        filterStateMatches(card, scheduleState);
    });

    elements.browseResultCount.textContent = matches.length + " card" + (matches.length === 1 ? "" : "s");
    elements.cardLibrary.replaceChildren();
    elements.browseEmpty.hidden = matches.length !== 0;

    matches.forEach(function (card) {
      var item = createElement("article", "library-card" + (card.schedule.suspended ? " is-suspended" : ""));
      var copy = createElement("div");
      copy.appendChild(createElement("h3", "", card.front));
      var answerPreview = card.back.length > 140 ? card.back.slice(0, 137) + "…" : card.back;
      copy.appendChild(createElement("p", "", answerPreview));

      var meta = createElement("div", "library-meta");
      meta.appendChild(createElement("strong", "", card.deck));
      meta.appendChild(createElement("span", "", card.topic));
      var schedule = createElement("div", "library-schedule");
      schedule.appendChild(createElement("strong", "", stateLabel(card)));
      schedule.appendChild(createElement("span", "", dueLabel(card)));
      meta.appendChild(schedule);

      var actions = createElement("div", "library-actions");
      [
        { action: "edit", label: "Edit" },
        { action: "suspend", label: card.schedule.suspended ? "Resume" : "Suspend" },
        { action: "reset", label: "Reset" },
        { action: "delete", label: "Delete", danger: true }
      ].forEach(function (details) {
        var button = createElement("button", "small-action" + (details.danger ? " danger-action" : ""), details.label);
        button.type = "button";
        button.dataset.cardAction = details.action;
        button.dataset.cardId = card.id;
        actions.appendChild(button);
      });

      item.append(copy, meta, actions);
      elements.cardLibrary.appendChild(item);
    });
  }

  function openCardEditor(card) {
    lastFocusedElement = document.activeElement;
    elements.cardForm.reset();
    elements.cardId.value = card ? card.id : "";
    elements.cardDeck.value = card ? card.deck : (deckNames()[0] || "HTML Foundations");
    elements.cardTopic.value = card ? card.topic : "";
    elements.cardFront.value = card ? card.front : "";
    elements.cardBack.value = card ? card.back : "";
    elements.cardExample.value = card ? card.example : "";
    elements.cardHint.value = card ? card.hint : "";
    elements.cardTags.value = card ? card.tags.join(", ") : "";
    elements.cardEditorTitle.textContent = card ? "Edit card" : "Add a card";
    elements.cardModal.hidden = false;
    document.body.classList.add("modal-open");
    elements.cardDeck.focus();
  }

  function closeCardEditor() {
    elements.cardModal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function saveCardFromForm(event) {
    event.preventDefault();
    var id = elements.cardId.value;
    var existing = id ? cardById(id) : null;
    var card = existing || normaliseCard({
      id: "custom-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      front: elements.cardFront.value,
      back: elements.cardBack.value,
      deck: elements.cardDeck.value,
      topic: elements.cardTopic.value
    });
    if (!card) {
      announce("The card needs both a question and an answer.");
      return;
    }
    card.deck = elements.cardDeck.value.trim();
    card.topic = elements.cardTopic.value.trim();
    card.front = elements.cardFront.value.trim();
    card.back = elements.cardBack.value.trim();
    card.example = elements.cardExample.value.trim();
    card.hint = elements.cardHint.value.trim();
    card.tags = elements.cardTags.value.split(",").map(function (tag) { return tag.trim(); }).filter(Boolean);
    if (!existing) {
      card.starter = false;
      card.schedule = defaultSchedule();
      state.cards.push(card);
    }
    saveState();
    updateDeckInputs();
    renderLibrary();
    renderDashboard();
    closeCardEditor();
    announce(existing ? "Card updated." : "Card created and added to the new-card queue.");
  }

  function handleLibraryAction(event) {
    var button = event.target.closest("button[data-card-action]");
    if (!button) {
      return;
    }
    var card = cardById(button.dataset.cardId);
    if (!card) {
      return;
    }
    var action = button.dataset.cardAction;
    if (action === "edit") {
      openCardEditor(card);
      return;
    }
    if (action === "suspend") {
      card.schedule.suspended = !card.schedule.suspended;
      announce(card.schedule.suspended ? "Card suspended." : "Card returned to the review queue.");
    } else if (action === "reset") {
      card.schedule = defaultSchedule();
      announce("Card progress reset.");
    } else if (action === "delete") {
      if (!window.confirm("Delete this card? You can restore starter cards later, but review history for this card will remain only in the activity log.")) {
        return;
      }
      state.cards = state.cards.filter(function (item) { return item.id !== card.id; });
      if (session) {
        session.queue = session.queue.filter(function (id) { return id !== card.id; });
      }
      announce("Card deleted.");
    }
    saveState();
    updateDeckInputs();
    renderLibrary();
    renderDashboard();
    renderReviewSetup();
  }

  function renderStats() {
    var reviews = state.activity.length;
    var successful = state.activity.filter(function (item) { return item.rating !== "again"; }).length;
    var studied = state.cards.filter(function (card) { return card.schedule.reviews > 0; }).length;
    var streaks = calculateStreaks();
    elements.statsReviews.textContent = reviews;
    elements.statsAccuracy.textContent = reviews ? Math.round(successful / reviews * 100) + "%" : "—";
    elements.statsStudied.textContent = studied;
    elements.statsLongestStreak.textContent = streaks.longest;

    elements.masteryList.replaceChildren();
    deckNames().forEach(function (name) {
      var deck = cardsForDeck(name);
      var mastered = deck.filter(isMastered).length;
      var learned = deck.filter(function (card) { return card.schedule.status !== "new"; }).length;
      var percent = deck.length ? Math.round(mastered / deck.length * 100) : 0;
      var row = createElement("div", "mastery-row");
      var label = createElement("div", "mastery-label");
      label.append(createElement("strong", "", name), createElement("span", "", mastered + " mastered · " + learned + " studied"));
      var track = createElement("div", "mastery-track");
      var fill = createElement("span");
      fill.style.width = percent + "%";
      track.appendChild(fill);
      row.append(label, track);
      elements.masteryList.appendChild(row);
    });

    renderForecast();
    renderHeatmap();
  }

  function renderForecast() {
    var today = startOfLocalDay();
    var days = [];
    for (var i = 0; i < 7; i += 1) {
      var date = addDays(today, i);
      var next = addDays(today, i + 1);
      var count = state.cards.filter(function (card) {
        if (card.schedule.suspended || !card.schedule.due || card.schedule.status === "new") {
          return false;
        }
        var due = Number(card.schedule.due);
        if (i === 0 && due < date.getTime()) {
          return true;
        }
        return due >= date.getTime() && due < next.getTime();
      }).length;
      days.push({ date: date, count: count });
    }
    var maximum = Math.max.apply(null, days.map(function (day) { return day.count; }).concat([1]));
    elements.forecastChart.replaceChildren();
    days.forEach(function (day) {
      var item = createElement("div", "forecast-day");
      var wrap = createElement("div", "forecast-bar-wrap");
      var bar = createElement("span", "forecast-bar");
      bar.style.height = Math.max(4, Math.round(day.count / maximum * 100)) + "%";
      wrap.appendChild(bar);
      item.append(wrap, createElement("strong", "", day.count), createElement("small", "", new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day.date)));
      elements.forecastChart.appendChild(item);
    });
  }

  function renderHeatmap() {
    var counts = {};
    state.activity.forEach(function (item) {
      var key = localDayKey(item.timestamp);
      counts[key] = (counts[key] || 0) + 1;
    });
    elements.studyHeatmap.replaceChildren();
    var today = startOfLocalDay();
    for (var i = 27; i >= 0; i -= 1) {
      var date = addDays(today, -i);
      var key = localDayKey(date);
      var count = counts[key] || 0;
      var level = count === 0 ? 0 : count < 2 ? 1 : count < 4 ? 2 : count < 7 ? 3 : 4;
      var cell = createElement("span", "heatmap-cell level-" + level);
      var label = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date) + ": " + count + " review" + (count === 1 ? "" : "s");
      cell.title = label;
      cell.setAttribute("aria-label", label);
      elements.studyHeatmap.appendChild(cell);
    }
  }

  function renderSettings() {
    elements.newCardLimit.value = state.settings.newLimit;
    elements.reviewCardLimit.value = state.settings.reviewLimit;
    elements.dailyReviewGoal.value = state.settings.dailyGoal;
    elements.newCardOrder.value = state.settings.newOrder;
  }

  function saveSettings(event) {
    event.preventDefault();
    state.settings.newLimit = Math.max(1, Math.min(100, Number(elements.newCardLimit.value) || 20));
    state.settings.reviewLimit = Math.max(1, Math.min(500, Number(elements.reviewCardLimit.value) || 100));
    state.settings.dailyGoal = Math.max(1, Math.min(500, Number(elements.dailyReviewGoal.value) || 20));
    state.settings.newOrder = elements.newCardOrder.value === "random" ? "random" : "deck";
    saveState();
    renderDashboard();
    renderReviewSetup();
    elements.dataStatus.textContent = "Settings saved at " + new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date()) + ".";
    announce("Study settings saved.");
  }

  function exportData() {
    var payload = {
      app: "Jordan HTML & CSS Study Deck",
      version: 1,
      exportedAt: new Date().toISOString(),
      cards: state.cards,
      settings: state.settings,
      activity: state.activity
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "html-css-study-backup-" + localDayKey(new Date()) + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    elements.dataStatus.textContent = "Backup exported. Keep it somewhere safe.";
    announce("Study backup exported.");
  }

  function importDataFile(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    file.text().then(function (text) {
      var imported;
      try {
        imported = JSON.parse(text);
      } catch (error) {
        throw new Error("That file is not valid JSON.");
      }

      if (Array.isArray(imported)) {
        var existingIds = new Set(state.cards.map(function (card) { return card.id; }));
        var added = 0;
        imported.map(normaliseCard).filter(Boolean).forEach(function (card) {
          if (!existingIds.has(card.id)) {
            card.starter = false;
            state.cards.push(card);
            existingIds.add(card.id);
            added += 1;
          }
        });
        elements.dataStatus.textContent = added + " card" + (added === 1 ? "" : "s") + " imported.";
      } else if (imported && Array.isArray(imported.cards)) {
        if (!window.confirm("Replace the current cards, progress, and settings with this backup?")) {
          return;
        }
        var restoredCards = imported.cards.map(normaliseCard).filter(Boolean);
        if (!restoredCards.length) {
          throw new Error("The backup does not contain any valid cards.");
        }
        state = {
          version: 1,
          cards: restoredCards,
          settings: Object.assign({}, defaultSettings, imported.settings || {}),
          activity: Array.isArray(imported.activity) ? imported.activity.slice(-5000) : []
        };
        elements.dataStatus.textContent = "Backup restored successfully.";
      } else {
        throw new Error("The file does not contain a card list or study backup.");
      }
      saveState();
      updateDeckInputs();
      renderAll();
      announce("Import complete.");
    }).catch(function (error) {
      elements.dataStatus.textContent = error.message || "The backup could not be imported.";
      announce(elements.dataStatus.textContent);
    }).finally(function () {
      event.target.value = "";
    });
  }

  function resetProgress() {
    if (!window.confirm("Reset all card scheduling and study history? Your card content and custom cards will stay.")) {
      return;
    }
    state.cards.forEach(function (card) {
      card.schedule = defaultSchedule();
    });
    state.activity = [];
    session = null;
    saveState();
    renderAll();
    elements.dataStatus.textContent = "Learning progress was reset.";
    announce("All learning progress reset.");
  }

  function restoreStarterCards() {
    var existingIds = new Set(state.cards.map(function (card) { return card.id; }));
    var restored = 0;
    seedCards.forEach(function (seed) {
      if (!existingIds.has(seed.id)) {
        state.cards.push(seedWithSchedule(seed));
        restored += 1;
      }
    });
    saveState();
    updateDeckInputs();
    renderAll();
    elements.dataStatus.textContent = restored ? restored + " starter card" + (restored === 1 ? "" : "s") + " restored." : "All starter cards are already present.";
    announce(elements.dataStatus.textContent);
  }

  function renderAll() {
    renderDashboard();
    renderReviewSetup();
    renderLibrary();
    renderStats();
    renderSettings();
  }

  function cacheElements() {
    elements.announcement = byId("learn-announcement");
    elements.metricDue = byId("metric-due");
    elements.metricNew = byId("metric-new");
    elements.metricMastered = byId("metric-mastered");
    elements.metricStreak = byId("metric-streak");
    elements.dashboardDecks = byId("dashboard-decks");
    elements.dailyRing = byId("daily-ring");
    elements.dailyProgress = byId("daily-progress");
    elements.dailyReviewed = byId("daily-reviewed");
    elements.dailyGoalLabel = byId("daily-goal-label");
    elements.dailyMessage = byId("daily-message");
    elements.recentActivity = byId("recent-activity-list");
    elements.reviewDeck = byId("review-deck");
    elements.reviewSetup = byId("review-setup");
    elements.reviewSession = byId("review-session");
    elements.sessionComplete = byId("session-complete");
    elements.sessionDueCount = byId("session-due-count");
    elements.sessionNewCount = byId("session-new-count");
    elements.sessionTotalCount = byId("session-total-count");
    elements.startSessionButton = byId("start-session-button");
    elements.reviewProgressText = byId("review-progress-text");
    elements.reviewQueueText = byId("review-queue-text");
    elements.reviewProgressBar = byId("review-progress-bar");
    elements.reviewDeckName = byId("review-deck-name");
    elements.reviewTopicName = byId("review-topic-name");
    elements.reviewFront = byId("review-front");
    elements.reviewBack = byId("review-back");
    elements.reviewHint = byId("review-hint");
    elements.reviewAnswer = byId("review-answer");
    elements.reviewExample = byId("review-example");
    elements.reviewExampleWrap = byId("review-example-wrap");
    elements.reviewNote = byId("review-note");
    elements.revealRow = byId("reveal-row");
    elements.ratingGrid = byId("rating-grid");
    elements.revealAnswerButton = byId("reveal-answer-button");
    elements.intervalAgain = byId("interval-again");
    elements.intervalHard = byId("interval-hard");
    elements.intervalGood = byId("interval-good");
    elements.intervalEasy = byId("interval-easy");
    elements.sessionCompleteSummary = byId("session-complete-summary");
    elements.cardSearch = byId("card-search");
    elements.browseDeck = byId("browse-deck-filter");
    elements.browseState = byId("browse-state-filter");
    elements.browseResultCount = byId("browse-result-count");
    elements.cardLibrary = byId("card-library");
    elements.browseEmpty = byId("browse-empty");
    elements.cardModal = byId("card-modal");
    elements.cardEditorTitle = byId("card-editor-title");
    elements.cardForm = byId("card-form");
    elements.cardId = byId("card-id");
    elements.cardDeck = byId("card-deck");
    elements.cardTopic = byId("card-topic");
    elements.cardFront = byId("card-front");
    elements.cardBack = byId("card-back");
    elements.cardExample = byId("card-example");
    elements.cardHint = byId("card-hint");
    elements.cardTags = byId("card-tags");
    elements.deckOptions = byId("deck-options");
    elements.statsReviews = byId("stats-reviews");
    elements.statsAccuracy = byId("stats-accuracy");
    elements.statsStudied = byId("stats-studied");
    elements.statsLongestStreak = byId("stats-longest-streak");
    elements.masteryList = byId("mastery-list");
    elements.forecastChart = byId("forecast-chart");
    elements.studyHeatmap = byId("study-heatmap");
    elements.newCardLimit = byId("new-card-limit");
    elements.reviewCardLimit = byId("review-card-limit");
    elements.dailyReviewGoal = byId("daily-review-goal");
    elements.newCardOrder = byId("new-card-order");
    elements.dataStatus = byId("data-status");
  }

  function bindEvents() {
    document.querySelectorAll("[data-view]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        setView(tab.getAttribute("data-view"));
      });
    });
    document.querySelector(".learn-tabs").addEventListener("keydown", function (event) {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) {
        return;
      }
      var tabs = Array.from(document.querySelectorAll(".learn-tab"));
      var currentIndex = tabs.indexOf(document.activeElement);
      if (currentIndex === -1) {
        return;
      }
      event.preventDefault();
      var nextIndex = currentIndex;
      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }
      tabs[nextIndex].focus();
      setView(tabs[nextIndex].getAttribute("data-view"));
    });
    byId("hero-study-button").addEventListener("click", function () { setView("review"); });
    byId("dashboard-study-button").addEventListener("click", function () { setView("review"); });
    byId("hero-add-button").addEventListener("click", function () { setView("browse"); openCardEditor(); });
    byId("add-card-button").addEventListener("click", function () { openCardEditor(); });
    byId("view-all-stats").addEventListener("click", function () { setView("stats"); });
    elements.dashboardDecks.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-deck]");
      if (button) {
        setView("review");
        startSession(button.dataset.deck);
      }
    });
    elements.reviewDeck.addEventListener("change", renderReviewSetup);
    elements.startSessionButton.addEventListener("click", function () { startSession(); });
    elements.revealAnswerButton.addEventListener("click", revealAnswer);
    elements.ratingGrid.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-rating]");
      if (button) {
        rateCurrent(button.dataset.rating);
      }
    });
    byId("end-session-button").addEventListener("click", endSession);
    byId("edit-review-card").addEventListener("click", function () {
      if (session && session.queue.length) {
        openCardEditor(cardById(session.queue[0]));
      }
    });
    byId("return-dashboard-button").addEventListener("click", function () { setView("dashboard"); });
    byId("review-more-button").addEventListener("click", renderReviewSetup);
    elements.cardSearch.addEventListener("input", renderLibrary);
    elements.browseDeck.addEventListener("change", renderLibrary);
    elements.browseState.addEventListener("change", renderLibrary);
    byId("clear-card-filters").addEventListener("click", function () {
      elements.cardSearch.value = "";
      elements.browseDeck.value = "all";
      elements.browseState.value = "all";
      renderLibrary();
    });
    elements.cardLibrary.addEventListener("click", handleLibraryAction);
    elements.cardForm.addEventListener("submit", saveCardFromForm);
    byId("close-card-editor").addEventListener("click", closeCardEditor);
    byId("cancel-card-editor").addEventListener("click", closeCardEditor);
    elements.cardModal.addEventListener("click", function (event) {
      if (event.target === elements.cardModal) {
        closeCardEditor();
      }
    });
    byId("settings-form").addEventListener("submit", saveSettings);
    byId("export-data-button").addEventListener("click", exportData);
    byId("import-data-button").addEventListener("click", function () { byId("import-data-file").click(); });
    byId("import-data-file").addEventListener("change", importDataFile);
    byId("reset-progress-button").addEventListener("click", resetProgress);
    byId("restore-cards-button").addEventListener("click", restoreStarterCards);

    document.addEventListener("keydown", function (event) {
      if (!elements.cardModal.hidden && event.key === "Escape") {
        closeCardEditor();
        return;
      }
      var target = event.target;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].indexOf(target.tagName) !== -1) {
        return;
      }
      if (!session || elements.reviewSession.hidden) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        revealAnswer();
      } else if (!elements.ratingGrid.hidden && ["1", "2", "3", "4"].indexOf(event.key) !== -1) {
        event.preventDefault();
        rateCurrent({ "1": "again", "2": "hard", "3": "good", "4": "easy" }[event.key]);
      }
    });
  }

  function init() {
    cacheElements();
    state = loadState();
    saveState();
    updateDeckInputs();
    bindEvents();
    renderAll();
    var initialView = window.location.hash.replace("#", "") || "dashboard";
    setView(initialView);
  }

  init();
})();
