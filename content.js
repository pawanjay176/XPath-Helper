/**
 * Copyright 2011 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @author opensource@google.com
 * @license Apache License, Version 2.0.
 */


'use strict';

// Extension namespace.
var xh = xh || {};


////////////////////////////////////////////////////////////////////////////////
// Generic helper functions and constants

xh.SHIFT_KEYCODE = 16;
xh.X_KEYCODE = 88;


xh.elementsShareFamily = function(primaryEl, siblingEl) {
  if (primaryEl.tagName === siblingEl.tagName &&
      (!primaryEl.className || primaryEl.className === siblingEl.className) &&
      (!primaryEl.id || primaryEl.id === siblingEl.id)) {
    return true;
  }
  return false;
};

xh.getElementIndex = function(el) {
  var className = el.className;
  var id = el.id;

  var index = 1;  // XPath is one-indexed
  var sib;
  for (sib = el.previousSibling; sib; sib = sib.previousSibling) {
    if (sib.nodeType === Node.ELEMENT_NODE && xh.elementsShareFamily(el, sib)) {
      index++;
    }
  }
  if (index > 1) {
    return index;
  }
  for (sib = el.nextSibling; sib; sib = sib.nextSibling) {
    if (sib.nodeType === Node.ELEMENT_NODE && xh.elementsShareFamily(el, sib)) {
      return 1;
    }
  }
  return 0;
};



/* Utility function to tokenize all id names 
   Tokenizes the id string bassed on hyphens, underscores and camelCase. 
   Removes all numbers from alphanumeric strings. 
   If the resulting tokens are all dictionary words, function concludes that 
   the id isn't unique and returns false
   Alternative way to generate XPaths relative to block if block XPath not given!
*/
var dictionary = new Typo("en_US");
xh.tokenize = function(str) {
  
  var res = str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([a-z])/g, ' $1$2')
    .replace(/\ +/g, ' ');
function filter(string){
  var result = string.replace(/\d/gi,'')
  return result || string;
}
  res = filter(res);
  res = res.split(/-|\s|_/);
  res = res.filter(Boolean);
  
  for(var i=0;i<res.length;i++){
    if(dictionary.check(res[i])===true){
      return true;
    }
  }
  return false;
}



xh.makeQueryForElement = function(el) {
  var query = '';
  var blockQuery = '';
  var bq = '';
  var flag = 1;

  /* Do not want class attribute for final element.  */
  var classFlag = 1;
  for (; el && el.nodeType === Node.ELEMENT_NODE; el = el.parentNode) {
    var component = el.tagName.toLowerCase();
    var component_ = el.tagName.toLowerCase();
    var index = xh.getElementIndex(el);
    if (el.id) {
      if(xh.tokenize(el.id)){
        component_ += '[@id=\'' + el.id + '\']';  
      }
     component += '[@id=\'' + el.id + '\']';
    } else if ((classFlag>1) && (el.className)) {
    //} else if (el.className) {
      component += '[@class=\'' + el.className + '\']';
      if(classFlag>1)
        component_ += '[@class=\'' + el.className + '\']';
    }
    if (index >= 1) {
      component += '[' + index + ']';
      //if((classFlag<=2) || ((el.tagName.toLowerCase()=='li') || (el.tagName.toLowerCase()=='ul')))
        component_ += '[' + index + ']';
    }
    classFlag++;
    query = '/' + component + query;
     if( (flag==1) && (component!=component_) ){
      bq = '/'+blockQuery;
      flag = 2;
    }
    blockQuery = '/' + component_ + blockQuery;
  }
  return query;
};

xh.absoluteToRelative = function(query, result) {

/* Utility function to convert absolute XPath to relative XPath  
   The result of both the relative and absollute XPath must be same
*/
  var res = [];
  var count = '';
  /* Flag value to determine after how many elements should we 
     start checking if the results of the absolute and generated 
     XPath are similar. 
  */ 
  var flag = 4;
  var temp = query;
  var reduced = '';
  while(1) {
    var last = temp.lastIndexOf("/");
    reduced = query.substring(last, query.length);
    temp = query.substring(0,last);
    reduced = '/'+reduced;
    if(count>flag)
      res = xh.evaluateQuery(reduced, 2);
    if((res[0]==result[0]) && (count>flag))
      return reduced;
    count++;
  }
};


xh.relativeToAbsolute = function(query) {

/* Converts a relative XPath to absolute by evaluating 
   the given XPath and querying for the obtained result. 
*/
  xh.evaluateQuery(query, 1);
  var node = document.getElementsByClassName('mark-node')[0];
  xh.clearMarkings();
  var blockAbsolute = xh.makeQueryForElement(node);
  return blockAbsolute;
}

