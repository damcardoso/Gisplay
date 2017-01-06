This thesis proposed and implementd a high-level JavaScript API called Gisplay, 
targeting the construction of thematic maps rendered by WebGL. 
Gisplay provides a high level of abstraction for the construction and customization of several thematic maps, 
as well as for the interactive actions such as pan, zoom and filtering\\
The developed API can be easily integrated with external libraries for developing interconnected visualization methods,
and it can also be extended. This API is composed by an intermediate API and a high-level API. 
The former contains the core functions regarding the construction of thematic maps while the latter uses those functions to 
implement the several types of thematic maps. 

________________________________________________________________________________________________________________________________

Depedencies:
The "lib" folder contains every single dependency needed to start with Gisplay:
	- Chroma.min.js
	- earcut.js
	- jquery-2.1.4.min.js
	- kdtree.js
	- rtree.js

________________________________________________________________________________________________________________________________
	
Examples:
On the "Demos" folder several examples can be found, containing at least one example for each thematic map type implemented.
