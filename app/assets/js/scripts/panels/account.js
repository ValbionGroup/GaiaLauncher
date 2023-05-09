/**
 * Script for panels/account.ejs
 */
// REQUIREMENTS
const {
	MSFT_OPCODE,
	MSFT_REPLY_TYPE,
	MSFT_ERROR
} = require('./assets/js/ipcconstants')

let hasRPC = false

const msftLoginLogger = LoggerUtil.getLogger('Microsoft Login')
const msftLogoutLogger = LoggerUtil.getLogger('Microsoft Logout')

const loginOptionMicrosoft = document.querySelector('#microsoft #add');
const loginOptionMojang = document.querySelector('#mojang #add');

const microsoftAccounts = document.querySelector("div#microsoft.accounts div");
const mojangAccounts = document.querySelector("div#mojang.accounts div");

const mojangForm = document.getElementById('loginContainer');
const mojangCancel = document.querySelector(".connect-close");

const loginWithMojang = async () => {
	$(mojangForm).fadeIn(150, () => {
		$('#main').attr('tabindex', '-1');
		mojangForm.firstElementChild.classList.toggle('show');
	})
}

const loginWithMicrosoft = async () => {
	ipcRenderer.send(MSFT_OPCODE.OPEN_LOGIN)
}

/**
 * Create an auth account element.
 * 
 * @param {Object} account 
 * @returns HTMLDivElement
 */
function addAccount(account, isActive) {
	let div = document.createElement("div");
	div.classList.add("account");
	if (isActive) {
		div.classList.add("active");
	}
	div.id = account.uuid;
	div.innerHTML = `
		<img class="acc-image" src="https://mc-heads.net/avatar/${account.uuid}/250/avatar.png"/>
		<div class="acc-username">${account.displayName}</div>
		<div class="acc-email">${account.uuid}</div>
		<div class="acc-delete icon-account-delete"></div>
	`
	return div;
}

/**
 * Close the Microsoft loading screen.
 */
function closeMsftLoader() {
	$('#loadingContainer').fadeOut(150, () => {
		$('#loadSpinnerImage').removeClass('rotating')
		$('#main').removeAttr('tabindex', '');
	})
}

ipcRenderer.on(MSFT_OPCODE.REPLY_LOGIN, (_, ...arguments_) => {
	if (arguments_[0] === MSFT_REPLY_TYPE.ERROR) {

		closeMsftLoader()
		if (arguments_[1] === MSFT_ERROR.NOT_FINISHED) {
			// User cancelled.
			msftLoginLogger.info('Login cancelled by user.')
			return
		}

		// Unexpected error.
		setPopupContent(
			'Une erreur est survenue',
			'La connexion via Microsoft a échoué. Veuillez réessayer plus tard',
			'warning',
			'OK'
		)
		setPopupHandler(() => {
			togglePopup(false)
		})
		togglePopup(true)
	} else if (arguments_[0] === MSFT_REPLY_TYPE.SUCCESS) {
		const queryMap = arguments_[1]

		// Error from request to Microsoft.
		if (Object.prototype.hasOwnProperty.call(queryMap, 'error')) {
			closeMsftLoader();
			// TODO Dont know what these errors are. Just show them I guess.
			// This is probably if you messed up the app registration with Azure.
			let error = queryMap.error // Error might be 'access_denied' ?
			let errorDesc = queryMap.error_description
			msftLoginLogger.error('Error getting authCode, is Azure application registered correctly?')
			msftLoginLogger.error(error)
			msftLoginLogger.error(errorDesc)
			msftLoginLogger.error('Full query map', queryMap)
			setPopupContent(
				"Une erreur est survenue",
				`<b>${error}</b>: ` + errorDesc,
				'warning',
				'OK'
			)
			setPopupHandler(() => {
				togglePopup(false)
			})
			togglePopup(true)
		} else {

			msftLoginLogger.info('Acquired authCode, proceeding with authentication.')

			const authCode = queryMap.code
			AuthManager.addMicrosoftAccount(authCode).then(value => {
					updateSelectedAccount(value)
					if (Object.keys(ConfigManager.getAuthAccounts()).length == 0) {
						microsoftAccounts.appendChild(addAccount(value, true))
					} else {
						microsoftAccounts.appendChild(addAccount(value, false))
					}
					closeMsftLoader()
				})
				.catch((displayableError) => {

					let actualDisplayableError
					if (isDisplayableError(displayableError)) {
						msftLoginLogger.error('Error while logging in.', displayableError)
						actualDisplayableError = displayableError
					} else {
						// Uh oh.
						msftLoginLogger.error('Unhandled error during login.', displayableError)
						actualDisplayableError = {
							title: 'Erreur inconnue pendant la connexion',
							desc: 'Une erreur inconnue s\'est produite. Veuillez consulter la console pour plus de détails.'
						}
					}

					closeMsftLoader()
					setPopupContent(actualDisplayableError.title, actualDisplayableError.desc, "warning", Lang.queryJS('login.tryAgain'))
					setPopupHandler(() => {
						togglePopup(false)
					})
					togglePopup(true)
				})
		}
	}
})

