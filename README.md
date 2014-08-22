recresreq
=========

Recuresively resolve requires (and package.json dependencies) of a Node.js source file and output a potentially convenient resolution map.

The goal of this module is to create a static map of all the dependencies and (naïvely parsed) require calls of a Node.js project recursively. 

The produced resolution map is in the format of:

    [
        a base-directory: {
            a module name or require call syntax: resolved path to the module from this base-directory,
            ...
        },
        ...  
    ]

Where the base-directories are all the unique locations of any module or source recursively `recresreq`'s.

Why?
----

I intend to use this resolution map is to be able to inject these scripts and modules into the browser as another hackish way of making CommonJS style requires work on browsers without having to compile bundles, register modules manually, or wrap module sources with extra code. But that's another matter entirely, and will be handled by another module. 

But a resolution map of all the dependencies and naïvely parsed requires might be useful for other cases too, maybe? I mean, why not?

Caveats
-------

This Node.js module is very much a naïve hack and quite unstable. Consider it pre- version 0.0.0

While one of the "core features" of the module is to parse sources for arbitrary require calls, it is done _very_ naïvely. It's just a regex match for `require(...)` calls, which is then eval'd. This means:

-   Aliases for `require` are simply not noticed.
-   And runtime-generated require calls will mostly likely not if it has any arbitrary variables, or worse, work wrongly.

Even _srsbzns_ tools like [detective] doesn't handle generative requires, and for good reason. I didn't use detective because I felt it might be overkill. Might consider having it as an optional parser.

It does however still resolve recorded package.json dependencies, so hopefully as properly specified project will still find it's dependencies covered.

And it's worth sheepishly pointing out again that this module simply creates resolution map. Actually injecting the dependencies is the responsibility of another module that I haven't yet...um...built.

Credits
-------

Portions of this code is quite brazenly "based" off [preresolve], which batch-resolves requires in a source-file in-place to make the calls faster.



[detective]: https://github.com/substack/node-detective
[preresolve]: https://github.com/650Industries/preresolve
[brwserreq]: https://github.com/5310/brwserreq