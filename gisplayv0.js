
	
	'use strict';
	//general
	var maps = new Array();
	
	var mapcount = 0;


	function round(value, exp) {
	  if (typeof exp === 'undefined' || +exp === 0)
	    return Math.round(value);

	  value = +value;
	  exp = +exp;

	  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0))
	    return NaN;

	  // Shift
	  value = value.toString().split('e');
	  value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));

	  // Shift back
	  value = value.toString().split('e');
	  return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
	}

	//end general

	//WebGL API


	function generateShaders(){
		//choropleth

		var vertexSourceCode = " attribute vec4 vertexCoord; " ;
			vertexSourceCode+= "\n	attribute float aPointSize; " ;
			vertexSourceCode+= "\n	uniform mat4 projection; " ;
			vertexSourceCode+= "\n	attribute float a_opacity; " ;
			vertexSourceCode+= "\n	varying float v_opacity; " ;
			//vertexSourceCode+= "\n	varying vec4 u_color; " ; //delete
			vertexSourceCode+= "\n	void main() {" ;
			vertexSourceCode+= "\n		gl_Position = (projection * vertexCoord); " ;
			vertexSourceCode+= "\n		gl_PointSize = aPointSize; v_opacity = a_opacity; " ;
			vertexSourceCode+= "\n}" ;


		var fragmentSourceCode = "precision mediump float;";
		fragmentSourceCode += "\n		uniform vec4 u_color;";//uniform
		fragmentSourceCode += "\n		varying float v_opacity; ";
		fragmentSourceCode += "\n 		uniform float isPoint;";
		fragmentSourceCode += "\n		void main(){";
		fragmentSourceCode += "\n			float border = 0.5;";
	 	fragmentSourceCode += "\n			float radius = 0.5;";
	 	fragmentSourceCode += "\n			float centerDist = length(gl_PointCoord - 0.5);";
		fragmentSourceCode += "\n			float alpha;";
		fragmentSourceCode += "\n			if (u_color[3] == -1.0){";
		fragmentSourceCode += "\n				alpha =  v_opacity * step(centerDist, radius);";
		fragmentSourceCode += "\n			}";
		fragmentSourceCode += "\n			else{";
		fragmentSourceCode += "\n				alpha =  u_color[3] * step(centerDist, radius);";
		fragmentSourceCode += "\n			}";
		fragmentSourceCode += "\n			if(isPoint == 1.0 ){";
		fragmentSourceCode += "\n			if (alpha < 0.1) discard;";
		fragmentSourceCode += "\n				gl_FragColor = vec4(u_color[0], u_color[1], u_color[2], alpha);}";
		fragmentSourceCode += "\n 			else";
		fragmentSourceCode += "\n				gl_FragColor = vec4(u_color[0], u_color[1], u_color[2], u_color[3]);";
	 	fragmentSourceCode += "\n		}";

			
/**/


		return {vertex: vertexSourceCode, fragment: fragmentSourceCode};
	}




	function shader(type, source_code, _webgl) {
		var shader = _webgl.gl.createShader(type);

		_webgl.gl.shaderSource(shader,source_code); 
		_webgl.gl.compileShader(shader);

		console.log("shader "+ (type.valueOf()==35633?"vertex":"fragment") + ": "  + _webgl.gl.getShaderInfoLog(shader));

		return shader;
	}






	


	//Intermediate API
	function Feature(id, properties, triangles, borders, points){
		this._id = id;
		this._properties = properties;
		this._triangles = triangles;
		this._borders = borders;
		this._points = points;
		return this;
	};




	function Aesthetic(id, attr, fcolor, stroke, pointsize, range){
		this.id = id;
		this.fillColor = fcolor;
		this.strokeColor = stroke;
		this.range = range;
		this._attr = attr;
		this.pointSize = pointsize==null?1.0:parseFloat(pointsize);
		this._features = new Array();
		this._allFeatures = null;
		this.enabled = true;
		this.outer = false;
		return this;
	};

	Aesthetic.prototype = {

		addFeature: function(id, properties, triangles, borders, points){
			this._features.push(new Feature(id, properties, triangles, borders, points));
		},

		getAttr: function(){
			return this._attr;
		},

		checkProperty: function(value){
			if(this.range == null)
					return true;
			else{
				if(typeof value === 'number'){
				
					return ( (this.range[0] == null || value >= this.range[0]) 
						&& (this.range[1] == null || 
							(value < this.range[1] || (value <= this.range[1] && this.outer == true))));
				}
				else
					return ( value == this.range[0] );
			}
		},

		addGroupedFeature: function(id, triangles, borders, points){
			if(this._allFeatures == null){
				this._allFeatures = new Array();
				this._allFeatures.push(new Feature(id, null, triangles, borders, points));
			}
			else{
				var cursor = 0; //TODO
				//this._allFeatures[0]._properties.push(properties);
				this._allFeatures[cursor].push(new Feature(id, null, triangles, borders, points));
				//this._allFeatures[cursor]._triangles.concat(triangles);
				//this._allFeatures[cursor]._borders.concat(borders);
			}
		},

		enableDisable: function(){
			this.enabled = !this.enabled;
			return this.enabled;
		}


	};



	function Legend(id){
		this.init(id);
		return this;
	};

	Legend.prototype = {
		insertLegend: function(map){
			this.legendDiv.appendChild(this.table);
			map.getContainer().appendChild(this.legendDiv);
		},

		insertPointRow: function(currentaes, mapobj){
			this.insertRow(currentaes,mapobj, 2);
		},

		insertPolygonRow: function(currentaes, mapobj){
			this.insertRow(currentaes,mapobj, 1);
		},


		insertRow: function(currentaes, mapobj, type){

			var row = document.createElement('tr');
			var value = document.createElement('td');
			var color = document.createElement('td');
			var text;
			if(typeof currentaes.range[0] === 'number'){
				var mininput = currentaes.range[0]!=null?currentaes.range[0]:mapobj.min;
				var maxinput = currentaes.range[1]!=null?currentaes.range[1]:mapobj.max;
				if(currentaes.outer == false)
					text = document.createTextNode('[' + mininput + ', ' + maxinput + '[');
				else
					text = document.createTextNode('[' + mininput + ', ' + maxinput + ']');
			}
			else
				text = document.createTextNode(currentaes.range[0]);
			value.appendChild(text);

			var colorDiv = document.createElement('div');
			colorDiv.style.position = 'relative';
			var rgbc = 'rgba('+ currentaes.fillColor[0] +',' + currentaes.fillColor[1] +',' + currentaes.fillColor[2] +  ',' + currentaes.fillColor[3] +')';
			colorDiv.style['backgroundColor'] = rgbc;
			if(type==1){//polygon
				colorDiv.style.height = 25;//(mapCanvas.height / 10);
				colorDiv.style.width = 80;//(mapCanvas.width / 10);
				if(currentaes.strokeColor!=null && currentaes!=undefined)
					colorDiv.style['borderColor'] = 'rgba('+currentaes.strokeColor[0] +',' + currentaes.strokeColor[1] +',' + currentaes.strokeColor[2] +  ',' + currentaes.strokeColor[3] +')';
				colorDiv.className = '_gisplayrectangle';
			}
			else if(type==2){//point
				var size;
				if(currentaes.pointSize != null){
					size = Math.max(currentaes.pointSize, 5);
				}
				else
					size = 25;
				colorDiv.style.height = size;
				colorDiv.style.width = size;
				colorDiv.className = '_gisplaycircle';
			}


			color.appendChild(colorDiv);

			row.appendChild(color);
			row.appendChild(value);
			


			row.onclick = function(){
				if(mapobj.legendToggle != false){
					var toFade = !currentaes.enableDisable();
					if(toFade==true){
						this.className += " _gisplayfade";
					}
					else{
						this.className = this.className.replace( /(?:^|\s)_gisplayfade(?!\S)/g , '' );
					}
				}
				mapobj.legendOnClickCall(currentaes);
				mapobj.draw();
				
			};

			this.table.appendChild(row);

		},


		insertGradient: function(aesarray){

		},

		init: function(id,classname){
			var mapCanvas = document.getElementById('mapCanvas' + id);
			this.legendDiv = document.createElement('div');
			if(classname != undefined && classname != null){
				this.legendDiv.className = classname;	
			}
			else{
				this.legendDiv.className = '_gisplaylegendBR';
			}
			this.legendDiv.id = 'legendDiv' + id;
			




			this.table = document.createElement('table');
			this.table.style.zIndex = "2000";
			var thvalue = document.createElement('th');
			var thcolor = document.createElement('th');
			thcolor.style.align = "center";
			//thcolor.style.width = 100;
			this.table.appendChild(thcolor);
			this.table.appendChild(thvalue);

		},

		insertProportionalRow: function(currentaes, mapobj, numberof){
			var row = document.createElement('tr');
			var value = document.createElement('td');
			value.colSpan = 2;
			value.style.textAlign = 'center';
			var lastdiv;
			var rgbc = 'rgba('+ currentaes.fillColor[0] +',' + currentaes.fillColor[1] +',' + currentaes.fillColor[2] +  ',' + 1 +')';
			var strokecolor;
			var lastdiv;
			if(currentaes.strokeColor!=null && currentaes!=undefined)
				strokecolor = 'rgba('+currentaes.strokeColor[0] +',' + currentaes.strokeColor[1] +',' + currentaes.strokeColor[2] +  ',' + currentaes.strokeColor[3] +')';
			else
				strokecolor = 'rgba('+0 +',' + 0 +',' + 0 +  ',' + 1 +')';

			for(var i =numberof-1; i>=0; i--){
				var current = document.createElement('div');
				var propvalue = mapobj.min + i/(numberof-1)*(mapobj.max - mapobj.min);
				var text = document.createTextNode(round(propvalue));
				current.appendChild(text);
				var colorDiv = document.createElement('div');
				colorDiv.style.position = 'relative';
				colorDiv.style.backgroundColor = rgbc;
				colorDiv.className = '_gisplayproportionalcircle';
				colorDiv.style.borderColor = strokecolor;
				var temppointsize = ((mapobj.maxpointsize - mapobj.minpointsize)/(mapobj.max - mapobj.min))*(propvalue - mapobj.min);
				var size = Math.max(temppointsize, 5);
				colorDiv.style.height = size;
				colorDiv.style.width = size;
				current.appendChild(colorDiv);
				if(i!= (numberof-1)){
					lastdiv.appendChild(current);
					lastdiv = colorDiv;
				}
				else{
					value.appendChild(current);
					lastdiv = colorDiv;
				}

			}
			row.appendChild(value);
			this.table.appendChild(row);


		}






	};


	function BGMapWrapper(map){
		this.map = map;
		return this;
	};

	BGMapWrapper.prototype = {
		

			getContainer: function(){
				return this.map.getContainer();
			},

			createCanvas: function(id){
				var mapCanvas = document.createElement('canvas');
				mapCanvas.id = 'mapCanvas'+id;
				mapCanvas.style.position = 'absolute';
				
				var mapDiv = this.map.getContainer();
				mapCanvas.height = mapDiv.offsetHeight;
				mapCanvas.width = mapDiv.offsetWidth;
				//mapCanvas.style.zIndex = "2";

				//case mapbox
				mapDiv.insertBefore(mapCanvas, mapDiv.firstChild.nextSibling);
		


		
				var canvas = document.getElementById("mapCanvas"+id);
				return canvas;
			},

			getZoom: function(){
				return this.map.getZoom();
			},

			getLngBound: function(){
				return this.map.getBounds().getNorthWest().lng
			},

			getLatBound: function(){
				return this.map.getBounds().getNorthWest().lat
			},

			onEvent: function(eventstr, eventfunction){
				this.map.on(eventstr, eventfunction);
			},

			loader: function(){
				if(this.loaderDiv === undefined)
					this.createLoader(this.map);
				else{
					if(this.loaderDiv.style.display == 'none')
						this.loaderDiv.style.display = 'flex';
					else{
						this.loaderDiv.style.display = 'none';
					}

					if(this.loaderDiv.className.includes('_gisplayhidden')){
						this.loaderDiv.className = this.loaderDiv.className.replace( /(?:^|\s)_gisplayhidden(?!\S)/g , '_gisplayLoaderOuterDiv' );
					}
					else{
						this.loaderDiv.className = this.loaderDiv.className.replace( /(?:^|\s)_gisplayLoaderOuterDiv(?!\S)/g , '_gisplayhidden' );
					}
				}
			},

			createLoader: function(){
				var outerDiv = document.createElement('div');
				var innerDiv = document.createElement('div');
				innerDiv.className = '_gisplayloader';
				
				
				var mapDiv = this.getContainer();

				/*outerDiv.style = ' opacity: 0.5; background-color: grey; justify-content: center; display: flex;';
				outerDiv.style.position = 'absolute';
				outerDiv.style.zIndex = '999999999';*/
				outerDiv.className = '_gisplayLoaderOuterDiv';
				outerDiv.style.height = mapDiv.offsetHeight;
				outerDiv.style.width = mapDiv.offsetWidth;
				outerDiv.appendChild(innerDiv);
				this.loaderDiv = outerDiv;
				
				mapDiv.parentElement.insertBefore(outerDiv, mapDiv);

			}


	};



	function Map(type, geometry){

		return this;
	};


	Map.prototype = {


		program: function() {
			this._webgl.program = this._webgl.gl.createProgram();

			var source_code = generateShaders();

			var vertex_shader = shader(this._webgl.gl.VERTEX_SHADER, source_code.vertex, this._webgl);
			var fragment_shader = shader(this._webgl.gl.FRAGMENT_SHADER, source_code.fragment, this._webgl);

			this._webgl.gl.attachShader(this._webgl.program, vertex_shader);
			this._webgl.gl.attachShader(this._webgl.program, fragment_shader);

			this._webgl.gl.linkProgram(this._webgl.program);
			this._webgl.gl.useProgram(this._webgl.program);
			
		},


		readGeojson: function(geojson){

		},

		addAesthetic: function(aes){
			this.aesthetics.push(aes);
		},

		setAesthetic: function(id, aes){
			for(var i=0; i<aesthetics.length; i++){
				if(id==aesthetics[i].id){
				 	aesthetics[i]=aes;
					break;
				}
			}
		},

		buildLegend: function(){
			
			var mapCanvas = document.getElementById('mapCanvas' + this.id);
			var legendDiv = document.createElement('div');
			legendDiv.id = 'legendDiv' + this.id;
			legendDiv.style.position = 'absolute';
			legendDiv.style.backgroundColor = 'white';
			//legendDiv.style.height = 200;//(mapCanvas.height / 10);
			legendDiv.style.width = 250;//(mapCanvas.width / 10);
			legendDiv.style.bottom = 20;
			legendDiv.style.right = 0;
			legendDiv.style.borderColor = 'black';
			legendDiv.style.border = 'solid';


			var table = document.createElement('table');
			var thvalue = document.createElement('th');
			var thcolor = document.createElement('th');
			//thvalue.style.width = 125;
			table.style.zIndex = "2000";
			thcolor.style.width = 100;
			table.appendChild(thcolor);
			table.appendChild(thvalue);
			




			for(var i = 0; i<this.aesthetics.length;i++){
				var currentaes = this.aesthetics[i];
				//if(currentaes._features.length > 0 || currentaes._allFeatures.length > 0){
					var row = document.createElement('tr');
					var value = document.createElement('td');
					var color = document.createElement('td');
					var ptext = document.createElement('p');
					var text;
					if(typeof currentaes.range[0] === 'number')
						text = document.createTextNode('[' + currentaes.range[0] + ', ' + currentaes.range[1] + '[');
					else
						text = document.createTextNode(currentaes.range[0]);
					ptext.appendChild(text);
					value.appendChild(ptext);

					var colorDiv = document.createElement('div');
					colorDiv.style.position = 'relative';
					 var rgbc = 'rgba('+ currentaes.fillColor[0] +',' + currentaes.fillColor[1] +',' + currentaes.fillColor[2] +  ',' + currentaes.fillColor[3] +')';
					//console.log(rgbc);
					colorDiv.style['backgroundColor'] = rgbc;
					colorDiv.style.height = 25;//(mapCanvas.height / 10);
					colorDiv.style.width = 80;//(mapCanvas.width / 10);



					color.appendChild(colorDiv);

					row.appendChild(color);
					row.appendChild(value);
					
					table.appendChild(row);
				//}


			}
			legendDiv.appendChild(table);
			this.map.getContainer().appendChild(legendDiv);
		},

		preProcessData: function(geojson, numberOf, algorithm, colorscheme){

			var aesarray = [];
			var values = [];
			var strings = [];
			var breaks;
			var fcolor;
			for(var g = 0; g<geojson.features.length && (this.maxfeatures ==undefined || g<this.maxfeatures); g++){
				if(geojson.features[g].properties[this.attr] != null &&  typeof geojson.features[g].properties[this.attr] == 'number'){
					values.push(geojson.features[g].properties[this.attr]);
					this.max = Math.max(this.max, geojson.features[g].properties[this.attr]);
					this.min = Math.min(this.min, geojson.features[g].properties[this.attr]);
				}
				else
					if(strings.indexOf(geojson.features[g].properties[this.attr])==-1)
						strings.push(geojson.features[g].properties[this.attr]);
			}
			if(values.length > 0){//quantitative
				if(this.breaks==undefined){
					if(numberOf>1)
						breaks = this.calcClassBreaks(values, algorithm, numberOf);
					else
						breaks = [this.min,this.max];
				}
				else{
					breaks = this.breaks;
				}
					if(breaks.length>2){
						fcolor = chroma.scale(colorscheme).colors(breaks.length-1);
						for(var i = 0; i < breaks.length-1; i++){
							var color = chroma(fcolor[i]).rgb();
							if(i!=breaks.length-2){
								var aes = new Aesthetic(i, this.attr, [Math.round(color[0]), Math.round(color[1]), Math.round(color[2]), this.alpha], [0,0,0,1], null, [breaks[i], breaks[i+1]]);
							}
							else{
								var aes = new Aesthetic(i, this.attr, [Math.round(color[0]), Math.round(color[1]), Math.round(color[2]), this.alpha], [0,0,0,1], null, [breaks[i], breaks[i+1]]);
								aes.outer = true;
							}
							aesarray.push(aes);
						}
					}
					else{
						color = chroma(colorscheme[0]).rgb();
						var aes = new Aesthetic(i, this.attr, [Math.round(color[0]), Math.round(color[1]), Math.round(color[2]), this.alpha], [0,0,0,1], null, [breaks[0], breaks[1]]);
						aes.outer = true;
						aesarray.push(aes);
					}
			}
				
					
			
			
			else{//qualitative
				if(strings.length>0){
					breaks = strings;
					if(typeof colorscheme === 'string'){//string
						fcolor = chroma.scale(colorscheme).colors(breaks.length);
					}
					else{ //array
						fcolor = chroma.scale(colorscheme).colors(breaks.length);		
					}
					for(var i = 0; i < breaks.length; i++){
						var color = chroma(fcolor[i]).rgb();
						var aes = new Aesthetic(i, this.attr, [Math.round(color[0]), Math.round(color[1]), Math.round(color[2]), 1], [0,0,0,1], null, [strings[i]]);
						aesarray.push(aes);
					}
				}
			}

			this.aesthetics = aesarray;
			//return aesarray;


		},


		calcClassBreaks: function(values, algorithm, numberOf){
			var breaks;
			switch(algorithm){
				case 'equidistant':
					breaks = chroma.limits(values, 'e', numberOf);
					break;
				
				case 'quantile':
					breaks = chroma.limits(values, 'q', numberOf);
					break;

				case 'k-means':
					breaks = chroma.limits(values, 'k', numberOf);
					break;

				default:
					breaks = chroma.limits(values, 'q', numberOf);
					break;
			}
			return breaks;
		},

		insertFeature: function(id, properties, triangles, borders, points){
			var flag = false;
			for(var i=0; i<this.aesthetics.length;i++){
				if(this.aesthetics[i].checkProperty(properties[this.aesthetics[i].getAttr()]) == true){
					this.aesthetics[i].addFeature(id, properties, triangles, borders, points);
					flag = true;
				}
			}
			if(!flag){
				//TODO
				console.log("TODO: feature does not fit into any of the aesthetics defined.\n Value: " + properties[this.attr]);
			}
		},


		insertGroupedFeature: function(idaes, triangles, borders, points){
			
			this.aesthetics[idaes].addGroupedFeature(null, triangles, borders, points);
			
		},
	
		draw: function(){
		
			alert("draw() not implemented");


			
		},

		processPolygon: function(polygon){

				if(polygon.geometry.type == "Polygon"){
			 		var outsidepolygon = polygon.geometry.coordinates[0];

				 		var insidepolygons = [];
				 		for(var k = 1; k<polygon.geometry.coordinates.length; k++){
				 			//todo inside polygon
				 			insidepolygons.push(polygon.geometry.coordinates[i][k]);
				 		}
				 		var tempVerts = new Array();
				 		for(var out = 0; out< outsidepolygon.length-1; out++){
				 			tempVerts.push(outsidepolygon[out][0], outsidepolygon[out][1]);
				 			//console.log("lon: " + outsidepolygon[out][0] + " lat: " + outsidepolygon[out][1]);
				 		}
				 		
				 		
				 		
				 		var triangles_vert = earcut(tempVerts);
						
				 		polyarray.push({triangles: triangles_vert, vertex: tempVerts});
			 	}



			 	else if(polygon.geometry.type == "MultiPolygon"){
			 		var polyarray = [];
			 		for (var i = 0; i< polygon.geometry.coordinates.length; i++){

			 			var outsidepolygon = polygon.geometry.coordinates[i][0];

				 		var insidepolygons = [];
				 		for(var k = 1; k<polygon.geometry.coordinates[i].length; k++){
				 			//todo inside polygon
				 			insidepolygons.push(polygon.geometry.coordinates[i][k]);
				 		}
				 		var tempVerts = new Array();
				 		for(var out = 0; out< outsidepolygon.length-1; out++){
				 			tempVerts.push(outsidepolygon[out][0], outsidepolygon[out][1]);
				 			//console.log("lon: " + outsidepolygon[out][0] + " lat: " + outsidepolygon[out][1]);
				 		}
				 		
				 		
				 		
				 		var triangles_vert = earcut(tempVerts);

						//var temp = earcut.flatten(polygon.geometry.coordinates[i]);
						//var triangles_vert = earcut(temp.vertices, temp.holes, temp.dimensions);
						
				 		polyarray.push({triangles: triangles_vert, vertex: tempVerts});
				 		//console.log(polyarray);
				 	}


			 		return polyarray;
			 	}




			console.log("something went wrong: workpolygon");
		},

		processData: function(geojson) {
			
			
			
			console.log("numero de features: ", geojson.features.length);

			var gl = this._webgl.gl;
			var tempPoints = null;
			var treepoints = null;


			


			for(var g = 0; g<geojson.features.length && (this.maxfeatures ==undefined || g<this.maxfeatures); g++)
			 {
			 	var properties = geojson.features[g].properties;
			 	geojson.features[g].properties['_gisplayid'] = g;
				if(typeof geojson.features[g].properties[this.minuend] == 'number' && geojson.features[g].properties[this.minuend] != null && typeof geojson.features[g].properties[this.subtrahend] == 'number' && geojson.features[g].properties[this.subtrahend] != null){
					geojson.features[g].properties['change'] = geojson.features[g].properties[this.minuend] - geojson.features[g].properties[this.subtrahend];
				}			 	


			 	if(geojson.features[g].geometry.type == "Polygon" || geojson.features[g].geometry.type == "MultiPolygon"){
				 	var polygons = this.processPolygon(geojson.features[g]);
				 	
				 	var currentBorders = [];
				 	var currentTriangles = [];
				 	var bufferT = [];
				 	var bufferB = [];

				 	for(var j = 0; j< polygons.length; j++){
				 		var trianglespolygon = polygons[j].triangles;
				 		var border = polygons[j].vertex;
				 		currentTriangles[j] = new Array();
				 		currentBorders[j] = new Array();
				 		



						for (var h = 0; h < trianglespolygon.length; h++) {
				 			var pixel = this.latLongToPixelXY(border[trianglespolygon[h]*2], border[trianglespolygon[h]*2+1]);
				 			currentTriangles[j].push(pixel.x, pixel.y);	

				 			if(h==trianglespolygon.length-1){
				 				bufferT.push(gl.createBuffer());

								var vertArray = new Float32Array(currentTriangles[j]);

								gl.fsize = vertArray.BYTES_PER_ELEMENT;
								gl.bindBuffer(gl.ARRAY_BUFFER, bufferT[j]);
								gl.bufferData(gl.ARRAY_BUFFER, vertArray, gl.STATIC_DRAW);

								bufferT[j].itemSize=2;
								bufferT[j].numItems=vertArray.length/2;
				 			}
				 		}


				 		for(var y = 0; y < border.length; y+=2){
				 			var pixel = this.latLongToPixelXY(border[y], border[y+1]);
				 			currentBorders[j].push(pixel.x, pixel.y);	

				 			if(y==border.length-2){
				 				bufferB.push(gl.createBuffer());

								var vertArray = new Float32Array(currentBorders[j]);

								gl.fsize = vertArray.BYTES_PER_ELEMENT;
								gl.bindBuffer(gl.ARRAY_BUFFER, bufferB[j]);
								gl.bufferData(gl.ARRAY_BUFFER, vertArray, gl.STATIC_DRAW);

								bufferB[j].itemSize=2;
								bufferB[j].numItems=vertArray.length/2;
				 			}
				 		}

				 	}
				 	//polygon
				 	this.insertFeature(g, properties, bufferT, bufferB, []);

				}

				else if(geojson.features[g].geometry.type == "Point" && this.dynamic==true){
					//dum
					var currentPoints = []
					currentPoints[0] = new Array();
				 	var pixel = this.latLongToPixelXY(geojson.features[g].geometry.coordinates[0], geojson.features[g].geometry.coordinates[1]);
				 	currentPoints[0].push(pixel.x, pixel.y);	
				 	var bufferP = [];
				 	bufferP.push(gl.createBuffer());

					var vertArray = new Float32Array(currentPoints[0]);
					
					gl.fsize = vertArray.BYTES_PER_ELEMENT;
					gl.bindBuffer(gl.ARRAY_BUFFER, bufferP[0]);
					gl.bufferData(gl.ARRAY_BUFFER, vertArray, gl.STATIC_DRAW);

					bufferP[0].itemSize=2;
					bufferP[0].numItems=vertArray.length/2;

					this.insertFeature(g, properties, [], [], bufferP);

					if(treepoints==null) treepoints = [];
					treepoints.push({lon:geojson.features[g].geometry.coordinates[0], lat:geojson.features[g].geometry.coordinates[1], properties:properties});


				}

				else if(geojson.features[g].geometry.type == "Point" && this.dynamic==false){
					//debugger;
				 	var pixel = this.latLongToPixelXY(geojson.features[g].geometry.coordinates[0], geojson.features[g].geometry.coordinates[1]);
					if(tempPoints==null){
						tempPoints = new Array();
						for(var a=0; a<this.aesthetics.length; a++){
							tempPoints[a]=[];
						}
					}

					var aesarrays = this.fitFeature(properties);
					for(var y = 0; y<aesarrays.length; y++){
						tempPoints[aesarrays[y]].push(pixel.x, pixel.y);
					}

					if(treepoints==null) treepoints = [];
					treepoints.push({lon:geojson.features[g].geometry.coordinates[0], lat:geojson.features[g].geometry.coordinates[1], properties:properties});


				}
			 

			}//end features loop
			

			//insert grouped points
			if(tempPoints!=null){
				for(var t=0; t<tempPoints.length;t++){
					if(tempPoints[t].length>0){
						var bufferP = [];
					 	bufferP.push(gl.createBuffer());

						var vertArray = new Float32Array(tempPoints[t]);
						
						gl.fsize = vertArray.BYTES_PER_ELEMENT;
						gl.bindBuffer(gl.ARRAY_BUFFER, bufferP[0]);
						gl.bufferData(gl.ARRAY_BUFFER, vertArray, gl.STATIC_DRAW);

						bufferP[0].itemSize=2;
						bufferP[0].numItems=vertArray.length/2;
						this.insertGroupedFeature(t, [],[], bufferP);
					}
				}
				
			}
			if(treepoints!=null)
				this.kdtree = new kdTree(treepoints, function(a, b){
								  		return Math.pow(a.lon - b.lon, 2) +  Math.pow(a.lat - b.lat, 2);
									},
							["lon", "lat", "properties"]);
			if(this.type=='CP')
				this.rtree = new PolygonLookup(geojson);

		},

		createCanvas: function(){
			var canvas = this.map.createCanvas(this.id);
	
			//init webgl properties
			this._webgl = { gl: null, 
				program: null,
				projection: null};

			this._webgl.gl = canvas.getContext("webgl");
			this._webgl.projection = new Float32Array(16);
			this._webgl.projection.set([2/canvas.width, 0, 0, 0, 0, -2/canvas.height, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);

			this._webgl.gl.viewport(0, 0, this.map.getContainer().offsetWidth, this.map.getContainer().offsetHeight);
			this._webgl.gl.disable(this._webgl.gl.DEPTH_TEST);
		
		},

		getNumberOfFeatures: function(){
			var count = 0;
			for(var i =0; i<this.aesthetics.length; i++){
				count += this.aesthetics[i]._features.length;
			}
			return count;
		},

		scaleProjection: function(matrix, scaleX, scaleY) {
			// scaling x and y, which is just scaling first two columns of matrix
			matrix[0] *= scaleX;
			matrix[1] *= scaleX;
			matrix[2] *= scaleX;
			matrix[3] *= scaleX;

			matrix[4] *= scaleY;
			matrix[5] *= scaleY;
			matrix[6] *= scaleY;
			matrix[7] *= scaleY;
		},
		
		translateProjection: function(matrix, tx, ty) {
			// translation is in last column of matrix
			matrix[12] += matrix[0]*tx + matrix[4]*ty;
			matrix[13] += matrix[1]*tx + matrix[5]*ty;
			matrix[14] += matrix[2]*tx + matrix[6]*ty;
			matrix[15] += matrix[3]*tx + matrix[7]*ty;
		},

		latLongToPixelXY: function(longitude, latitude) {
			var pi_180 = Math.PI / 180.0;
			var pi_4 = Math.PI * 4;
			var sinLatitude = Math.sin(latitude * pi_180);
			var pixelY = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) /(pi_4)) * 256;
			var pixelX = ((longitude + 180) / 360) * 256;

			var pixel =  {x: pixelX, y: pixelY};

			return pixel;
		},


		clear: function(){
			var gl = this._webgl.gl;
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.disable(gl.DEPTH_TEST);
		},

		drawTriangles: function(aes){
				var gl = this._webgl.gl;
				if (gl == null) return;
				var matrixProjection = new Float32Array(16);

				//gl.clear(gl.COLOR_BUFFER_BIT);
				//gl.disable(gl.DEPTH_TEST);

				//gl.enable(gl.BLEND);
				//gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);


				var currentZoom = this.map.getZoom();
				var pointSize = Math.max(currentZoom - 5.0, 1.0);

				matrixProjection.set(this._webgl.projection);

				var scale = Math.pow(2, currentZoom);
				this.scaleProjection(matrixProjection, scale, scale);

				var offset = this.latLongToPixelXY(this.map.getLngBound(), this.map.getLatBound());
				this.translateProjection(matrixProjection, -offset.x, -offset.y);

				var projectionLocation = gl.getUniformLocation(this._webgl.program, 'projection');
				gl.uniformMatrix4fv(projectionLocation, false, matrixProjection);

				var vertexSizeLocation = gl.getAttribLocation(this._webgl.program, 'aPointSize');
				gl.vertexAttrib1f(vertexSizeLocation, pointSize);

				var isPointLocation = gl.getUniformLocation(this._webgl.program, 'isPoint');
				gl.uniform1f(isPointLocation, 0.0);



				var vertexCoordLocation = gl.getAttribLocation(this._webgl.program, 'vertexCoord');
				

				var vertexColorLocation =  gl.getUniformLocation(this._webgl.program, "u_color");
				


				/** 
				 * 
				 *  Draw Polygons' Interior
				 *  **/
				var fsize = Float32Array.BYTES_PER_ELEMENT;
				//console.log("Numero de Buffers: ", buffers.length);

				gl.uniform4f(vertexColorLocation, aes.fillColor[0]/255, aes.fillColor[1]/255, aes.fillColor[2]/255, aes.fillColor[3]);
				



				for (var i = 0; i < aes._features.length; i++) {
					for(var y = 0; y<aes._features[i]._triangles.length; y++){

					 	gl.bindBuffer(gl.ARRAY_BUFFER, aes._features[i]._triangles[y]);
				
						gl.enableVertexAttribArray(vertexCoordLocation);
						gl.vertexAttribPointer(vertexCoordLocation, 2, gl.FLOAT, false, fsize * 2, 0);
					 	//gl.vertexAttribPointer(vertexColorLocation, 4, gl.FLOAT, false, fsize * 6, fsize * 2);
					 	//gl.enableVertexAttribArray(vertexColorLocation);

					 	

					 	gl.drawArrays(gl.TRIANGLES, 0, aes._features[i]._triangles[y].numItems);	
					}
				}
		},

		drawBorders: function(aes){
			var gl = this._webgl.gl;
				if (gl == null) return;
				var matrixProjection = new Float32Array(16);

				//gl.clear(gl.COLOR_BUFFER_BIT);
				//gl.disable(gl.DEPTH_TEST);

				gl.enable(gl.BLEND);
				gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

				var currentZoom = this.map.getZoom();
				var pointSize = Math.max(currentZoom - 5.0, 1.0);

				matrixProjection.set(this._webgl.projection);

				var scale = Math.pow(2, currentZoom);
				this.scaleProjection(matrixProjection, scale, scale);

				var offset = this.latLongToPixelXY(this.map.getLngBound(), this.map.getLatBound());
				this.translateProjection(matrixProjection, -offset.x, -offset.y);

				var projectionLocation = gl.getUniformLocation(this._webgl.program, 'projection');
				gl.uniformMatrix4fv(projectionLocation, false, matrixProjection);

				var vertexSizeLocation = gl.getAttribLocation(this._webgl.program, 'aPointSize');
				gl.vertexAttrib1f(vertexSizeLocation, pointSize);

				var vertexCoordLocation = gl.getAttribLocation(this._webgl.program, 'vertexCoord');
				

				var vertexColorLocation =  gl.getUniformLocation(this._webgl.program, "u_color");
				
				var isPointLocation = gl.getUniformLocation(this._webgl.program, 'isPoint');
				gl.uniform1f(isPointLocation, 0.0);


				/** 
				 * 
				 *  Draw Polygons' Interior
				 *  **/
				var fsize = Float32Array.BYTES_PER_ELEMENT;
				//console.log("Numero de Buffers: ", buffers.length);

				gl.uniform4f(vertexColorLocation, aes.strokeColor[0]/255, aes.strokeColor[1]/255, aes.strokeColor[2]/255, aes.strokeColor[3]);
				



			



				
		for (var i = 0; i < aes._features.length; i++) {
					for(var y = 0; y<aes._features[i]._borders.length; y++){

					 	gl.bindBuffer(gl.ARRAY_BUFFER, aes._features[i]._borders[y]);
				
						gl.enableVertexAttribArray(vertexCoordLocation);
						gl.vertexAttribPointer(vertexCoordLocation, 2, gl.FLOAT, false, fsize * 2, 0);
					 	//gl.vertexAttribPointer(vertexColorLocation, 4, gl.FLOAT, false, fsize * 6, fsize * 2);
					 	//gl.enableVertexAttribArray(vertexColorLocation);

					 	

					 	gl.drawArrays(gl.LINE_LOOP, 0, aes._features[i]._borders[y].numItems);	
					}
				}

				
		},

		drawPoints: function(aes){
			

				var gl = this._webgl.gl;
				if (gl == null) return;
				var matrixProjection = new Float32Array(16);

				//TODO: RS uncomment these two lines
				//gl.clear(gl.COLOR_BUFFER_BIT);
				//gl.disable(gl.DEPTH_TEST);

				gl.enable(gl.BLEND);
				gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

				var currentZoom = this.map.getZoom();
				var pointSize = Math.max(currentZoom - 4.0 + aes.pointSize, aes.pointSize);

				matrixProjection.set(this._webgl.projection);

				var scale = Math.pow(2, currentZoom);
				this.scaleProjection(matrixProjection, scale, scale);

				var offset = this.latLongToPixelXY(this.map.getLngBound(), this.map.getLatBound());
				this.translateProjection(matrixProjection, -offset.x, -offset.y);

				var projectionLocation = gl.getUniformLocation(this._webgl.program, 'projection');
				gl.uniformMatrix4fv(projectionLocation, false, matrixProjection);

				var vertexSizeLocation = gl.getAttribLocation(this._webgl.program, 'aPointSize');
				gl.vertexAttrib1f(vertexSizeLocation, pointSize);

				var vertexCoordLocation = gl.getAttribLocation(this._webgl.program, 'vertexCoord');
				

				var vertexColorLocation =  gl.getUniformLocation(this._webgl.program, "u_color");
				
				var isPointLocation = gl.getUniformLocation(this._webgl.program, 'isPoint');
				gl.uniform1f(isPointLocation, 1.0);

				/** 
				 * 
				 *  Draw Polygons' Interior
				 *  **/
				var fsize = Float32Array.BYTES_PER_ELEMENT;
				//console.log("Numero de Buffers: ", buffers.length);

				gl.uniform4f(vertexColorLocation, aes.fillColor[0]/255, aes.fillColor[1]/255, aes.fillColor[2]/255, aes.fillColor[3]);
				



			



				
				for (var i = 0; i < aes._features.length && this.dynamic==true; i++) {
					for(var y = 0; y<aes._features[i]._points.length; y++){

					 	gl.bindBuffer(gl.ARRAY_BUFFER, aes._features[i]._points[y]);
				
						gl.enableVertexAttribArray(vertexCoordLocation);
						gl.vertexAttribPointer(vertexCoordLocation, 2, gl.FLOAT, false, fsize * 2, 0);
					 	//gl.vertexAttribPointer(vertexColorLocation, 4, gl.FLOAT, false, fsize * 6, fsize * 2);
					 	//gl.enableVertexAttribArray(vertexColorLocation);

					 	

					 	gl.drawArrays(gl.POINTS, 0, aes._features[i]._points[y].numItems);	
					 		//1);
					}
				}


				for (var i = 0;this.dynamic==false && aes._allFeatures != null && i < aes._allFeatures.length; i++) {
					for(var y = 0; y<aes._allFeatures[i]._points.length; y++){

					 	gl.bindBuffer(gl.ARRAY_BUFFER, aes._allFeatures[i]._points[y]);
				
						gl.enableVertexAttribArray(vertexCoordLocation);
						gl.vertexAttribPointer(vertexCoordLocation, 2, gl.FLOAT, false, fsize * 2, 0);
					 	//gl.vertexAttribPointer(vertexColorLocation, 4, gl.FLOAT, false, fsize * 6, fsize * 2);
					 	//gl.enableVertexAttribArray(vertexColorLocation);

					 	

					 	gl.drawArrays(gl.POINTS, 0, aes._allFeatures[i]._points[y].numItems);	
					 	//gl.drawArrays(gl.TRIANGLE_STRIP, 0, aes._allFeatures[i]._points[y].numItems-2);	
					 		//1);
					}
				}


			

			},

			drawContinuousPolygons: function(aes){

				var gl = this._webgl.gl;
				if (gl == null) return;
				var matrixProjection = new Float32Array(16);

				//gl.clear(gl.COLOR_BUFFER_BIT);
				//gl.disable(gl.DEPTH_TEST);

				//gl.enable(gl.BLEND);
				//gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);


				var currentZoom = this.map.getZoom();
				var pointSize = Math.max(currentZoom - 5.0, 1.0);

				matrixProjection.set(this._webgl.projection);

				var scale = Math.pow(2, currentZoom);
				this.scaleProjection(matrixProjection, scale, scale);

				var offset = this.latLongToPixelXY(this.map.getLngBound(), this.map.getLatBound());
				this.translateProjection(matrixProjection, -offset.x, -offset.y);

				var projectionLocation = gl.getUniformLocation(this._webgl.program, 'projection');
				gl.uniformMatrix4fv(projectionLocation, false, matrixProjection);

				var vertexSizeLocation = gl.getAttribLocation(this._webgl.program, 'aPointSize');
				gl.vertexAttrib1f(vertexSizeLocation, pointSize);

				var isPointLocation = gl.getUniformLocation(this._webgl.program, 'isPoint');
				gl.uniform1f(isPointLocation, 0.0);



				var vertexCoordLocation = gl.getAttribLocation(this._webgl.program, 'vertexCoord');
				

				var vertexColorLocation =  gl.getUniformLocation(this._webgl.program, "u_color");
				


				/** 
				 * 
				 *  Draw Polygons' Interior
				 *  **/
				var fsize = Float32Array.BYTES_PER_ELEMENT;
				//console.log("Numero de Buffers: ", buffers.length);

				
				



				for (var i = 0; i < aes._features.length; i++) {
					for(var y = 0; y<aes._features[i]._triangles.length; y++){
						var color;
						var diff = aes._features[i]._properties['change'];
						if(diff == 0)
							color = aes.fillColor(0.5);
						else{
							if(diff>0){
								color = aes.fillColor(0.5 + diff/this.max/2);
							}else{
								color = aes.fillColor(0.5 - diff/this.min/2);
							}
						}


						gl.uniform4f(vertexColorLocation, color[0]/255, color[1]/255, color[2]/255, this.alpha);
					 	gl.bindBuffer(gl.ARRAY_BUFFER, aes._features[i]._triangles[y]);
				
						gl.enableVertexAttribArray(vertexCoordLocation);
						gl.vertexAttribPointer(vertexCoordLocation, 2, gl.FLOAT, false, fsize * 2, 0);
					 	//gl.vertexAttribPointer(vertexColorLocation, 4, gl.FLOAT, false, fsize * 6, fsize * 2);
					 	//gl.enableVertexAttribArray(vertexColorLocation);

					 	

					 	gl.drawArrays(gl.TRIANGLES, 0, aes._features[i]._triangles[y].numItems);	
					}
				}


			},

			drawProporcionalPoints: function(aes){

				var gl = this._webgl.gl;
				if (gl == null) return;
				var matrixProjection = new Float32Array(16);

				

				gl.enable(gl.BLEND);
				gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

				var currentZoom = this.map.getZoom();
				

				matrixProjection.set(this._webgl.projection);

				var scale = Math.pow(2, currentZoom);
				this.scaleProjection(matrixProjection, scale, scale);

				var offset = this.latLongToPixelXY(this.map.getLngBound(), this.map.getLatBound());
				this.translateProjection(matrixProjection, -offset.x, -offset.y);

				var projectionLocation = gl.getUniformLocation(this._webgl.program, 'projection');
				gl.uniformMatrix4fv(projectionLocation, false, matrixProjection);

				

				var vertexCoordLocation = gl.getAttribLocation(this._webgl.program, 'vertexCoord');
				

				var vertexColorLocation =  gl.getUniformLocation(this._webgl.program, "u_color");
				
				var isPointLocation = gl.getUniformLocation(this._webgl.program, 'isPoint');
				gl.uniform1f(isPointLocation, 1.0);

				/** 
				 * 
				 *  Draw Polygons' Interior
				 *  **/
				var fsize = Float32Array.BYTES_PER_ELEMENT;
				//console.log("Numero de Buffers: ", buffers.length);

				gl.uniform4f(vertexColorLocation, aes.fillColor[0], aes.fillColor[1], aes.fillColor[2], aes.fillColor[3]);
				



			



				
			
				if(this.dynamic==true){
					for (var i in aes._features) {
						for(var y in aes._features[i]._points){

						 	gl.bindBuffer(gl.ARRAY_BUFFER, aes._features[i]._points[y]);
						 	var propvalue = parseFloat(aes._features[i]._properties[this.attr]);
							var temppointsize = ((this.maxpointsize - this.minpointsize)/(this.max - this.min))*(propvalue - this.min);
							var pointSize = Math.max(currentZoom - 4.0 + temppointsize, temppointsize);
							var vertexSizeLocation = gl.getAttribLocation(this._webgl.program, 'aPointSize');
							gl.vertexAttrib1f(vertexSizeLocation, pointSize);
							
							gl.enableVertexAttribArray(vertexCoordLocation);
							gl.vertexAttribPointer(vertexCoordLocation, 2, gl.FLOAT, false, fsize * 2, 0);
						 	//gl.vertexAttribPointer(vertexColorLocation, 4, gl.FLOAT, false, fsize * 6, fsize * 2);
						 	//gl.enableVertexAttribArray(vertexColorLocation);

						 	

						 	gl.drawArrays(gl.POINTS, 0, aes._features[i]._points[y].numItems);	
						 		//1);
						}
					}
				}


			},

			initialize: function(){
					this.max = null;
					this.min = null;
					this.createCanvas();
					this.program();		
					var mappos;
					for(var i=0; i<maps.length;i++)
						if(maps[i].id == this.id)
							mappos = i;
					this.map.onEvent('move', 
						function() {
							maps[mappos].draw();
						}
					);

					if(this.interactive==true)
						maps[mappos].map.onEvent('click', function (e) {
					        // e.point is the x, y coordinates of the mousemove event relative
					        // to the top-left corner of the map
					        
					            // e.lngLat is the longitude, latitude geographical position of the event
							//alert("lat: " + e.latlng.lat + "\n lon: " + e.latlng.lng);


							var lat = e.latlng.lat;
							var lon = e.latlng.lng;

							if(maps[mappos].rtree != undefined){
								var bool = maps[0].rtree.search(lon, lat);
								if(bool ==undefined)
									return;
								else{
									//console.log
									var s = "";
									var first = true;
									if(maps[mappos].showPropertiesOnClick != null){
										for(var i=0; i< maps[mappos].showPropertiesOnClick.length; i+=2){
												if(first){
													s+= maps[mappos].showPropertiesOnClick[i+1] + ": " + bool.properties[maps[mappos].showPropertiesOnClick[i]];
													first=false;
												}
												else{
													s+= "\n" + maps[mappos].showPropertiesOnClick[i+1] + ": " + bool.properties[maps[mappos].showPropertiesOnClick[i]];
												}
											
										}
									}
									else{
									
										var keys = Object.keys(bool.properties);
										
										for(var i=0; i< keys.length; i++){
											if(keys[i] != "_gisplayid"){
												if(first){
													s+= keys[i] + ": " + bool.properties[keys[i]];
													first=false;
												}
												else{
													s+= "\n" + keys[i] + ": " + bool.properties[keys[i]];
												}
											}
										}
									}
									alert(s);
									if(maps[mappos].mapOnClickCall!= undefined && maps[mappos].mapOnClickCall != null)
										maps[mappos].mapOnClickCall(bool);
								}
							}
							if(maps[mappos].kdtree != undefined){
								
								var nearest = maps[mappos].kdtree.nearest({lat:lat, lon: lon},1,128/(Math.pow(2, map.getZoom()*2)));
								if(nearest.length <= 0)
									return;
								else{
									var bool = nearest[0][0];
									//console.log
									var s = "";
									var first = true;
									if(maps[mappos].showPropertiesOnClick != null){
										for(var i=0; i< maps[mappos].showPropertiesOnClick.length; i+=2){
												if(first){
													s+= maps[mappos].showPropertiesOnClick[i+1] + ": " + bool.properties[maps[mappos].showPropertiesOnClick[i]];
													first=false;
												}
												else{
													s+= "\n" + maps[mappos].showPropertiesOnClick[i+1] + ": " + bool.properties[maps[mappos].showPropertiesOnClick[i]];
												}
											
										}
									}
									else{
									
										var keys = Object.keys(bool.properties);
										
										for(var i=0; i< keys.length; i++){
											if(keys[i] != "_gisplayid"){
												if(first){
													s+= keys[i] + ": " + bool.properties[keys[i]];
													first=false;
												}
												else{
													s+= "\n" + keys[i] + ": " + bool.properties[keys[i]];
												}
											}
										}
									}
									alert(s);
									if(maps[mappos].mapOnClickCall!= undefined && maps[mappos].mapOnClickCall != null)
										maps[mappos].mapOnClickCall(bool);

								}


							}
								
							
						});

			},

			

			fitFeature: function(properties){
				var result = [];
				for(var a =0; a<this.aesthetics.length; a++){
					if(this.aesthetics[a].checkProperty(properties[this.aesthetics[a].getAttr()]) == true)
						result.push(a);
				}
				return result;
			},

			loadOptions: function(options, bgmap){
				if(options.customMapService == true)
					this.map = bgmap;
				else
					this.map = new BGMapWrapper(bgmap);
				if(options.loader != false)
	 				this.loader();

				if(options.showPropertiesOnClick == true){
						this.showPropertiesOnClick = null;
						//append on bgmap object
				}
				else if(options.showPropertiesOnClick == false){
						//nada
				}
				else if(options.showPropertiesOnClick!=undefined){
					this.showPropertiesOnClick = options.showPropertiesOnClick;
				}
				this.alpha = options.alpha!=undefined?options.alpha:0.5;
				this.interactive = options.interactive==undefined?true:!options.interactive;
				this.attr = options.attr;
				this.dynamic = options.dynamic==undefined?false:options.dynamic;
				this.maxfeatures = options.maxFeatures;
				this.breaks = options.classBreaks;
				this.colorscheme = options.colorScheme;
				this.numberofclasses = options.numberOfClasses;
				this.algorithm = options.classBreaksMethod;
				this.legendOnClickCall = options.legendOnClickFunction;
				this.mapOnClickCall = options.mapOnClickFunction;
				

			},

			loader: function(){
				this.map.loader();
			}

	};

	




	
	function Choropleth(bgmap, geometry, options){
		this.geometry = geometry;
		this.aesthetics = new Array();
		this.annotations = new Array();
		this.loadOptions(options, bgmap);
		this.id=mapcount++;
		this.type='CP';
		maps.push(this);
		this.initialize();	
		

		return this;
	}


	Choropleth.prototype = Object.create(Map.prototype,{

		

		draw: {//OVERRIDE
			value: function(){
				this.clear();
				for(var i = 0; i<this.aesthetics.length; i++){
					if(this.aesthetics[i].enabled == true){
						this.drawTriangles(this.aesthetics[i]);
					}
					this.drawBorders(this.aesthetics[i]);
				}
				
			}
		},
		buildLegend: { //override
			value: function(){
				this.legend = new Legend(this.id);
				for(var a in this.aesthetics){
					this.legend.insertPolygonRow(this.aesthetics[a], this);
				}
				this.legend.insertLegend(this.map);
			}
		}

	});




			
	function DotMap(bgmap,geometry, options){
		this.geometry = geometry;
		this.aesthetics = new Array();
		this.annotations = new Array();
		this.type = 'DM';
		this.loadOptions(options, bgmap);
		this.id=mapcount++;
		maps.push(this);
		this.initialize();
		
		return this;

	}

	 DotMap.prototype = Object.create(Map.prototype,{

	 	draw: {
	 		value: function(){
				//var time = Date.now();
				this.clear();
				for(var i = 0; i<this.aesthetics.length; i++){
					if(this.aesthetics[i].enabled == true)
						this.drawPoints(this.aesthetics[i]);
				}
				
	 		}	
		},

		buildLegend: { //override
			value: function(){
				this.legend = new Legend(this.id);
				for(var a in this.aesthetics){

					this.legend.insertPointRow(this.aesthetics[a], this);
				}
				this.legend.insertLegend(this.map);
			}
		}

		

	 });


	 function PSymbolsMap(bgmap, geometry, options){
	 	this.geometry = geometry;
	 	this.aesthetics = new Array();
		this.legend;
		this.annotations = new Array();
		this.map = bgmap;
		this.id=mapcount++;
		this.type = 'PS';
		this.loadOptions(options, bgmap);
		this.dynamic = options.sizeByClass==undefined?true:!options.sizeByClass;
		if(this.dynamic == true){
			this.maxpointsize = options.maxPointSize==undefined?10.0:parseFloat(options.maxPointSize);
			this.minpointsize = options.minPointSize==undefined?1.0:parseFloat(options.minPointSize);
		}
		maps.push(this);
		this.initialize();

		return this;
	 }

	 PSymbolsMap.prototype = Object.create(Map.prototype,{

	 	draw: {
	 		value: function(){
				//var time = Date.now();
				this.clear();
				if(this.dynamic==false)
					for(var i = this.aesthetics.length-1; i>=0; i--){
						if(this.aesthetics[i].enabled == true)
							this.drawPoints(this.aesthetics[i]);
					}
				else{
					for(var i = this.aesthetics.length-1; i>=0; i--){
						if(this.aesthetics[i].enabled == true)
							this.drawProporcionalPoints(this.aesthetics[i]);
					}
				}

			}
		},

		buildLegend: { //override
			value: function(){
				this.legend = new Legend(this.id);
				/*for(var a in this.aesthetics){
					this.legend.insertPointRow(this.aesthetics[a], this);
				}
				this.legend.insertLegend(this.map);*/

			}
		}
	 });


	 function ChangeMap(bgmap, geometry, options){
		this.geometry = geometry;
		this.aesthetics = new Array();
		this.annotations = new Array();
		this.loadOptions(options, bgmap);
		this.id=mapcount++;
		this.type='CP';
		maps.push(this);
		this.initialize();	

		return this;
	 };

	 ChangeMap.prototype = Object.create(Map.prototype,{
	 	draw: {
	 		value: function(){
				this.clear();
				for(var i = 0; i<this.aesthetics.length; i++){
					if(this.aesthetics[i].enabled == true){
						this.drawContinuousPolygons(this.aesthetics[i]);
					}
					this.drawBorders(this.aesthetics[i]);
				}
			}
		},

		preProcessData: {
			value: function(geojson, numberOf, algorithm, colorscheme){

				var aesarray = [];
				var values = [];
				var breaks;
				var fcolor;
				for(var g = 0; g<geojson.features.length && (this.maxfeatures ==undefined || g<this.maxfeatures); g++){
					if(typeof geojson.features[g].properties[this.minuend] == 'number' && geojson.features[g].properties[this.minuend] != null && typeof geojson.features[g].properties[this.subtrahend] == 'number' && geojson.features[g].properties[this.subtrahend] != null){
						this.max = Math.max(this.max, geojson.features[g].properties[this.minuend] - geojson.features[g].properties[this.subtrahend]);
						this.min = Math.min(this.min, geojson.features[g].properties[this.minuend] - geojson.features[g].properties[this.subtrahend]);
					}
				}
				breaks = [this.min,this.max];
				fcolor = chroma.scale(colorscheme);
				var aes = new Aesthetic(i, this.attr, fcolor, [0,0,0,1], null, [breaks[0], breaks[1]]);
				aes.outer = true;
				aesarray.push(aes);

				this.aesthetics = aesarray;


			}
		}

	 });
	
	 function Gisplay(){
	 	return this;
	 };

	 Gisplay.prototype = {

	 	makeChoropleth: function(bgmap, geometry, options,defaultid){
	 		
	 		var gismap = new Choropleth(bgmap, geometry, options);
	 		setTimeout(function(){
		 		defaultid = defaultid != null ? defaultid: 1;
		 		
		 			
		 		if(gismap.colorscheme==undefined)
		 			gismap.colorscheme = Gisplay.choroplethDefaults(defaultid).colorScheme;
		 		if(gismap.classbreaks ==undefined){
		 			if(gismap.numberofclasses == undefined){
		 				gismap.numberofclasses = Gisplay.choroplethDefaults(defaultid).numberOfClasses;
		 			}
		 			gismap.preProcessData(geometry, gismap.numberofclasses, gismap.algorithm, gismap.colorscheme);
		 		}
		 			
		 		gismap.processData(geometry);
		 		gismap.draw();
				if(options.legend != false)
					gismap.buildLegend();

		 		if(options.loader != false){
		 			gismap.loader();
		 		}
		 	},1);

	 	},

	 	choroplethDefaults: function(defaultid){
	 		var options = {};
	 		switch(defaultid){
	 			case 1:
	 				options.colorScheme = ['white','yellow','orange','red'];
	 				options.numberOfClasses = 4;
	 				break;
	 			
	 			default:
	 				
	 				break;
	 		}
	 		return options;
	 	},



	 	changemapdefaults: function(defaultid){
	 		var options = {};
	 		switch(defaultid){
	 			case 1:

	 				break;
	 			
	 			default:
	 				
	 				break;
	 		}
	 		return options;
	 	},


	 	makeChorochromaticMap: function(bgmap, geometry, options,defaultid){
	 		var gismap = new Choropleth(bgmap, geometry, options);
	 		setTimeout(function(){
		 		defaultid = defaultid != null ? defaultid: 1;
		 		
		 			
		 		if(gismap.colorscheme==undefined)
		 			gismap.colorscheme = Gisplay.choroplethDefaults(defaultid).colorScheme;
		 		
		 		gismap.preProcessData(geometry, gismap.numberofclasses, gismap.algorithm, gismap.colorscheme);

		 		gismap.processData(geometry);
		 		gismap.draw();
		 		if(options.legend != false)
					gismap.buildLegend();

		 		if(options.loader != false){
		 			gismap.loader();
		 		}
		 	},1);
	 	},

	 	chorochromaticDefaults: function(defaultid){
	 		var options = {};
	 		switch(defaultid){
	 			case 1:
	 				//options.colorScheme = ['purple','orange', 'blue', 'yellow', 'pink', 'green', 'red', 'navy'];
					options.colorScheme = ["#440154","#440256","#450457","#450559","#46075a","#46085c","#460a5d","#460b5e","#470d60","#470e61","#471063","#471164","#471365","#481467","#481668","#481769","#48186a","#481a6c","#481b6d","#481c6e","#481d6f","#481f70","#482071","#482173","#482374","#482475","#482576","#482677","#482878","#482979","#472a7a","#472c7a","#472d7b","#472e7c","#472f7d","#46307e","#46327e","#46337f","#463480","#453581","#453781","#453882","#443983","#443a83","#443b84","#433d84","#433e85","#423f85","#424086","#424186","#414287","#414487","#404588","#404688","#3f4788","#3f4889","#3e4989","#3e4a89","#3e4c8a","#3d4d8a","#3d4e8a","#3c4f8a","#3c508b","#3b518b","#3b528b","#3a538b","#3a548c","#39558c","#39568c","#38588c","#38598c","#375a8c","#375b8d","#365c8d","#365d8d","#355e8d","#355f8d","#34608d","#34618d","#33628d","#33638d","#32648e","#32658e","#31668e","#31678e","#31688e","#30698e","#306a8e","#2f6b8e","#2f6c8e","#2e6d8e","#2e6e8e","#2e6f8e","#2d708e","#2d718e","#2c718e","#2c728e","#2c738e","#2b748e","#2b758e","#2a768e","#2a778e","#2a788e","#29798e","#297a8e","#297b8e","#287c8e","#287d8e","#277e8e","#277f8e","#27808e","#26818e","#26828e","#26828e","#25838e","#25848e","#25858e","#24868e","#24878e","#23888e","#23898e","#238a8d","#228b8d","#228c8d","#228d8d","#218e8d","#218f8d","#21908d","#21918c","#20928c","#20928c","#20938c","#1f948c","#1f958b","#1f968b","#1f978b","#1f988b","#1f998a","#1f9a8a","#1e9b8a","#1e9c89","#1e9d89","#1f9e89","#1f9f88","#1fa088","#1fa188","#1fa187","#1fa287","#20a386","#20a486","#21a585","#21a685","#22a785","#22a884","#23a983","#24aa83","#25ab82","#25ac82","#26ad81","#27ad81","#28ae80","#29af7f","#2ab07f","#2cb17e","#2db27d","#2eb37c","#2fb47c","#31b57b","#32b67a","#34b679","#35b779","#37b878","#38b977","#3aba76","#3bbb75","#3dbc74","#3fbc73","#40bd72","#42be71","#44bf70","#46c06f","#48c16e","#4ac16d","#4cc26c","#4ec36b","#50c46a","#52c569","#54c568","#56c667","#58c765","#5ac864","#5cc863","#5ec962","#60ca60","#63cb5f","#65cb5e","#67cc5c","#69cd5b","#6ccd5a","#6ece58","#70cf57","#73d056","#75d054","#77d153","#7ad151","#7cd250","#7fd34e","#81d34d","#84d44b","#86d549","#89d548","#8bd646","#8ed645","#90d743","#93d741","#95d840","#98d83e","#9bd93c","#9dd93b","#a0da39","#a2da37","#a5db36","#a8db34","#aadc32","#addc30","#b0dd2f","#b2dd2d","#b5de2b","#b8de29","#bade28","#bddf26","#c0df25","#c2df23","#c5e021","#c8e020","#cae11f","#cde11d","#d0e11c","#d2e21b","#d5e21a","#d8e219","#dae319","#dde318","#dfe318","#e2e418","#e5e419","#e7e419","#eae51a","#ece51b","#efe51c","#f1e51d","#f4e61e","#f6e620","#f8e621","#fbe723","#fde725"];
	 				break;
	 			
	 			default:
	 				
	 				break;
	 		}
	 		return options;
	 	},


	 	makeDotMap: function(bgmap, geometry, options,defaultid){
	 		var gismap = new DotMap(bgmap, geometry, options);
	 		setTimeout(function(){
		 		defaultid = defaultid != null ? defaultid: 1;
		 		if(gismap.colorscheme==undefined)
		 			gismap.colorscheme = Gisplay.dotmapDefaults(defaultid, options).colorScheme;
		 		if(gismap.classbreaks ==undefined){
		 			if(gismap.numberofclasses == undefined){
		 				gismap.numberofclasses = Gisplay.dotmapDefaults(defaultid, options).numberOfClasses;
		 			}
		 			gismap.preProcessData(geometry, gismap.numberofclasses, gismap.algorithm, gismap.colorscheme);
		 		}
		 			
		 		gismap.processData(geometry);
		 		gismap.draw();
				if(options.legend != false)
					gismap.buildLegend();

		 		if(options.loader != false){
		 			gismap.loader();
		 		}
		 	},1);
	 	},

	 	dotmapDefaults: function(defaultid, useroptions){
	 		var options = {};
	 		switch(defaultid){
	 			case 1:
	 				options.colorScheme = ["#440154","#440256","#450457","#450559","#46075a","#46085c","#460a5d","#460b5e","#470d60","#470e61","#471063","#471164","#471365","#481467","#481668","#481769","#48186a","#481a6c","#481b6d","#481c6e","#481d6f","#481f70","#482071","#482173","#482374","#482475","#482576","#482677","#482878","#482979","#472a7a","#472c7a","#472d7b","#472e7c","#472f7d","#46307e","#46327e","#46337f","#463480","#453581","#453781","#453882","#443983","#443a83","#443b84","#433d84","#433e85","#423f85","#424086","#424186","#414287","#414487","#404588","#404688","#3f4788","#3f4889","#3e4989","#3e4a89","#3e4c8a","#3d4d8a","#3d4e8a","#3c4f8a","#3c508b","#3b518b","#3b528b","#3a538b","#3a548c","#39558c","#39568c","#38588c","#38598c","#375a8c","#375b8d","#365c8d","#365d8d","#355e8d","#355f8d","#34608d","#34618d","#33628d","#33638d","#32648e","#32658e","#31668e","#31678e","#31688e","#30698e","#306a8e","#2f6b8e","#2f6c8e","#2e6d8e","#2e6e8e","#2e6f8e","#2d708e","#2d718e","#2c718e","#2c728e","#2c738e","#2b748e","#2b758e","#2a768e","#2a778e","#2a788e","#29798e","#297a8e","#297b8e","#287c8e","#287d8e","#277e8e","#277f8e","#27808e","#26818e","#26828e","#26828e","#25838e","#25848e","#25858e","#24868e","#24878e","#23888e","#23898e","#238a8d","#228b8d","#228c8d","#228d8d","#218e8d","#218f8d","#21908d","#21918c","#20928c","#20928c","#20938c","#1f948c","#1f958b","#1f968b","#1f978b","#1f988b","#1f998a","#1f9a8a","#1e9b8a","#1e9c89","#1e9d89","#1f9e89","#1f9f88","#1fa088","#1fa188","#1fa187","#1fa287","#20a386","#20a486","#21a585","#21a685","#22a785","#22a884","#23a983","#24aa83","#25ab82","#25ac82","#26ad81","#27ad81","#28ae80","#29af7f","#2ab07f","#2cb17e","#2db27d","#2eb37c","#2fb47c","#31b57b","#32b67a","#34b679","#35b779","#37b878","#38b977","#3aba76","#3bbb75","#3dbc74","#3fbc73","#40bd72","#42be71","#44bf70","#46c06f","#48c16e","#4ac16d","#4cc26c","#4ec36b","#50c46a","#52c569","#54c568","#56c667","#58c765","#5ac864","#5cc863","#5ec962","#60ca60","#63cb5f","#65cb5e","#67cc5c","#69cd5b","#6ccd5a","#6ece58","#70cf57","#73d056","#75d054","#77d153","#7ad151","#7cd250","#7fd34e","#81d34d","#84d44b","#86d549","#89d548","#8bd646","#8ed645","#90d743","#93d741","#95d840","#98d83e","#9bd93c","#9dd93b","#a0da39","#a2da37","#a5db36","#a8db34","#aadc32","#addc30","#b0dd2f","#b2dd2d","#b5de2b","#b8de29","#bade28","#bddf26","#c0df25","#c2df23","#c5e021","#c8e020","#cae11f","#cde11d","#d0e11c","#d2e21b","#d5e21a","#d8e219","#dae319","#dde318","#dfe318","#e2e418","#e5e419","#e7e419","#eae51a","#ece51b","#efe51c","#f1e51d","#f4e61e","#f6e620","#f8e621","#fbe723","#fde725"];
	 				break;
	 			case 2:
	 				options.colorScheme = ['purple','orange', 'blue', 'yellow', 'pink', 'green', 'red', 'navy'];
	 				break;
	 			default:
	 				
	 				break;
	 		}
	 		options.numberOfClasses = 1;
	 		return options;
	 	},

	 	makeProportionalSymbolsMap: function(bgmap, geometry, options,defaultid){
	 		var gismap = new PSymbolsMap(bgmap, geometry, options);
	 		setTimeout(function(){
		 		defaultid = defaultid != null ? defaultid: 1;
		 		if(gismap.colorscheme==undefined)
		 			gismap.colorscheme = Gisplay.psymbolsDefaults(defaultid, options).colorScheme;
		 		if(gismap.classbreaks ==undefined){
		 			if(gismap.numberofclasses == undefined){
		 				gismap.numberofclasses = Gisplay.psymbolsDefaults(defaultid, options).numberOfClasses;
		 			}
		 			gismap.preProcessData(geometry, gismap.numberofclasses, gismap.algorithm, gismap.colorscheme);
		 		}
		 			
		 		gismap.processData(geometry);
		 		gismap.draw();
				if(options.legend != false)
					gismap.buildLegend();

		 		if(options.loader != false){
		 			gismap.loader();
		 		}
		 	},1);
	 	},

	 	psymbolsDefaults: function(defaultid){
	 		var options = {};
	 		switch(defaultid){
	 			case 1:
	 			options.maxPointSize = 60;
	 			options.minPointSize = 5;
	 			options.colorScheme = ['green', 'red', 'blue'];
	 			options.numberOfClasses = 1;
	 				break;
	 			
	 			default:
	 				
	 				break;
	 		}
	 		return options;
	 	},

	 	validateOptions: function(maptype, options){

	 	}


	 };

	 //init Gisplay API
	 var Gisplay = new Gisplay();

	