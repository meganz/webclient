/*!
 * Arkanoid 1.0
 *
 * Copyright 2011, Dimitar Ivanov (http://www.bulgaria-web-developers.com/projects/javascript/arkanoid/)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 * 
 * Date: Mon Sep 12 22:08:10 2011 +0200
 */
function Arkanoid (id) {
	this.d = window.document;
	this.canvas = this.d.getElementById(id);
	this.radius = 5;
	this.width = 897;
	this.height = 400;
	this.pw = 13;
	this.ph = 8;
	this.tw = 75;
	this.th = 15;
	this.ty = this.height - this.th;
	this.colors = [
		[],
		["#000000", "050505","0A0A0A","0D0D0D","121212","1A1A1A","1F1F1F","242424","2E2E2E","333333","383838","3D3D3D","454545","4D4D4D","545454","5E5E5E","666666","707070"]
	];
	this.intervalID;
	this.levels = [[],[
[1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0],
[1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,1, 1,1,1,1, 1,0,0,0, 0,0,0,0],
[1,1,1,1, 1,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,1,1, 1,1,1,1, 1,1,0,0, 0,0,0,0],
[1,1,1,1, 1,1,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,1,1,1, 1,1,1,1, 1,1,1,0, 0,0,0,0],
[1,1,1,1, 1,1,1,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0],
[1,1,1,1, 1,1,1,1, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1, 1,1,1,0, 0,0,0,0, 0,1,1,1, 1,0,0,0],
[1,1,1,1, 1,1,1,1, 1,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,1, 1,1,0,0, 0,0,0,0, 0,0,1,1, 1,1,0,0],
[1,1,1,1, 0,1,1,1, 1,1,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,1,1,1, 1,0,0,0, 0,0,0,0, 0,0,0,1, 1,1,1,0],
[1,1,1,1, 0,0,1,1, 1,1,1,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1],
[1,1,1,1, 0,0,0,1, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1],
[1,1,1,1, 0,0,0,0, 1,1,1,1, 1,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1],
[1,1,1,1, 0,0,0,0, 0,1,1,1, 1,1,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1],
[1,1,1,1, 0,0,0,0, 0,0,1,1, 1,1,1,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
[1,1,1,1, 0,0,0,0, 0,0,0,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
[1,1,1,1, 0,0,0,0, 0,0,0,0, 1,1,1,1, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
[1,1,1,1, 0,0,0,0, 0,0,0,0, 0,1,1,1, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
[1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,1,1, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1],
[1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,1, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1],
[1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1],
[1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1]]];
	this.ctx = this.canvas.getContext('2d');
	this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	this.reset();
}

Arkanoid.prototype = {
	init: function () {
		var self = this;
		window.setTimeout(function () {
			self.newLife(1);
		}, 0);
	},
	reset: function () {
		window.clearInterval(this.intervalID);
		this.x = 150;
		this.y = 150;
		this.dx = 2;
		this.dy = 4;
		this.tx = 100;
		this.bricks = [];
		this.hits = [];
		this.currentLevel = 1;
		this.lifes = 10000;
	},
	bind: function () {
		var self = this;
		/*
		self.d.getElementById("btnRestart").onclick = function () {
			self.reset();
			self.init();
			return false;
		};
		*/
		// move bat
		self.canvas.onmousemove = function (e) {
			self.tx = -self.canvas.offsetLeft + e.pageX - (self.tw / 2);
		};
		self.d.onkeydown = function (e) {
			var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
			switch (key) {
				case 37:
					// arrow left
					if (self.tx > 0) {
						self.tx -= 35;
					}
					break;
				case 39:
					// arrow right
					if (self.tx + self.tw < self.width) {
						self.tx += 35;
					}
					break;
			}
		};
		self.d.onkeypress = function (e) {
			var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
			switch (key) {
				case 97:
					// Char 'A'
					if (self.tx > 0) {
						self.tx -= 35;
					}
					break;
				case 100:
					// Char 'D'
					if (self.tx + self.tw < self.width) {
						self.tx += 35;
					}
					break;
			}
		};
		//self.d.getElementById("audio_new_game").play();
	},
	start: function () {
		this.reset();
		this.bind();
		//this.screen("ARKANOID");
		this.screen("")
		this.init();
	},
	newLife: function (t) {
		if (!t) t = 1000;
		var self = this;
		self.tx = (self.width / 2) - (self.tw / 2);
		self.x = self.tx + (self.tw / 2) - self.radius;
		self.y = self.height - self.th - (self.radius * 2);
		self.dx = -2;
		self.dy = -4;
		//self.screen("LEVEL " + self.currentLevel);
		self.screen("");
		//self.d.getElementById("audio_new_level").play();
		window.setTimeout(function () {
			self.intervalID = window.setInterval(function () {
				self.draw.apply(self, []);
			}, 10);
		},t );
	},
	die: function () {
		var self = this;
		self.lifes -= 1;
		window.clearInterval(self.intervalID);
		if (self.lifes > 0) {

			//this.d.getElementById("audio_die").play();
			window.setTimeout(function () {
				self.newLife();
			}, 100);
		} else {
			self.gameOver();
		}
	},
	gameOver: function () {
		//this.screen("GAME OVER");
		//this.d.getElementById("audio_game_over").play();
	},
	screen: function (text) {
		this.clear();
		this.drawPlayground();
		this.ctx.textAlign = "center";
		this.ctx.font = "bold 20px sans-serif";
		this.ctx.fillStyle = "#000000";
		this.ctx.fillText(text, this.width/2, this.height/2, this.width);
	},
	clear: function () {
		this.ctx.clearRect(0, 0, this.width, this.height);
	},
	ball: function (x, y, r, style, stroke) {
		if (style != null) {
			this.ctx.fillStyle = style;
		}
		if (stroke != null) {
			this.ctx.strokeStyle = stroke;
		}
		this.ctx.beginPath();
		this.ctx.arc(x, y, r, 0, Math.PI * 2, true);
		this.ctx.closePath();
		this.ctx.fill();
	},
	pane: function (x, y, w, h, style, stroke) {
		if (style != null) {
			this.ctx.fillStyle = style;
		}
		if (stroke != null) {
			this.ctx.strokeStyle = stroke;
		}
		this.ctx.beginPath();
		this.ctx.rect(x, y, w, h);
		this.ctx.closePath();
		this.ctx.fill();
	},
	drawPlayground: function () {
		var self = this,
			gradient = self.ctx.createLinearGradient(0, 0, 0, self.height);
		gradient.addColorStop(0.5, "#FFFFFF");
		gradient.addColorStop(1, "#FFFFFF");
		// draw playground
		self.pane(0, 0, self.width, self.height, gradient, null);
		//self.pane(0, 0, self.width, self.height, 'rgba(0, 0, 0, 1)', null);
	},
	draw: function () {
	
		if ($.killarkanoid)
		{
			arkanoid=undefined;
			return false;
		}
	
		var self = this;
		self.clear();
		// create gradient
		self.drawPlayground();		
		// complete current level
		if (self.bricks.length === 0 && self.hits.length > 0) {
			// move on next level
			if (self.currentLevel < self.levels.length - 1) {
				// TODO - play sound
				self.screen("YOU COMPLETE LEVEL " + self.currentLevel);
				var nextLevel = self.currentLevel + 1;
				self.reset();
				self.currentLevel = nextLevel;
				self.init();
			} else {
				// TODO - play sound
				self.screen("YOU WIN");
			}
			return;
		}
		
		// draw ball
		self.ball(self.x, self.y, self.radius, 'red', null);
		// draw paddle
		self.pane(self.tx, self.ty, self.tw, self.th, "#666666", null);
		// collision with playground
		if (self.x + self.dx > self.width || self.x + self.dx < 0) {
			self.dx = -self.dx;
		}
		if (self.y + self.dy < 0) {
			self.dy = -self.dy;
		}
		if (self.y + self.dy > self.height) {
			self.die();
		}
		// collision with bat
		if (self.collision(self.x, self.y, self.radius, self.tx, self.ty, self.tw, self.th)) 
		{
			
			
			self.x = self.x + (self.x*Math.random()/50)-(self.x*Math.random()/50);
		
			if (self.x < self.tw/2 + self.tx) {
				if (self.dx + Math.abs(self.dx) !== 0) {
					self.dx = -self.dx;	
				}
			} else {
				if (self.dx + Math.abs(self.dx) === 0) {
					self.dx = -self.dx;
				}
			}
			self.dy = -self.dy;
			this.d.getElementById("audio_ping").play();
		}
		// collision with bricks
		var i, row, rows, j, els, x = 0, y = 0;
		for (i = 0, row = 1, rows = self.levels[self.currentLevel].length; i < rows; i++, row++) {
			for (j = 0, els = self.levels[self.currentLevel][i].length; j < els; j++) {
				if (!self.inHits(x + 1, y + 1) && self.collision(self.x, self.y, self.radius, x + 1, y + 1, self.pw, self.ph)) 
				{
					self.dx = -self.dx;
					self.dy = -self.dy;
					self.hits.push({x: x + 1, y: y + 1});
					this.d.getElementById("audio_pong").play();
				}
				x += self.pw + 1;
			}
			x = 0;
			y += self.ph + 1;
		}
		
		self.x += self.dx;
		self.y += self.dy;
		
		self.bricks = [];
		x = 0;
		y = 0;
		for (i = 0, row = 1, rows = self.levels[self.currentLevel].length; i < rows; i++, row++) {
			for (j = 0, els = self.levels[self.currentLevel][i].length; j < els; j++) {
				if (self.levels[self.currentLevel][i][j] === 0) {
					if (!self.inHits(x + 1, y + 1)) {
						self.hits.push({x: x + 1, y: y + 1});
					}
				} else {
					if (!self.inHits(x + 1, y + 1)) {
						if (!self.bricks[row]) {
							self.bricks[row] = [];
						}
						self.bricks[row].push({x: x + 1, y: y + 1, w: self.pw, h: self.ph});
						//draw single brick
						self.pane(x + 1, y + 1, self.pw, self.ph, self.colors[self.currentLevel][i], null);
					}
				}
				x += self.pw + 1;
			}
			x = 0;
			y += self.ph + 1;
		}
	},
	inHits: function (x, y) 
	{
		var self = this;
		for (var i = 0, len = self.hits.length; i < len; i++) {
			if (self.hits[i].x == x && self.hits[i].y == y) {
				return true;
			}
		}
		return false;
	},
	collision: function (circleX, circleY, radius, squareX, squareY, width, height) {
		var distance = 0;	
		if (circleX < squareX) {
			distance += Math.pow(circleX - squareX, 2);
		} else if (circleX > squareX + width) {
			distance += Math.pow(circleX - squareX - width, 2);
		}	
		if (circleY < squareY) {
			distance += Math.pow(circleY - squareY, 2);
		} else if (circleY > squareY + height) {
			distance += Math.pow(circleY - squareY - height, 2);
		}	
		return distance <= Math.pow(radius, 2);
	}
};