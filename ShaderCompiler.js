import glslangModule from 'https://unpkg.com/@webgpu/glslang@0.0.8/dist/web-devel/glslang.js';
import * as tintModule from './ext/twgsl.js';

function addLineNumbers( iString )
{
    var lines = iString.split( '\n' );
    for ( var i = 0; i < lines.length; i++ )
    {
        lines[ i ] = ( i + 1 ) + ': ' + lines[ i ];
    }
    return lines.join( '\n' );
}

export default async function()
{
    const glslang = await glslangModule();
    const tintWASM = await twgsl("ext/twgsl.wasm");

    return {
        compileShader: function compileShader( iShaderCode, iMode )
        {
            let compiledCode;
            try
            {
                const spirvCode = glslang.compileGLSL( iShaderCode, iMode );
                compiledCode = tintWASM.convertSpirV2WGSL( spirvCode );
            }
            catch ( e )
            {
                console.log( addLineNumbers( iShaderCode ) );
            };
            return compiledCode;
        }
    };
};