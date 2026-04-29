(function () {
  if (typeof Chess === "undefined" || typeof Chessboard === "undefined") {
    return;
  }

  var game = new Chess();
  var board = null;
  var searchDepth = 2;
  var quiescenceDepth = 4;
  var transpositionTable = {};
  var nodesSearched = 0;

  var statusEl = document.getElementById("status");
  var engineStateEl = document.getElementById("engine-state");
  var moveHistoryEl = document.getElementById("move-history");
  var depthInputEl = document.getElementById("depth");
  var depthValueEl = document.getElementById("depth-value");
  var depthWarningEl = document.getElementById("depth-warning");
  var newGameEl = document.getElementById("new-game");
  var flipBoardEl = document.getElementById("flip-board");
  var engineWorker = null;
  var engineRequestId = 0;
  var engineThinking = false;

  var pieceValues = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };

  var centerSquares = {
    d4: true,
    e4: true,
    d5: true,
    e5: true
  };

  var extendedCenterSquares = {
    c3: true,
    d3: true,
    e3: true,
    f3: true,
    c4: true,
    d4: true,
    e4: true,
    f4: true,
    c5: true,
    d5: true,
    e5: true,
    f5: true,
    c6: true,
    d6: true,
    e6: true,
    f6: true
  };

  var openingBook = {
    "": ["e5", "c5", "e6", "c6"],
    "e4": ["e5", "c5", "e6", "c6"],
    "d4": ["d5", "Nf6"],
    "Nf3": ["d5", "Nf6"],
    "c4": ["e5", "Nf6"]
  };

  var pieceSquareTables = {
    p: [
      0, 0, 0, 0, 0, 0, 0, 0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
      5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0,
      5, -5, -10, 0, 0, -10, -5, 5,
      5, 10, 10, -20, -20, 10, 10, 5,
      0, 0, 0, 0, 0, 0, 0, 0
    ],
    n: [
      -50, -40, -30, -30, -30, -30, -40, -50,
      -40, -20, 0, 5, 5, 0, -20, -40,
      -30, 5, 10, 15, 15, 10, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30,
      -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 10, 15, 15, 10, 0, -30,
      -40, -20, 0, 0, 0, 0, -20, -40,
      -50, -40, -30, -30, -30, -30, -40, -50
    ],
    b: [
      -20, -10, -10, -10, -10, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 10, 10, 5, 0, -10,
      -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10,
      -10, 10, 10, 10, 10, 10, 10, -10,
      -10, 5, 0, 0, 0, 0, 5, -10,
      -20, -10, -10, -10, -10, -10, -10, -20
    ],
    r: [
      0, 0, 0, 5, 5, 0, 0, 0,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      5, 10, 10, 10, 10, 10, 10, 5,
      0, 0, 0, 0, 0, 0, 0, 0
    ],
    q: [
      -20, -10, -10, -5, -5, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 5, 5, 5, 0, -10,
      -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5,
      -10, 5, 5, 5, 5, 5, 0, -10,
      -10, 0, 5, 0, 0, 0, 0, -10,
      -20, -10, -10, -5, -5, -10, -10, -20
    ],
    k: [
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20,
      -10, -20, -20, -20, -20, -20, -20, -10,
      20, 20, 0, 0, 0, 0, 20, 20,
      20, 30, 10, 0, 0, 10, 30, 20
    ]
  };

  function squareToIndex(square) {
    var file = square.charCodeAt(0) - 97;
    var rank = parseInt(square.charAt(1), 10);
    return (8 - rank) * 8 + file;
  }

  function mirroredIndex(index) {
    var rank = Math.floor(index / 8);
    var file = index % 8;
    return (7 - rank) * 8 + file;
  }

  function getFenKey() {
    return game.fen().split(" ").slice(0, 4).join(" ");
  }

  function squareFile(square) {
    return square.charCodeAt(0) - 97;
  }

  function squareRank(square) {
    return parseInt(square.charAt(1), 10);
  }

  function isPassedPawn(square, color, pawnsByColor) {
    var file = squareFile(square);
    var rank = squareRank(square);
    var enemy = color === "w" ? "b" : "w";
    var enemyPawns = pawnsByColor[enemy];

    for (var i = 0; i < enemyPawns.length; i += 1) {
      var enemyFile = squareFile(enemyPawns[i]);
      var enemyRank = squareRank(enemyPawns[i]);

      if (Math.abs(enemyFile - file) > 1) {
        continue;
      }

      if (color === "w" && enemyRank > rank) {
        return false;
      }

      if (color === "b" && enemyRank < rank) {
        return false;
      }
    }

    return true;
  }

  function evaluatePawnStructure(pawnsByColor) {
    var total = 0;

    ["w", "b"].forEach(function (color) {
      var sign = color === "w" ? 1 : -1;
      var pawns = pawnsByColor[color];
      var files = {};

      pawns.forEach(function (square) {
        var file = squareFile(square);
        files[file] = (files[file] || 0) + 1;
      });

      pawns.forEach(function (square) {
        var file = squareFile(square);
        var rank = squareRank(square);
        var hasLeftNeighbor = files[file - 1] > 0;
        var hasRightNeighbor = files[file + 1] > 0;

        if (files[file] > 1) {
          total -= sign * 12;
        }

        if (!hasLeftNeighbor && !hasRightNeighbor) {
          total -= sign * 10;
        }

        if (isPassedPawn(square, color, pawnsByColor)) {
          var progress = color === "w" ? rank - 2 : 7 - rank;
          total += sign * (18 + progress * 8);
        }
      });
    });

    return total;
  }

  function evaluateCastlingRights() {
    var fenParts = game.fen().split(" ");
    var rights = fenParts[2];
    var total = 0;

    if (rights.indexOf("K") !== -1 || rights.indexOf("Q") !== -1) {
      total += 18;
    }

    if (rights.indexOf("k") !== -1 || rights.indexOf("q") !== -1) {
      total -= 18;
    }

    return total;
  }

  function evaluateBoardPosition() {
    if (game.in_checkmate()) {
      return game.turn() === "w" ? -999999 : 999999;
    }

    if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
      return 0;
    }

    var boardState = game.board();
    var total = 0;
    var bishopCount = { w: 0, b: 0 };
    var pawnsByColor = { w: [], b: [] };
    var developedMinorPieces = { w: 0, b: 0 };

    for (var rank = 0; rank < 8; rank += 1) {
      for (var file = 0; file < 8; file += 1) {
        var piece = boardState[rank][file];

        if (!piece) {
          continue;
        }

        var square = String.fromCharCode(97 + file) + (8 - rank);
        var index = squareToIndex(square);
        var table = pieceSquareTables[piece.type];
        var positional = piece.color === "w" ? table[index] : table[mirroredIndex(index)];
        var material = pieceValues[piece.type] + positional;
        var sign = piece.color === "w" ? 1 : -1;

        if (piece.type === "b") {
          bishopCount[piece.color] += 1;
        }

        if (piece.type === "p") {
          pawnsByColor[piece.color].push(square);
        }

        if ((piece.type === "n" || piece.type === "b") && (piece.color === "w" ? rank < 7 : rank > 0)) {
          developedMinorPieces[piece.color] += 1;
        }

        if (centerSquares[square]) {
          material += 12;
        } else if (extendedCenterSquares[square]) {
          material += 5;
        }

        total += sign * material;
      }
    }

    if (bishopCount.w >= 2) {
      total += 35;
    }

    if (bishopCount.b >= 2) {
      total -= 35;
    }

    total += (developedMinorPieces.w - developedMinorPieces.b) * 10;
    total += evaluatePawnStructure(pawnsByColor);
    total += evaluateCastlingRights();

    if (game.in_check()) {
      total += game.turn() === "w" ? -40 : 40;
    }

    return total;
  }

  function scoreMove(move) {
    var score = 0;

    if (move.captured) {
      score += 10000 + pieceValues[move.captured] - pieceValues[move.piece] / 10;
    }

    if (move.promotion) {
      score += pieceValues[move.promotion] || 800;
    }

    if (centerSquares[move.to]) {
      score += 35;
    } else if (extendedCenterSquares[move.to]) {
      score += 12;
    }

    if (move.flags && move.flags.indexOf("k") !== -1) {
      score += 80;
    }

    if (move.flags && move.flags.indexOf("q") !== -1) {
      score += 70;
    }

    game.move(move);

    if (game.in_check()) {
      score += 600;
    }

    game.undo();
    return score;
  }

  function getOrderedMoves(options) {
    return game.moves(options || { verbose: true }).sort(function (a, b) {
      return scoreMove(b) - scoreMove(a);
    });
  }

  function quiescence(alpha, beta, maximizingPlayer, depth) {
    nodesSearched += 1;

    var standPat = evaluateBoardPosition();

    if (depth === 0 || game.game_over()) {
      return standPat;
    }

    if (maximizingPlayer) {
      if (standPat >= beta) {
        return beta;
      }

      alpha = Math.max(alpha, standPat);
    } else {
      if (standPat <= alpha) {
        return alpha;
      }

      beta = Math.min(beta, standPat);
    }

    var tacticalMoves = getOrderedMoves({ verbose: true }).filter(function (move) {
      return move.captured || move.promotion;
    });

    for (var i = 0; i < tacticalMoves.length; i += 1) {
      game.move(tacticalMoves[i]);
      var score = quiescence(alpha, beta, !maximizingPlayer, depth - 1);
      game.undo();

      if (maximizingPlayer) {
        alpha = Math.max(alpha, score);
      } else {
        beta = Math.min(beta, score);
      }

      if (beta <= alpha) {
        break;
      }
    }

    return maximizingPlayer ? alpha : beta;
  }

  function minimax(depth, alpha, beta, maximizingPlayer) {
    nodesSearched += 1;

    if (depth === 0 || game.game_over()) {
      return quiescence(alpha, beta, maximizingPlayer, quiescenceDepth);
    }

    var fenKey = getFenKey();
    var cached = transpositionTable[fenKey];

    if (cached && cached.depth >= depth) {
      return cached.score;
    }

    var moves = getOrderedMoves({ verbose: true });
    var bestScore;
    var searchedAllMoves = true;

    if (maximizingPlayer) {
      var maxEval = -Infinity;

      for (var i = 0; i < moves.length; i += 1) {
        game.move(moves[i]);
        var evalScore = minimax(depth - 1, alpha, beta, false);
        game.undo();
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);

        if (beta <= alpha) {
          searchedAllMoves = false;
          break;
        }
      }

      bestScore = maxEval;
    } else {
      var minEval = Infinity;

      for (var j = 0; j < moves.length; j += 1) {
        game.move(moves[j]);
        var replyScore = minimax(depth - 1, alpha, beta, true);
        game.undo();
        minEval = Math.min(minEval, replyScore);
        beta = Math.min(beta, replyScore);

        if (beta <= alpha) {
          searchedAllMoves = false;
          break;
        }
      }

      bestScore = minEval;
    }

    if (searchedAllMoves) {
      transpositionTable[fenKey] = {
        depth: depth,
        score: bestScore
      };
    }

    return bestScore;
  }

  function getBookMove() {
    var history = game.history();
    var key = history.join(" ");
    var choices = openingBook[key];

    if (!choices || choices.length === 0) {
      return null;
    }

    var legalMoves = game.moves({ verbose: true });
    var preferred = choices[Math.floor(Math.random() * choices.length)];

    for (var i = 0; i < legalMoves.length; i += 1) {
      if (legalMoves[i].san === preferred) {
        return legalMoves[i];
      }
    }

    return null;
  }

  function getBestMove(depth) {
    var bookMove = getBookMove();

    if (bookMove) {
      nodesSearched = 0;
      return bookMove;
    }

    var moves = getOrderedMoves({ verbose: true });
    var bestMove = null;
    var bestScore = Infinity;
    transpositionTable = {};
    nodesSearched = 0;

    for (var i = 0; i < moves.length; i += 1) {
      var move = moves[i];
      game.move(move);
      var score = minimax(depth - 1, -Infinity, Infinity, true);
      game.undo();

      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
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

  function updateDepthUi() {
    depthValueEl.textContent = searchDepth + " ply";
    depthWarningEl.hidden = searchDepth < 4;
  }

  function updateStatus() {
    var status = "";

    if (game.in_checkmate()) {
      status = game.turn() === "w" ? "Checkmate. Black wins." : "Checkmate. White wins.";
    } else if (game.in_draw()) {
      status = "Draw.";
    } else {
      status = game.turn() === "w" ? "Your move as White." : "Engine thinking as Black.";

      if (game.in_check()) {
        status += " Check.";
      }
    }

    statusEl.textContent = status;
    renderMoveHistory();
  }

  function syncBoard() {
    board.position(game.fen(), false);
    updateStatus();
  }

  function createEngineWorker() {
    if (typeof Worker === "undefined") {
      return null;
    }

    try {
      var worker = new Worker("chess-engine-worker.js");

      worker.onmessage = function (event) {
        var data = event.data;

        if (!data || data.requestId !== engineRequestId) {
          return;
        }

        engineThinking = false;

        if (data.error) {
          engineStateEl.textContent = "Worker failed; using fallback";
          window.setTimeout(runSynchronousEngineMove, 20);
          return;
        }

        applyEngineResult(data);
      };

      worker.onerror = function () {
        engineThinking = false;
        engineWorker = null;
        engineStateEl.textContent = "Worker unavailable; using fallback";
        window.setTimeout(runSynchronousEngineMove, 20);
      };

      return worker;
    } catch (error) {
      return null;
    }
  }

  function applyEngineResult(result) {
    if (game.game_over() || game.turn() !== "b") {
      return;
    }

    if (result.move) {
      game.move(result.move);
      syncBoard();
    }

    if (game.game_over()) {
      engineStateEl.textContent = "Game over";
    } else if (result.book) {
      engineStateEl.textContent = "Book move";
    } else {
      engineStateEl.textContent = "Searched " + Number(result.nodes || 0).toLocaleString() + " positions";
    }
  }

  function runSynchronousEngineMove() {
    if (game.game_over() || game.turn() !== "b") {
      engineStateEl.textContent = game.game_over() ? "Game over" : "Waiting";
      return;
    }

    var bestMove = getBestMove(searchDepth);
    applyEngineResult({
      move: bestMove,
      nodes: nodesSearched,
      book: nodesSearched === 0
    });
  }

  function onDragStart(source, piece) {
    if (engineThinking) {
      return false;
    }

    if (game.game_over()) {
      return false;
    }

    if (game.turn() !== "w") {
      return false;
    }

    if (piece.search(/^b/) !== -1) {
      return false;
    }

    return true;
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
    window.setTimeout(makeEngineMove, 150);
    return undefined;
  }

  function onSnapEnd() {
    board.position(game.fen());
  }

  function makeEngineMove() {
    if (game.game_over()) {
      engineStateEl.textContent = "Game over";
      updateStatus();
      return;
    }

    if (game.turn() !== "b") {
      engineStateEl.textContent = "Waiting";
      return;
    }

    engineThinking = true;
    engineStateEl.textContent = "Thinking at depth " + searchDepth;

    if (!engineWorker) {
      engineWorker = createEngineWorker();
    }

    if (!engineWorker) {
      window.setTimeout(function () {
        engineThinking = false;
        runSynchronousEngineMove();
      }, 20);
      return;
    }

    engineRequestId += 1;
    engineWorker.postMessage({
      requestId: engineRequestId,
      fen: game.fen(),
      history: game.history(),
      depth: searchDepth
    });
  }

  function resetGame() {
    engineRequestId += 1;
    engineThinking = false;

    if (engineWorker) {
      engineWorker.terminate();
      engineWorker = createEngineWorker();
    }

    game.reset();
    engineStateEl.textContent = "Waiting";
    syncBoard();
  }

  board = Chessboard("board", {
    draggable: true,
    position: "start",
    pieceTheme: "vendor/img/chesspieces/wikipedia/{piece}.png",
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  });

  engineWorker = createEngineWorker();

  window.addEventListener("resize", function () {
    board.resize();
  });

  depthInputEl.addEventListener("input", function (event) {
    searchDepth = parseInt(event.target.value, 10);
    updateDepthUi();
  });

  newGameEl.addEventListener("click", resetGame);

  flipBoardEl.addEventListener("click", function () {
    board.flip();
  });

  updateDepthUi();
  renderMoveHistory();
  updateStatus();
})();
