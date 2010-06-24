/* This file is part of the Lunatic Systems Canvas Library
 *  Copyright (C) 2010 Adam Etienne <eadam@lunasys.fr>
 *
 *  This library is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU Library General Public
 *  License as published by the Free Software Foundation; either
 *  version 2 of the License, or (at your option) any later version.
 *
 *  This library is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 *  Library General Public License for more details.
 *
 *  You should have received a copy of the GNU Library General Public License
 *  along with this library; see the file COPYING.LIB.  If not, write to
 *  the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor,
 *  Boston, MA 02110-1301, USA.
 */

// For FPS
var fps = 0;
var lasttime = 0;
var frame = 0;

var debug_mode = false;

var Point = $.inherit({
	__constructor : function( x, y ){
		this.x = x;
		this.y = y;
	},

	role: function(){
		return "point";
	},

	doAnim: function(){
	},

	render: function( ctx ){
		ctx.beginPath();
		ctx.lineWidth = 1;
		ctx.lineCap = 'square';
		ctx.strokeStyle = 'rgba(255,255,255,1)';
		var locx = this.x+game.origin.x;
		var locy = this.y+game.origin.y;
		ctx.moveTo(locx-0.5, locy-0.5);
		ctx.lineTo(locx+0.5, locy-0.5);
		ctx.lineTo(locx+0.5, locy+0.5);
		ctx.lineTo(locx-0.5, locy+0.5);
		ctx.lineTo(locx-0.5, locy-0.5);
		ctx.stroke();
	},

	info: function(){
		return this.x + "/" + this.y + "est un " + this.role();
	}
});


var Obj = $.inherit( Point, {
	__constructor : function( game, p, img_name ){
		this.x = p.x;
		this.y = p.y;
		this.img_name = img_name;
		this.game = game;
	},
	role : function(){
		return "obj";
	},
	render : function( ctx ) {
		ctx.drawImage( this.img, Math.round(this.x-Math.round(this.w/2))+game.origin.x, Math.floor(this.y-this.h/2)+game.origin.y, this.w, this.h );
		if( this.ind && debug_mode ) {
			ctx.fillStyle = "#fff";
			ctx.font = 'arial 5px';
			ctx.fillText( this.ind, Math.floor(this.x-this.w/2)+4+game.origin.x, Math.floor(this.y-this.h/2)+10+game.origin.y );
			ctx.fillText( this.obj_id, Math.floor(this.x-this.w/2)+4+game.origin.x, Math.floor(this.y-this.h/2)+18+game.origin.y );
		}
	}
});

var Cursor = $.inherit( Point, {
	__constructor: function( game ) {
		this.attached_obj = null;
		this.game = game;
	},
	doAnim: function() {
		this.x = this.game.mouse.x - this.game.origin.x;
		this.y = this.game.mouse.y - this.game.origin.y;
		if( this.attached_obj ) {
			this.attached_obj.x = this.x;
			this.attached_obj.y = this.y;
			this.attached_obj.doAnim();
		}
	},
	render : function( ctx ) {
		// Nothing
	},
	role : function() {
		return "cursor";
	}
});


var logs = [];
debug = function( s ) {
	//$("#debug").append( "DBG: "+txt+"\n" );
	logs.push( s );
	if( logs.length>80 )
		logs.splice( 0, 1 );
	$("#debug").html( logs.join( "<br>" ) ).get(0).scrollTop = $("#debug").get(0).scrollHeight;
}


