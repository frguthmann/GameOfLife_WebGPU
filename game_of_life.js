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

const computeShaders = [computeShader0, computeShader1, computeShader2, computeShader3, 
    computeShader4, computeShader5];

const swapChainFormat = "bgra8unorm"
const threadsPerGroup = 64;
const threadsPerDirectionXY = Math.sqrt(threadsPerGroup); 
const canvas = document.getElementById("webGPUCanvas");

let compileShader;
let device;

let gridSize = 64;
const url = new URL(window.location.href);
const gridSizeParameter = url.searchParams.get("grid_size");
if( parseInt( gridSizeParameter ) )
{
    gridSize = gridSizeParameter
}

let cellsCount, scaleFactor, dispatchX, dispatchY;
updateGridConstants( gridSize );

let computeMode = 4;
let slowMode = false;
let slowModeFrameTime = 500;
let averageFrameTime = 0;
let frameCount = 0;

let computePipelines = [];
let computeBindGroupLayout, computeBindGroups, computePipelineLayout;
let renderBindGroupLayout, renderBindGroups, renderPipelineLayout, renderPipeline;

(async () => {

    if (!navigator.gpu) {
        alert('WebGPU not supported! To see this content, you must use Chrome Canary and enable this UNSAFE flag: chrome://flags/#enable-unsafe-webgpu');
    }

    const adapter = await navigator.gpu.requestAdapter();
    device = await adapter.requestDevice();
    const ShaderCompiler = await shaderCompilerModule();
    compileShader = ShaderCompiler.compileShader;

    const context = canvas.getContext('gpupresent');

    // COMPUTE PIPELINE SETUP

    computeBindGroupLayout = device.createBindGroupLayout({
        bindings: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, type: "storage-buffer" },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, type: "storage-buffer" }
        ],
    });

    computePipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [computeBindGroupLayout]
    });

    computePipelines[ computeMode ] = createComputePipelineFromShader( device, computePipelineLayout, 
        computeShaders[ computeMode ] );
    const initialGridState = generateInitialGridState( gridSize );
    const cellBuffers = generateCellBuffers( initialGridState );
    computeBindGroups = generateComputeBindGroups( device, computeBindGroupLayout, cellBuffers, 
        initialGridState );

    // RENDER PIPELINE SETUP

    const swapChain = context.configureSwapChain({
        device,
        format: swapChainFormat
    });

    renderBindGroupLayout = device.createBindGroupLayout({
        bindings: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, type: "storage-buffer" }
        ],
    });

    renderPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [renderBindGroupLayout]
    });

    const fragmentShaderGLSL = getGlobalDefines() + fragmentShader;
    renderPipeline = createRenderPipelineFromShaders( device, renderPipelineLayout, vertexShaderGLSL,
        fragmentShaderGLSL, swapChainFormat );

    renderBindGroups = generateRenderBindGroups( device, renderBindGroupLayout, cellBuffers, initialGridState);

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
            displayAverageTime( averageFrameTime );
        }

        previousTime = iTimeStamp;

        // Get next available image view from swap chain
        renderPassDescriptor.colorAttachments[0].attachment = swapChain.getCurrentTexture().createView();
        const commandEncoder = device.createCommandEncoder({});

        // Compute pass
        const computePassEncoder = commandEncoder.beginComputePass();
        computePassEncoder.setPipeline(computePipelines[computeMode]);
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

function generateDispatchX( iGridSize, iThreadPerGroup ){
    var threadsPerDirection = Math.sqrt( iThreadPerGroup );
    return [
        iGridSize * iGridSize, 
        Math.ceil(iGridSize * iGridSize / iThreadPerGroup), 
        Math.ceil(iGridSize * iGridSize / iThreadPerGroup),
        iGridSize,
        Math.ceil(iGridSize / threadsPerDirection),
        Math.ceil(iGridSize / threadsPerDirection)
    ];
}

function generateDispatchY( iGridSize, iThreadPerGroup ){
    var threadsPerDirection = Math.sqrt( iThreadPerGroup );
    return [
        1, 
        1, 
        1,
        iGridSize,
        Math.ceil(iGridSize / threadsPerDirectionXY),
        Math.ceil(iGridSize / threadsPerDirectionXY)
    ];
}

function generateInitialGridState( iGridSize )
{
    let initialGridState = new Float32Array( iGridSize * iGridSize );
    initialGridState[iGridSize * 0 + 1] = 1;
    initialGridState[iGridSize * 1 + 2] = 1;
    initialGridState[iGridSize * 2 + 0] = 1;
    initialGridState[iGridSize * 2 + 1] = 1;
    initialGridState[iGridSize * 2 + 2] = 1;

    return initialGridState;
}

