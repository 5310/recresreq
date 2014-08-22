recresreq
=========

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

Usage
-----

### Command line

    Usage: recresreq [entry files] {OPTIONS}
    
    Standard Options:
    
                --parseRequires -p  Whether to parse source for require calls. 
                                    Default: true
    
             --indexCoreModules -c  Whether to index code modules requires to resolution map. 
                                    Default: false
    
         --indexPackageJSONDeps -d  Whether to index dependencies from package.json to resolution map. 
                                    Default: true
    
      --indexPackageJSONOptDeps -o  Whether to index optional dependencies from package.json to resolution map. 
                                    Default: true
    
          --indexRequiresByName -n  Whether to index require calls by name to resolution map. 
                                    Default: true
    
          --indexRequiresByPath -p  Whether to index require calls by path to resolution map. 
                                    Default: false
    
       --recursePackageJSONDeps -D  Whether to recursively resolve dependencies from package.json. 
                                    Default: true
    
    --recursePackageJSONOptDeps -O  Whether to recursively resolve optional dependencies from package.json. 
                                    Default: true
    
        --recurseRequiresByName -N  Whether to recursively resolve require calls by name. 
                                    Default: true
    
        --recurseRequiresByPath -P  Whether to recursively resolve require calls by path. 
                                    Default: true
    
                      --verbose -v  Display logging information.
    
                        --limit -l  Maximum number of modules to search recursively. 
                                    Throws exception when limit is exeeded. 
                                    Default: 1000000
    
                   --offsetPath -f  File path to make all resolved paths relative to. 
                                    Default: __dirpath
    
                  --externalize -x  A module that will not be recursed. 
                                    Allows resolutions trees to be split into parts.
                                    Can be used multiple times.

### Programmatically

#### Script

    var recresreq = require('recresreq');
    
    var resolutionMap = recresreq('recresreq');
    
    console.log(resolutionMap);
    
#### Output

    { 
        '/home/ubuntu/workspace': 
            { 
                resolve: 'node_modules/resolve/index.js',
                vinyl: 'node_modules/vinyl/index.js',
                'closest-package': 'node_modules/closest-package/index.js',
                yargs: 'node_modules/yargs/index.js' 
            },
        '/home/ubuntu/workspace/node_modules/vinyl': 
            { 
                'clone-stats': 'node_modules/vinyl/node_modules/clone-stats/index.js',
                lodash: 'node_modules/vinyl/node_modules/lodash/dist/lodash.js' 
            },
        '/home/ubuntu/workspace/node_modules/vinyl/lib': 
            { 
                'clone-stats': 'node_modules/vinyl/node_modules/clone-stats/index.js',
                lodash: 'node_modules/vinyl/node_modules/lodash/dist/lodash.js' 
            }
     }

Why?
----

I intend to use this resolution map is to be able to inject these scripts and modules into the browser as another hackish way of making CommonJS style requires work on browsers without having to compile bundles, register modules manually, or wrap module sources with extra code. But that's another matter entirely, and will be handled by another module. 

But a resolution map of all the dependencies and naïvely parsed requires might be useful for other cases too, maybe? I mean, why not?

Caveats
-------

This is my first Node.js module is very much a naïve hack. It's still "beta", and subject to breaking. I do plan on using it in my development workflow, and will keep it updated.

While one of the "core features" of the module is to parse sources for arbitrary require calls, it is done _very_ naïvely. It's just a regex match for `require(...)` calls, which is then eval'd. This means:

-   Aliases for `require` are simply not noticed.
-   And runtime-generated require calls will mostly likely not if it has any arbitrary variables, or worse, work wrongly.

Even _srsbzns_ tools like [detective] doesn't handle generative requires, and for good reason. I didn't use detective because I felt it might be overkill. Might consider having it as an optional parser.

It does however still resolve recorded package.json dependencies, so hopefully as properly specified project will still find it's dependencies covered.

And it's worth sheepishly pointing out again that this module simply creates resolution map. Actually injecting the dependencies is the responsibility of another module that I haven't yet...um...built.

Roadmap
-------

-   Implement resolving folders recursively.
-   Option to dedupe all modules that are a root dependency.
    -   That way, running this on an `npm dedupe`'d project will produce substantially cleaner resolution map.
-   Read options from `package.json` config.
-   
Credits
-------

Portions of this code is quite brazenly "based" off [preresolve], which batch-resolves requires in a source-file in-place to make the calls faster.



[detective]: https://github.com/substack/node-detective
[preresolve]: https://github.com/650Industries/preresolve
[brwserreq]: https://github.com/5310/brwserreq