import { slowModeChanged, setSlowModeFrameTime, resetAverageFrameTime } from "./game_of_life.js"

window.addEventListener("focus", resetAverageFrameTime, false);

const frameTimeInput = document.getElementById("frameTimeInput");
frameTimeInput.addEventListener( 'change', function(iEvent){
	setSlowModeFrameTime(this.value);
});

const frameTimeDiv 	 = document.getElementById("frameTimeDiv");
const slowModeToggle = document.getElementById("slowModeToggle");
slowModeToggle.addEventListener( 'change', function(iEvent){
	if(this.checked){
		frameTimeDiv.style.display = "inline-block";
	}else{
		frameTimeDiv.style.display = "none";
	}
	slowModeChanged(this.checked);
});

const averageTimeText = document.getElementById("averageTime");
export function displayAverageTime(iAverageTime){
	if(parseFloat(iAverageTime)){
		averageTimeText.innerHTML = iAverageTime.toFixed(2) + " ms";
	}
}