/**
 * Bind functionality for the account selection buttons. If another account
 * is selected, the UI of the previously selected account will be updated.
 */
function bindAuthAccountSelect() {
	Array.from(document.getElementsByClassName('account')).map((val) => {
		val.onclick = (e) => {
			if (val.classList.contains('active')) {
				return
			}
			const selectBtns = document.getElementsByClassName('account')
			for (let i = 0; i < selectBtns.length; i++) {
				if (selectBtns[i].classList.contains('active')) {
					selectBtns[i].classList.remove('active')
				}
			}
			updateSelectedAccount(ConfigManager.getAuthAccount(val.id))
			val.classList.toggle('active')
		}
	})
}

/**
 * Bind functionality for the log out button. If the logged out account was
 * the selected account, another account will be selected and the UI will
 * be updated accordingly.
 */
function bindAuthAccountLogOut() {
	Array.from(document.getElementsByClassName('acc-delete')).map((val) => {
		val.onclick = (e) => {
			let isLastAccount = false
			if (Object.keys(ConfigManager.getAuthAccounts()).length === 1) {
				isLastAccount = true
				setPopupContent(
					'Ceci est votre dernier compte',
					`Pour pouvoir utiliser le launcher, vous devez être connecté à au moins un compte. Vous devrez vous reconnecter après.<br/><br/>Êtes-vous sûr de vouloir supprimer le compte <b>${ConfigManager.getAuthAccount(val.closest('.account').id).displayName}</b> ?`,
					'information',
					'J\'en suis sûr',
					'Annuler'
				)
				setPopupHandler(() => {
					processLogOut(val, isLastAccount)
					togglePopup(false)
				})
				setDismissHandler(() => {
					togglePopup(false)
				})
				togglePopup(true, true)
			} else {
				processLogOut(val, isLastAccount)
			}

		}
	})
}

let msAccDomElementCache
/**
 * Process a log out.
 * 
 * @param {Element} val The log out button element.
 * @param {boolean} isLastAccount If this logout is on the last added account.
 */
function processLogOut(val, isLastAccount) {
	const parent = val.closest('.account')
	const uuid = parent.id
	const prevSelAcc = ConfigManager.getSelectedAccount()
	const targetAcc = ConfigManager.getAuthAccount(uuid)
	if (targetAcc.type === 'microsoft') {
		msAccDomElementCache = parent
		$('#loadingContainer').fadeIn(150, () => {
			$('#loadSpinnerImage').addClass('rotating')
		})
		ipcRenderer.send(MSFT_OPCODE.OPEN_LOGOUT, uuid, isLastAccount)
	} else {
		AuthManager.removeMojangAccount(uuid).then(() => {
			if (!isLastAccount && uuid === prevSelAcc.uuid) {
				const selAcc = ConfigManager.getSelectedAccount()
				refreshAuthAccountSelected(selAcc.uuid)
				updateSelectedAccount(selAcc)
				validateSelectedAccount()
			}
			if (isLastAccount) {
				parent.remove()
			}
		})
	}
}

function clearAccountState() {
	Array.from(document.getElementsByClassName('account')).map((val) => {
		parent = val.closest('.account')
		parent.remove()
		let side = document.querySelector('.account-side')
		side.ariaLabel = "Non connecté"
		side.innerHTML = `
		<img class="account-side-img" src="https://mc-heads.net/avatar/250/avatar.png"/>
		<div class="account-side-connected red"></div>
		`
	});
}

