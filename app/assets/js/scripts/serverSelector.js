function setServerListingHandlers() {
	const listings = Array.from(document.getElementsByClassName('serverDropdown'))
	listings.map((val) => {
		val.onclick = e => {
			if (val.classList.contains('active')) {
				return
			}
			const cListings = document.getElementsByClassName('serverDropdown')
			for (let i = 0; i < cListings.length; i++) {
				if (cListings[i].classList.contains('active')) {
					cListings[i].classList.remove('active')
				}
			}
			val.classList.add('active')
		}
	})
}

function createServerItem(server, isActive) {
	let div = document.createElement('div');
	div.classList.add('serverDropdown');
	if (isActive) {
		div.classList.add('active');
	}
	div.id = server.rawServer.id;
	if (server.rawServer.launcherPage) {
		server.rawServer.launcherPage.icon = server.rawServer.icon
		iconUrl = server.rawServer.icon
	} else {
		iconUrl = "./assets/images/icons/error.png"
	}
	div.innerHTML = `
		<div class="header">
			<img class="img" src="${iconUrl}" />
			<div class="name">${server.rawServer.name}</div>
			<div class="desc">${server.rawServer.description}</div>
			<div class="version">
				<div class="text">${server.rawServer.version}</div>
			</div>
		</div>
	`;
	return div;
}

async function populateServerListings() {
	const distro = await DistroAPI.getDistribution()
	const giaSel = ConfigManager.getSelectedServer()
	const servers = distro.servers
	document.querySelector('.serverSelector-content section').innerHTML = ''
	for (const serv of servers) {
		if (serv.rawServer.serverCode && !ConfigManager.getServerCodes().includes(serv.rawServer.serverCode)) {
			continue
		}
		const isActive = giaSel === serv.rawServer.id
		document.querySelector('.serverSelector-content section').appendChild(createServerItem(serv, isActive))
	}
}

async function showServerSelector() {
	await prepareServerSelectionList()
	const serverSelector = document.getElementById('serverSelectorContainer')
	serverSelector.style.display = "";
	setTimeout(() => {
		serverSelector.classList.toggle('show')
	}, 100)
	if (hasRPC) {
		DiscordWrapper.updateDetails('Sélectionne un serveur...')
		DiscordWrapper.clearState()
	}
}

async function prepareServerSelectionList() {
	await populateServerListings()
	setServerListingHandlers()
}

document.querySelector('.serverSelector-close.icon-close').onclick = async e => {
	const serverSelector = document.getElementById('serverSelectorContainer')
	serverSelector.classList.toggle('show')
	setTimeout(() => {
		serverSelector.style.display = "none";
	}, 1000)

	const listings = document.getElementsByClassName('serverDropdown')
	for(let i=0; i<listings.length; i++){
		if(listings[i].classList.contains('active')){
			const serv = (await DistroAPI.getDistribution()).getServerById(listings[i].id)
			updateSelectedServer(serv)
			refreshServerStatus(true)
			if (hasRPC) {
				DiscordWrapper.updateDetails('Prêt à jouer !')
				DiscordWrapper.updateState('> Sur ' + serv.rawServer.name)
			}
			return
		}
	}

	if(listings.length > 0){
		const serv = (await DistroAPI.getDistribution()).getServerById(listings[i].id)
		updateSelectedServer(serv)
		toggleOverlay(false)
		if (hasRPC) {
			DiscordWrapper.updateDetails('Prêt à jouer !')
			DiscordWrapper.updateState('> Sur ' + serv.rawServer.name)
		}
	}
}