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
        coords = (gl_GlobalInvocationID.xy + sampleXYOffsets[i] + GRID_SIZE) % GRID_SIZE;

        uint neighborIndex = coords.x + coords.y * GRID_SIZE;
        aliveNeighbors += int(srcGrid.state[neighborIndex]);
    }


    // float currentCellState = srcGrid.state[gl_GlobalInvocationID.x];

    uint currentCellIndex = gl_GlobalInvocationID.x + gl_GlobalInvocationID.y * GRID_SIZE;
    float currentCellState = srcGrid.state[currentCellIndex];

    // Make sure to copy the current data before updating it
    dstGrid.state[currentCellIndex] = currentCellState;

    // Dead cell comes back to life
    if( currentCellState < 1.0 ){
        if( aliveNeighbors == 3 ){
            dstGrid.state[currentCellIndex] = 1.0;
        }
        return;
    }

    // Alive cell dies
    if( aliveNeighbors < 2.0 || aliveNeighbors > 3.0){
        dstGrid.state[currentCellIndex] = 0.0;
    }

}`;

export default computeShader;