function generateCellBuffers( iInitialGridState )
{
    const cellBuffers = new Array(2);
    for (let i = 0; i < 2; ++i) {

        const [gpuBuffer, cpuArrayBuffer] = device.createBufferMapped({
            size: iInitialGridState.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        new Float32Array(cpuArrayBuffer).set( iInitialGridState );
        gpuBuffer.unmap();

        cellBuffers[i] = gpuBuffer;
    }

    return cellBuffers;
}

function generateComputeBindGroups( iDevice, iComputeBindGroupLayout, iCellBuffers, iInitialGridState  )
{
    const computeBindGroups = new Array(2);
    for ( let i = 0; i < 2; ++i ) 
    {
        computeBindGroups[i] = iDevice.createBindGroup({
            layout: iComputeBindGroupLayout,
            bindings: [{
                binding: 0,
                resource: {
                    buffer: iCellBuffers[i],
                    offset: 0,
                    size: iInitialGridState.byteLength
                },
            }, {
                binding: 1,
                resource: {
                    buffer: iCellBuffers[ (i + 1) % 2],
                    offset: 0,
                    size: iInitialGridState.byteLength,
                },
            }]
        });
    }

    return computeBindGroups;
}

function generateRenderBindGroups( iDevice, iRenderBindGroupLayout, iCellBuffers, iInitialGridState )
{
    const renderBindGroups = new Array( 2 );
    for ( let i = 0; i < 2; ++i ) {
        renderBindGroups[i] = iDevice.createBindGroup({
            layout: iRenderBindGroupLayout,
            bindings: [{
                binding: 0,
                resource: {
                    buffer: iCellBuffers[ i ],
                    offset: 0,
                    size: iInitialGridState.byteLength
                },
            }]
        });
    }

    return renderBindGroups;
}

function getGlobalDefines(){
    let globalDefines = 
        "#version 450\n" +
        "#define CELLS_COUNT "      + cellsCount    + "\n" +
        "#define GRID_SIZE "        + gridSize      + "\n" + 
        "#define PIXELS_PER_CELL "  + scaleFactor   + "\n";
    if( gridSize <= 512){
        globalDefines += "#define HAS_GRID\n";
    }
    return globalDefines;
}

function getComputeDefines( iCaseNumber )
{
    const computeDefines = 
        "#define DISPATCH_X "          + dispatchX[iCaseNumber] + "\n" +
        "#define DISPATCH_Y "          + dispatchY[iCaseNumber] + "\n" +
        "#define THREADS_PER_GROUP "   + threadsPerGroup        + "\n" + 
        "#define THREADS_PER_GROUP_X " + threadsPerDirectionXY  + "\n" + 
        "#define THREADS_PER_GROUP_Y " + threadsPerDirectionXY  + "\n";
    return computeDefines;
}

function createComputePipelineFromShader( iDevice, iLayout, iShader )
{
    const computeShaderGLSL = getGlobalDefines() + getComputeDefines( computeMode ) + iShader;
    return iDevice.createComputePipeline({
        layout: iLayout,
        computeStage: {
            module: iDevice.createShaderModule({
                code: compileShader( computeShaderGLSL, "compute" ),
            }),
            entryPoint: "main"
        },
    });
}

function createRenderPipelineFromShaders( iDevice, iRenderPipelineLayout, iVSCode, iFSCode, iSwapChainFormat )
{
    return iDevice.createRenderPipeline({
        layout: iRenderPipelineLayout,

        vertexStage: {
            module: iDevice.createShaderModule({
                code: compileShader( iVSCode, "vertex" ),
            }),
            entryPoint: "main"
        },
        fragmentStage: {
            module: iDevice.createShaderModule({
                code: compileShader( iFSCode, "fragment" ),
            }),
            entryPoint: "main"
        },

        primitiveTopology: "triangle-list",

        colorStates: [{
            format: iSwapChainFormat,
        }],
    });
}

function updateGridConstants( iGridSize )
{
    cellsCount = iGridSize * iGridSize;
    scaleFactor = Math.floor( ( canvas.width - 1 ) / iGridSize );
    dispatchX = generateDispatchX( gridSize, threadsPerGroup );
    dispatchY = generateDispatchY( gridSize, threadsPerGroup );
}

function rebuildPipelines( iGridSize )
{
    const initialGridState = generateInitialGridState( iGridSize );
    const cellBuffers = generateCellBuffers( initialGridState );
    computeBindGroups = generateComputeBindGroups( device, computeBindGroupLayout, cellBuffers, 
        initialGridState );
    computePipelines[ computeMode ] = createComputePipelineFromShader( device, computePipelineLayout, 
        computeShaders[ computeMode ] );

    renderBindGroups = generateRenderBindGroups( device, renderBindGroupLayout, cellBuffers, 
        initialGridState);
    const fragmentShaderGLSL = getGlobalDefines() + fragmentShader;
    renderPipeline = createRenderPipelineFromShaders( device, renderPipelineLayout, vertexShaderGLSL,
        fragmentShaderGLSL, swapChainFormat );
}

// UI related stuff

export function resetAverageFrameTime()
{
    averageFrameTime = 0;
    frameCount = frameCount % 2;
}

export function slowModeChanged( isActivated )
{
    slowMode = isActivated;
    resetAverageFrameTime();
    displayAverageTime( slowModeFrameTime );
}

export function setSlowModeFrameTime( iFrameTime )
{
    slowModeFrameTime = iFrameTime;
    resetAverageFrameTime();
    displayAverageTime( iFrameTime );
}

export function changeTestCase( iCaseNumber )
{
    computeMode = iCaseNumber;
    if( !computePipelines[ computeMode ] )
    {
        computePipelines[ computeMode ] = createComputePipelineFromShader( device, computePipelineLayout, 
            computeShaders[ computeMode ] );
    }
    resetAverageFrameTime();
}

export function changeGridSize( iGridSize )
{
    gridSize = iGridSize;
    computePipelines = [];
    updateGridConstants( iGridSize );
    rebuildPipelines( iGridSize );
    resetAverageFrameTime();
}   