const vertexShaderGLSL = `

	#version 450
        
    layout(location = 0) out vec2 vUv;

    void main()
    {
        float x = -1.0 + float( ( gl_VertexIndex & 1 ) << 2);
        float y = -1.0 + float( ( gl_VertexIndex & 2 ) << 1);
        vUv.x = ( x + 1.0 ) * 0.5;
        vUv.y = ( y + 1.0 ) * 0.5;
        gl_Position = vec4(x, y, 0, 1);
    }
`;
export default vertexShaderGLSL;