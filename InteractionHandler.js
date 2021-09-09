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

let guiData = {
	averageFrameTime: 0,
	simulationTimeStep: 16,
	gridSize: 32,
	cellSize: 15,
	computePreset: 0,
};

const gui = new dat.GUI();

// Compute GUI
const computeFolder = gui.addFolder( "Compute" );
computeFolder.add( guiData, "computePreset", computePresets ).name( "Preset" ).onChange( changeTestCase );
computeFolder.open();

// Display GUI
const displayFolder = gui.addFolder( "Display" );
const gridSizeGUI = displayFolder.add( guiData, "gridSize", 1 ).step( 1 ).name( "Grid Size" ).onChange( setGridSize );
const cellSizeGUI = displayFolder.add( guiData, "cellSize", 1 ).step( 1 ).name( "Cell Size" ).onChange( setCellSize );
displayFolder.open();

// Simulation GUI

const simulationFolder = gui.addFolder( "Simulation" );
simulationFolder.add( guiData, "simulationTimeStep", 0 ).min( 0 ).step( 1 ).name( "Time step " ).onChange( setSimulationTimeStep );
simulationFolder.open();

// Metrics GUI

const metricsFolder = gui.addFolder( "Metrics" );
let averageFrameTimeGUI = metricsFolder.add( guiData, "averageFrameTime" ).name( "Frame Time" );
averageFrameTimeGUI.domElement.style.pointerEvents = "none"
averageFrameTimeGUI.domElement.style.opacity = 0.5;
metricsFolder.open();

export default async function()
{
	return {
		displayAverageTime: function displayAverageTime( iAverageTime )
		{
			if ( parseFloat( iAverageTime ) )
			{
				guiData.averageFrameTime = iAverageTime;
				averageFrameTimeGUI.updateDisplay();
			}
		},
		updateUI: function displayAverageTime( iGridSize, iCellSize )
		{
			guiData.gridSize = iGridSize;
			gridSizeGUI.updateDisplay(); 
			guiData.cellSize = iCellSize;
			cellSizeGUI.updateDisplay();
		}
	};
};