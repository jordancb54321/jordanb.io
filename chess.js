(function () {
  if (typeof Chess === "undefined" || typeof Chessboard === "undefined") {
    return;
  }

  var game = new Chess();
  var board = null;
  var searchDepth = 2;
  var stockfishMoveTime = 500;
  var botBattle = false;
  var engines = {
    w: "custom",
    b: "custom"
  };

  var activeRequestId = 0;
  var engineThinking = false;
  var customWorker = null;
  var stockfish = null;
  var botMoveTimer = null;

  var statusEl = document.getElementById("status");
  var engineStateEl = document.getElementById("engine-state");
  var moveHistoryEl = document.getElementById("move-history");
  var depthInputEl = document.getElementById("depth");
  var depthValueEl = document.getElementById("depth-value");
  var depthWarningEl = document.getElementById("depth-warning");
  var newGameEl = document.getElementById("new-game");
  var flipBoardEl = document.getElementById("flip-board");
  var blackEngineEl = document.getElementById("black-engine");
  var whiteEngineEl = document.getElementById("white-engine");
  var botBattleEl = document.getElementById("bot-battle");
  var stockfishTimeEl = document.getElementById("stockfish-time");
  var stockfishTimeValueEl = document.getElementById("stockfish-time-value");

  function createCustomWorker() {
    if (typeof Worker === "undefined") {
      return null;
    }

    try {
      return new Worker("chess-engine-worker.js");
    } catch (error) {
      return null;
    }
  }

  function createStockfishEngine() {
    var worker = null;
    var ready = false;
    var loading = false;
    var queue = [];
    var active = null;

    function send(command) {
      if (worker) {
        worker.postMessage(command);
      }
    }

    function startNext() {
      if (!ready || active || queue.length === 0) {
        return;
      }

      active = queue.shift();
      send("ucinewgame");
      send("isready");
    }

    function failActive(message) {
      if (active) {
        active.reject(new Error(message));
        active = null;
      }

      while (queue.length > 0) {
        queue.shift().reject(new Error(message));
      }
    }

    function load() {
      if (worker || loading || typeof Worker === "undefined") {
        return;
      }

      loading = true;
      worker = new Worker("vendor/stockfish/stockfish-18-lite-single.js");

      worker.onmessage = function (event) {
        var line = String(event.data || "");

        if (line === "uciok") {
          send("setoption name Skill Level value 8");
          send("setoption name UCI_LimitStrength value true");
          send("setoption name UCI_Elo value 1600");
          send("isready");
          return;
        }

        if (line === "readyok") {
          ready = true;

          if (active && !active.started) {
            active.started = true;
            send("position fen " + active.fen);
            send("go movetime " + active.moveTime);
          } else {
            startNext();
          }

          return;
        }

        if (line.indexOf("bestmove ") === 0 && active) {
          var uci = line.split(/\s+/)[1];
          var current = active;
          active = null;
          current.resolve(uci);
          startNext();
        }
      };

      worker.onerror = function () {
        failActive("Stockfish failed to load");
        ready = false;
        loading = false;
        worker = null;
      };

      send("uci");
    }

    return {
      getMove: function (fen, moveTime) {
        load();

        return new Promise(function (resolve, reject) {
          if (!worker) {
            reject(new Error("Stockfish worker unavailable"));
            return;
          }

          queue.push({
            fen: fen,
            moveTime: moveTime,
            resolve: resolve,
            reject: reject,
            started: false
          });

          startNext();
        });
      },
      reset: function () {
        queue = [];
        active = null;

        if (worker) {
          send("stop");
          send("ucinewgame");
        }
      },
      terminate: function () {
        if (worker) {
          send("quit");
          worker.terminate();
        }

        worker = null;
        ready = false;
        loading = false;
        queue = [];
        active = null;
      }
    };
  }

  function getStockfish() {
    if (!stockfish) {
      stockfish = createStockfishEngine();
    }

    return stockfish;
  }

  function updateDepthUi() {
    depthValueEl.textContent = searchDepth + " ply";
    depthWarningEl.hidden = searchDepth < 4;
  }

  function updateStockfishTimeUi() {
    stockfishTimeValueEl.textContent = stockfishMoveTime + " ms";
  }

  function renderMoveHistory() {
    var history = game.history();
    moveHistoryEl.innerHTML = "";

    if (history.length === 0) {
      var emptyItem = document.createElement("li");
      emptyItem.textContent = "No moves yet.";
      moveHistoryEl.appendChild(emptyItem);
      return;
    }

    for (var i = 0; i < history.length; i += 2) {
      var item = document.createElement("li");
      var whiteMove = history[i] || "";
      var blackMove = history[i + 1] || "";
      item.textContent = (Math.floor(i / 2) + 1) + ". " + whiteMove + (blackMove ? " " + blackMove : "");
      moveHistoryEl.appendChild(item);
    }
  }

  function botName(kind) {
    return kind === "stockfish" ? "Stockfish.js" : "Custom minimax";
  }

  function updateStatus() {
    var status = "";

    if (game.in_checkmate()) {
      status = game.turn() === "w" ? "Checkmate. Black wins." : "Checkmate. White wins.";
    } else if (game.in_draw()) {
      status = "Draw.";
    } else if (botBattle) {
      status = (game.turn() === "w" ? "White" : "Black") + " bot to move.";
    } else {
      status = game.turn() === "w" ? "Your move as White." : botName(engines.b) + " thinking as Black.";
    }

    if (!game.game_over() && game.in_check()) {
      status += " Check.";
    }

    statusEl.textContent = status;
    renderMoveHistory();
  }

  function syncBoard() {
    board.position(game.fen(), false);
    updateStatus();
  }

  function shouldBotMove() {
    if (game.game_over() || engineThinking) {
      return false;
    }

    return botBattle || game.turn() === "b";
  }

  function scheduleBotMove(delay) {
    window.clearTimeout(botMoveTimer);

    if (!shouldBotMove()) {
      engineStateEl.textContent = game.game_over() ? "Game over" : "Waiting";
      return;
    }

    botMoveTimer = window.setTimeout(makeBotMove, delay || 180);
  }

  function moveFromUci(uci) {
    if (!uci || uci === "(none)") {
      return null;
    }

    return {
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4, 5) || "q"
    };
  }

  function requestCustomMove(requestId, fen, history) {
    return new Promise(function (resolve, reject) {
      if (!customWorker) {
        customWorker = createCustomWorker();
      }

      if (!customWorker) {
        reject(new Error("Custom worker unavailable"));
        return;
      }

      customWorker.onmessage = function (event) {
        var data = event.data || {};

        if (data.requestId !== requestId) {
          return;
        }

        if (data.error) {
          reject(new Error(data.error));
          return;
        }

        resolve({
          move: data.move,
          label: data.book ? "Custom book move" : "Custom searched " + Number(data.nodes || 0).toLocaleString() + " positions"
        });
      };

      customWorker.onerror = function () {
        reject(new Error("Custom worker failed"));
      };

      customWorker.postMessage({
        requestId: requestId,
        fen: fen,
        history: history,
        depth: searchDepth
      });
    });
  }

  function requestStockfishMove(fen) {
    return getStockfish().getMove(fen, stockfishMoveTime).then(function (uciMove) {
      return {
        move: moveFromUci(uciMove),
        label: "Stockfish.js chose " + uciMove
      };
    });
  }

  function getBotMove(kind, requestId, fen, history) {
    if (kind === "stockfish") {
      return requestStockfishMove(fen);
    }

    return requestCustomMove(requestId, fen, history);
  }

  function makeBotMove() {
    if (!shouldBotMove()) {
      return;
    }

    var color = game.turn();
    var kind = engines[color];
    var requestId = activeRequestId + 1;
    var fen = game.fen();
    var history = game.history();

    activeRequestId = requestId;
    engineThinking = true;
    engineStateEl.textContent = botName(kind) + " thinking for " + (color === "w" ? "White" : "Black");

    getBotMove(kind, requestId, fen, history)
      .then(function (result) {
        if (requestId !== activeRequestId || game.game_over()) {
          return;
        }

        if (!result.move) {
          engineStateEl.textContent = botName(kind) + " found no legal move";
          return;
        }

        var move = game.move(result.move);

        if (!move) {
          engineStateEl.textContent = botName(kind) + " returned an illegal move";
          return;
        }

        engineStateEl.textContent = result.label;
        syncBoard();
      })
      .catch(function (error) {
        if (requestId === activeRequestId) {
          engineStateEl.textContent = error.message || "Engine failed";
        }
      })
      .finally(function () {
        if (requestId !== activeRequestId) {
          return;
        }

        engineThinking = false;

        if (game.game_over()) {
          engineStateEl.textContent = "Game over";
          updateStatus();
          return;
        }

        scheduleBotMove(botBattle ? 350 : 0);
      });
  }

  function onDragStart(source, piece) {
    if (engineThinking || game.game_over() || botBattle || game.turn() !== "w") {
      return false;
    }

    return piece.search(/^b/) === -1;
  }

  function onDrop(source, target) {
    var move = game.move({
      from: source,
      to: target,
      promotion: "q"
    });

    if (move === null) {
      return "snapback";
    }

    syncBoard();
    scheduleBotMove(150);
    return undefined;
  }

  function onSnapEnd() {
    board.position(game.fen());
  }

  function cancelThinking() {
    activeRequestId += 1;
    engineThinking = false;
    window.clearTimeout(botMoveTimer);

    if (customWorker) {
      customWorker.terminate();
      customWorker = null;
    }

    if (stockfish) {
      stockfish.reset();
    }
  }

  function resetGame() {
    cancelThinking();
    game.reset();
    engineStateEl.textContent = "Waiting";
    syncBoard();
    scheduleBotMove(250);
  }

  function syncEngineSettings() {
    engines.b = blackEngineEl.value;
    engines.w = whiteEngineEl.value;
    botBattle = botBattleEl.checked;
    whiteEngineEl.disabled = !botBattle;
    engineStateEl.textContent = "Settings updated";
    scheduleBotMove(200);
  }

  board = Chessboard("board", {
    draggable: true,
    position: "start",
    pieceTheme: "vendor/img/chesspieces/wikipedia/{piece}.png",
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  });

  window.addEventListener("resize", function () {
    board.resize();
  });

  depthInputEl.addEventListener("input", function (event) {
    searchDepth = parseInt(event.target.value, 10);
    updateDepthUi();
  });

  stockfishTimeEl.addEventListener("input", function (event) {
    stockfishMoveTime = parseInt(event.target.value, 10);
    updateStockfishTimeUi();
  });

  blackEngineEl.addEventListener("change", syncEngineSettings);
  whiteEngineEl.addEventListener("change", syncEngineSettings);
  botBattleEl.addEventListener("change", syncEngineSettings);
  newGameEl.addEventListener("click", resetGame);

  flipBoardEl.addEventListener("click", function () {
    board.flip();
  });

  updateDepthUi();
  updateStockfishTimeUi();
  syncEngineSettings();
  renderMoveHistory();
  updateStatus();
})();
