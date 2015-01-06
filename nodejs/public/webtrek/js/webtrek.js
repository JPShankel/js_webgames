
var mouseState = 'up';

$(document).ready(function() {
  console.log('Web Trek loaded...');

  setInterval(frameTimer,10);


  var scanner = document.getElementById('scanner');

  document.addEventListener('keydown',function(evt){
    gameStateManager.onKeyDown(evt);
  });

  scanner.addEventListener('mouseout',function(e){
  	mouseGrid.x = mouseGrid.y = -1;
  	trekGameScene.redrawScene();
  },false);

  scanner.addEventListener('mousemove',function(e){
    var canvas =document.getElementById("scanner");

  	var newGrid = {x:Math.floor(e.offsetX*8/canvas.width),y:Math.floor(e.offsetY*8/canvas.height)};
  	if (newGrid.x!=mouseGrid.x ||newGrid.y!=mouseGrid.y) {
  		mouseGrid = newGrid;
      trekGameScene.redrawScene();
  	}
  });

  scanner.addEventListener('mousedown',function(e) {
  	mouseState='down';
  });

  scanner.addEventListener('mouseup',function(e){
  	if (mouseState === 'down') {
	  	mouseState = 'up';
	  	if (mouseGrid.x != -1) {
	  		lockCursor = mouseGrid;
	  	}
  	}
  	redrawScene();
  });


  var images = ['svg/star.svg',
  	'svg/station.svg',
  	'svg/cursor.svg',
  	'svg/enemy.svg',
  	'svg/ship.svg',
  	'svg/torpedo.svg',
  	'svg/lockCursor.svg'];

  async.each(images,trekGameScene.loadImage,function(err){
    trekGameScene.redrawScene();
  });

});

var imageMap = {};
var mouseGrid = {x:-1,y:-1};
var torpedoes = [];
var phasers = [];
var lockCursor = null;
var course = [];
var travelBaseTime = 0;
var phaserEnergy = 100;

var torpedoInterval = 200;

function frameTimer() {

  gameStateManager.onFrameUpdate();

	trekGameScene.setReadoutText(0,'Ship Status');
  trekGameScene.setReadoutText(1,'TORP: '+trekGameScene.ship.torpedoes);
  trekGameScene.setReadoutText(2,'ENER: '+trekGameScene.ship.energy);
  trekGameScene.setReadoutText(3,'SHLD: '+trekGameScene.ship.shields);
  trekGameScene.setReadoutText(4,'');

  trekGameScene.setReadoutText(5,'Target Status');
  trekGameScene.setReadoutText(6,trekGameScene.getTargetStatusString());

	var time = new Date().getTime();
	var wantRedraw = torpedoes.length > 0 || phasers.length > 0;
	torpedoes.forEach(function(t){
		var impact = checkTorpedoImpact(t);
		if (impact !== null && impact.type !== 'svg/ship.svg') {
			console.log('impact at '+t.points[0].x+','+t.points[0].y+' with '+impact.type);

			if (impact.type === 'svg/station.svg') {
				impact.object.friendly = false;
			}

			if (impact.type === 'svg/enemy.svg') {
				damageEnemy(impact.object,200+randomInt(0,1000));
			}

			t.points = [];
		}
		else if (time-t.baseTime > t.interval) {
			t.baseTime = time;
			t.points = t.points.slice(1,t.points.length);
		}
	});
	torpedoes = torpedoes.filter(function(t){
		return t.points.length > 0;
	});

	phasers = phasers.filter(function(p){
		if (time-p.baseTime > p.duration) {
			damageEnemy(p.target,p.energy);
			scene.ship.energy -= p.energy;
			return false;
		} else {
			return true;
		}
	});

	wantRedraw = wantRedraw || phasers.length > 0;


	if (course.length > 0 && time-travelBaseTime > 500) {
		travelBaseTime = time;
		scene.ship.x = course[0].x;
		scene.ship.y = course[0].y;
		course = course.splice(1,course.length);
		if (course.length == 0) {
			lockCursor = null;
		}
		wantRedraw = true;
	}


	if (wantRedraw) {
		redrawScene();
	}
}


function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function bresenhamLine(x0,y0,x1,y1,points) {
	var dx = Math.abs(x1-x0);
	var dy = Math.abs(y1-y0);
	var sx = x0 < x1 ? 1 : -1;
	var sy = y0 < y1 ? 1 : -1;
	var err = dx-dy;
	points.push({x:x0,y:y0});
	while (x0!=x1 || y0!=y1) {
		var e2 = 2*err;
		if (e2 > -dy) {
			err = err - dy;
			x0 = x0 + sx;
		}
		if (e2 < dx) {
			err = err + dx;
			y0 = y0 + sy;
		}
		points.push({x:x0,y:y0});
	}
}