// Bind reply for Microsoft Logout.
ipcRenderer.on(MSFT_OPCODE.REPLY_LOGOUT, (_, ...arguments_) => {
	if (arguments_[0] === MSFT_REPLY_TYPE.ERROR) {
		closeMsftLoader()

		if (arguments_.length > 1 && arguments_[1] === MSFT_ERROR.NOT_FINISHED) {
			// User cancelled.
			msftLogoutLogger.info('Logout cancelled by user.')
			return
		}

		// Unexpected error.
		setPopupContent(
			'Quelque chose n\'a pas marché',
			'La déconnexion de Microsoft a échoué. Veuillez réessayer.',
			'warning',
			'OK'
		)
		setPopupHandler(() => {
			togglePopup(false)
		})
		togglePopup(true)
	} else if (arguments_[0] === MSFT_REPLY_TYPE.SUCCESS) {

		const uuid = arguments_[1]
		const isLastAccount = arguments_[2]
		const prevSelAcc = ConfigManager.getSelectedAccount()

		msftLogoutLogger.info('Logout Successful. uuid:', uuid)

		AuthManager.removeMicrosoftAccount(uuid)
			.then(() => {
				if (!isLastAccount && uuid === prevSelAcc.uuid) {
					const selAcc = ConfigManager.getSelectedAccount()
					refreshAuthAccountSelected(selAcc.uuid)
					updateSelectedAccount(selAcc)
					validateSelectedAccount()
				}
				if (isLastAccount) {
					closeMsftLoader()
					clearAccountState()
				}
				if (msAccDomElementCache) {
					msAccDomElementCache.remove()
					msAccDomElementCache = null
				}
			})
			.finally(() => {
				if (!isLastAccount) {
					closeMsftLoader()
				}
			})

	}
})

/**
 * Refreshes the status of the selected account on the auth account
 * elements.
 * 
 * @param {string} uuid The UUID of the new selected account.
 */
function refreshAuthAccountSelected(uuid) {
	Array.from(document.getElementsByClassName('account')).map((val) => {
		const selected = val.querySelector('.account.active')[0]
		if (uuid === val.id) {
			selected.classList.toggle('active')
		} else {
			if (selected.classList.contains('active')) {
				selected.classList.toggle('active')
			}
		}
	})
}

/**
 * Add auth account elements for each one stored in the authentication database.
 */
function populateAuthAccounts() {
	const authAccounts = ConfigManager.getAuthAccounts()
	const authKeys = Object.keys(authAccounts)
	if (authKeys.length === 0) {
		return
	}
	const selectedUUID = ConfigManager.getSelectedAccount().uuid

	authKeys.forEach((val) => {
		const acc = authAccounts[val]

		if (selectedUUID === acc.uuid) {
			if (acc.type === 'microsoft') {
				microsoftAccounts.appendChild(addAccount(acc, true))
			} else {
				mojangAccounts.appendChild(addAccount(acc, true))
			}
		} else {
			if (acc.type === 'microsoft') {
				microsoftAccounts.appendChild(addAccount(acc, false))
			} else {
				mojangAccounts.appendChild(addAccount(acc, false))
			}
		}

	})
}

/**
 * Prepare the accounts tab for display.
 */
function prepareAccountsTab() {
	populateAuthAccounts()
	bindAuthAccountSelect()
	bindAuthAccountLogOut()
}

loginOptionMicrosoft.onclick = (e) => {
	$('#loadingContainer').fadeIn(150, () => {
		$('#main').attr('tabindex', '-1');
		$('#loadSpinnerImage').addClass('rotating')
	})

	loginWithMicrosoft();
}


loginOptionMojang.onclick = (e) => {
	loginWithMojang();
}

const email = document.getElementById('email');
const password = document.getElementById('pass');
const connection = document.getElementById("connect");
const email_regex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

mojangCancel.onclick = (e) => {
	email.value = ''
	password.value = ''

	mojangForm.firstElementChild.classList.toggle('show');
	$(mojangForm).fadeOut(150)
	$('#main').removeAttr('tabindex', '');
}

email.addEventListener("keyup", (event) => {
	if (event.keyCode == 13) {
		var click = new Event('click');
		connection.dispatchEvent(click);
	}
});

password.addEventListener("keyup", (event) => {
	if (event.keyCode == 13) {
		var click = new Event('click');
		connection.dispatchEvent(click);
	}
});

prepareAccountsTab()