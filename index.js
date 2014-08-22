#!/usr/bin/env node

(function() {

    var fs = require('fs');
    var path = require('path');
    var resolve = require('resolve');

    var File = require('vinyl'); // The module file to be checked.

    var deps = {}; // The dependency tree being resolved.
    var checked = []; // List of modules already checked.
    var toCheck = []; // List of modules to parse next.

    var opts = {
        parseRequires: true, // Naively parses source for require statements.
        indexPackageJSONDeps: true, // Indexes dependencies in pacakge.json
        indexRequiresByName: true, // Indexes parsed dependencies required by name.
        indexRequiresByPath: false, // Indexes parsed dependencies required by path.
        recursePackageJSONDeps: true, // Recurse through package.json dependencies.
        recurseRequiresByPath: true, // Recurse through parsed dependencies required by path.
        verbose: false, // Print logging info.
        limit: 1000000, // Maximum number of modules checked recursively. 
                        // Setting this to `1` stops the recursion at checking only the given module's dependencies.
                        // But this isn't really a recursion counter, as all dependencies beyond the first level count towards the limit individually.
        offsetPath: __dirname // All resolved modules are made relative to this path.
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

        // Parse package.json and add all dependencies to toCheck.
        if (opts.recursePackageJSONDeps) {
            require('closest-package').sync(basedir, function(json, filename) {
                for (var moduleName in json.dependencies) {

                    // Resolve module path.
                    var modulePathLocal = resolve.sync(moduleName, {
                        basedir: basedir
                    });
                    // Make path absolute.
                    var modulePathAbsolute = path.resolve(modulePathLocal);

                    // Add resolution to output.
                    if (opts.indexPackageJSONDeps) {
                        if (typeof deps[basedir] !== typeof {}) deps[basedir] = {};
                        deps[basedir][moduleName] = path.relative(opts.offsetPath, modulePathAbsolute);
                    }

                    // Add dependency to be checked recursively.
                    toCheck.push(modulePathAbsolute);

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
                        // Throw a fit if module is core to Node.
                        throw "Core modules do not run in the browser!";
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
                        if (opts.indexRequiresByName && (opts.indexRequiresByPath || !requiredByPath)) {
                            if (path.resolve(file.path) != modulePathAbsolute) {
                                if (typeof deps[basedir] !== typeof {}) deps[basedir] = {};
                                deps[basedir][moduleName] = path.relative(opts.offsetPath, modulePathAbsolute);
                                if (opts.verbose) console.log("Indexed dependency `" + moduleName + "`.");
                            }
                        }
                        else {
                            if (opts.verbose) console.log("Did not index dependency `" + moduleName + "`.");
                        }

                        // Add dependency to be checked recursively.
                        if (toCheck.indexOf(modulePathAbsolute) <= -1) {
                            toCheck.push(modulePathAbsolute);
                            if (opts.verbose) console.log("Will not parse path dependency " + moduleName + "`.");
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
            }));
        }

        // Verbose log for files checked for requires.
        if (opts.verbose) {
            console.log("Parsing dependency `" + name + "`.");
        }

        // Return the resolution map.
        return deps;

    };



    // Exports.
    checkByModule.opts = opts;
    checkByModule.checkByFile = checkByFile;
    module.exports = checkByModule;



    // Run from command-line.
    if (require.main === module) {
        var args = require('yargs').argv._;
        for (var i = 0; i < args.length; i++) {
            var infile = args[i];
            console.log(checkByModule(infile));
        }
    }

}).call(this);