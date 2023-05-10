const actualVersionText		= document.getElementById('actual-version')
const actualVersionDateText = document.getElementById('actual-version-date')
const updateMessageText		= document.getElementById('update-message')
const updateBox				= document.getElementById('update-box')
const updateContent			= document.getElementById('update-content')
const updateIcon 			= document.getElementById('update-icon')

function populateUpdateInformation(data){
	if(data != null){
		updateMessageText.innerHTML = `Nouvelle ${isPrerelease(data.version) ? 'pre-version' : 'version'} ${data.version} disponible.`
		updateBox.classList.replace('update', 'new-update')
		updateIcon.classList.replace('icon-check', 'icon-update')

		populateActualVersionInformation()

		updateContent.style.display = null

		if(process.platform === 'darwin'){
			setUpdateButtonStatus('Télécharger depuis GitHub<span style="font-size: 10px;color: gray;text-shadow: none !important;">Fermez le lanceur et exécutez le dmg pour mettre à jour.</span>', false, () => {
				shell.openExternal(data.darwindownload)
			})
		} else {
			setUpdateButtonStatus('Téléchargement...', true)
		}
	} else {
		populateActualVersionInformation()

		updateMessageText.innerHTML = 'Vous avez la dernière version du launcher.'
		updateBox.classList.replace('new-update', 'update')
		updateIcon.classList.replace('icon-update', 'icon-check')
		settingsUpdateChangelogCont.style.display = 'none'
		
		setUpdateButtonStatus('Vérifier les mises à jour', false, () => {
			if(!isDev){
				ipcRenderer.send('autoUpdateAction', 'checkForUpdate')
				setUpdateButtonStatus('Vérification des mises à jour...', true)
			}
		})
	}
}

function populateActualVersionInformation(){
	versionNumber = remote.app.getVersion()
	actualVersionText.innerHTML = versionNumber
	actualVersionDateText.innerHTML = `Version ${isPrerelease(versionNumber) ? 'beta' : 'stable'} du 01 janvier 1970`
}

function setUpdateButtonStatus(text, disabled = false, handler = null){
	settingsUpdateActionButton.innerHTML = text
	settingsUpdateActionButton.disabled = disabled
	if(handler != null){
		settingsUpdateActionButton.onclick = handler
	}
}

/**
 * Return whether or not the provided version is a prerelease.
 * 
 * @param {string} version The semver version to test.
 * @returns {boolean} True if the version is a prerelease, otherwise false.
 */
function isPrerelease(version){
	const preRelComp = semver.prerelease(version)
	return preRelComp != null && preRelComp.length > 0
}

/**
 * Fetches the GitHub atom release feed and parses it for the release notes
 * of the current version. This value is displayed on the UI.
 */
function populateReleaseNotes(){
	$.ajax({
		url: 'https://github.com/ValbionGroup/GaiaLauncher/releases.atom',
		success: (data) => {
			const version = 'v' + remote.app.getVersion()
			const entries = $(data).find('entry')
			
			for(let i=0; i<entries.length; i++){
				const entry = $(entries[i])
				let id = entry.find('id').text()
				id = id.substring(id.lastIndexOf('/')+1)

				if(id === version){
					settingsAboutChangelogTitle.innerHTML = entry.find('title').text()
					settingsAboutChangelogText.innerHTML = entry.find('content').text()
					settingsAboutChangelogButton.href = entry.find('link').attr('href')
				}
			}

		},
		timeout: 2500
	}).catch(err => {
		settingsAboutChangelogText.innerHTML = 'Échec du chargement des notes de mise à jour.'
	})
}

populateUpdateInformation()