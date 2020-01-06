import { displayAverageTime }   from './InteractionHandler.js'
import fragmentShader           from './shaders/fragment_shader.js'
import shaderCompilerModule     from './ShaderCompiler.js'
import vertexShaderGLSL         from './shaders/vertex_shader.js'

import computeShader0           from './shaders/compute1d.js'
import computeShader1           from './shaders/compute1d_multipleThreads_1d.js'
import computeShader2           from './shaders/compute1d_multipleThreads_2d.js'
import computeShader3           from './shaders/compute2d.js'
import computeShader4           from './shaders/compute2d_multipleThreads_1d.js'
import computeShader5           from './shaders/compute2d_multipleThreads_2d.js'

const computeShaders = [computeShader0, computeShader1, computeShader2, computeShader3, computeShader4, computeShader5];

const computeMode = 4;
const gridSize = 49;
const threadsPerGroup = 64;
const threadsPerDirectionXY = Math.sqrt(threadsPerGroup); 

const dispatchX = [
    gridSize * gridSize, 
    Math.ceil(gridSize * gridSize / threadsPerGroup), 
    Math.ceil(gridSize * gridSize / threadsPerGroup),
    gridSize,
    Math.ceil(gridSize / threadsPerDirectionXY),
    Math.ceil(gridSize / threadsPerDirectionXY)
];

const dispatchY = [
    1, 
    1, 
    1,
    gridSize,
    Math.ceil(gridSize / threadsPerDirectionXY),
    Math.ceil(gridSize / threadsPerDirectionXY)
];

let slowMode = false;
let slowModeFrameTime = 500;
let averageFrameTime = 0;
let frameCount = 0;

