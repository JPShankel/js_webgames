
var mouseState = 'up';

$(document).ready(function() {
  console.log('Web Trek loaded...');

  var scanner = document.getElementById('scanner');

  document.addEventListener('keydown',function(evt){
    gameStateManager.onKeyDown(evt);
  });

  scanner.addEventListener('mouseout',function(e){
    gameStateManager.onMouseOut();
  },false);

  scanner.addEventListener('mousemove',function(e){
    gameStateManager.onMouseMove(e);
  });

  scanner.addEventListener('mousedown',function(e) {
    gameStateManager.onMouseDown(e);
  });

  scanner.addEventListener('mouseup',function(e){
    gameStateManager.onMouseUp(e);
  });


  var images = ['svg/star.svg',
  	'svg/station.svg',
  	'svg/cursor.svg',
  	'svg/enemy.svg',
  	'svg/ship.svg',
  	'svg/torpedo.svg',
  	'svg/lockCursor.svg'];

  async.each(images,trekGameScene.loadImage,function(err){
    trekGameModel.init();
    gameStateManager.setState(mainMenuState);
    setInterval(frameTimer,10);

  });

});

function frameTimer() {
  gameStateManager.onFrameUpdate();
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
