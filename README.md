# inject-ecma262-links

Chrome extension to inject some extra links while browsing https://tc39.github.io/ecma262/

## Status

* Extension actives on pages that contain a `.title` that looks right.
* Hovering over a reference to a Runtime Semantics or Static Semantics function will popup a list of links to all possible defintions of that function.
  * I believe all Runtime Semantics and Static Semantics defintions are parsed correctly (even "TV and TRV").
  * Not smart enough to filter defintions if a reference has a nearby clue like "LexicallyDeclaredNames of StatementList".
