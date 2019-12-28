import glslangModule from 'https://unpkg.com/@webgpu/glslang@0.0.8/dist/web-devel/glslang.js';
import vertexShaderGLSL from './vertex_shader.js'
import fragmentShader from './fragment_shader.js'
import computeShader from './compute1d_numThread64.js'

// TODO: enable / disable grid
// Add sliders to move around the grid
// Let the user choose grid resolution
// Optimize compute shader further
// Let the user draw patterns

(async () => {

    if (!navigator.gpu) {
        alert('WebGPU not supported! To see this content, you must use Chrome Canary and enable this UNSAFE flag: chrome://flags/#enable-unsafe-webgpu');
    }

    const canvas = document.getElementById("webGPUCanvas");
    const gridSize = 10;
    const cellsCount  = gridSize * gridSize;
 
    const density = ( canvas.width - 1)  / gridSize;
    if(density < 3.0){
        canvas.width = canvas.height = ( 3.0 * gridSize) + 1;
    }

    const scaleFactor = Math.floor( (canvas.width - 1) / gridSize);
    
    const localComputeSize = 64;

    const globalDefines = 
        "#version 450\n" +
        "#define CELLS_COUNT "  + cellsCount  + "\n" +
        "#define GRID_SIZE "    + gridSize    + "\n" + 
        "#define PIXELS_PER_CELL " + scaleFactor + "\n";

    const fragmentShaderGLSL = globalDefines + fragmentShader;

    const computeDefines = 
        "#define LOCAL_SIZE " + localComputeSize + "\n";

    const computeShaderGLSL = globalDefines + computeDefines + computeShader;

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const glslang = await glslangModule();

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
                code: glslang.compileGLSL(computeShaderGLSL, "compute"),
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
                code: glslang.compileGLSL(vertexShaderGLSL, "vertex"),
            }),
            entryPoint: "main"
        },
        fragmentStage: {
            module: device.createShaderModule({
                code: glslang.compileGLSL(fragmentShaderGLSL, "fragment"),
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

    let t = 0;
    let previousTime = 0;
    async function frame(iTimeStamp) {

        console.log(iTimeStamp - previousTime);
        if( iTimeStamp - previousTime > 250){
            previousTime = iTimeStamp;

            // Get next available image view from swap chain
            renderPassDescriptor.colorAttachments[0].attachment = swapChain.getCurrentTexture().createView();
            const commandEncoder = device.createCommandEncoder({});

            // Compute pass
            const computePassEncoder = commandEncoder.beginComputePass();
            computePassEncoder.setPipeline(computePipeline);
            computePassEncoder.setBindGroup(0, computeBindGroups[t % 2]);
            computePassEncoder.dispatch(Math.ceil(gridSize * gridSize / localComputeSize));
            computePassEncoder.endPass();

            // compute1d:               computePassEncoder.dispatch(gridSize * gridSize);
            // compute2d:               computePassEncoder.dispatch(gridSize, gridSize);
            // compute1d_numThread64 :  computePassEncoder.dispatch(Math.ceil(gridSize * gridSize / localComputeSize));

            // Render pass
            const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            renderPassEncoder.setPipeline(renderPipeline);
            renderPassEncoder.setBindGroup(0, renderBindGroups[t % 2]);
            renderPassEncoder.draw(3, 1, 0, 0);
            renderPassEncoder.endPass();

            // Submit commands to the GPU
            device.defaultQueue.submit([commandEncoder.finish()]);
            t++;
        }

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
})();