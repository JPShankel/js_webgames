/*
* webtrekGameState.js
*
* Manages the current application state (main menu, loading, saving, playing)
*
* Copyright(c) 2014 - Jason Shankel all rights reserved
*
*/


/*
 * TrekGameState - base class for app state
 */
function TrekGameState() {
}

TrekGameState.prototype.onEnter = function() {
  console.log("enter "+this.name);
  console.log(this);
}

TrekGameState.prototype.onExit = function() {
  console.log("exit "+this.name);
}

TrekGameState.prototype.onKeyDown = function(evt) {
  console.log(evt);
}

TrekGameState.prototype.onUpdate = function() {
  console.log("update "+this.name);
}

TrekGameState.prototype.onFrameUpdate = function() {
}

/*
* NewGameState - app state handler for starting a new game
*/
function NewGameState () {
  this.name = "new game state";
}
NewGameState.prototype = new TrekGameState();
NewGameState.prototype.onFrameUpdate = function() {
  gameStateManager.setState(shortRangeState);
}
var newGameState = new NewGameState();

/*
* LoadGameState - app state handler for loading an old game
*/
function LoadGameState() {
  this.name="load game state";
}
LoadGameState.prototype = new TrekGameState();
LoadGameState.prototype.onEnter = function() {
  TrekGameState.prototype.onEnter.call(this);
  $("#loadGameModal").modal({backdrop:'static'});
}
var loadGameState = new LoadGameState();

/*
* SaveGameState - app state handler for saving current game
*/
function SaveGameState() {
  this.name="save game state";
  this.showingDialog = false;
}
SaveGameState.prototype = new TrekGameState();
SaveGameState.prototype.onEnter = function() {
  TrekGameState.prototype.onEnter.call(this);
  this.showingDialog = false;
}
SaveGameState.prototype.onFrameUpdate = function() {
  if (!this.showingDialog) {
    this.showingDialog = true;
    var gameName = window.prompt("Enter Save Game Name");
    if (gameName) {
      alert("Game Saved!");
      gameStateManager.setState(shortRangeState);
    }
    else {
      gameStateManager.setState(escapeMenuState);
    }
  }
}
var saveGameState = new SaveGameState();

/*
* GameOverState - app state handler for the game over state
*/
function GameOverState() {
  this.name="game over state";
}
GameOverState.prototype = new TrekGameState();
var gameOverState = new GameOverState();

/*
* ShortRangeState - app state handler for the short range scanner mode
*/
function ShortRangeState() {
  this.name="short range state";
}
ShortRangeState.prototype = new TrekGameState();
ShortRangeState.prototype.onKeyDown = function(evt) {
  if (evt.keyCode === 27) {
    gameStateManager.setState(escapeMenuState);
  } else {
    TrekGameState.prototype.onKeyDown(evt);
  }
}
var shortRangeState = new ShortRangeState();

/*
* LongRangeState - app state handler for the long ranger scanner mode
*/
function LongRangeState() {
  this.name="long range state";
}
LongRangeState.prototype = new TrekGameState();
var longRangeState = new LongRangeState();


/*
* MainMenuState - app state handler for the main menu
*/
function MainMenuState() {
  this.name="main menu state";
}
MainMenuState.prototype = new TrekGameState();
MainMenuState.prototype.onEnter = function() {
  $("#mainMenuModal").modal({backdrop:'static'});
  console.log("enter main menu state");
}
var mainMenuState = new MainMenuState();

/*
* EscapeMenuState - app state handler for the escape menu
*/
function EscapeMenuState() {
  this.name="escape menu state";
}
EscapeMenuState.prototype = new TrekGameState();
EscapeMenuState.prototype.onEnter = function() {
  TrekGameState.prototype.onEnter.call(this);
  $("#escapeMenuModal").modal({backdrop:'static'});
}
var escapeMenuState = new EscapeMenuState();

/*
 * gameStateManager - manages current app state and state transitions
 */
var gameStateManager = {
  setState : function(newState) {
    if (this.currentState) {
      this.currentState.onExit();
    }
    console.log("Setting State");
    console.log(newState);
    newState.onEnter();
    this.currentState = newState;
  },

  onKeyDown : function(evt) {
    if (this.currentState) {
      this.currentState.onKeyDown(evt);
    }
  },

  onFrameUpdate : function() {
    if (this.currentState) {
      this.currentState.onFrameUpdate();
    }
  },

  pushState : function() {
    this.stateStack.push(this.currentState);
    console.log(this.stateStack);
  },

  popState : function(newState) {
    if (this.currentState) {
      this.currentState.onExit();
    }
    this.currentState = this.stateStack.pop();
    if (newState) {
      this.currentState = newState;
    }
    this.currentState.onEnter();
    console.log(this.stateStack);
  }
}
gameStateManager.stateStack = [];

function onClickNewGame() {
  gameStateManager.setState(newGameState);
}

function onClickLoadGame() {
  gameStateManager.pushState();
  gameStateManager.setState(loadGameState);
}

function onClickSaveGame() {
  gameStateManager.setState(saveGameState);
}

function onClickMainMenu() {
  gameStateManager.setState(mainMenuState);
}

function onLoadSelectedGame() {
  gameStateManager.popState(shortRangeState);
}

function onCancelLoadGame() {
  gameStateManager.popState();
}

gameStateManager.setState(mainMenuState);
