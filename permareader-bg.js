/* 
* Permareader-bg.js
* 
* Troy Rennie - dsm.iv.tr@gmail.com
* May 2021
* 
* Enables or disables Reader Mode without user intervention.
* 
*/

/*
 * TODO
 * - add whitelist of url's that will never be filtered for "forced" mode
 *      see: browser.tabs.onUpdated.addListener()
 * - add UI for this
 */

const EXTENSION_ID = "Permareader";
const EXTENSION_VERSION = "1.1";
const DEBUGGIN = true;

var PERMAREADER_ENABLED = false;
var PERMAREADER_FORCED = false;

/*
* clog
* 
* Logs a message to the console, but only if debugging is set via DEBUGGIN.
*      ...msg - vararg to assist with logging
*/

function clog (...msg) {
    if (DEBUGGIN) {
        console.log (EXTENSION_ID, EXTENSION_VERSION, " - ", ...msg);
    }
}

/*
* saveState
* 
* Saves the extension's state to local storage.
*      isFirstTime:
*          true - initializes state as 'false'
*/

function saveState (isFirstTime) {
    
    if (isFirstTime) {
        browser.storage.local.set ({
            "state": false
        }).then(function () {
            clog("The extension's initial state was saved.")}, function () {
                clog("There was an error saving the extension's state to LocalStorage.")}
        );
        
        setButtonStatus(false);
        
    } else {
        browser.storage.local.set ({
            "state": PERMAREADER_ENABLED
        }).then(function () {
            clog("The extension's state was saved.")}, function () {
                clog("There was an error saving the extension's state to LocalStorage.")}
        );
    }
    
}

/*
* restoreState
* 
* Restores the extension's state from local storage.
*/

function restoreState () {
    browser.storage.local.get("state").then(function (val) {
        clog("The extension's state was retrieved successfully from LocalStorage. val.state =");
        PERMAREADER_ENABLED = val.state;
        clog("The extension's state was restored. val.state =", PERMAREADER_ENABLED);
        setButtonStatus(PERMAREADER_ENABLED);
    }, function () {
            clog("There was an error retrieving the extension's state from LocalStorage.")}
            );
}

/*
* setButtonStatus
* 
* Sets the button properties for user feedback.
*      isEnabled
*          true - sets button to ON state
*          false - sets button to OFF state
* 
*       isForced
*           true - sets button state to FORCED and breaks out of fn
*/

function setButtonStatus (isEnabled, isForced) {

        if (isForced) {
            browser.browserAction.setBadgeText({
                text: "F"
            });
            browser.browserAction.setBadgeBackgroundColor({
                color: "blue"
            });
            browser.browserAction.setTitle({
                title: EXTENSION_ID + " - FORCED"
            });
            
            return;
        }
        
        if (isEnabled) {
            
            browser.browserAction.setBadgeText({
                text: "ON"
            });
            browser.browserAction.setBadgeBackgroundColor({
                color: "green"
            });
            browser.browserAction.setTitle({
                title: EXTENSION_ID + " - ON"
            });
            
        } else {
            
            browser.browserAction.setBadgeText({
                text: "OFF"
            });
            browser.browserAction.setBadgeBackgroundColor({
                color: "grey"
            });
            browser.browserAction.setTitle({
                title: EXTENSION_ID + " - OFF"
            });    
        }
}

/*
* handleButtonClick
* 
* Event handler for the extension's only button.
*      (https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/onClicked)
*/

function handleButtonClick (tab, onClickData) {

    if (PERMAREADER_ENABLED) {
        
        PERMAREADER_FORCED = false;
        PERMAREADER_ENABLED = false;
        
        setButtonStatus(false);
        
    } else {
        
        PERMAREADER_FORCED = false;
        PERMAREADER_ENABLED = true;
        
        setButtonStatus(true);
    }
    
    clog("The extension's state has changed. val.state =", PERMAREADER_ENABLED, "forced =", PERMAREADER_FORCED);
    
    saveState();
}

/*
* handleMenuClick
* 
* Event handler for the extension's menu items.
*      (https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/onClicked)
*/

function handleMenuClick (info, tab) {
    switch (info.menuItemId) {
        case "permareader-forced":
            
            if (!PERMAREADER_FORCED) {
                
                PERMAREADER_FORCED = true;
                PERMAREADER_ENABLED = true;
                
                setButtonStatus(null, true);
            }
            
            break;
            
        default:
            clog("The extension's menu handler reached the default case. This shouldn't happen.");
    }
    
     clog("The extension's state has changed. val.state =", PERMAREADER_ENABLED, "forced =", PERMAREADER_FORCED);
}


/*
* handleUpdatedTab
* 
* Event handler for tabs.
*      (https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onUpdated)
*/

function handleUpdatedTab (tabId, changeInfo, tabInfo) {
    
    if (PERMAREADER_ENABLED) {
        if (changeInfo.isArticle) {
            browser.tabs.toggleReaderMode(tabId);
        } else if (PERMAREADER_FORCED) {
            
            if (changeInfo.status === "complete") {
            
                browser.tabs.get(tabId).then(function(val) {
                    
                    clog("The extension is trying to create a tab for you. val.url =", val.url);
                    
                    if (!val.isInReaderMode) {
                        
                        browser.tabs.create({
                            url: val.url,
                            openInReaderMode: true,
                        }).then(function(v){
                            
                            browser.tabs.remove(tabId);
                            
                        }, function (v){});
                    }
                    
                }, function(val) {
                    clog("The extension failed to create a tab. val.url =");
                });
            
            }
        }
    }
    
    if ((changeInfo.status === "complete") && (DEBUGGIN)) {
        clog("tabId:", tabId, "isInReaderMode:", tabInfo.isInReaderMode);
    }
}

/*
* handleInstallation
* 
* Event handler for when the extension is installed.
*      (https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onInstalled)
*/

function handleInstallation () {
    saveState(true);
}

/* handleStartup
* 
* Event handler for when the extension is started.
*      (https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onStartup)
*/

function handleStartup () {
    restoreState();
}

/*
 * Menu creation.
 * Maybe there's a way to put this into the onStartup() listener in the future?
 */
browser.menus.create({
    id: "permareader-forced",
    type: "normal",
    title: "Force Reader Mode (EXPERIMENTAL)",
    contexts: ["browser_action"],
    icons: {
        "48": "icons/out48.jpg",
        "96": "icons/out96.jpg"
    },
}, function(x) {
    clog("The extension couldn't create a menu item.");
});

/*
 * Event handlers.
 */

browser.runtime.onInstalled.addListener(handleInstallation);
browser.runtime.onStartup.addListener(handleStartup);
browser.browserAction.onClicked.addListener(handleButtonClick);

browser.menus.onClicked.addListener(handleMenuClick);

/*
 * Filter onUpdated() events so that about:, config:, and other special URLs don't cause trouble.
 * This could be a problem, for example, if the extension tried to reload "about:reader" URLs
 * and thus caused an infinite loop of event triggering; and most special URL schemes don't accept reader mode anyway.
 */

browser.tabs.onUpdated.addListener (handleUpdatedTab, {
    urls: ["*://*/*"],
});
