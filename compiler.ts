


import { NodeVM, VMScript } from 'vm2';
import { Volume, createFsFromVolume } from 'memfs';
import { ufs } from 'unionfs';
import * as fs from 'fs';
import * as ts from 'typescript';

// Function to compile TypeScript code to JavaScript
function compileTypeScript(code: string): string {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES5,
    },
  });
  return result.outputText;
}

// Lambda handler function
export const entry = async (event: any) => {
  try {
    console.log("event: ", event);
    const code = JSON.parse(event.body).code; // The TypeScript code to execute

    // Create an in-memory file system
    const vol = Volume.fromJSON({});
    const memFs = createFsFromVolume(vol);
    const unionFs = ufs.use(memFs).use(fs);

    // Write the TypeScript code to the in-memory file system
    memFs.mkdirSync('/sandbox');
    const filePath = '/sandbox/index.ts';
    memFs.writeFileSync(filePath, code);

    // Compile the TypeScript code to JavaScript
    const jsCode = compileTypeScript(code);

    // Write the compiled JavaScript code to the in-memory file system
    const jsFilePath = '/sandbox/index.js';
    memFs.writeFileSync(jsFilePath, jsCode);


    // Create a sandboxed environment using vm2
    let consoleOutput: string[] = [];
    const vm = new NodeVM({
      sandbox: {
        console: {
          log: (...args: any[]) => consoleOutput.push(args.join(' ')),
          error: (...args: any[]) => consoleOutput.push(args.join(' ')),
          warn: (...args: any[]) => consoleOutput.push(args.join(' ')),
          info: (...args: any[]) => consoleOutput.push(args.join(' ')),
        }
      },
      require: {
        external: true,
        builtin: ['*'],
        root: ['/sandbox'],
        mock: {
          fs: unionFs,
        },
      },
    });


    // Wrap the compiled JavaScript code in a function that returns its result
    const wrappedJsCode = `
      (function() {
        let result;
        ${jsCode}
        return result;
      })()
    `;

    // Load and execute the compiled JavaScript code
    const script = new VMScript(wrappedJsCode, jsFilePath);

    try {
      const result = await vm.run(script);
      return {
        statusCode: 200,
        body: JSON.stringify({ logs: consoleOutput }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ query: JSON.stringify(event, null, 2), code: jsCode, error: error.message }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ query: JSON.stringify(event, null, 2), error: err.message }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};