/* Utility functions for marking the nodes without highlighting them */
xh.markNodes = function(nodes){
  for (var i = 0, l = nodes.length; i < l; i++) {
    nodes[i].className += ' mark-node';
  }
}

xh.clearMarkings = function() {
  var els = document.getElementsByClassName('mark-node');
  // Note: getElementsByClassName() returns a live NodeList.
  while (els.length) {
    els[0].className = els[0].className.replace(' mark-node', '');
  }
};

/* Highlighting functions */
xh.highlightNodes = function(nodes) {
  for (var i = 0, l = nodes.length; i < l; i++) {
    nodes[i].className += ' xh-highlight';
  }
};

xh.clearHighlights = function() {
  var els = document.getElementsByClassName('xh-highlight');
  // Note: getElementsByClassName() returns a live NodeList.
  while (els.length) {
    els[0].className = els[0].className.replace(' xh-highlight', '');
  }
};

// Returns [values, nodeCount]. Highlights result nodes, if applicable. Assumes
// no nodes are currently highlighted.
xh.evaluateQuery = function(query,mode) {
console.time("concatenation");
  mode = typeof mode !== 'undefined' ? mode:0;
  var xpathResult = null;
  var str = '';
  var nodeCount = 0;
  var nodesToHighlight = [];
  try {
    xpathResult = document.evaluate(query, document, null,
                                    XPathResult.ANY_TYPE, null);
  } catch (e) {
    str = '[INVALID XPATH EXPRESSION]';
    nodeCount = 0;
  }

  if (!xpathResult) {
    return [str, nodeCount];
  }

  if (xpathResult.resultType === XPathResult.BOOLEAN_TYPE) {
    str = xpathResult.booleanValue ? '1' : '0';
    nodeCount = 1;
  } else if (xpathResult.resultType === XPathResult.NUMBER_TYPE) {
    str = xpathResult.numberValue.toString();
    nodeCount = 1;
  } else if (xpathResult.resultType === XPathResult.STRING_TYPE) {
    str = xpathResult.stringValue;
    nodeCount = 1;
  } else if (xpathResult.resultType ===
             XPathResult.UNORDERED_NODE_ITERATOR_TYPE) {
    for (var it = xpathResult.iterateNext(); it;
         it = xpathResult.iterateNext()) {
      nodesToHighlight.push(it);
      if (str) {
        str += '\n';  
      }
      str += it.textContent;
      nodeCount++;
    }
    
    if (nodeCount === 0) {
      str = '[NULL]';
    }
  } else {
    // Since we pass XPathResult.ANY_TYPE to document.evaluate(), we should
    // never get back a result type not handled above.
    str = '[INTERNAL ERROR]';
    nodeCount = 0;
  }
  if(mode==0)
    xh.highlightNodes(nodesToHighlight);
  // When highlighting is not required, use mode = 1
  else if(mode==1)
    xh.markNodes(nodesToHighlight);
  return [str, nodeCount];
};



xh.bind = function(object, method) {
  return function() {
    return method.apply(object, arguments);
  };
};


////////////////////////////////////////////////////////////////////////////////
// xh.Bar class definition

xh.Bar = function() {
  this.boundShowBar_ = xh.bind(this, this.showBar_);
  this.boundHandleRequest_ = xh.bind(this, this.handleRequest_);
  this.boundMouseMove_ = xh.bind(this, this.mouseMove_);
  this.boundKeyDown_ = xh.bind(this, this.keyDown_);

  chrome.extension.onMessage.addListener(this.boundHandleRequest_);

  this.barFrame_ = document.createElement('iframe');
  this.barFrame_.src = chrome.extension.getURL('bar.html');
  this.barFrame_.id = 'xh-bar';
  this.barFrame_.className = 'top';
  this.barFrame_.style.height = '0';

  // Temporarily make bar 'hidden' and add it to the DOM. Once the bar's html
  // has loaded, it will send us a message with its height, at which point we'll
  // set this.barHeightInPx_, remove it from the DOM, and make it 'visible'.
  // We'll add it back to the DOM on the first bar request.
  //this.barFrame_.style.visibility = 'hidden';
  document.body.appendChild(this.barFrame_);

  document.addEventListener('keydown', this.boundKeyDown_);
};