var LSGame = $.inherit({
	__constructor : function( canvas ) {
		//this.canvas = canvas;
		this.ctx = document.getElementById( "hs_canvas" ).getContext('2d');
		this.logs = [];
		this.origin = new Point( 152, 10 );
		
		this.media_path = "/media/himesama";
		
		// Game objects
		this.objs = [];
		this.explosions = [];
		this.cursor = new Cursor( this );
		this.mouse = new Point( 430, 100 );

		// Images arrays
		this.all_imgs = [];
		this.imagesLoaded = 0;
		this.imagesToPreload = 0;

		// Sounds array
		this.audios = [];
		this.loadedAudioElements = 0;
		this.toloadAudioElements = 0;

		this.canvas_element = $('#'+canvas);
		this.canvas_element.bind( "mousemove", {o:this}, this.mousemove );
		this.canvas_element.bind( "click", {o:this}, this.click );
		this.canvas_element.bind( "dblclick", {o:this}, this.dblclick );
		//this.canvas_element.dblclick( this.dblclick );
		// Disable double click selection:
		this.canvas_element.get(0).onselectstart = function () { return false; };
	},
	mousemove : function( e ) {
		var o = e.data.o;	// o is 'this' object, passed as argument because it's an event callback
		o.mouse.x = e.pageX - o.canvas_element.parent().get(0).offsetLeft;
		o.mouse.y = e.pageY - o.canvas_element.parent().get(0).offsetTop;
	},
	drawScreen : function() {
	},
	dblclick : function( e ) {
		return false;
	},
	click : function( e ) {
		return false;
	},
	delObj : function( obj ) {
		//if( obj && obj.obj_id && this.objs[obj.obj_id] ) {
			//this.objs.splice(obj.obj_id, 1);
			//if( obj.ind==302 )
			//	game.debug( "delObj: "+obj.obj_id+" ind:"+this.objs[obj.obj_id].ind+"/"+this.objs.length );
			delete this.objs[obj.obj_id];
		//	return true;
		//}
	},
	addObj : function( obj ) {
		obj.img = this.preloadImage( obj.img_name );
		obj.obj_id = this.objs.length;
		this.objs.push( obj );
		//if( this.objs[obj.obj_id] )
		//	debug( "addObj: "+obj.obj_id+" ind:"+this.objs[obj.obj_id].ind+" id:"+this.objs[obj.obj_id].obj_id );
		//this.objs[id].img = preloadImage( "/media/himesama/img/"+this.objs[id].img_name );
		return true;
	},
	init : function() {
		// Start loading
		this.loadImages();
		this.loadSounds();
	},
	start : function() {
		// Start loop, at around 30 FPS
		//setInterval( animAll, 24 );
		setInterval( drawAll, 29 );
	},
	drawAfter : function( ctx ) {
	},
	drawBefore : function( ctx ) {
		// Draw scores, lives, etc...
		ctx.fillStyle = "#fff";
		ctx.font = '14px Arial';
		ctx.fillText( this.score, 40, 120 );
		ctx.fillText( this.lives, 65, 310 );
	},
	debug : function( txt ) {
		// Call an external debug functional for the sake of simplicity
		debug( txt );
	},
	animAll : function() {
		for( var id in this.objs ) {
			if( this.objs[id] )
				this.objs[id].doAnim();
		}
		this.cursor.doAnim();
	},
	drawAll : function() {
		/**
		 * Animation loop
		 */
		ctx = this.ctx;
		ctx.clearRect(0,0,800,600);
		ctx.save();

		this.drawBefore( ctx );

		if( this.state=="play" ) {
			this.animAll();
			/*
			for( var id in this.explosions ) {
				this.explosions[id].doAnim();
			}
			*/
			for( var id in this.objs ) {
				if( this.objs[id] ) {
					//if( this.objs[id].ind==110 )
					//	debug( "HEYYYY" );
					//this.objs[id].doAnim();
					this.objs[id].render( ctx );
				}
			}
			/*
			for( var id in this.explosions ) {
				this.explosions[id].render( ctx );
			}
			*/
		} else {
			this.drawScreen();
		}

		this.drawAfter( ctx );
		
		//this.cursor.doAnim();
		this.cursor.render( ctx );

		frame++;
		if( frame%50==0 ) {
			var curtime = (new Date()).getTime();
			fps = Math.floor( frame/((curtime-lasttime)/1000) );
			lasttime = curtime;
			frame = 0;
			//debug( fps );
		}
		ctx.fillStyle = "#fff";
		ctx.font = '14px Arial';
		ctx.fillText( fps+" fps", 10, 360 );

		ctx.restore();
	},
	loadImages : function() {
		//alert( imagesLoaded+" >= "+imagesToPreload );
		for( var i in this.all_imgs ) {
			this.load_image( this.all_imgs[i][1], this.all_imgs[i][0] );
		}
	},
	load_image : function(img,uri) {
		//var img = new Image();
		img.onload = on_image_load_event;
		img.onerror = on_image_load_event;
		img.onabort = on_image_load_event;
		img.src = this.media_path+"/img/"+uri;
		return img;
	},
	preloadImage : function(uri) {
		var i=0;
		for( i in this.all_imgs ) {
			if( this.all_imgs[i][0]==uri )
				break;
		}
		if( this.all_imgs[i] && this.all_imgs[i][0]==uri ) {
			var img = this.all_imgs[i][1];
			//game.debug( "LOAD IMG [CACHED]: "+uri );
		} else {
			this.imagesToPreload++;
			//game.debug( "LOAD IMG: "+uri );
			var img = new Image();
			this.all_imgs.push( [uri,img] );
		}
		return img;
	},
	loadSounds : function() {
		this.toloadAudioElements = this.audios.length-1;
		for( var ii in this.audios ) {
			var audioElement = this.audios[ii][1];
			audioElement.addEventListener("error", function() {
				//alert( "error"+this.src );
			}, true);
			audioElement.addEventListener("load", function() {
				game.loadedAudioElements++;
			}, true);
			var src = this.media_path + "/snd/" + this.audios[ii][0];
			src = src.replace( "#", "%23" );
			audioElement.src = src;
			audioElement.load();
		}
	},
	playSound : function( audioname ) {
	},
	preloadSound : function( audioname ) {
		var ii;
		for( ii in this.audios )
			if( this.audios[ii][0]==audioname )
				break;
		if( this.audios[ii] && this.audios[ii][0]==audioname ) {
			var audioElement = this.audios[ii][1];
			//debug( "LOAD SOUND [CACHED]: "+src );
		} else {
			var audioElement = new Audio();
			//debug( "LOAD SOUND: "+src );
			this.audios.push( [audioname,audioElement] );
			//this.audios_index[
		}
		return audioElement;
	}
});



// Static methods
// TODO: find a clean way to do that
drawAll = function() {
	game.drawAll();
}
animAll = function() {
	game.animAll();
}


function on_image_load_event() {
	game.imagesLoaded++;
	if (game.imagesLoaded >= game.imagesToPreload) {
		game.start();
	}
}


function getAngle( p1, p2 ) {
	alpha = Math.atan( (p1.y - p2.y) / (p1.x - p2.x) );
	return alpha;
}
function getAdjacent( a, h ) {
	return Math.cos( a )*h;
}
function getOppose( a, h ) {
	return Math.sin( a )*h;
}
function rand( min, max ) {
	return Math.floor( Math.random()*(max-min+1) )+min;
}
