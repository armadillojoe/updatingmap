(function() {
	"use strict";
	var express = require('express');
	var http = require('https');
	var fs = require('fs');
	var PImage = require('pureimage');
	
	var OFFSET = 300;
	var COLORS = ['#ff0000', '#ff00d4', '#9b44ff', '#4470ff', '#44efff', '#f2ff44', '#ff7f00', '#ffffff', '#47ff32', '#7c9ab5'];
	var ready = [false, false, false];

	var app = express();
	
	app.use(express.static('public'))

	app.listen(process.env.PORT || 3000, () => console.log("Started Server"));
	
	main();
	
	function main() {
		justDoIt();
		setInterval(() => {
			justDoIt();
		}, 100 * 60 * 60);
	}
	
	function justDoIt() {
		var now = new Date().getTime() / 1000 / 60 / 60;
		if (checkReloadNeeded(now)) {
			updateData(now, drawMap);
		}
	}
	
	function drawMap() {
		var fnt = PImage.registerFont('font.ttf', 'Open Sans');
		fnt.load(() => {
			var data = readInData();
			var tribes = data[0].map(x => x.split(","));
			var players = data[1].map(x => x.split(","));
			var villages = data[2].map(x => x.split(","));
			
			tribes.sort(function(a, b) {
				return (parseInt(b[7]) - parseInt(a[7]));
			});
			
			tribes.reverse();
			
			var img = PImage.make(800, 800);
			var ctx = img.getContext('2d');
			ctx.fillStyle = '#006d15';
			ctx.fillRect(0, 0, 800, 800);
			ctx.fillStyle = '#666666';
			ctx.font = "24pt 'Open Sans'";
			for (var i = 200; i < 800; i += 200) {
				ctx.fillRect(i, 0, 2, 800);
				ctx.fillRect(0, i, 800, 2);
			}
			
			for (var j = COLORS.length - 1; j >= 0; j--) {
				var id = tribes[j][0];
				var tPlayers = players.filter(x => x[2] == id);
				var tVillages = villages.filter(x => {
					for (var i = 0; i < tPlayers.length; i++) {
						if (x[4] == tPlayers[i][0]) {
							return true;
						}
					}
					return false;
				});
				
				ctx.fillStyle = '#000000';
				for (var i = 0; i < tVillages.length; i++) {
					var x = parseInt(tVillages[i][2]) - OFFSET;
					var y = parseInt(tVillages[i][3]) - OFFSET;
					x *= 2;
					y *= 2;
					ctx.fillRect(x - 2, y - 2, 6, 6);
				}
				
				ctx.fillStyle = COLORS[j];
				for (var i = 0; i < tVillages.length; i++) {
					var x = parseInt(tVillages[i][2]) - OFFSET;
					var y = parseInt(tVillages[i][3]) - OFFSET;
					x *= 2;
					y *= 2;
					ctx.fillRect(x - 1, y - 1, 4, 4);
				}
				ctx.fillText((j + 1) + " " + tribes[j][2], 20, 20 + j * 30);
			}
			
			PImage.encodePNGToStream(img, fs.createWriteStream('public/top10.png')).then(() => {
				console.log("Map Created!");
			}).catch((e)=>{
				console.log("An Error Occured!");
			});
		});
	}
	
	function readInData() {
		var tribes = fs.readFileSync("tribes.txt");
		var players = fs.readFileSync("players.txt");
		var villages = fs.readFileSync("villages.txt");
		return [tribes.toString().trim().split("\n"), players.toString().trim().split("\n"), villages.toString().trim().split("\n")];
	}
	
	function updateData(now, callback) {
		var tribes = fs.createWriteStream("tribes.txt");
		http.get("https://en115.tribalwars.net/map/ally.txt", (res) => {
			res.pipe(tribes);
			res.on('end', () => {
				ready[0] = true;
			});
		});
		var players = fs.createWriteStream("players.txt");
		http.get("https://en115.tribalwars.net/map/player.txt", (res) => {
			res.pipe(players);
			res.on('end', () => {
				ready[1] = true;
			});
		});
		var villages = fs.createWriteStream("villages.txt");
		http.get("https://en115.tribalwars.net/map/village.txt", (res) => {
			res.pipe(villages);
			res.on('end', () => {
				ready[2] = true;
			});
		});
		fs.writeFile("time.txt", now, (err) => {
			if (err) throw err;
			console.log("Time Updated");
		});
		var timer = null;
		timer = setInterval(() => {
			if (ready[0] && ready[1] && ready[2]) {
				clearInterval(timer);
				ready = [false, false, false];
				callback();
			} else {
				console.log("Waiting for data...");
			}
		}, 100);
	}
	
	function checkReloadNeeded(now) {
		var contents = fs.readFileSync("time.txt").toString();
		var lastTime = parseFloat(contents);
		return now - lastTime > 1;
	}
})();