xh.Bar.prototype.active_ = false;
xh.Bar.prototype.barFrame_ = null;
xh.Bar.prototype.barHeightInPx_ = 0;
xh.Bar.prototype.currEl_ = null;
xh.Bar.prototype.boundHandleRequest_ = null;
xh.Bar.prototype.boundMouseMove_ = null;
xh.Bar.prototype.boundKeyDown_ = null;


xh.Bar.prototype.updateQueryAndBar_  = function(el, mode) {
  xh.clearHighlights();

  /* Generate the absolute and relative query */
  this.absoluteQuery_ = el ? xh.makeQueryForElement(el) : '';
  this.results_ = this.absoluteQuery_ ? xh.evaluateQuery(this.absoluteQuery_) : ['', 0];
  this.optimalQuery_ = xh.absoluteToRelative(this.absoluteQuery_, this.results_);
   
  // var block = "/html/body[@class='browse new-branding']/div[@class='newMenu  fkart fksk-body line  ']/div[@id='fk-mainbody-id']/div[@class='grid-expansion fk-content fksk-content enable-compare']/div[3]/div[@id='browse']/div[@class='line ']/div[@id='sticky-referrer']/div[@class='gu-flexi-grid-20-16'][2]/div[@class='gd-row']/div[@id='browse-results-area']/div[@class='results grid js-product-ad-count-detection']/div[@id='plWrap']/div/div[@id='products']/div[@class='old-grid']/div[@class='gd-row browse-grid-row'][1]/div[@class='gd-col gu3']";
  // var block1 = "/html/body[@class='listingPage']/div[@id='content_wrapper']/div[@class='pageWrapper clearfix product-cat-deal']/div[@class='rightWrapper']/div[@id='products-main4']/div[@class='product_grid_row'][1]/div[@id='629650059919']"
  // if(this.query_.indexOf(block)!=-1)
  //   this.query_ = this.generateRelativeQuery_(this.query_);
  this.query_ = mode==1 ? this.optimalQuery_ : this.absoluteQuery_;
  this.updateBar_(true);
};

xh.Bar.prototype.updateBar_ = function(update_query) {
  this.results_ = this.query_ ? xh.evaluateQuery(this.query_) : ['', 0];
  var request = {
    'type': 'update',
    'query': update_query ? this.query_ : null,
    'results': this.results_
  };
  chrome.runtime.sendMessage(request);

  /* Display attributes of the nodeElement */
  this.attributes_();
};

/* Generate relative query based on the block XPath received from API */
xh.Bar.prototype.generateRelativeQuery_ = function(query){
  var block = "/html/body[@class='browse new-branding']/div[@class='newMenu  fkart fksk-body line  ']/div[@id='fk-mainbody-id']/div[@class='grid-expansion fk-content fksk-content enable-compare']/div[3]/div[@id='browse']/div[@class='line ']/div[@id='sticky-referrer']/div[@class='gu-flexi-grid-20-16'][2]/div[@class='gd-row']/div[@id='browse-results-area']/div[@class='results grid js-product-ad-count-detection']/div[@id='plWrap']/div/div[@id='products']/div[@class='old-grid']/div[@class='gd-row browse-grid-row'][1]/div[@class='gd-col gu3']";
  var block1 = "/html/body[@class='listingPage']/div[@id='content_wrapper']/div[@class='pageWrapper clearfix product-cat-deal']/div[@class='rightWrapper']/div[@id='products-main4']/div[@class='product_grid_row'][1]/div"
  var adsads = "/html/body[@class='listingPage']/div[@id='content_wrapper']/div[@class='pageWrapper clearfix product-cat-deal']/div[@class='rightWrapper']/div[@id='products-main4']/div[@class='product_grid_row'][1]/div[@id='1288231995']/div[@class='product_grid_box']/div[@class='productWrapper']/div[@class='hoverProductWrapper product-txtWrapper  ']/a[@id='prodDetails']/div[@class='product-price']/div[1]"
  var relative = '';
  xh.evaluateQuery(block, 1);
  var node = document.getElementsByClassName('mark-node')[0];
  xh.clearMarkings();
  var blockAbsolute = xh.makeQueryForElement(node);
  
  var blockLength = blockAbsolute.length; 
  relative = '/'+ query.substr(blockLength, query.length);
  var results = xh.evaluateQuery(relative);
  return relative; 
  // var request = {
  //   'type': 'relative',
  //   'query': relative,
  //   'results': results
  // }
  // chrome.runtime.sendMessage(request);
  // this.attributes_();
}

