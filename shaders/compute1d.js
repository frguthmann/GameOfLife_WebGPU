const computeShader =  `
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

        uvec2 coords;
        coords.y = int(gl_GlobalInvocationID.x) / GRID_SIZE;
        coords.x = int(gl_GlobalInvocationID.x) - coords.y * GRID_SIZE;
        // Bring everything above 0 to be able to use the modulo operator
        coords = (coords + sampleXYOffsets[i] + GRID_SIZE) % GRID_SIZE;

        uint neighborIndex = coords.x + coords.y * GRID_SIZE;
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

export default computeShader;