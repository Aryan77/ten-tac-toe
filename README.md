# Ten-Tac-Toe

Ten-Tac-Toe, more commonly known as [Ultimate Tic Tac Toe](https://en.wikipedia.org/wiki/Ultimate_tic-tac-toe), is a deeply strategic and significantly more complicated extension of regular Tic-Tac-Toe. This web app allows players to play this game against an AI of varying difficulties, or against other players online. 

The multiplayer game has been implemented using websockets in order to establish and maintain a connection between the two players playing - it generates a unique link using which both players can be connected in a 'room' and play the game.

The AI is fairly sophisticated and was built using the Minimax algorithm - it creates a search tree of all the possible moves it can play, it evaluates and checks the board after every move and then it decides to play the move that results in the highest overall score. Increasing the number of moves it can forecast - that is, increasing the depth to which the algorithm searches in the search tree of possible moves will increase the strength of the AI but it also makes it very slow - my implementation is decently strong while still playing moves faster than a regular human would.

Any implementation of a minimax algorithm is strongly reliant on the evaluation function it uses - how does it evaluate different boards and determine that one is better for a certain player than another? In my case, I look at all possible straight lines in the game - these include all the rows, all the columns and all the diagonals. If any of these straight lines consist purely of X’s and O’s, it gets a score based on the number of each it contains, else it gets 0. After every move (in a box), we will update the scores for all the straight lines that contain that box. This way, the algorithm will be able to check how good a certain move is in comparison with other candidate moves.

To capture this notion mathematically,
$eval(GameState) = \sum_{Line \in GameState}{value(Line)}$

We essentially just sum over the lines, in a particular game state, and value(Line) is 0 if it contains both X’s and O’s. In order to separate the evaluation functions of the player and the AI, it is positive for the human and negative for the AI.

This way we capture the notion of one agent trying to maximize the goal while the other is trying to work against that.

Finally a technique called alpha-beta pruning gave me significant performance improvements as it enabled me to selectively disregard significant portions of the game tree, specifically along paths where there was no hope of victory. All of these combined, I believe I thoroughly explored the capabilities of a minimax algorithm and how game-playing algorithms in general are built.

## Run local instance

Clone the repo, run `npm install` in the `src` directory and run `npm run start` to start the game.