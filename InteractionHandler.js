import { slowModeChanged, setSlowModeFrameTime, resetAverageFrameTime } from "./game_of_life.js"

const averageTimeText = document.getElementById("averageTime");
const frameTimeInput = document.getElementById("frameTimeInput");
const frameTimeDiv 	 = document.getElementById("frameTimeDiv");
const slowModeToggle = document.getElementById("slowModeToggle");

window.addEventListener("focus", resetAverageFrameTime, false);

frameTimeInput.addEventListener( 'change', function(iEvent){
	setSlowModeFrameTime(this.value);
});

slowModeToggle.addEventListener( 'change', function(iEvent){
	if(this.checked){
		frameTimeDiv.style.display = "inline-block";
	}else{
		frameTimeDiv.style.display = "none";
	}
	slowModeChanged(this.checked);
});

export function displayAverageTime(iAverageTime){
	if(parseFloat(iAverageTime)){
		averageTimeText.textContent = iAverageTime.toFixed(2) + " ms";
	}
}