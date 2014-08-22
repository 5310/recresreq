#!/usr/bin/env node

(function() {

    var fs = require('fs');
    var path = require('path');
    var resolve = require('resolve');

    var File = require('vinyl'); // The module file to be checked.

    var resolution = {}; // The dependency tree being resolved.
    var checked = []; // List of modules already checked.
    var toCheck = []; // List of modules to parse next.

    var defaultOpts = {
        parseRequires: true, // Naively parses source for require statements.
        indexCoreModules: false, //Whether to index core modules or skip them.
        indexPackageJSONDeps: true, // Indexes dependencies in pacakge.json
        indexPackageJSONOptDeps: true, // Indexes optional dependencies in pacakge.json
        indexPac: true, // Indexes dependencies in pacakge.json
        indexRequiresByName: true, // Indexes parsed dependencies required by name.
        indexRequiresByPath: false, // Indexes parsed dependencies required by path.
        recursePackageJSONDeps: true, // Recurse through package.json dependencies.
        recursePackageJSONOptDeps: true, // Recurse through package.json optional dependencies.
        recurseRequiresByName: true, //TODO: Recurse through parsed dependencies required by name.
        recurseRequiresByPath: true, // Recurse through parsed dependencies required by path.
        verbose: false, // Print logging info.
        limit: 1000000, // Maximum number of modules checked recursively. 
                        // Setting this to `1` stops the recursion at checking only the given module's dependencies.
                        // But this isn't really a recursion counter, as all dependencies beyond the first level count towards the limit individually.
        offsetPath: __dirname // All resolved modules are made relative to this path.
    };
    
    // Set opts.
    var opts = {};
    var setOpts = function(passedOpts) {
        for ( var key in defaultOpts ) {
            if ( typeof passedOpts === typeof {} && passedOpts[key] !== undefined ) {
                opts[key] = passedOpts[key];
            } else {
                opts[key] = defaultOpts[key];
            }
        }
    };

    // Actual logic for parsing files.
    var checkByFile = function(file) {

        // Check for the "recursion" limit.
        if (opts.limit >= 0) {
            opts.limit--;
        }
        else {
            throw "Recursion limit reached.";
        }

        var basedir = path.resolve(path.dirname(file.path));

        // Parse package.json.
        if ( opts.indexPackageJSONDeps || opts.indexPackageJSONOptDeps || opts.recursePackageJSONDeps || opts.recursePackageJSONOptDeps ) {
            require('closest-package').sync(basedir, function(json, filename) {
                
                if ( opts.indexPackageJSONDeps || opts.recursePackageJSONDeps ) {
                    for (var moduleName in json.dependencies) {
    
                        // Resolve module path.
                        var modulePathLocal = resolve.sync(moduleName, {
                            basedir: basedir
                        });
                        // Make path absolute.
                        var modulePathAbsolute = path.resolve(modulePathLocal);
    
                        // Add resolution to output.
                        if (opts.indexPackageJSONDeps) {
                            if (typeof resolution[basedir] !== typeof {}) resolution[basedir] = {};
                            resolution[basedir][moduleName] = path.relative(opts.offsetPath, modulePathAbsolute);
                            if (opts.verbose) console.log("Indexed package.json dependency `" + moduleName + "`.");
                        }
    
                        // Add dependency to be checked recursively.
                        if  (opts.recursePackageJSONDeps && toCheck.indexOf(modulePathAbsolute) <= -1 ) {
                            toCheck.push(modulePathAbsolute);
                        }
    
                    }
                }
                
                if ( opts.indexPackageJSONOptDeps || opts.recursePackageJSONOptDeps ) {
                    for (var moduleName in json.optionalDependencies) {
    
                        // Resolve module path.
                        var modulePathLocal = resolve.sync(moduleName, {
                            basedir: basedir
                        });
                        // Make path absolute.
                        var modulePathAbsolute = path.resolve(modulePathLocal);
    
                        // Add resolution to output.
                        if (opts.indexPackageJSONOptDeps) {
                            if (typeof resolution[basedir] !== typeof {}) resolution[basedir] = {};
                            resolution[basedir][moduleName] = path.relative(opts.offsetPath, modulePathAbsolute);
                            if (opts.verbose) console.log("Indexed package.json optional dependency `" + moduleName + "`.");
                        }
    
                        // Add dependency to be checked recursively.
                        if ( opts.recursePackageJSONOptDeps && toCheck.indexOf(modulePathAbsolute) <= -1 ) {
                            toCheck.push(modulePathAbsolute);
                        }
    
                    }
                }
                
                return true; //NOTE: Because this is a filtering function and the lookup would onlt stop at true. And we do want the very closest one.
            });
        }

        // Parse file body for requires.

        if (opts.parseRequires) {

            var input = file.contents.toString('utf-8');

            var regex = /\brequire\(([^\)]*)\)/g;

            var matchObject;
            while (matchObject = regex.exec(input)) {

                var fullMatch = matchObject[0];
                var match = matchObject[1];

                try {

                    // Evaluate and "clean" module name.
                    var moduleName = eval(match);

                    if (resolve.isCore(moduleName)) {
                        if (opts.indexCoreModules) {
                            // Make path absolute.
                            if (typeof resolution[basedir] !== typeof {}) resolution[basedir] = {};
                            resolution[basedir][moduleName] = moduleName;
                            if (opts.verbose) console.log("Indexed core module `" + moduleName + "`.");
                        } else {
                            // Throw a fit if module is core to Node.
                            throw "Core modules do not run in the browser!";
                        }
                    }
                    else {

                        // Else continue.
                        // Check if module was required by path.
                        var requiredByPath = /^(?:\.{0,2})\//.test(moduleName);

                        // Check whether to parse path'd modules.
                        if (!opts.recurseRequiresByPath && requiredByPath) {
                            throw "Will not parse modules required by path.";
                        }

                        // Resolve module.
                        var modulePathLocal = resolve.sync(moduleName, {
                            basedir: basedir
                        });
                        // Make path absolute.
                        var modulePathAbsolute = path.resolve(modulePathLocal);

                        // Add resolution to index of module wasn't required in path form.
                        if ( (opts.indexRequiresByName && !requiredByPath ) || (opts.indexRequiresByPath && requiredByPath) ) {
                            if (path.resolve(file.path) != modulePathAbsolute) {
                                if (typeof resolution[basedir] !== typeof {}) resolution[basedir] = {};
                                resolution[basedir][moduleName] = path.relative(opts.offsetPath, modulePathAbsolute);
                                if (opts.verbose) console.log("Indexed required module `" + moduleName + "`.");
                            }
                        }
                        else {
                            if (opts.verbose) console.log("Did not index required module `" + moduleName + "`.");
                        }

                        // Add dependency to be checked recursively.
                        if (toCheck.indexOf(modulePathAbsolute) <= -1) {
                            if (requiredByPath) {
                                if (opts.recurseRequiresByPath) {
                                    toCheck.push(modulePathAbsolute);
                                }
                            } else {
                                if (opts.recurseRequiresByName) {
                                    toCheck.push(modulePathAbsolute);
                                }
                            }
                            if (opts.verbose) console.log("Will recurse `" + moduleName + "`.");
                        }

                    }

                }
                catch (e) {
                    console.error("Could not resolve `" + match + "`: " + (e.toString()));
                }

            }

        }

        var modulePathAbsolute = toCheck.shift();
        while (modulePathAbsolute) {
            checkByModule(modulePathAbsolute);
            modulePathAbsolute = toCheck.shift();
        }

    };



    // Shortcut for checking by filepath or module name.
    var checkByModule = function(name) {

        // Resolve absolute module path.
        var filePathAbsolute = path.resolve(resolve.sync(name, {
            basedir: __dirname
        }));

        // Check if absolute filepath has not already been checked.
        if (checked.indexOf(filePathAbsolute) <= -1) {
            // Add absolute filepath to checked list.
            checked.push(filePathAbsolute);
            // Parse for dependencies.
            checkByFile(new File({
                cwd: process.cwd(),
                base: path.dirname(filePathAbsolute),
                path: filePathAbsolute,
                contents: fs.readFileSync(filePathAbsolute)
            }), opts);
        }

        // Verbose log for files checked for requires.
        if (opts.verbose) {
            console.log("Parsing dependency `" + name + "`.");
        }

        // Return the resolution map.
        return resolution;

    };
    
    
    
    // Clear resolved dependencies.
    var clearResolution = function () {
        while(resolution.length > 0) {
            resolution.pop();
        }
    };



    // Exports.
    module.exports = checkByModule;
    module.exports.checkByFile = checkByFile;
    module.exports.defaultOpts = defaultOpts;
    module.exports.clearResolution = clearResolution;



    // Run from command-line.
    if (require.main === module) {
        
        var argv = require('yargs')
            .default(defaultOpts)
            .boolean('parseRequires')
            .boolean('indexCoreModules')
            .boolean('indexPackageJSONDeps')
            .boolean('indexPackageJSONOptDeps')
            .boolean('indexRequiresByName')
            .boolean('indexRequiresByPath')
            .boolean('recursePackageJSONDeps')
            .boolean('recursePackageJSONOptDeps')
            .boolean('recurseRequiresByName')
            .boolean('recurseRequiresByPath')
            .boolean('verbose')
            .alias( 'parseRequires', 'r' )
            .alias( 'indexCoreModules', 'c' )
            .alias( 'indexPackageJSONDeps', 'd' )
            .alias( 'indexPackageJSONOptDeps', 'o' )
            .alias( 'indexRequiresByName', 'n' )
            .alias( 'indexRequiresByPath', 'p' )
            .alias( 'recursePackageJSONDeps', 'D' )
            .alias( 'recursePackageJSONOptDeps', 'O' )
            .alias( 'recurseRequiresByName', 'N' )
            .alias( 'recurseRequiresByPath', 'P' )
            .alias( 'verbose', 'v' )
            .argv;
        var args = argv._;
        
        setOpts(argv);
        
        clearResolution();
        
        for (var i = 0; i < args.length; i++) {
            var infile = args[i];
            checkByModule(infile);
        }
        console.log(resolution);
        
    }

}).call(this);