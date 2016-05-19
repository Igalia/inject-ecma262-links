(function() {

var semanticFunctions = {};

if (document.readyState === "complete") {
  init();
} else {
  window.addEventListener("load", init);
}
function init() {
  // are we on the right page?
  try {
    if (document.getElementsByClassName("title")[0].textContent !== "ECMAScript® 2017 Language Specification") return;
  } catch (e) { return; }

  // wait for other load handlers to run first
  setTimeout(injectEcma262LinksMain, 0);
}

var counter = 0;
function nextCounter() {
  return counter++;
}

function injectEcma262LinksMain() {
  var startTime = new Date().getTime();
  // define functions
  var h1List = document.getElementsByTagName("h1");
  for (var i = 0; i < h1List.length; i++) {
    var h1Node = h1List[i];
    var headingName = getHeadingName(h1Node);
    if (headingName == null) continue;
    putSemanticFunction(headingName, h1Node);
  }

  var keywordPattern = new RegExp("\\b(?:" + Object.keys(semanticFunctions).join("|") + ")\\b", "g");

  // link usage to function definitions
  forEachTextNode(document.body, ["a", "h1"], function(textNode) {
    var matches = [];
    // use replace() to search.
    // this is nominally wasteful as it splits and concatenates strings that get discarded.
    textNode.data.replace(keywordPattern, function(functionName, offset) {
      matches.push([functionName, offset]);
    });
    // go backwards since we truncate with multiple offsets relative to the start of the original text node.
    for (var i = matches.length - 1; i >= 0; i--) {
      var functionName = matches[i][0];
      var offset       = matches[i][1];
      var secondTextNode = textNode.splitText(offset);
      secondTextNode.data = secondTextNode.data.substr(functionName.length);
      var linkNode = document.createElement("a");
      linkNode.textContent = functionName;
      linkNode.setAttribute("href", "#");
      linkNode.addEventListener("click", clickHandler);
      linkNode.addEventListener("mouseenter", enterHandler);
      linkNode.addEventListener("mouseout", outHandler);
      textNode.parentNode.insertBefore(linkNode, secondTextNode);
    }
  });

  var totalTime = new Date().getTime() - startTime;
  //console.log("inject-ecma262-links setup took ms:", totalTime);
}

function putSemanticFunction(headingName, h1Node) {
  var match = /(Static|Runtime) Semantics: (.*)/.exec(headingName);
  if (match == null) return;
  var functionType = match[1];
  var functionNames = match[2];
  if (functionNames === "Early Errors") return;
  // split "Static Semantics: TV and TRV"
  functionNames.split(" and ").forEach(function(functionName) {
    functionName = functionName.replace(/[^\w].*/, "");
    var functionList = semanticFunctions[functionName];
    if (functionList == null) {
      functionList = [];
      semanticFunctions[functionName] = functionList;
    }

    // find the productions specified in this clause
    var clauseElement = h1Node.parentNode;
    assert(isElement(clauseElement, {tagName: /emu-clause|emu-annex/}));

    forEachChildElement(clauseElement, /emu-grammar/, function(grammarNode) {
      var id = grammarNode.getAttribute("id");
      if (id == null) {
        id = "ecmalinks-" + nextCounter();
        grammarNode.setAttribute("id", id);
      }
      forEachChildElement(grammarNode, /emu-production/, function(productionNode) {
        var ntNode = null;
        forEachChildElement(productionNode, /emu-nt/, function(node) {
          assert(ntNode == null);
          ntNode = node;
        });
        var ntName = ntNode.textContent;
        functionList.push({
          type: functionType,
          name: functionName,
          ntName: ntName,
          node: productionNode,
          id: id,
        });
      });
    });
  });
}
function getHeadingName(h1Node) {
  var childNodes = h1Node.childNodes;
  if (childNodes.length !== 3) return null;
  if (!isElement(childNodes[0], {tagName: /span/, className: "secnum"})) return null;
  if (!isElement(childNodes[2], {tagName: /span/, className: "utils"})) return null;
  return getTextNodeText(childNodes[1]);
}
function isElement(node, options) {
  if (options == null) options = {};
  if (node.nodeType !== document.ELEMENT_NODE) return false;
  if (options.tagName != null && !options.tagName.test(node.tagName.toLowerCase())) return false;
  if (options.className != null && node.className !== options.className) return false;
  return true;
}
function getTextNodeText(node) {
  if (node.nodeType !== document.TEXT_NODE) return null;
  return node.textContent;
}

function forEachChildElement(parentNode, tagName, callback) {
  var childNodes = parentNode.childNodes;
  for (var i = 0; i < childNodes.length; i++) {
    var childNode = childNodes[i];
    if (isElement(childNode, {tagName: tagName})) callback(childNode);
  }
}
function forEachTextNode(rootNode, tagNameBlacklist, callback) {
  // walk the tree recursively.
  // do it without actual recursion for the sake of the exercise.
  var cursor = rootNode.firstChild;
  while (true) {
    if (cursor.nodeType === document.TEXT_NODE) {
      callback(cursor);
    } else if (cursor.nodeType === document.ELEMENT_NODE) {
      if (tagNameBlacklist.indexOf(cursor.tagName.toLowerCase()) === -1) {
        if (cursor.firstChild != null) {
          cursor = cursor.firstChild;
          continue;
        }
      }
    }

    while (true) {
      if (cursor.nextSibling != null) {
        cursor = cursor.nextSibling;
        break;
      }
      cursor = cursor.parentNode;
      if (cursor === rootNode) return;
    }
  }
}

function assert(b) {
  if (!b) {
    throw new Error();
  }
}

// UI

function clickHandler(event) {
  event.preventDefault();
}
function enterHandler(event) {
  var linkNode = this;
  setActiveLinkNode(linkNode);
}
var mouseOutTimeout = null;
function outHandler(event) {
  startMouseOutTimeout();
}
function startMouseOutTimeout() {
  clearMouseOutTimeout();
  mouseOutTimeout = setTimeout(hideFloatingDiv, 0);
}
function hideFloatingDiv() {
  theFloatingDiv.style.display = "none";
  clearMouseOutTimeout();
  activeLinkNode = null;
}
function clearMouseOutTimeout() {
  if (mouseOutTimeout == null) return;
  clearTimeout(mouseOutTimeout);
  mouseOutTimeout = null;
}
var activeLinkNode;
function setActiveLinkNode(linkNode) {
  clearMouseOutTimeout();
  if (linkNode === activeLinkNode) return;
  activeLinkNode = linkNode;

  var functionName = linkNode.textContent;
  var functionList = semanticFunctions[functionName];

  var overloadGroups = [];
  var currentNtName = null;
  functionList.forEach(function(functionObject) {
    var id = functionObject.id;
    var ntName = functionObject.ntName;
    if (currentNtName != ntName) {
      currentNtName = ntName;
      overloadGroups.push([ntName, id]);
    } else {
      overloadGroups[overloadGroups.length - 1].push(id);
    }
  });

  var listThing = initFloatingDiv();
  var html = overloadGroups.map(function(group) {
    var ntName = group[0];
    var id = group[1];
    var itemHtml = '<a href="#' + id + '">' + ntName + '</a>';
    if (group.length > 2) {
      itemHtml += ' (' + group.slice(2).map(function(id, i) {
        return '<a href="#' + id + '">' + (i + 2) + '</a>';
      }).join(", ") + ')';
    }
    return '<li>' + itemHtml + '</li>';
  }).join("");
  listThing.innerHTML = html;

  var linkNodeRect = linkNode.getBoundingClientRect();
  var bodyRect = document.body.getBoundingClientRect();
  var x = linkNodeRect.right; // TODO: this doesn't work when the window is scrolled horizontally
  var y = linkNodeRect.top - bodyRect.top;
  theFloatingDiv.style.left = x + "px";
  theFloatingDiv.style.top  = y + "px";
  theFloatingDiv.style.display = "block";
}
var theFloatingDiv = null;
function initFloatingDiv() {
  if (theFloatingDiv == null) {
    theFloatingDiv = document.createElement("div");
    theFloatingDiv.style.display = "none";
    theFloatingDiv.style.position = "absolute";
    theFloatingDiv.style.background = "#eee";
    theFloatingDiv.innerHTML = '<ul id="ecmalinks-floating-list" style="margin:1em 1em 1em 0px"></ul>'
    theFloatingDiv.addEventListener("mouseenter", function() {
      setActiveLinkNode(activeLinkNode);
    });
    theFloatingDiv.addEventListener("mouseleave", function() {
      startMouseOutTimeout();
    });
    document.body.appendChild(theFloatingDiv);
  }
  return document.getElementById("ecmalinks-floating-list");
}

})();
