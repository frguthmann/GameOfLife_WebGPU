import glslangModule from 'https://unpkg.com/@webgpu/glslang@0.0.8/dist/web-devel/glslang.js';

function addLineNumbers(string) {
    var lines = string.split('\n');
    for (var i = 0; i < lines.length; i++) {
        lines[i] = (i + 1) + ': ' + lines[i];
    }
    return lines.join('\n');
}

export default async function(){

    const glslang = await glslangModule();

    return {
        compileShader: function compileShader(iShaderCode, iMode){
            let compiledComputeCode;
            try {
                compiledComputeCode = glslang.compileGLSL(iShaderCode, iMode);
            } catch (e) {
                console.log(addLineNumbers(iShaderCode));
            };
            return compiledComputeCode;
        } 
    };
};