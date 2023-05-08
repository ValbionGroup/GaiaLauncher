/**
 * Script for popup.ejs
 */

/**
 * Check to see if the popup is visible.
 * 
 * @returns {boolean} Whether or not the popup is visible.
 */
function isPopupVisible() {
	return document.getElementById('popupContainer').classList.contains('show')
}

let popupHandlerContent

/**
 * Popup keydown handler for a non-dismissable popup.
 * 
 * @param {KeyboardEvent} e The keydown event.
 */
function popupKeyHandler(e) {
	if (e.key === 'Enter' || e.key === 'Escape') {
		document.querySelector(popupHandlerContent + " .buttons #popupAcknowledge").click()
	}
}
/**
 * Popup keydown handler for a dismissable popup.
 * 
 * @param {KeyboardEvent} e The keydown event.
 */
function popupKeyDismissableHandler(e) {
	if (e.key === 'Enter') {
		document.querySelector(popupHandlerContent + " .buttons #popupAcknowledge").click()
	} else if (e.key === 'Escape') {
		document.querySelector(popupHandlerContent + " .buttons #popupDismiss").click()
	}
}

/**
 * Bind popup keydown listeners for escape and exit.
 * 
 * @param {boolean} state Whether or not to add new event listeners.
 * @param {string} content The popup content which will be shown.
 * @param {boolean} dismissable Whether or not the popup is dismissable 
 */
function bindPopupKeys(state, content, dismissable) {
	popupHandlerContent = content
	document.removeEventListener('keydown', popupKeyHandler)
	document.removeEventListener('keydown', popupKeyDismissableHandler)
	if (state) {
		if (dismissable) {
			document.addEventListener('keydown', popupKeyDismissableHandler)
		} else {
			document.addEventListener('keydown', popupKeyHandler)
		}
	}
}

/**
 * Toggle the visibility of the popup.
 * 
 * @param {boolean} toggleState True to display, false to hide.
 * @param {boolean} dismissable Optional. True to show the dismiss option, otherwise false.
 */
function togglePopup(toggleState, dismissable = false, content = ".popup") {
	if (toggleState == null) {
		toggleState = !document.getElementById('popupContainer').classList.contains('show')
	}
	if (typeof dismissable === 'string') {
		content = dismissable
		dismissable = false
	}
	bindPopupKeys(toggleState, content, dismissable)
	if (toggleState) {
		// Make things untabbable.
		$('#main').attr('tabindex', '-1')
		if(dismissable){
            $('#popupDismiss').show()
        } else {
            $('#popupDismiss').hide()
        }
		$('#popupContainer').show()
		document.getElementById('popupContainer').classList.add('show')
	} else {
		document.getElementById('popupContainer').classList.remove('show')
		// Make things tabbable.
		$('#main *').removeAttr('tabindex')
		setTimeout(() => {
			$('#popupContainer').hide()
		}, 1000);
	}
}

/**
 * Set the content of the popup.
 * 
 * @param {string} title Popup title text.
 * @param {string} description Popup description text.
 * @param {{"warning", "information"}} type Popup type image.
 * @param {string} acknowledge Popup acknowledge button text.
 * @param {string} dismiss Popup dismiss button text.
 */
function setPopupContent(title, description, type, acknowledge, dismiss = "Fermer") {
	document.querySelector('.popup .buttons').innerHTML = ''
	document.querySelector('.popup .title').innerHTML = title
	document.querySelector('.popup .information').innerHTML = description
	if (type == "information") {
		document.querySelector('.popup .title').classList.add('info')
		document.querySelector('.popup .title').classList.remove('warning')
	} else if (type == "warning") {
		document.querySelector('.popup .title').classList.add('warning')
		document.querySelector('.popup .title').classList.remove('info')
	}
	document.querySelector('.popup .buttons').appendChild(createButton(acknowledge))
	document.querySelector('.popup .buttons').appendChild(createButton(dismiss, true))
}

/**
 * Create button for popup.
 * 
 * @param {string} value Text to display on the button.
 * @param {boolean} dismiss Optional. True to add the dismiss class, otherwise false.
 * @return {HTMLElement} HTML button.
 */
function createButton(value, dismissable = false) {
	let div = document.createElement("div");
	div.classList.add("button");
	if (dismissable) {
		div.id = "popupDismiss"
	} else {
		div.id = "popupAcknowledge"
	}
	div.textContent = value;
	return div;
}

/**
 * Set the onclick handler of the popup acknowledge button.
 * If the handler is null, a default handler will be added.
 * 
 * @param {function} handler 
 */
function setPopupHandler(handler) {
	if (handler == null) {
		document.getElementById('popupAcknowledge').onclick = () => {
			togglePopup(false)
		}
	} else {
		document.getElementById('popupAcknowledge').onclick = handler
	}
}

/**
 * Set the onclick handler of the popup dismiss button.
 * If the handler is null, a default handler will be added.
 * 
 * @param {function} handler 
 */
function setDismissHandler(handler) {
	if (handler == null) {
		document.getElementById('popupDismiss').onclick = () => {
			togglePopup(false)
		}
	} else {
		document.getElementById('popupDismiss').onclick = handler
	}
}

function sleep(ms) {
	return new Promise(function (resolve) {
		setTimeout(resolve, ms)
	});
}