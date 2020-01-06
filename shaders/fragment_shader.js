const fragmentShader = `

    layout(location = 0) in vec2 vUv;
    
    layout(location = 0) out vec4 outColor;

    layout(std430, set = 0, binding = 0) buffer Grid {
        float state[CELLS_COUNT];
    } grid;

    const vec4 gridColor = vec4( 0.13, 0.588, 0.95, 1.0);

    void main() {

        ivec2 screenCoord = ivec2( gl_FragCoord.xy / PIXELS_PER_CELL);

        if( screenCoord.x < GRID_SIZE && screenCoord.y < GRID_SIZE ) 
        {
            #if defined(HAS_GRID)
                if( gl_FragCoord.x - PIXELS_PER_CELL * screenCoord.x < 0.6 )
                {
                    outColor = gridColor;
                    return;
                }

                if( gl_FragCoord.y - PIXELS_PER_CELL * screenCoord.y < 0.6 ) 
                {
                    outColor = gridColor;
                    return;
                }
            #endif

            int cellIndex = screenCoord.x + screenCoord.y * GRID_SIZE;
            float cellState = grid.state[cellIndex];
            outColor = vec4(vec3(cellState), 1.0);
        }
        #if defined(HAS_GRID)
        else if( gl_FragCoord.x <= GRID_SIZE * PIXELS_PER_CELL + 1.0 && gl_FragCoord.y <= GRID_SIZE * PIXELS_PER_CELL + 1.0 )
        {
            outColor = gridColor;
        }
        #endif
    }
`;
export default fragmentShader;