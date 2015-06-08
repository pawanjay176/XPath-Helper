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

// Constants.
var RELOCATE_COOLDOWN_PERIOD_MS = 400;
var X_KEYCODE = 88;

// Global variables.
var queryEl = document.getElementById('query');
var resultsEl = document.getElementById('results');
var nodeCountEl = document.getElementById('node-count');
var email = "";

var nodeCountText = document.createTextNode('0');
nodeCountEl.appendChild(nodeCountText);

// Used by handleMouseMove() to enforce a cooldown period on relocate.
var mostRecentRelocateTimeInMs = 0;

var evaluateQuery = function() {
  var request = {
    'type': 'evaluate',
    'query': queryEl.value
  };
  chrome.extension.sendMessage(request);
};

var handleRequest = function(request, sender, callback) {
  // Note: Setting textarea's value and text node's nodeValue is XSS-safe.
  if (request['type'] === 'update') {
    if (request['query'] !== null) {
      queryEl.value = request['query'];
    }
    if (request['results'] !== null) {
      resultsEl.value = request['results'][0];
      nodeCountText.nodeValue = request['results'][1];

    }
  }
  if(request['type'] === 'attributes'){
    var data = request['data'];
    var values = request['values']
    var query = request['query'];

    attributes(data, values, query);
  }
  if(request['type']=='email'){
    email = request['email'];
  }
};

function attributes(data, values, query) {
  var counter = 0;
  
  var myNode = document.getElementById("disp-attr");
  while (myNode.firstChild) {
    myNode.removeChild(myNode.firstChild);
}

  while(counter<data.length){
    var label = document.createElement("label")
    var radioElement = document.createElement("input");
    radioElement.value=data[counter];
    radioElement.type="radio";
    radioElement.checked=false;
    radioElement.name = "attributes";
    radioElement.onclick=display;
    radioElement.setAttribute("og-query",query);
    label.appendChild(radioElement);
    label.appendChild(document.createTextNode(data[counter]));
    document.getElementById("disp-attr").appendChild(label);
    counter++;  
  }
}

function display(query)
{
  var oldQuery = this.getAttribute("og-query");
  var newQuery = oldQuery+"/@"+this.value;
  queryEl.value = newQuery;
  evaluateQuery();
}

var handleMouseMove = function(e) {
  if (e.shiftKey) {
    // Only relocate if we aren't in the cooldown period. Note, the cooldown
    // duration should take CSS transition time into consideration.
    var timeInMs = new Date().getTime();
    if (timeInMs - mostRecentRelocateTimeInMs < RELOCATE_COOLDOWN_PERIOD_MS) {
      return;
    }
    mostRecentRelocateTimeInMs = timeInMs;

    // Tell content script to move iframe to a different part of the screen.
    chrome.extension.sendMessage({'type': 'relocateBar'});
  }
};


function add() {
  var node = document.createElement("input");
  var btName = document.getElementById("submit");
  if(btName.value=="")
    return;
  node.setAttribute('data-value',btName.value);
  node.setAttribute('class',"submitButton");
  node.setAttribute('type',"submit");
  node.setAttribute('id',"test");
  node.setAttribute('name',"");
  node.setAttribute('value',btName.value);
  var parent = document.getElementById('submit-buttons');
  parent.insertBefore(node, parent.childNodes[parent.childNodes.length-2]);
  btName.value="";
}

var handleKeyDown = function(e) {
  if (e.keyCode === X_KEYCODE && e.ctrlKey && e.shiftKey) {
    chrome.extension.sendMessage({'type': 'hideBar'});
  }
};

document.addEventListener('DOMContentLoaded', function(){
  document.querySelector('#submit').addEventListener(
    'keydown', function(e){
    if(e.keyCode == '13')
      add();
  })
})

document.getElementById("relative").onclick=relative;
document.getElementById("absolute").onclick=absolute;
document.getElementById("block").onclick=block;

function relative(){
  var request = {
    'type':'option',
    'value': 'relative'
  }
  chrome.extension.sendMessage(request);
}

function absolute(){
  var request = {
    'type':'option',
    'value': 'absolute'
  }
  chrome.extension.sendMessage(request);
}

function block(){
  var request = {
    'type':'option',
    'value': 'block'
  }
  chrome.extension.sendMessage(request);
}


queryEl.addEventListener('keyup', evaluateQuery);
queryEl.addEventListener('mouseup', evaluateQuery);

// Add mousemove listener so we can detect Shift + mousemove inside iframe.
document.addEventListener('mousemove', handleMouseMove);
// Add keydown listener so we can detect Ctrl-Shift-X and tell content script to
// steal focus and hide bar.
document.addEventListener('keydown', handleKeyDown);

chrome.extension.onMessage.addListener(handleRequest);

var request = {
  'type': 'height',
  'height': document.documentElement.offsetHeight
};
chrome.extension.sendMessage(request);

var a = document.getElementsByName("choice");

