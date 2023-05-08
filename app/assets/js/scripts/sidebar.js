/**
 * Script for sidebar.ejs
 */

// Launch Elements
const buttons = document.querySelectorAll('.panels .button');
const userImg = document.getElementsByClassName('account-side-img');
const account = document.getElementsByClassName('account-side');
const isUserConnected = document.getElementById('isConnected');
const sidePlay = document.getElementById('play-button');

const loggerSidebar = LoggerUtil('[Sidebar]');

let activeBtn = document.querySelector('#serverBtn.button');
let settings = document.getElementById('settingsBtn');

// Bind selected account
function updateSelectedAccount(authUser) {
	if (authUser != null) {
		if (authUser.displayName != null) {
			account[0].ariaLabel = authUser.displayName;
		}
		if (authUser.uuid != null) {
			userImg[0].setAttribute('src', `https://mc-heads.net/avatar/${authUser.uuid}/250/avatar.png`)
		}
		isUserConnected.classList.add('green');
		isUserConnected.classList.remove('red');
	} else {
		isUserConnected.classList.add('red');
		isUserConnected.classList.remove('green');
		account[0].ariaLabel = "Non connecté";
		userImg[0].setAttribute('src', 'https://mc-heads.net/avatar/250/avatar.png')
	}
}
updateSelectedAccount(ConfigManager.getSelectedAccount())

function buttonClicked(button) {
	if (button.id == activeBtn.id) return;
	if (button.id == 'settingsBtn') {
		if (activeBtn.parentElement.id == "stg") {
			activeBtn.classList.toggle("active");
			(activeBtn = document.querySelector("#serverBtn.button")).classList.toggle("active");
			switchView(getCurrentView(), VIEWS.server)
		}
		return button.classList.toggle("close");
	}
	activeBtn.classList.toggle('active');
	button.classList.toggle('active');
	activeBtn = button;
	loggerSidebar.log(`Switched to ${button.id.substr(0, button.id.length-3)} panel`);
	switchView(getCurrentView(), VIEWS[button.id.substr(0, button.id.length-3)]);
}

// Buttons listener
buttons.forEach(button => {
	button.addEventListener('click', () => {
		buttonClicked(button);
	});
});

/** 
 * FIXME - Account not clickable 
account.onclick = function () {
	if(settings.classList.contains('close')){
		settings.classList.toggle('close');
		activeBtn.classList.toggle('active');
		(activeBtn = document.querySelector('#account.button')).classList.toggle('active');
		switchView(getCurrentView(), VIEWS.account);
	}
}; 
*/

sidePlay.addEventListener("click", () => {
	LauncherScript.launchGame() 
});


loggerSidebar.info('Sidebar initialized');