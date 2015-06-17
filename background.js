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

var email = "";

chrome.identity.getProfileUserInfo(function(userInfo) {
    email = userInfo.email;
});

var count = 0;
function handleRequest(request, sender, callback) {
  // Simply relay the request. This lets content.js talk to bar.js.
  chrome.tabs.sendMessage(sender.tab.id, request, callback);
  var req = {
    'type': 'email',
    'email': email
  }
  chrome.tabs.sendMessage(sender.tab.id, req);
  
}
chrome.extension.onMessage.addListener(handleRequest);

var oauth = ChromeExOAuth.initBackgroundPage({
  'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken',
  'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken',
  'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken',
  'consumer_key': 'anonymous',
  'consumer_secret': 'anonymous',
  'scope': 'https://docs.google.com/feeds/',
  'app_name': 'My Google Docs Extension'
});

oauth.clearTokens();
