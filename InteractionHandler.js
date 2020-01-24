import { 
	slowModeChanged, 
	setSlowModeFrameTime, 
	resetAverageFrameTime, 
	changeTestCase, 
	changeGridSize 
} from "./game_of_life.js"

const averageTimeText 	= document.getElementById( "averageTime" );
const frameTimeInput 	= document.getElementById( "frameTimeInput" );
const frameTimeDiv 	 	= document.getElementById( "frameTimeDiv" );
const slowModeToggle 	= document.getElementById( "slowModeToggle" );
const testSelector		= document.getElementById( "testSelector" );
const gridSizeInput		= document.getElementById( "gridSizeInput" );

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
});

export function displayAverageTime( iAverageTime )
{
	if( parseFloat( iAverageTime ) )
	{
		averageTimeText.textContent = iAverageTime.toFixed( 2 ) + " ms";
	}
}

gridSizeInput