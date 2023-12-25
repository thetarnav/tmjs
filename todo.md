TODO:

-   [x] labels
    -   [x] continue, break, or_continue, or_break label
-   [ ] unions
-   [ ] enums
-   [ ] proc groups
-   [ ] enum members `.None`
-   [ ] type initialization

```json
"type-initialization": {
    "name": "meta.type.initialization.odin",
    "begin": "\\b([A-Za-z_]\\w*)\\s*({)",
    "beginCaptures": {
        "1": { "name": "entity.name.type.odin" },
        "2": { "name": "punctuation.odin" }
    },
    "end": "}",
    "endCaptures": { "0": { "name": "punctuation.odin" } },
    "patterns": [
        { "include": "#assignments" },
        { "include": "#expressions" }
    ]
},
```

-   [x] `map[Type]`
-   [x] `bit_set[Type]`
-   [x] `cast(Type)` `transmute(Type)`
-   [ ] `[Foo]Bar` `[dynamic]Type`
-   [ ] `^Type` `^package.Type`
-   [ ] `type :: struct {}` vs `var :: struct {}{}`
-   [x] return value types `-> (int, Error)`
-   [x] multi var parameters `a, b, c: int`
-   [x] `package name`
-   [ ] `import "../path/to/package"`
