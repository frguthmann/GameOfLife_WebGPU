import
{
	setSimulationTimeStep,
	changeTestCase,
	setGridSize,
	setCellSize
}
from "./game_of_life.js"

const computePresets = {
	"Dispatch1D": 0,
	"Dispatch 1D, ThreadGroup 1D": 1,
	"Dispatch 1D, ThreadGroup 2D": 2,
	"Dispatch 2D": 3,
	"Dispatch 2D, ThreadGroup 1D": 4,
	"Dispatch 2D, ThreadGroup 2D": 5
}

let lastX, lastY;
let dragging = false;
let marginLeft = 0,
	marginTop = 0;
let maxMarginLeft, maxMarginTop;

let gameData = {
	averageFrameTime: 0,
	simulationTimeStep: 16,
	gridSize: 32,
	cellPixelSize: 15,
	computePreset: 0,
};

let guis = [];
const gui = new dat.GUI();

// Compute GUI
const computeFolder = gui.addFolder( "Compute" );
computeFolder.add( gameData, "computePreset", computePresets ).name( "Preset" ).onChange( changeTestCase );
computeFolder.open();

// Display GUI
const displayFolder = gui.addFolder( "Display" );
displayFolder.add( gameData, "gridSize", 1 ).step( 1 ).name( "Grid Size" ).onChange( setGridSize );
const cellSizeGUI = displayFolder.add( gameData, "cellPixelSize", 1 ).step( 1 ).name( "Cell Size" ).onChange( setCellSize );
guis.push( cellSizeGUI );
displayFolder.open();

// Simulation GUI

const simulationFolder = gui.addFolder( "Simulation" );
simulationFolder.add( gameData, "simulationTimeStep", 1 ).min( 1 ).step( 1 ).name( "Time step " ).onChange( setSimulationTimeStep );
simulationFolder.open();

// Metrics GUI

const metricsFolder = gui.addFolder( "Metrics" );
let averageFrameTimeGUI = metricsFolder.add( gameData, "averageFrameTime" ).name( "Frame Time" );
averageFrameTimeGUI.domElement.style.pointerEvents = "none"
averageFrameTimeGUI.domElement.style.opacity = 0.5;
guis.push( averageFrameTimeGUI );
metricsFolder.open();

export default async function()
{
	return {
		updateUI: function displayAverageTime( iGameData )
		{
			Object.assign(gameData, iGameData);
			for( let guiIdx in guis )
			{
				guis[ guiIdx ].updateDisplay();
			}
		}
	};
};