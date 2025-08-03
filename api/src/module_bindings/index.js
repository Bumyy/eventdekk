/**
 * JavaScript adapter for SpacetimeDB TypeScript module bindings
 * This file allows the use of TypeScript module bindings in JavaScript files
 */

// Try to import the TypeScript bindings
let moduleBindings = require("./index.ts");
try {
  // Attempt to import the compiled TypeScript module
  moduleBindings = require("./index.ts");
} catch (e) {
  try {
    // If that fails, try to require the compiled JavaScript output
    moduleBindings = require("./index");
  } catch (err) {
    console.error("Failed to import SpacetimeDB module bindings:", err);
    // Create a fallback implementation that prints meaningful errors
    const createErrorClass = (className) => {
      return class ErrorClass {
        constructor() {
          throw new Error(
            `${className} could not be loaded from module_bindings. Make sure the TypeScript files are compiled properly.`
          );
        }

        static builder() {
          return {
            withModuleName: () => {
              throw new Error(`${className} builder could not be loaded`);
            },
            withUri: () => {
              throw new Error(`${className} builder could not be loaded`);
            },
            withToken: () => {
              throw new Error(`${className} builder could not be loaded`);
            },
            onConnect: () => {
              throw new Error(`${className} builder could not be loaded`);
            },
            onDisconnect: () => {
              throw new Error(`${className} builder could not be loaded`);
            },
            onConnectError: () => {
              throw new Error(`${className} builder could not be loaded`);
            },
            build: () => {
              throw new Error(`${className} builder could not be loaded`);
            },
          };
        }
      };
    };

    moduleBindings = {
      DbConnection: createErrorClass("DbConnection"),
      Identity: createErrorClass("Identity"),
    };
  }
}

console.log("moduleBindings loaded:", moduleBindings);

// Export the required classes for use in JavaScript
module.exports = {
  DbConnection: moduleBindings.DbConnection,
  Identity: moduleBindings.Identity,
};
