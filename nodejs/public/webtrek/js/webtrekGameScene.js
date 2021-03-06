/*
* webtrekGameScene.js
*
* Contains drawing, animation and UI code for the main game screne
*
* Copyright(c) 2014 - Jason Shankel all rights reserved
*
*/

var trekGameScene = {
  stars: [],
  bases: [],
  enemies: [],
  ship: {x:0,y:0,energy:1000,torpedoes:10},
  mouseGrid: {x:0,y:0},
  lockCursor: {x:-1,y:-1},
  imageMap: {},
  course: [],
  travelBaseTime: 0,
  torpedoInterval: 200,

  placeObjectOnGrid: function(ob,x,y) {
    var canvas =document.getElementById("scanner");
    var context =canvas.getContext("2d");
    context.drawImage(ob,x*canvas.width/8,y*canvas.height/8);
  },

  loadImage: function(file,callback) {
    var url = document.URL+file;

    var source = new Image();
    source.src = url;

    var self = trekGameScene;

    source.onload = function(){
      self.imageMap[file] = source;
      callback(null);
    }
  },

  redrawScene: function() {
    var canvas =document.getElementById("scanner");
    var context =canvas.getContext("2d");
    context.clearRect(0,0,canvas.width,canvas.height);

    var self = this;
    self.drawGrid();

    self.stars.forEach(function(s){
      self.placeObjectOnGrid(self.imageMap['svg/star.svg'],s.x,s.y);
    });

    self.bases.forEach(function(s){
      self.placeObjectOnGrid(self.imageMap['svg/station.svg'],s.x,s.y);
    });

    self.enemies.forEach(function(e){
      self.placeObjectOnGrid(self.imageMap['svg/enemy.svg'],e.x,e.y);
    });


    self.placeObjectOnGrid(self.imageMap['svg/ship.svg'],self.ship.x,self.ship.y);

    if (trekGameScene.mouseGrid.x != -1) {
      self.placeObjectOnGrid(self.imageMap['svg/cursor.svg'],self.mouseGrid.x,self.mouseGrid.y);
    }

    self.torpedoes.forEach(function(t){
      self.placeObjectOnGrid(self.imageMap['svg/torpedo.svg'],t.points[0].x,t.points[0].y);
    });

    var canvas = document.getElementById('scanner');
    var context = canvas.getContext('2d');
    context.strokeStyle="#ff0000";
    this.phasers.forEach(function(p){
      context.beginPath();
      context.moveTo(p.points[0].x*canvas.width/8,p.points[0].y*canvas.height/8);
      context.lineTo(p.points[1].x*canvas.width/8,p.points[1].y*canvas.height/8);
      context.stroke();

    });

    if (this.lockCursor) {
      this.placeObjectOnGrid(this.imageMap['svg/lockCursor.svg'],this.lockCursor.x,this.lockCursor.y);
    }
  },


  drawGrid: function() {
    var canvas =document.getElementById("scanner");
    var context =canvas.getContext("2d");
    context.fillStyle="#000000";
    context.fillRect(0,0,canvas.width,canvas.height);
    context.strokeStyle="#00A000";
    context.lineWidth = 2;

    for (var g=0;g<=8;g++) {
      context.beginPath();
      context.moveTo((g*canvas.width)/8,0);
      context.lineTo((g*canvas.width)/8,canvas.height);
      context.stroke();


      context.beginPath();
      context.moveTo(0,canvas.height*g/8);
      context.lineTo(canvas.width,canvas.height*g/8);
      context.stroke();
    }
  },

  drawLongRange: function() {
    var canvas =document.getElementById("scanner");
    var context =canvas.getContext("2d");
    this.drawGrid();
    for (var i=0;i<8;++i) {
      for (var j=0;j<8;++j) {
        var px = (i*canvas.width)/8;
        var py = (j*canvas.height)/8;
        context.fillText("HI",px,py);
      }
    }
  },

  clipCourse: function(points) {
    var ret = [];
    for (var p=0;p<points.length;p++) {
      ret.push(points[p]);
      if (this.coordOccupied(points[p].x,points[p].y)) {
        return ret;
      }
    }
    return ret;
  },

  firePhasers: function(btn) {
    btn.blur();
    if (this.phasers.length == 0 && this.lockCursor) {
      var points=[];

      var target = this.coordOccupied(this.lockCursor.x,this.lockCursor.y);
      if (target && target.type === 'svg/enemy.svg') {
        bresenhamLine(this.ship.x,this.ship.y,this.lockCursor.x,this.lockCursor.y,points);
        if (points.length > 1) {
          console.log(points);
          points = [{x:this.ship.x,y:this.ship.y}].concat(this.clipCourse(points.slice(1,points.length)));//.join({x:scene.ship.x,y:scene.ship.y});
          console.log(points);
          if (points.length > 1) {
            this.firePhasersCoords(points[0].x,points[0].y,points[points.length-1].x,points[points.length-1].y,5000);
          }
        }
      }
    }
  },

  fireTorpedo: function(btn) {
    if (this.ship.torpedoes > 0) {
      if (this.lockCursor) {
        this.ship.torpedoes -= 1;
        this.fireTorpedoCoords(this.ship.x,this.ship.y,this.lockCursor.x,this.lockCursor.y,this.torpedoInterval);
      }
    }
    btn.blur();
  },

  dockShip: function(btn) {
    btn.blur();
  },

  travelTo: function(btn) {
    btn.blur();
    if (this.lockCursor) {
      var points = [];
      bresenhamLine(this.ship.x,this.ship.y,this.lockCursor.x,this.lockCursor.y,points);
      points = points.slice(1,points.length);
      if (points.length > 0) {
        if (this.coordOccupied(points[points.length-1].x,points[points.length-1].y)){
          points = points.slice(0,points.length-1);
        }
        this.course = this.clipCourse(points);
        this.travelBaseTime = new Date().getTime();
      }
    }
  },

  coordOccupied: function(x,y) {
    for (var s=0;s<this.stars.length;s++) {
      if (this.stars[s].x == x && this.stars[s].y == y) {
        return {object:this.stars[s],type:'svg/star.svg'};
      }
    }
    for (var s=0;s<this.bases.length;s++) {
      if (this.bases[s].x == x && this.bases[s].y == y) {
        return {object:this.bases[s],type:'svg/station.svg'};
      }
    }
    for (var s=0;s<this.enemies.length;s++) {
      if (this.enemies[s].x == x && this.enemies[s].y == y) {
        return {object:this.enemies[s],type:'svg/enemy.svg'};
      }
    }
    if (this.ship && (this.ship.x == x && this.ship.y == y)) {
      return {object:this.ship,type:'svg/ship.svg'};
    }
    return null;
  },

  findFreeSpot: function() {
    var x=randomInt(0,7),y=randomInt(0,7);
    while(this.coordOccupied(x,y)!==null) {
      x = randomInt(0,7);
      y = randomInt(0,7);
    }
    return [x,y];
  },

  loadQuadrant: function(qx,qy) {

    console.log("Loading "+qx+" "+qy);

    var quadrant = trekGameModel.quadrantData[qx][qy];

    console.log(quadrant);

    this.stars = [];
    this.bases = [];
    this.enemies = [];
    this.phasers = [];
    this.torpedoes = [];

    for (var n in quadrant.stars) {
      this.stars.push({
        x:quadrant.stars[n].position.secx,
        y:quadrant.stars[n].position.secy
      });
    }

    for (var n in quadrant.bases) {
      this.bases.push({
        x:quadrant.bases[n].position.secx,
        y:quadrant.bases[n].position.secy
      });
    }

    for (var n in quadrant.enemies) {
      this.enemies.push({
        x:quadrant.enemies[n].position.secx,
        y:quadrant.enemies[n].position.secy
      });
    }

    var loc = this.findFreeSpot();
    this.ship = {x:loc[0],y:loc[1],torpedoes:9,energy:999,shields:100};

    this.redrawScene();
  },

  firePhasersCoords: function(x0,y0,x1,y1,duration) {

    var target = this.coordOccupied(x1,y1);
    if (target && target.type === 'svg/enemy.svg') {

      this.phasers.push({points:[{x:x0+0.5,y:y0+0.5},{x:x1+0.5,y:y1+0.5}],
        baseTime:new Date().getTime(),
        duration:duration,
        target:target.object,
        energy:trekGameModel.phaserEnergy});
      }
    },

  fireTorpedoCoords: function(x0,y0,x1,y1,interval) {
    var points = [];
    bresenhamLine(x0,y0,x1,y1,points);

    this.torpedoes.push({points:points,baseTime:new Date().getTime(),interval:interval
    });
  },

  checkTorpedoImpact: function(torpedo) {
    var impact = this.coordOccupied(torpedo.points[0].x,torpedo.points[0].y);
    return impact;
  },

  setReadoutText: function(line,text) {
    var textLine = document.getElementById('readout-'+line);
    if (textLine) {
      textLine.innerHTML = text+'<br/>';
    }
  },

  getTargetStatusString: function() {
    if (this.lockCursor===null) {
      return 'No Target';
    }

    var object = this.coordOccupied(this.lockCursor.x,this.lockCursor.y);
    if (object===null) {
      return 'No Target';
    }

    if (object.type==='svg/star.svg') {
      return 'Star';
    }

    if (object.type==='svg/station.svg') {
      if (object.object.friendly) {
        return 'FRIEND';
      } else {
        return 'FOE';
      }
    }

    if (object.type==='svg/enemy.svg') {
      return 'DMG: '+object.object.damage;
    }

    return 'No Target'
  },

  damageEnemy: function(enemy,points) {
    enemy.damage -= points;
    this.enemies = this.enemies.filter(function(o){
      return o.damage > 0;
    });
  },

  frameUpdate: function() {
    var self = this;
    self.setReadoutText(0,'Ship Status');
    self.setReadoutText(1,'TORP: '+self.ship.torpedoes);
    self.setReadoutText(2,'ENER: '+self.ship.energy);
    self.setReadoutText(3,'SHLD: '+self.ship.shields);
    self.setReadoutText(4,'');

    self.setReadoutText(5,'Target Status');
    self.setReadoutText(6,self.getTargetStatusString());

    var time = new Date().getTime();
    var wantRedraw = self.torpedoes.length > 0 || self.phasers.length > 0;
    self.torpedoes.forEach(function(t){
      var impact = self.checkTorpedoImpact(t);
      if (impact !== null && impact.type !== 'svg/ship.svg') {
        console.log('impact at '+t.points[0].x+','+t.points[0].y+' with '+impact.type);

        if (impact.type === 'svg/station.svg') {
          impact.object.friendly = false;
        }

        if (impact.type === 'svg/enemy.svg') {
          self.damageEnemy(impact.object,200+randomInt(0,1000));
        }

        t.points = [];
      }
      else if (time-t.baseTime > t.interval) {
        t.baseTime = time;
        t.points = t.points.slice(1,t.points.length);
      }
    });
    self.torpedoes = self.torpedoes.filter(function(t){
      return t.points.length > 0;
    });

    self.phasers = self.phasers.filter(function(p){
      if (time-p.baseTime > p.duration) {
        self.damageEnemy(p.target,p.energy);
        self.ship.energy -= p.energy;
        return false;
      } else {
        return true;
      }
    });

    wantRedraw = wantRedraw || self.phasers.length > 0;


    if (this.course.length > 0 && time-this.travelBaseTime > 500) {
      this.travelBaseTime = time;
      self.ship.x = this.course[0].x;
      self.ship.y = this.course[0].y;
      this.course = this.course.splice(1,this.course.length);
      if (this.course.length == 0) {
        this.lockCursor = null;
      }
      wantRedraw = true;
    }


    if (wantRedraw) {
      self.redrawScene();
    }
  }

};
