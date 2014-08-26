recresreq
=========

**This module is deemed redundant and won't be continued.**

Recuresively resolve requires (and package.json dependencies) of a Node.js source file and output a potentially convenient resolution map.

The goal of this module is to create a static map of all the dependencies and (naïvely parsed) require calls of a Node.js project recursively. 

The produced resolution map is in the format of:

    [
        a base-directory: {
            a module name or require call syntax: 
                resolved path to the module from this base-directory,
            ...
        },
        ...  
    ]

Where the base-directories are all the unique locations of any module or source recursively `recresreq`'s.



Why? (And why not?)
-------------------

I had intended to use this resolution map to inject these dependencies into the browser as another hackish way of making CommonJS style requires work on browsers without having to compile bundles, register modules manually, or wrap module sources with extra code. But that's another matter entirely, and will be handled by another module. 

But I decided it's not worth it as a publicly released module for several reasons:

-    It's futile trying to parse require calls from source, procedural require calls will always be left unparsed. 
-    Modules required by relative or absolute paths can be resolved trivially anyway.
-    As for declared dependencies, [resolve-recurse] already very neatly resolves all package.json dependencies anyway. The little benefit this module offers by structuring the resolutions by folder name and then module name to url can be done far more cleanly and sensibly without the rest of the redundant functionality.

I still intend to write a module inject dependencies in the browser for a Node project under-development, like I do manually now. But I'll do so without reinventing the wheel (poorly at that).



Caveats
-------

This is my first Node.js module and it's very much a naïve hack. It's still "beta", and subject to breaking. I do plan on using it in my development workflow, and will keep it updated.

While one of the "core features" of the module is to parse sources for arbitrary require calls, it is done _very_ naïvely. It's just a regex match for `require(...)` calls, which is then eval'd. This means:

-   Aliases for `require` are simply not noticed.
-   And runtime-generated require calls will mostly likely not if it has any arbitrary variables, or worse, work wrongly.

Even _srsbzns_ tools like [detective] doesn't handle generative requires, and for good reason. I didn't use detective because I felt it might be overkill. Might consider having it as an optional parser.

It does however still resolve recorded package.json dependencies, so hopefully a properly specified project will still find it's dependencies covered.

And it's worth sheepishly pointing out again that this module simply creates a resolution map. Actually injecting the dependencies is the responsibility of another module that I haven't yet...um...built.



Usage
-----

### Installation

**You shouldn't really need to use this module.**

[detecive] [resolve] [resolve-recurse] and a bit of busywork will serve all the functionality this module provided other than the particular structuring of the resolution map, and do it far better.

But if you want to anyway:

    npm install git://github.com/5310/recresreq.git

### Command line

    Usage: recresreq [entry files] {OPTIONS}
    
    Standard Options:
    
                --parseRequires -p  Whether to parse source for require calls. 
                                    Default: true
    
             --indexCoreModules -c  Whether to index code modules requires.
                                    Default: false
    
         --indexPackageJSONDeps -d  Whether to index package.json dependencies.
                                    Default: true
    
      --indexPackageJSONOptDeps -o  Whether to index optional package.json dependencies.
                                    Default: true
    
          --indexRequiresByName -n  Whether to index require calls by name.
                                    Default: true
    
          --indexRequiresByPath -p  Whether to index require calls by path.
                                    Default: false
    
       --recursePackageJSONDeps -D  Whether to recursively resolve 
                                    package.json dependencies.
                                    Default: true
    
    --recursePackageJSONOptDeps -O  Whether to recursively resolve 
                                    package.json optional dependencies.
                                    Default: true
    
        --recurseRequiresByName -N  Whether to recursively resolve 
                                    require calls by name. 
                                    Default: true
    
        --recurseRequiresByPath -P  Whether to recursively resolve 
                                    require calls by path. 
                                    Default: true
    
                      --verbose -v  Display logging information.
    
                        --limit -l  Maximum number of modules to search recursively. 
                                    Throws exception when limit is exeeded. 
                                    Default: 1000000
    
                   --offsetPath -f  File path to make all resolved paths relative to. 
                                    Default: process.cwd()
    
                  --externalize -x  A module that will not be recursed. 
                                    Allows resolutions trees to be 
                                    split into parts.
                                    Can be used multiple times.

### Programmatically

#### Script

    var recresreq = require('recresreq');
    
    recresreq.clearResolution();
    recresreq.setOpts({
        externalize: ['vinyl']
    });
    console.log(recresreq('recresreq'));
    
#### Output

    {
        '/home/ubuntu/workspace': {
            'closest-package': 'node_modules/closest-package/index.js',
            resolve: 'node_modules/resolve/index.js',
            vinyl: 'node_modules/vinyl/index.js',
            yargs: 'node_modules/yargs/index.js'
        }
    }

#### Methods

##### `recresreq(`_`module`_`)`

-   _`module`_
    -   The Node.js module or source file to recursively resolve for requires (and package.json dependencies).
    -   Must be a string with the module name or a path.
-   Returns:
    -   The object map with all resolutions.
-   All resolutions are cached to within the module.
-   Subsequent calls will include previousl resolved maps unless cleared with `.clearResolution()`.

##### `recresreq.checkByFile(`_`file`_`)`

-   _`file`_
    -   [vinyl]-like file-object recursively resolve for requires (and package.json dependencies). 
-   Returns:
    -   The object map with all resolutions.
-   Same as `recresreq()`, but checks a [vinyl]-like file-object instead.

##### `recresreq.setOpts(`_`[opts]`_`)`

-   _`[opts]`_
    -   An object containing specific keys and values that will override the defaults.
    -   If objectargument is missing, the options are reset to default.
    -   Options are the same as the full command line keys.
-   Sets the options for the module persistently. 
-   Susequent calls to the cached module will use the same options.


##### `recresreq.clearResolution()`

-   Clears the resolution map. 



Roadmap?
--------

-   Bug in programmatically resolving multiple modules breaking results of all resolutions after the first.
-   Implement resolving folders recursively.
-   Option to dedupe all modules that are a root dependency.
    -   That way, running this on an `npm dedupe`'d project will produce a substantially cleaner resolution map.
-   Read options from `package.json` config.



Credits
-------

Portions of this code is quite brazenly "based" off [preresolve], which batch-resolves requires in a source-file in-place to make the calls faster.



[detective]: https://www.npmjs.org/package/detective
[preresolve]: https://www.npmjs.org/package/preresolve
[resolve-recurse]: https://www.npmjs.org/package/resolve-recurse
[brwserreq]: https://github.com/5310/brwserreq
[vinyl]: https://www.npmjs.org/package/vinyl