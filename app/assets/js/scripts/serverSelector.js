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
	div.id = server.getID();
	div.innerHTML = `
		<div class="header">
			<img class="img" src="${server.getIcon()}" />
			<div class="name">${server.getName()}</div>
			<div class="desc">${server.getDescription()}</div>
			<div class="version">
				<div class="text">${server.getVersion()}</div>
			</div>
		</div>
	`;
	return div;
}

function populateServerListings() {
	const distro = DistroManager.getDistribution()
	const giaSel = ConfigManager.getSelectedServer()
	const servers = distro.getServers()
	document.querySelector('.serverSelector-content section').innerHTML = ''
	for (const serv of servers) {
		if (serv.getServerCode() && !ConfigManager.getServerCodes().includes(serv.getServerCode())) {
			continue
		}
		const isActive = giaSel === serv.getID()
		document.querySelector('.serverSelector-content section').appendChild(createServerItem(serv, isActive))
	}
}

function showServerSelector() {
	prepareServerSelectionList()
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

function prepareServerSelectionList() {
	populateServerListings()
	setServerListingHandlers()
}

document.querySelector('.serverSelector-close.icon-close').onclick = e => {
	const serverSelector = document.getElementById('serverSelectorContainer')
	serverSelector.classList.toggle('show')
	setTimeout(() => {
		serverSelector.style.display = "none";
	}, 1000)

	const listings = document.getElementsByClassName('serverDropdown')
    for(let i=0; i<listings.length; i++){
        if(listings[i].classList.contains('active')){
            const serv = DistroManager.getDistribution().getServer(listings[i].id)
            updateSelectedServer(serv)
            refreshServerStatus(true)
			if (hasRPC) {
				DiscordWrapper.updateDetails('Prêt à jouer !')
				DiscordWrapper.updateState('> Sur ' + serv.getName())
			}
            return
        }
    }

    if(listings.length > 0){
        const serv = DistroManager.getDistribution().getServer(listings[i].id)
        updateSelectedServer(serv)
        toggleOverlay(false)
		if (hasRPC) {
			DiscordWrapper.updateDetails('Prêt à jouer !')
			DiscordWrapper.updateState('> Sur ' + serv.getName())
		}
    }
}