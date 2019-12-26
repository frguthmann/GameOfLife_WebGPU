import glslangModule from 'https://unpkg.com/@webgpu/glslang@0.0.8/dist/web-devel/glslang.js';

(async () => {

    const gridSize = 64;
    const cellsCount = gridSize * gridSize;

    const vertexShaderGLSL = `#version 450
        
        layout(location = 0) out vec2 vUv;

        void main()
        {
            float x = -1.0 + float( ( gl_VertexIndex & 1 ) << 2);
            float y = -1.0 + float( ( gl_VertexIndex & 2 ) << 1);
            vUv.x = ( x + 1.0 ) * 0.5;
            vUv.y = ( y + 1.0 ) * 0.5;
            gl_Position = vec4(x, y, 0, 1);
        }`;

    const fragmentShader = `layout(location = 0) in vec2 vUv;
        
        layout(location = 0) out vec4 outColor;

        layout(std430, set = 0, binding = 0) buffer Grid {
            float state[CELLS_COUNT];
        } grid;
        
        #define SCALE_FACTOR 10.0

        void main() {

            ivec2 screenCoord = ivec2(gl_FragCoord.xy / SCALE_FACTOR);

            if( screenCoord.x < GRID_SIZE && screenCoord.y < GRID_SIZE ){

                if( gl_FragCoord.x - SCALE_FACTOR * screenCoord.x < 1.0 ){
                    outColor = vec4(0.0, 0.0, 1.0, 1.0);
                    return;
                }

                if( gl_FragCoord.y - SCALE_FACTOR * screenCoord.y < 1.0 ){
                    outColor = vec4(0.0, 0.0, 1.0, 1.0);
                    return;
                }

                int cellIndex = screenCoord.x + screenCoord.y * GRID_SIZE;
                float cellState = grid.state[cellIndex];
                outColor = vec4(vec3(cellState), 1.0);
            }
        }`;

    const fragmentShaderGLSL = 
        "#version 450\n" +
        "#define CELLS_COUNT " + cellsCount + "\n" +
        "#define GRID_SIZE "   + gridSize   + "\n" + 
        fragmentShader;

    const computeShader = `
        layout(std430, set = 0, binding = 0) buffer SrcGrid {
            float state[CELLS_COUNT];
        } srcGrid;
        
        layout(std430, set = 0, binding = 1) buffer DstGrid {
            float state[CELLS_COUNT];
        } dstGrid;

        const ivec2 sampleXYOffsets[] = { 
            ivec2(-1, -1),   ivec2(0, -1),  ivec2(1, -1),
            ivec2(-1,  0),                  ivec2(1,  0),
            ivec2(-1,  1),   ivec2(0,  1),  ivec2(1,  1),
        };

        void main() {

            int aliveNeighbors = 0;
            for( int i = 0; i < 8; i++ ){

                ivec2 coords;
                coords.y = int(gl_GlobalInvocationID.x) / GRID_SIZE;
                coords.x = int(gl_GlobalInvocationID.x) - coords.y * GRID_SIZE;
                // Bring everything above 0 to be able to use the modulo operator
                coords = (coords + sampleXYOffsets[i] + GRID_SIZE) % GRID_SIZE;

                int neighborIndex = coords.x + coords.y * GRID_SIZE;
                aliveNeighbors += int(srcGrid.state[neighborIndex]);
            }

            float currentCellState = srcGrid.state[gl_GlobalInvocationID.x];

            // Make sure to copy the current data before updating it
            dstGrid.state[gl_GlobalInvocationID.x] = currentCellState;

            // Dead cell comes back to life
            if( currentCellState < 1.0 ){
                if( aliveNeighbors == 3 ){
                    dstGrid.state[gl_GlobalInvocationID.x] = 1.0;
                }
                return;
            }

            // Alive cell dies
            if( aliveNeighbors < 2.0 || aliveNeighbors > 3.0){
                dstGrid.state[gl_GlobalInvocationID.x] = 0.0;
            }

        }`;

    const computeShaderGLSL = 
        "#version 450\n" +
        "#define CELLS_COUNT " + cellsCount + "\n" + 
        "#define GRID_SIZE "   + gridSize   + "\n" + 
        computeShader;

    const canvas = document.getElementById("webGPUCanvas");

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
                r: 0.5,
                g: 0.5,
                b: 0.5,
                a: 1.0
            },
        }]
    };

    let t = 0;
    let previousTime = 0;
    async function frame(iTimeStamp) {

        if( iTimeStamp - previousTime > 16){
            previousTime = iTimeStamp;

            // Get next available image view from swap chain
            renderPassDescriptor.colorAttachments[0].attachment = swapChain.getCurrentTexture().createView();
            const commandEncoder = device.createCommandEncoder({});

            // Compute pass
            const computePassEncoder = commandEncoder.beginComputePass();
            computePassEncoder.setPipeline(computePipeline);
            computePassEncoder.setBindGroup(0, computeBindGroups[t % 2]);
            computePassEncoder.dispatch(cellsCount);
            computePassEncoder.endPass();

            // Render pass
            const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            renderPassEncoder.setPipeline(renderPipeline);
            renderPassEncoder.setBindGroup(0, renderBindGroups[t % 2]);
            renderPassEncoder.draw(3, 1, 0, 0);
            renderPassEncoder.endPass();

            // Submit commands to GPU
            device.defaultQueue.submit([commandEncoder.finish()]);
            t++;
        }

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
})();