/*
 * webtrekGameModel.js
 *
 * Contains the data model for the game state (enemies, stars, quadrants, etc)
 *
 * Copyright(c) 2014 - Jason Shankel all rights reserved
 *
 */


/*
 * TrekPosition - a quadrant/sector position
 */
function TrekPosition(quadx,quady,secx,secy) {
  this.quadx=quadx;
  this.quady=quady;
  this.secx=secx;
  this.secy=secy;
}

/*
 * TrekObject - base class for objects (stars, enemies, bases)
 */
function TrekObject(quadx,quady,secx,secy,type) {
  this.position = new TrekPosition(quadx,quady,secx,secy);
  this.type = type;
}

/*
 * Trek Quadrant - one of the 64 game quadrants with lists of objects
 */
function TrekQuadrant() {
  this.stars = [];
  this.enemies = [];
  this.bases = [];
}

TrekQuadrant.prototype.getSectorObjects = function(sx,sy) {
  var ret = [];

  for (var o in this.stars) {
    if (this.stars[o].position.secx === sx && this.stars[o].position.secy === sy) {
      ret.push(this.stars[o]);
    }
  }

  for (var o in this.enemies) {
    if (this.enemies[o].position.secx === sx && this.enemies[o].position.secy === sy) {
      ret.push(this.enemies[o]);
    }
  }

  for (var o in this.bases) {
    if (this.bases[o].position.secx === sx && this.bases[o].position.secy === sy) {
      ret.push(this.bases[o]);
    }
  }

  return ret;
}

TrekQuadrant.prototype.getObjectCount = function(type) {
  if (type === "star") {
    return this.stars.length;
  }
  if (type === "base") {
    return this.bases.length;
  }
  if (type === "enemy") {
    return this.enemies.length;
  }
}

TrekQuadrant.prototype.createObjectAt = function(qx,qy,sx,sy,type) {
  var newOb = new TrekObject(qx,qy,sx,sy,type);
  if (type==="star") {
    this.stars.push(newOb);
  } else if (type==="base") {
    this.bases.push(newOb);
  } else if (type==="enemy") {
    this.enemies.push(newOb);
  }
  return newOb;
}

/*
 * trekGameModel - data model for the game
 */
var trekGameModel = {
  shipPosition: new TrekPosition(0,0,0,0),
  quadrantData: [],
  phaserEnergy:100,

  init: function() {
    for (var i=0;i<8;++i) {
      var row = [];
      for (var j=0;j<8;++j) {
        row.push(new TrekQuadrant());
      }
      this.quadrantData.push(row);
    }
  },

  generateObjects: function(type,count,quadLimit) {
    for (var i=0;i<count;++i) {
      var qx,qy;
      do {
        qx = Math.floor(Math.random()*8);
        qy = Math.floor(Math.random()*8);
      } while (this.quadrantData[qx][qy].getObjectCount(type) >= quadLimit);
      var sx,sy;
      do {
        sx = Math.floor(Math.random()*8);
        sy = Math.floor(Math.random()*8);
      } while (this.quadrantData[qx][qy].getSectorObjects(sx,sy).length > 0);
      this.quadrantData[qx][qy].createObjectAt(qx,qy,sx,sy,type);
    }
  },

  generate: function(numStars,numBases,numEnemies) {
    this.generateObjects("star",numStars,7);
    this.generateObjects("base",numBases,2);
    this.generateObjects("enemy",numEnemies,3);
  }
};
