import { 
	setSimulationTimeStep, 
	changeTestCase, 
	setGridSize,
	setCellSize
} from "./game_of_life.js"

const testSelector		= document.getElementById( "testSelector" );
const canvas			= document.getElementById( "webGPUCanvas" );
const canvasView		= document.getElementById( "canvasView" );

let lastX, lastY;
let dragging = false;
let marginLeft = 0, marginTop = 0;
let maxMarginLeft, maxMarginTop;

let guiData = {
	averageFrameTime : 0,
	simulationTimeStep : 16,
	gridSize : 32,
	cellSize : 15,
};

const gui = new dat.GUI();

// Display GUI
const displayFolder = gui.addFolder( "Display" );
displayFolder.add( guiData, "gridSize", 1 ).step( 1 ).name( "Grid Size" ).onChange( setGridSize );
displayFolder.add( guiData, "cellSize", 1 ).step( 1 ).name( "Cell Size" ).onChange( setCellSize );
displayFolder.open();

// Simulation GUI

const simulationFolder = gui.addFolder( "Simulation" );
simulationFolder.add( guiData, "simulationTimeStep", 1 ).min(1).step( 1 ).name( "Time step " ).onChange( setSimulationTimeStep );
simulationFolder.open();

// Metrics GUI

const metricsFolder = gui.addFolder( "Metrics" );
let averageFrameTimeGUI = metricsFolder.add( guiData, "averageFrameTime" ).name("Frame Time");
averageFrameTimeGUI.domElement.style.pointerEvents = "none"
averageFrameTimeGUI.domElement.style.opacity = 0.5;
metricsFolder.open();

testSelector.addEventListener( 'change', ( iEvent ) => 
{
	changeTestCase( parseInt( iEvent.target.value ) );
});

export function displayAverageTime( iAverageTime )
{
	if( parseFloat( iAverageTime ) )
	{
		guiData.averageFrameTime = iAverageTime;
		averageFrameTimeGUI.updateDisplay();
	}
}