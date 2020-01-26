import { 
	slowModeChanged, 
	setSlowModeFrameTime, 
	resetAverageFrameTime, 
	changeTestCase, 
	changeGridSize,
	changeCellSize
} from "./game_of_life.js"

const averageTimeText 	= document.getElementById( "averageTime" );
const frameTimeInput 	= document.getElementById( "frameTimeInput" );
const frameTimeDiv 	 	= document.getElementById( "frameTimeDiv" );
const slowModeToggle 	= document.getElementById( "slowModeToggle" );
const testSelector		= document.getElementById( "testSelector" );
const gridSizeInput		= document.getElementById( "gridSizeInput" );
const cellSizeInput		= document.getElementById( "cellSizeInput" );
const canvas			= document.getElementById( "webGPUCanvas" );
const canvasView		= document.getElementById( "canvasView" );

let lastX, lastY;
let dragging = false;
let marginLeft = 0, marginTop = 0;
let maxMarginLeft, maxMarginTop;

window.addEventListener( "focus", resetAverageFrameTime, false );

frameTimeInput.addEventListener( 'change', ( iEvent ) => 
{
	setSlowModeFrameTime( parseInt( iEvent.target.value ) );
});

slowModeToggle.addEventListener( 'change', ( iEvent ) => {
	if( iEvent.target.checked )
	{
		frameTimeDiv.style.display = "inline-block";
	}
	else
	{
		frameTimeDiv.style.display = "none";
	}
	slowModeChanged( iEvent.target.checked );
});

testSelector.addEventListener( 'change', ( iEvent ) => 
{
	changeTestCase( parseInt( iEvent.target.value ) );
});

gridSizeInput.addEventListener( 'change', ( iEvent ) => 
{
	changeGridSize( parseInt( iEvent.target.value ) );
	resetMargins();
});

cellSizeInput.addEventListener( 'change', ( iEvent ) => 
{
	changeCellSize( parseInt( iEvent.target.value ) );
	resetMargins();
});

canvas.addEventListener( 'mousedown', ( iEvent ) =>
{
    dragging = true;
    lastX = iEvent.clientX;
    lastY = iEvent.clientY;
    iEvent.preventDefault();
}, false);

window.addEventListener( 'mousemove', ( iEvent) => 
{
    if (dragging) {
        const deltaX = iEvent.clientX - lastX;
        const deltaY = iEvent.clientY - lastY;
        lastX = iEvent.clientX;
        lastY = iEvent.clientY;
        marginLeft = Math.max( maxMarginLeft, Math.min( marginLeft + deltaX, 0.0 ) );
        marginTop  = Math.max( maxMarginTop,  Math.min( marginTop  + deltaY, 0.0 ) );
        canvas.style.transform  = "translate(" + marginLeft + "px, "+ marginTop + "px)";
    }
    iEvent.preventDefault();
}, false);

window.addEventListener('mouseup', function() {
    dragging = false;
}, false);

function resetMargins()
{
	maxMarginLeft = Math.min( 0.0, ( parseInt(canvasView.style.width)  -  parseInt( canvas.style.width )  ) );
	maxMarginTop  = Math.min( 0.0, ( parseInt(canvasView.style.height) -  parseInt( canvas.style.height ) ) );
	canvas.style.transform  = "translate(0px, 0px)";
}

resetMargins();

export function displayAverageTime( iAverageTime )
{
	if( parseFloat( iAverageTime ) )
	{
		averageTimeText.textContent = iAverageTime.toFixed( 2 ) + " ms";
	}
}

export function updateUIInputFields( iCellSize, iGridSize )
{
	document.getElementById( "cellSizeInput" ).value = iCellSize;
	document.getElementById( "gridSizeInput" ).value = iGridSize;
}