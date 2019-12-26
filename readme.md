# WebGPU Game of Life

A simple experiment using WebGPU. The entire logic for the game is handled inside a compute shader, the CPU simply asks the GPU to swap buffers.

At the time of writing, this works in Chrome Canary (81) on windows by enabling the WebGPU flag: chrome://flags/#enable-unsafe-webgpu.