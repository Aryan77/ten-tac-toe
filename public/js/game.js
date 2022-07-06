(() => {
  class Line {
    constructor(children) {
      this.children = children;
      for (let i = 0; i < 3; i++) {
        this.children[i].lines.push(this);
      }
      this.player = null;
      this.numInARow = 0;
      this.score = 0;
    }

    evaluate() {
      let counter = {
        X: 0,
        O: 0,
        tie: 0,
      };
      for (let i = 0; i < this.children.length; i++) {
        if (this.children[i].winner) {
          counter[this.children[i].winner]++;
        }
        this.children[i].score -= this.score;
      }
      if (counter.tie > 0 || counter.X > 0 === counter.O > 0) {
        this.player = null;
        this.numInARow = 0;
        this.score = 0;
      } else if (counter.X > 0) {
        this.player = "X";
        this.numInARow = counter.X;
        if (this.children[0] instanceof Cell) {
          this.score = Math.pow(10, this.numInARow - 1);
        } else {
          this.score = Math.pow(10, this.numInARow + 1);
        }
      } else {
        this.player = "O";
        this.numInARow = counter.O;
        if (this.children[0] instanceof Cell) {
          this.score = -Math.pow(10, this.numInARow - 1);
        } else {
          this.score = -Math.pow(10, this.numInARow + 1);
        }
      }
      for (let i = 0; i < this.children.length; i++) {
        this.children[i].score += this.score;
      }
    }
  }

  class Cell {
    constructor(location) {
      this.location = location;
      this.lines = [];
      this.winner = null;
      this.score = 0;
    }

    makeMove(player) {
      if (this.winner === null) {
        this.winner = player;
        for (let i = 0; i < this.lines.length; i++) {
          this.lines[i].evaluate();
        }
        return true;
      }
      return false;
    }

    undoMove() {
      this.winner = null;
      for (let i = 0; i < this.lines.length; i++) {
        this.lines[i].evaluate();
      }
    }
  }

  class CellDisplay {
    constructor(parent, location) {
      this.element = $(
        "<td class='cell " + location.notation + " disabled'></td>"
      );
      this.element.click(this.onclick.bind(this));
      this.parent = parent;
      this.location = location;
    }

    update(move) {
      if (!move) {
        this.element.removeClass("enabled").addClass("disabled");
        let winner =
          game.bigBoard.children[this.parent.location.row][
            this.parent.location.col
          ].children[this.location.row][this.location.col].winner;
        this.element.text(winner);
      } else {
        let canMove = false;
        for (let i = 0; i < players.length; i++) {
          if (players[i] === game.playerWhoseTurnItIs) {
            canMove = true;
            break;
          }
        }
        if (canMove) {
          this.element.removeClass("disabled").addClass("enabled");
        } else {
          this.element.removeClass("enabled").addClass("disabled");
        }
        this.element.empty();
      }
    }

    onclick() {
      if (this.element.hasClass("enabled")) {
        let move = new Move(this.parent.location, this.location);
        game.makeMove(move);
        bigBoardDisplay.update();
        aiMove();

        if (online) {
          socket.emit("move", move);
        }
      }
    }
  }

  class SmallBoard {
    constructor(location) {
      this.location = location;
      this.children = [];
      for (let i = 0; i < 3; i++) {
        this.children.push([]);
        for (let j = 0; j < 3; j++) {
          this.children[i].push(new Cell(new Location(i, j)));
        }
      }

      let diag1 = [];
      let diag2 = [];
      for (let i = 0; i < 3; i++) {
        diag1.push(this.children[i][i]);
        diag2.push(this.children[i][2 - i]);
        let row = [];
        let col = [];
        for (let j = 0; j < 3; j++) {
          row.push(this.children[i][j]);
          col.push(this.children[j][i]);
        }
        new Line(row);
        new Line(col);
      }
      new Line(diag1);
      new Line(diag2);

      this.score = 0;

      this.lines = [];
      this.winner = null;
      this.numChildrenCompleted = 0;
    }

    getPossibleMoves() {
      let moves = [];
      if (this.winner === null) {
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (this.children[i][j].winner === null) {
              moves.push(new Move(this.location, this.children[i][j].location));
            }
          }
        }
      }
      return moves;
    }

    makeMove(move, player) {
      if (this.winner === null) {
        let cell = this.children[move.cellLocation.row][move.cellLocation.col];
        this.score -= cell.score;
        let success = cell.makeMove(player);
        this.score += cell.score;
        if (success) {
          this.numChildrenCompleted++;
          if (this.numChildrenCompleted === 9) {
            this.winner = "tie";
          }
          for (let i = 0; i < cell.lines.length; i++) {
            if (cell.lines[i].numInARow === 3) {
              this.winner = cell.lines[i].player;
              break;
            }
          }
          if (this.winner) {
            for (let i = 0; i < this.lines.length; i++) {
              this.lines[i].evaluate();
            }
          }
          return true;
        }
      }
      return false;
    }

    undoMove(move) {
      let cell = this.children[move.cellLocation.row][move.cellLocation.col];
      this.score -= cell.score;
      cell.undoMove();
      this.score += cell.score;
      this.numChildrenCompleted--;
      if (this.winner) {
        this.winner = null;
        for (let i = 0; i < this.lines.length; i++) {
          this.lines[i].evaluate();
        }
      }
    }
  }

  class SmallBoardDisplay {
    constructor(parent, location) {
      this.element = $(
        "<td class='smallBoard " + location.notation + " disabled'></td>"
      );
      this.parent = parent;
      this.location = location;

      this.children = [];
      let table = $("<table></table>").appendTo(this.element);
      for (let i = 0; i < 3; i++) {
        this.children.push([]);
        let row = $("<tr></tr>").appendTo(table);
        for (let j = 0; j < 3; j++) {
          let cellDisplay = new CellDisplay(this, new Location(i, j));
          this.children[i].push(cellDisplay);
          cellDisplay.element.appendTo(row);
        }
      }
    }

    update(possibleMoves) {
      if (possibleMoves.length === 0) {
        this.element.removeClass("enabled").addClass("disabled");
        let winner =
          game.bigBoard.children[this.location.row][this.location.col].winner;
        if (winner !== "tie") {
          this.element.attr("data-winner", winner);
        }
      } else {
        this.element.removeClass("disabled").addClass("enabled");
        this.element.attr("data-winner", null);
      }
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          let cellDisplay = this.children[i][j];
          cellDisplay.update(
            possibleMoves.find(function (move) {
              return (
                move.cellLocation.row === cellDisplay.location.row &&
                move.cellLocation.col === cellDisplay.location.col
              );
            })
          );
        }
      }
    }
  }

  class BigBoard {
    constructor() {
      this.children = [];
      for (let i = 0; i < 3; i++) {
        this.children.push([]);
        for (let j = 0; j < 3; j++) {
          this.children[i].push(new SmallBoard(new Location(i, j)));
        }
      }

      let diag1 = [];
      let diag2 = [];
      for (let i = 0; i < 3; i++) {
        diag1.push(this.children[i][i]);
        diag2.push(this.children[i][2 - i]);
        let row = [];
        let col = [];
        for (let j = 0; j < 3; j++) {
          row.push(this.children[i][j]);
          col.push(this.children[j][i]);
        }
        new Line(row);
        new Line(col);
      }
      new Line(diag1);
      new Line(diag2);

      this.score = 0;

      this.winner = null;
      this.numChildrenCompleted = 0;
    }

    getPossibleMoves() {
      let moves = [];
      if (this.winner === null) {
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            moves = moves.concat(this.children[i][j].getPossibleMoves());
          }
        }
      }
      return moves;
    }

    makeMove(move, player) {
      if (this.winner === null) {
        let smallBoard =
          this.children[move.smallBoardLocation.row][
            move.smallBoardLocation.col
          ];
        this.score -= smallBoard.score;
        let success = smallBoard.makeMove(move, player);
        this.score += smallBoard.score;
        if (success) {
          if (smallBoard.winner) {
            this.numChildrenCompleted++;
            if (this.numChildrenCompleted === 9) {
              this.winner = "tie";
            }
            for (let i = 0; i < smallBoard.lines.length; i++) {
              if (smallBoard.lines[i].numInARow === 3) {
                this.winner = smallBoard.lines[i].player;
                break;
              }
            }
          }
          return true;
        }
      }
      return false;
    }

    undoMove(move) {
      let smallBoard =
        this.children[move.smallBoardLocation.row][move.smallBoardLocation.col];
      if (smallBoard.winner) {
        this.numChildrenCompleted--;
      }
      this.score -= smallBoard.score;
      smallBoard.undoMove(move);
      this.score += smallBoard.score;
      this.winner = null;
    }
  }

  class BigBoardDisplay {
    constructor() {
      this.element = $("#game");

      this.children = [];
      let table = $("<table></table>").appendTo(this.element);
      for (let i = 0; i < 3; i++) {
        this.children.push([]);
        let row = $("<tr></tr>").appendTo(table);
        for (let j = 0; j < 3; j++) {
          let smallBoardDisplay = new SmallBoardDisplay(
            this,
            new Location(i, j)
          );
          this.children[i].push(smallBoardDisplay);
          smallBoardDisplay.element.appendTo(row);
        }
      }
    }

    update() {
      let possibleMoves = game.getPossibleMoves();
      if (possibleMoves.length === 0) {
        this.element.removeClass("enabled").addClass("disabled");
        let winner = game.bigBoard.winner;
        if (winner === "tie") {
          gameCaption.text("It's a tie!");
        } else {
          gameCaption.text(winner + " wins!");
        }
      } else {
        this.element.removeClass("disabled").addClass("enabled");
        gameCaption.text("Current move: " + game.playerWhoseTurnItIs);
        let canMove = false;
        for (let i = 0; i < players.length; i++) {
          if (players[i] === game.playerWhoseTurnItIs) {
            canMove = true;
            break;
          }
        }
        if (players.length === 0) {
          gameCaption.append(
            " <span class='text-muted'>(you are spectating)</span>"
          );
        } else if (!canMove) {
          gameCaption.append(" <span class='text-muted'>( ... )</span>");
        }
        let history = game.history;
        let turn = history.length;
        if (turn === historyTableBody.children("tr").length + 1) {
          let player = turn % 2 ? "X" : "O";
          let notation = history[turn - 1].notation;
          historyTableBody.append(
            "<tr><th scope='row'>" +
              turn +
              "</th><td>" +
              player +
              "</td><td>" +
              notation +
              "</td></tr>"
          );
        }
      }
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          let smallBoardDisplay = this.children[i][j];
          smallBoardDisplay.update(
            possibleMoves.filter(function (move) {
              return (
                move.smallBoardLocation.row ===
                  smallBoardDisplay.location.row &&
                move.smallBoardLocation.col === smallBoardDisplay.location.col
              );
            })
          );
        }
      }
    }
  }

  class Game {
    constructor(aiPlayer, difficulty) {
      this.playerWhoseTurnItIs = "X";
      this.history = [];
      this.bigBoard = new BigBoard();
      this.aiPlayer = aiPlayer;
      this.difficulty = difficulty;
    }

    getCurrentSmallBoard() {
      let smallBoard;
      if (this.history.length > 0) {
        let previousCellLocation =
          this.history[this.history.length - 1].cellLocation;
        smallBoard =
          this.bigBoard.children[previousCellLocation.row][
            previousCellLocation.col
          ];
      }
      return smallBoard;
    }

    getPossibleMoves() {
      let smallBoard = this.getCurrentSmallBoard();
      if (this.history.length === 0 || smallBoard.winner) {
        return this.bigBoard.getPossibleMoves();
      }
      if (this.bigBoard.winner === null) {
        return smallBoard.getPossibleMoves();
      }
      return [];
    }

    makeMove(move) {
      let smallBoard = this.getCurrentSmallBoard();
      if (
        this.history.length === 0 ||
        smallBoard.winner ||
        (move.smallBoardLocation.row === smallBoard.location.row &&
          move.smallBoardLocation.col === smallBoard.location.col)
      ) {
        let success = this.bigBoard.makeMove(move, this.playerWhoseTurnItIs);
        if (success) {
          if (this.playerWhoseTurnItIs === "X") {
            this.playerWhoseTurnItIs = "O";
          } else {
            this.playerWhoseTurnItIs = "X";
          }
          this.history.push(move);
          return true;
        }
      }
      return false;
    }

    undoMove() {
      if (this.history.length > 0) {
        if (this.playerWhoseTurnItIs === "X") {
          this.playerWhoseTurnItIs = "O";
        } else {
          this.playerWhoseTurnItIs = "X";
        }
        let move = this.history.pop();
        this.bigBoard.undoMove(move);
      }
    }

    minimax(depth, player, alpha, beta) {
      let moves = this.getPossibleMoves();

      let score, bestMove;

      if (moves.length === 0 || depth === this.difficulty) {
        score = this.getScore();
        return {
          score: score,
          move: null,
        };
      }

      for (let i = 0; i < moves.length; i++) {
        let move = moves[i];
        this.makeMove(move);
        score = this.minimax(
          depth + 1,
          player === "X" ? "O" : "X",
          alpha,
          beta
        ).score;
        if (player === this.aiPlayer) {
          if (score > alpha) {
            alpha = score;
            bestMove = move;
          }
        } else {
          if (score < beta) {
            beta = score;
            bestMove = move;
          }
        }
        this.undoMove();
        if (alpha >= beta) {
          break;
        }
      }

      return {
        score: player === this.aiPlayer ? alpha : beta,
        move: bestMove,
      };
    }

    getScore() {
      let score = this.bigBoard.score;
      if (this.aiPlayer === "O") {
        score *= -1;
      }
      return score;
    }
  }

  function Move(smallBoardLocation, cellLocation) {
    this.smallBoardLocation = smallBoardLocation;
    this.cellLocation = cellLocation;
    this.notation = smallBoardLocation.notation + "/" + cellLocation.notation;
  }

  function Location() {
    if (typeof arguments[0] === "string") {
      this.notation = arguments[0];

      let firstChar = this.notation.charAt(0);
      let lastChar = this.notation.charAt(this.notation.length - 1);

      if (firstChar === "N") {
        this.row = 0;
      } else if (firstChar === "S") {
        this.row = 2;
      } else {
        this.row = 1;
      }
      if (lastChar === "W") {
        this.col = 0;
      } else if (lastChar === "E") {
        this.col = 2;
      } else {
        this.col = 1;
      }
    } else {
      this.row = arguments[0];
      this.col = arguments[1];

      this.notation = "";

      if (this.row === 0) {
        this.notation += "N";
      } else if (this.row === 2) {
        this.notation += "S";
      }
      if (this.col === 0) {
        this.notation += "W";
      } else if (this.col === 2) {
        this.notation += "E";
      }
      if (this.notation.length === 0) {
        this.notation = "C";
      }
    }
  }

  ///////

  function aiMove() {
    if (game.aiPlayer === game.playerWhoseTurnItIs) {
      setTimeout(function () {
        let move = game.minimax(0, game.aiPlayer, -Infinity, Infinity).move;
        game.makeMove(move);
        bigBoardDisplay.update();
      }, 500);
    }
  }

  let game;
  let bigBoardDisplay = new BigBoardDisplay();
  let socket;
  let online = location.pathname.split("/")[1] === "online";
  let players = [];

  let gameCaption = $("#game-caption");
  let opponent = $("#opponent");
  let first = $("#first");
  let difficulty = $("#difficulty");
  let newGame = $("#new-game");
  let playerDisplay = $("#player-display");
  let connectionStatus = $("#connection-status");
  let url = $("#url");
  let historyTableBody = $("#history-table>tbody");

  newGame.click(function () {
    let aiPlayer;
    if (first.val() === "player") {
      players = ["X"];
      aiPlayer = "O";
      playerDisplay.text("You're playing as X");
    } else {
      players = ["O"];
      aiPlayer = "X";
      playerDisplay.text("You're playing as O");
    }
    playerDisplay.show(500);
    game = new Game(aiPlayer, parseInt(difficulty.val()));

    historyTableBody.empty();
    bigBoardDisplay.update();
    aiMove();
  });

  opponent.change(function () {
    if (this.value === "computer") {
      first.parent().show(500);
      difficulty.parent().show(500);
    } else {
      first.parent().hide(500);
      difficulty.parent().hide(500);
    }
  });

  url.val(location);
  url.focus(function () {
    $(this).select();
  });

  if (online) {
    socket = io();

    socket.on("connection", function (player, room) {
      if (player) {
        players = [player];
        playerDisplay.text("You're playing as " + player);
      } else {
        playerDisplay.text("Waiting for other player");
      }
      playerDisplay.show(500);
      if (room.game.players.length === 1) {
        url.closest("form").show(500);
      }
      game = new Game(null, 0);
      for (let i = 0; i < room.game.history.length; i++) {
        game.makeMove(room.game.history[i]);
      }
      bigBoardDisplay.update();
    });

    socket.on("someone connected", function (room) {
      if (room.game.players.length === 2) {
        connectionStatus.removeClass("alert-danger").addClass("alert-success");
        connectionStatus.text("Both players online");
        connectionStatus.show(500);
        url.closest("form").hide(500);
      }
    });

    socket.on("someone disconnected", function (room) {
      if (room.game.players.length < 2) {
        connectionStatus.removeClass("alert-success").addClass("alert-danger");
        connectionStatus.text(
          room.game.players.length === 1
            ? "Other player left"
            : "Both players left"
        );
      }
    });

    socket.on("move", function (move) {
      game.makeMove(move);
      bigBoardDisplay.update();
    });
  }
})();
