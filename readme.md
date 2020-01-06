# WebGPU Game of Life

Live here: https://frguthmann.github.io/GameOfLife_WebGPU/?grid_size=64
PS: You can modify the url to test different grid sizes.

A simple experiment using WebGPU. The entire logic for the game is handled inside a compute shader, the CPU simply asks the GPU to swap buffers.

At the time of writing, this works in Chrome Canary (81) on windows by enabling the WebGPU flag: chrome://flags/#enable-unsafe-webgpu.

Big shoutout to the people behind WebGPU samples, this code is heavily based on theirs.
https://github.com/austinEng/webgpu-samples
