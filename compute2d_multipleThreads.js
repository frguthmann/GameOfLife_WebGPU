const computeShader =  `

layout(local_size_x = LOCAL_SIZE, local_size_y = LOCAL_SIZE) in;

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

    if(gl_GlobalInvocationID.x >= GRID_SIZE || gl_GlobalInvocationID.y >= GRID_SIZE){
        return;
    }

    int aliveNeighbors = 0;
    for( int i = 0; i < 8; i++ ){

        uvec2 coords;
        coords.y = int(gl_GlobalInvocationID.y);
        coords.x = int(gl_GlobalInvocationID.x);

        // Bring everything above 0 to be able to use the modulo operator
        coords = (coords + sampleXYOffsets[i] + GRID_SIZE) % GRID_SIZE;

        uint neighborIndex = coords.x + coords.y * GRID_SIZE;
        aliveNeighbors += int(srcGrid.state[neighborIndex]);
    }

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