(async () => {

    if (!navigator.gpu) {
        alert('WebGPU not supported! To see this content, you must use Chrome Canary and enable this UNSAFE flag: chrome://flags/#enable-unsafe-webgpu');
    }

    const canvas = document.getElementById("webGPUCanvas");
    const cellsCount  = gridSize * gridSize;
 
    /*const density = ( canvas.width - 1)  / gridSize;
    if(density < 3.0){
        canvas.width = canvas.height = ( 3.0 * gridSize) + 1;
    }*/

    const scaleFactor = Math.floor( (canvas.width - 1) / gridSize);

    const globalDefines = 
        "#version 450\n" +
        "#define CELLS_COUNT "      + cellsCount  + "\n" +
        "#define GRID_SIZE "        + gridSize    + "\n" + 
        "#define PIXELS_PER_CELL "  + scaleFactor + "\n";

    const fragmentShaderGLSL = globalDefines + fragmentShader;

    const computeDefines = 
        "#define DISPATCH_X "          + dispatchX[computeMode]       + "\n" +
        "#define DISPATCH_Y "          + dispatchY[computeMode]       + "\n" +
        "#define THREADS_PER_GROUP "   + threadsPerGroup       + "\n" + 
        "#define THREADS_PER_GROUP_X " + threadsPerDirectionXY + "\n" + 
        "#define THREADS_PER_GROUP_Y " + threadsPerDirectionXY + "\n"; 

    const computeShaderGLSL = globalDefines + computeDefines + computeShaders[computeMode];

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const ShaderCompiler = await shaderCompilerModule();
    const compileShader = ShaderCompiler.compileShader;

    const context = canvas.getContext('gpupresent');

    // COMPUTE PIPELINE SETUP

    const computeBindGroupLayout = device.createBindGroupLayout({
        bindings: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, type: "storage-buffer" },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, type: "storage-buffer" }
        ],
    });

    const computePipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [computeBindGroupLayout]
    });

    const computePipeline = device.createComputePipeline({
        layout: computePipelineLayout,
        computeStage: {
            module: device.createShaderModule({
                code: compileShader(computeShaderGLSL, "compute"),
            }),
            entryPoint: "main"
        },
    });

    const initialGridState = new Float32Array(gridSize * gridSize);
    initialGridState[gridSize * 0 + 1] = 1;
    initialGridState[gridSize * 1 + 2] = 1;
    initialGridState[gridSize * 2 + 0] = 1;
    initialGridState[gridSize * 2 + 1] = 1;
    initialGridState[gridSize * 2 + 2] = 1;

    const cellBuffers = new Array(2);
    for (let i = 0; i < 2; ++i) {

        const [gpuBuffer, cpuArrayBuffer] = device.createBufferMapped({
            size: initialGridState.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        new Float32Array(cpuArrayBuffer).set(initialGridState);
        gpuBuffer.unmap();

        cellBuffers[i] = gpuBuffer;
    }

    const computeBindGroups = new Array(2);
    for (let i = 0; i < 2; ++i) {
        computeBindGroups[i] = device.createBindGroup({
            layout: computeBindGroupLayout,
            bindings: [{
                binding: 0,
                resource: {
                    buffer: cellBuffers[i],
                    offset: 0,
                    size: initialGridState.byteLength
                },
            }, {
                binding: 1,
                resource: {
                    buffer: cellBuffers[ (i + 1) % 2],
                    offset: 0,
                    size: initialGridState.byteLength,
                },
            }]
        });
    }

    // RENDER PIPELINE SETUP

    const swapChainFormat = "bgra8unorm"

    const swapChain = context.configureSwapChain({
        device,
        format: swapChainFormat
    });

    const renderBindGroupLayout = device.createBindGroupLayout({
        bindings: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, type: "storage-buffer" }
        ],
    });

    const renderPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [renderBindGroupLayout]
    });

    const renderPipeline = device.createRenderPipeline({
        layout: renderPipelineLayout,

        vertexStage: {
            module: device.createShaderModule({
                code: compileShader(vertexShaderGLSL, "vertex"),
            }),
            entryPoint: "main"
        },
        fragmentStage: {
            module: device.createShaderModule({
                code: compileShader(fragmentShaderGLSL, "fragment"),
            }),
            entryPoint: "main"
        },

        primitiveTopology: "triangle-list",

        colorStates: [{
            format: swapChainFormat,
        }],
    });

    const renderBindGroups = new Array(2);
    for (let i = 0; i < 2; ++i) {
        renderBindGroups[i] = device.createBindGroup({
            layout: renderBindGroupLayout,
            bindings: [{
                binding: 0,
                resource: {
                    buffer: cellBuffers[i],
                    offset: 0,
                    size: initialGridState.byteLength
                },
            }]
        });
    }

    const renderPassDescriptor = {
        colorAttachments: [{
            loadValue: {
                r: 1.0,
                g: 0.5,
                b: 0.5,
                a: 1.0
            },
        }]
    };

    let previousTime = 0;
    async function frame(iTimeStamp) {

        // Early out in slow mode
        if( slowMode === true ){
            if(iTimeStamp - previousTime < slowModeFrameTime){
                requestAnimationFrame(frame);
                return;
            }
        }else{
            // Forget about the first 10 operations
            if(frameCount === 20){
                averageFrameTime = iTimeStamp - previousTime;
            }else{
                const averageFrameTimeFactor = (frameCount - 1) / frameCount;
                averageFrameTime = averageFrameTime * averageFrameTimeFactor + (iTimeStamp - previousTime) * (1 - averageFrameTimeFactor);
            }
            displayAverageTime(averageFrameTime);
        }

        previousTime = iTimeStamp;

        // Get next available image view from swap chain
        renderPassDescriptor.colorAttachments[0].attachment = swapChain.getCurrentTexture().createView();
        const commandEncoder = device.createCommandEncoder({});

        // Compute pass
        const computePassEncoder = commandEncoder.beginComputePass();
        computePassEncoder.setPipeline(computePipeline);
        computePassEncoder.setBindGroup(0, computeBindGroups[frameCount % 2]);
        computePassEncoder.dispatch(dispatchX[computeMode], dispatchY[computeMode]);
        computePassEncoder.endPass();

        // Render pass
        const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        renderPassEncoder.setPipeline(renderPipeline);
        renderPassEncoder.setBindGroup(0, renderBindGroups[frameCount % 2]);
        renderPassEncoder.draw(3, 1, 0, 0);
        renderPassEncoder.endPass();

        // Submit commands to the GPU
        device.defaultQueue.submit([commandEncoder.finish()]);
        frameCount++;

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
})();


// UI related stuff

export function resetAverageFrameTime(){
    averageFrameTime = 0;
    frameCount = frameCount % 2;
}

export function slowModeChanged(isActivated){
    slowMode = isActivated;
    resetAverageFrameTime();
}

export function setSlowModeFrameTime(iFrameTime){
    slowModeFrameTime = iFrameTime;
}