/* Sends all the attributes for the currently selected node to the extension */
xh.Bar.prototype.attributes_ = function(){
  var xpe = new XPathEvaluator();
  var aNode = document;
  var evaluator = new XPathEvaluator();
  var result = evaluator.evaluate(this.query_, document, null, 0, null);
  var attributeList = [];
  var valueList = [];
  var res;
  //var att = result.singleNodeValue;
  while (res = result.iterateNext()){
    for(var it = 0; it<res.attributes.length;it++){
      var att = res.attributes.item(it).name;
      var value = res.attributes.item(it).nodeValue;
      if((attributeList.indexOf(att)==-1) && (att!=='class') && (att!=='style')){
        attributeList.push(att);
        valueList.push(value);
      }
    }
  }
  var request = {
    'type': 'attributes',
    'query': this.query_,
    'data': attributeList,
    'values': valueList
  }
  chrome.runtime.sendMessage(request);
}

xh.Bar.prototype.showBar_ = function() {
  this.barFrame_.style.height = this.barHeightInPx_ + 'px';
  document.addEventListener('mousemove', this.boundMouseMove_);
  this.updateBar_(true);
};

xh.Bar.prototype.hideBar_ = function() {
  // Note: It's important to set this.active_ to false here rather than in
  // keyDown_() because hideBar_() could be called via handleRequest_().
  this.active_ = false;
  xh.clearHighlights();
  document.removeEventListener('mousemove', this.boundMouseMove_);
  this.barFrame_.style.height = '0';
};


xh.Bar.prototype.handleRequest_ = function(request, sender, callback) {
  if (request['type'] === 'height' && this.barHeightInPx_ === 0) {
    this.barHeightInPx_ = request['height'];
    // Now that we've saved the bar's height, remove it from the DOM and make it
    // 'visible'.
    document.body.removeChild(this.barFrame_);
    this.barFrame_.style.visibility = 'visible';
  } else if (request['type'] === 'evaluate') {
    xh.clearHighlights();
    this.query_ = request['query'];
    this.updateBar_(false);
  } else if (request['type'] === 'relocateBar') {
    // Move iframe to a different part of the screen.
    this.barFrame_.className = (
      this.barFrame_.className === 'top' ? 'middle' : 'top');
  } else if (request['type'] === 'hideBar') {
    this.hideBar_();
    window.focus();

    /* Select relative or absolute query */
  } else if(request['type'] === 'option'){
      if(request['value']==='relative'){   
        var currQuery = request['query'];
        // Current query in query box is an absolute query
        if(currQuery[1]!='/'){ 
          this.results_ = xh.evaluateQuery(currQuery,2);
          this.optimalQuery_ = xh.absoluteToRelative(currQuery, this.results_);
          this.query_ = this.optimalQuery_;
          this.updateBar_(true);
      }
    }
      else if(request['value']==='absolute'){
        var currQuery = request['query'];

        // Current query in the box is relative query
        if(currQuery[1]=='/'){
          this.absoluteQuery_ = xh.relativeToAbsolute(currQuery);
          this.query_ = this.absoluteQuery_;
          this.updateBar_(true);
      }
    }
  }
};

xh.Bar.prototype.mouseMove_ = function(e) {
  if (this.currEl_ === e.toElement) {
    return;
  }
  this.currEl_ = e.toElement;
  if (e.shiftKey) {
    this.updateQueryAndBar_(this.currEl_, 1);
  }
};

xh.Bar.prototype.keyDown_ = function(e) {
  if (e.keyCode === xh.X_KEYCODE && e.ctrlKey && e.shiftKey) {
    if (!this.active_) {
      this.active_ = true;
      if (!this.barFrame_.parentNode) {
        // First bar request on this page. Add bar back to DOM.
        document.body.appendChild(this.barFrame_);
        // Use setTimeout so that the transition is visible.
        window.setTimeout(this.boundShowBar_, 0);
      } else {
        this.showBar_();
      }
    } else {
      this.hideBar_();
    }
  }

  // If the user just pressed Shift and they're not holding Ctrl, update query.
  // Note that we rely on the mousemove handler to have updated this.currEl_.
  // Also, note that checking e.shiftKey wouldn't work here, since Shift is the
  // key that triggered this event.
  if (this.active_ && e.keyCode === xh.SHIFT_KEYCODE && !e.ctrlKey) {
    this.updateQueryAndBar_(this.currEl_, 1);
  }
};


////////////////////////////////////////////////////////////////////////////////
// Initialization code

if (window['xhBarInstance']) {
  window['xhBarInstance'].dispose();
}
//if (location.href.indexOf('acid3.acidtests.org') === -1) {
  window['xhBarInstance'] = new xh.Bar();
//}


