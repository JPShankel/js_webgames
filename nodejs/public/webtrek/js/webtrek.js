
var mouseState = 'up';

$(document).ready(function() {
  console.log('Web Trek loaded...');
  generateSector();

  setInterval(frameTimer,10);


  var scanner = document.getElementById('scanner');
  
  scanner.addEventListener('mouseout',function(e){
  	mouseGrid.x = mouseGrid.y = -1;
  	redrawScene();
  },false);

  scanner.addEventListener('mousemove',function(e){
  	var newGrid = {x:Math.floor(e.offsetX*8/600),y:Math.floor(e.offsetY*8/400)};
  	if (newGrid.x!=mouseGrid.x ||newGrid.y!=mouseGrid.y) {
  		mouseGrid = newGrid;
  		redrawScene();
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

  async.each(images,loadImage,function(err){
  	redrawScene();
  });

});

var scene = {ship:{torpedoes:9,energy:999,shields:100}};
var imageMap = {};
var mouseGrid = {x:-1,y:-1};
var torpedoes = [];
var phasers = [];
var lockCursor = null;
var course = [];
var travelBaseTime = 0;
var phaserEnergy = 100;

var torpedoInterval = 200;

function firePhasersCoords(x0,y0,x1,y1,duration) {

	var target = coordOccupied(scene,x1,y1);
	if (target && target.type === 'svg/enemy.svg') {



		phasers.push({points:[{x:x0+0.5,y:y0+0.5},{x:x1+0.5,y:y1+0.5}],
			baseTime:new Date().getTime(),
			duration:duration,
			target:target.object,
			energy:phaserEnergy});
	}
}

function fireTorpedoCoords(x0,y0,x1,y1,interval) {
	var points = [];
	bresenhamLine(x0,y0,x1,y1,points);

	torpedoes.push({points:points,baseTime:new Date().getTime(),interval:interval
	});
}

function checkTorpedoImpact(torpedo) {
	var impact = coordOccupied(scene,torpedo.points[0].x,torpedo.points[0].y);
	return impact;
}


function setReadoutText(line,text) {
	var textLine = document.getElementById('readout-'+line);
	if (textLine) {
		textLine.innerHTML = text+'<br/>';
	}
}

function getTargetStatusString() {
	if (lockCursor===null) {
		return 'No Target';
	}

	var object = coordOccupied(scene,lockCursor.x,lockCursor.y);
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
}

function damageEnemy(enemy,points) {
	enemy.damage -= points;
	scene.enemies = scene.enemies.filter(function(o){
		return o.damage > 0;
	});
}

function frameTimer() {

	setReadoutText(0,'Ship Status');
	setReadoutText(1,'TORP: '+scene.ship.torpedoes);
	setReadoutText(2,'ENER: '+scene.ship.energy);
	setReadoutText(3,'SHLD: '+scene.ship.shields);
	setReadoutText(4,'');

	setReadoutText(5,'Target Status');
	setReadoutText(6,getTargetStatusString());

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

function placeObjectOnGrid(ob,x,y) {
	var canvas =document.getElementById("scanner");
	var context =canvas.getContext("2d");
	context.drawImage(ob,x*canvas.width/8,y*canvas.height/8);
}

function loadImage(file,callback) {
	var url = document.URL+file;

	var source = new Image();
	source.src = url;


	source.onload = function(){
		imageMap[file] = source;
		callback(null);
	}
}

function redrawScene() {
	var canvas =document.getElementById("scanner");
	var context =canvas.getContext("2d");
	context.clearRect(0,0,canvas.width,canvas.height);

	drawGrid();

	scene.stars.forEach(function(s){
		placeObjectOnGrid(imageMap['svg/star.svg'],s.x,s.y);
	});

	scene.stations.forEach(function(s){
		placeObjectOnGrid(imageMap['svg/station.svg'],s.x,s.y);
	});

	scene.enemies.forEach(function(e){
		placeObjectOnGrid(imageMap['svg/enemy.svg'],e.x,e.y);
	});


	placeObjectOnGrid(imageMap['svg/ship.svg'],scene.ship.x,scene.ship.y);
	
	if (mouseGrid.x != -1) {
		placeObjectOnGrid(imageMap['svg/cursor.svg'],mouseGrid.x,mouseGrid.y);
	}

	torpedoes.forEach(function(t){
		placeObjectOnGrid(imageMap['svg/torpedo.svg'],t.points[0].x,t.points[0].y);
	});

	var canvas = document.getElementById('scanner');
	var context = canvas.getContext('2d');
	context.strokeStyle="#ff0000";
	phasers.forEach(function(p){
		context.beginPath();
		context.moveTo(p.points[0].x*canvas.width/8,p.points[0].y*canvas.height/8);
		context.lineTo(p.points[1].x*canvas.width/8,p.points[1].y*canvas.height/8);
		context.stroke();

	});

	if (lockCursor) {
		placeObjectOnGrid(imageMap['svg/lockCursor.svg'],lockCursor.x,lockCursor.y);
	}
}


function drawGrid() {
	var canvas =document.getElementById("scanner");
	var context =canvas.getContext("2d");
	context.fillStyle="#000000";
	context.fillRect(0,0,600,400);
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
}

function clipCourse(points) {
	var ret = [];
	for (var p=0;p<points.length;p++) {
		ret.push(points[p]);
		if (coordOccupied(scene,points[p].x,points[p].y)) {
			return ret;
		} 
	}
	return ret;
}

function firePhasers(btn) {
	btn.blur();
	if (phasers.length == 0 && lockCursor) {
		var points=[];

		var target = coordOccupied(scene,lockCursor.x,lockCursor.y);
		if (target && target.type === 'svg/enemy.svg') {
			bresenhamLine(scene.ship.x,scene.ship.y,lockCursor.x,lockCursor.y,points);
			if (points.length > 1) {
				console.log(points);
				points = [{x:scene.ship.x,y:scene.ship.y}].concat(clipCourse(points.slice(1,points.length)));//.join({x:scene.ship.x,y:scene.ship.y});
				console.log(points);
				if (points.length > 1) {
					firePhasersCoords(points[0].x,points[0].y,points[points.length-1].x,points[points.length-1].y,5000);
				}
			}
		}
	}
}

function fireTorpedo(btn) {
	if (scene.ship.torpedoes > 0) {
		if (lockCursor) {
			scene.ship.torpedoes -= 1;
			fireTorpedoCoords(scene.ship.x,scene.ship.y,lockCursor.x,lockCursor.y,torpedoInterval);
		}}
	btn.blur();
}

function dockShip(btn) {
	btn.blur();
}

function travelTo(btn) {
	btn.blur();
	if (lockCursor) {
		var points = [];
		bresenhamLine(scene.ship.x,scene.ship.y,lockCursor.x,lockCursor.y,points);
		points = points.slice(1,points.length);
		if (points.length > 0) {
			if (coordOccupied(scene,points[points.length-1].x,points[points.length-1].y)){
				points = points.slice(0,points.length-1);
			}
			course = clipCourse(points);
			travelBaseTime = new Date().getTime();
		}
	}
}

function onclickGenerateSector(btn) {
	lockCursor = null;
	generateSector();
	redrawScene();
	btn.blur();
}

function coordOccupied(scene,x,y) {
	for (var s=0;s<scene.stars.length;s++) {
		if (scene.stars[s].x == x && scene.stars[s].y == y) {
			return {object:scene.stars[s],type:'svg/star.svg'};
		}
	}
	for (var s=0;s<scene.stations.length;s++) {
		if (scene.stations[s].x == x && scene.stations[s].y == y) {
			return {object:scene.stations[s],type:'svg/station.svg'};
		}
	}
	for (var s=0;s<scene.enemies.length;s++) {
		if (scene.enemies[s].x == x && scene.enemies[s].y == y) {
			return {object:scene.enemies[s],type:'svg/enemy.svg'};
		}
	}
	if (scene.ship && (scene.ship.x == x && scene.ship.y == y)) {
		return {object:scene.ship,type:'svg/ship.svg'};
	}
	return null;
}

function findFreeSpot(scene) {
	var x=randomInt(0,7),y=randomInt(0,7);
	while(coordOccupied(scene,x,y)!==null) {
		x = randomInt(0,7);
		y = randomInt(0,7);
	}
	return [x,y];
}

function generateSector() {
	var numStars = 1 + randomInt(1,8);
	scene = {};
	scene.stars = [];
	scene.stations = [];
	scene.enemies = [];
	for (var n=0;n<numStars;n++) {
		var loc = findFreeSpot(scene);
		scene.stars.push({x:loc[0],y:loc[1]});
	}

	if (randomInt(0,2)==0) {
		var numStations = 1 + randomInt(0,2);
		for (var n=0;n<numStations;n++) {
			var loc = findFreeSpot(scene);
			scene.stations.push({x:loc[0],y:loc[1],friendly:true});
		}
	}

	if (randomInt(0,2)==0) {
		var numEnemies = 1 + randomInt(0,2);
		for (var n=0;n<numEnemies;n++) {
			var loc = findFreeSpot(scene);
			scene.enemies.push({x:loc[0],y:loc[1],damage:999});
		}
	}

	var loc = findFreeSpot(scene);
	scene.ship = {x:loc[0],y:loc[1]};
	scene.ship.torpedoes = 9;
	scene.ship.energy = 999;
	scene.ship.shields = 100;

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


