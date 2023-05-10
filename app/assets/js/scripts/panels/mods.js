const switchModPanelBtn = document.querySelector("#panels #mods .server-box");

document.querySelector("#panels #mods").addEventListener("click", (event) => {
	if (event.target.classList.contains("header")) event.target.parentNode.classList.toggle("open");
});

switchModPanelBtn.addEventListener("click", async () => {
	await showServerSelector()
});

async function populateServerIndicator() {
	const serv = (await DistroAPI.getDistribution()).getServerById(ConfigManager.getSelectedServer())

	document.querySelector("#panels #mods .server-box").innerHTML = `
			<div class="header">
				<div class="icon"><img src="${serv.rawServer.icon}" /></div>
				<div class="title">${serv.rawServer.name}</div>
				<div class="description">${serv.rawServer.description}</div>
				<div class="switch icon-switchServer"></div>
			</div>
		`
}

/* RAM SETTINGS */

const memoryTotal = document.getElementById('total-ram')
const memoryAvail = document.getElementById('free-ram')

function populateMemoryStatus(){
    memoryTotal.innerHTML = Number((os.totalmem()-1073741824)/1073741824).toFixed(1) + ' Go'
    memoryAvail.innerHTML = Number(os.freemem()/1073741824).toFixed(1) + ' Go'
}



async function refreshModsPanel() {
	await populateServerIndicator()
	populateMemoryStatus()
}

refreshModsPanel()