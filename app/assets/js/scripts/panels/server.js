/**
 * Script for panels/server.ejs
 */
// Requirements
const cp = require('child_process')
const crypto = require('crypto')
const {
	URL
} = require('url')
const {
	MojangRestAPI,
	getServerStatus
} = require('gaialauncher-core/mojang')

// Internal Requirements
const DiscordWrapper = require('./assets/js/discordwrapper')
const ProcessBuilder = require('./assets/js/processbuilder')
const LauncherScript = require('./assets/js/launcherscript')
const serverSelector = require('./assets/js/scripts/serverSelector')
const {
	RestResponseStatus,
	isDisplayableError
} = require('gaialauncher-core/common')

// Launch Elements
const playBtn = document.getElementById('play')
const switchBtn = document.getElementById('switchServer')
const warningMsg = document.getElementById('warningMessage')

// Server specific variables
const server = {
	background: document.querySelector('.home-img'),
	logo: document.querySelector('.body-header .logo'),
	statusName: document.querySelector('.server .server-text .name'),
	statusIcon: document.querySelector('.server .server-img'),
	wikiTile: document.getElementById('wiki'),
	wikiContent: document.getElementsByClassName('wiki')
}

const loggerServer = LoggerUtil.getLogger('Landing')

function setLaunchEnabled(val) {
	playBtn.disabled = !val
	document.getElementById('play-button').disabled = !val
}

// Bind selected server
function updateSelectedServer(serv) {
	if (getCurrentView() === VIEWS.mods) {
		saveAllModConfigurations()
	}
	ConfigManager.setSelectedServer(serv != null ? serv.rawServer.id : null)
	ConfigManager.save()

	if (serv.rawServer.launcherPage) {
		// Logo
		if (serv.rawServer.launcherPage.logo != null) {
			server.logo.innerHTML = '<img src="' + serv.rawServer.launcherPage.logo + '" alt="' + serv.rawServer.name + '">'
		} else {
			server.logo.innerHTML = serv.rawServer.name
		}

		// Icon
		if (serv.rawServer.launcherPage.icon != null) {
			server.statusIcon.setAttribute('src', serv.rawServer.launcherPage.icon)
		} else {
			server.statusIcon.setAttribute('src', "./assets/images/icons/error.png")
		}

		// Background
		if (serv.rawServer.launcherPage.background != null) {
			server.background.setAttribute('src', serv.rawServer.launcherPage.background)
		} else {
			server.background.setAttribute('src', "./assets/images/backgrounds/" + document.body.getAttribute('bkid') + ".jpg")
		}

		// Wiki
		if (serv.rawServer.launcherPage.wiki) {
			server.wikiTile.style.display = 'block'
			server.wikiContent[0].style.display = 'block'
		} else {
			server.wikiContent[0].style.display = 'none'
			server.wikiTile.style.display = 'none'
		}
	} else {
		server.wikiContent[0].style.display = 'none'
		server.wikiTile.style.display = 'none'
		server.background.setAttribute('src', "./assets/images/backgrounds/" + document.body.getAttribute('bkid') + ".jpg")
		server.statusIcon.setAttribute('src', "./assets/images/icons/error.png")
	}

	// Name
	server.statusName.innerHTML = serv.rawServer.name

	if (getCurrentView() === VIEWS.mods) {
		animateModsTabRefresh()
	}
	setLaunchEnabled(serv != null)
}

// Refresh Status
const refreshMojangStatuses = async function () {
	loggerServer.info('Refreshing Mojang Statuses..')

	let status = 'grey'
	let statusEssential = ''
	let statusNonEssential = ''
	let essentialCount = 0
	let nonEssentialCount = 0
	let statusGlobalText = 'Inconnu'
	let doWarningMsg = false

	const response = await MojangRestAPI.status()
	let statuses
	if (response.responseStatus === RestResponseStatus.SUCCESS) {
		statuses = response.data
	} else {
		loggerServer.warn('Unable to refresh Mojang service status.')
		statuses = MojangRestAPI.getDefaultStatuses()
	}

	greenCount = 0
	greyCount = 0

	for (let i = 0; i < statuses.length; i++) {
		const service = statuses[i]

		// if (service.essential) {
		// 	tooltipEssentialHTML += `<div class="mojangStatusContainer">
		//         <span class="mojangStatusIcon" style="color: ${MojangRestAPI.statusToHex(service.status)};">&#8226;</span>
		//         <span class="mojangStatusName">${service.name}</span>
		//     </div>`
		// } else {
		// 	tooltipNonEssentialHTML += `<div class="mojangStatusContainer">
		//         <span class="mojangStatusIcon" style="color: ${MojangRestAPI.statusToHex(service.status)};">&#8226;</span>
		//         <span class="mojangStatusName">${service.name}</span>
		//     </div>`
		// }

		if (service.essential) {
			if (service.status === 'yellow' && status !== 'red') {
				status = 'yellow'
				statusGlobalText = 'Problèmes mineurs'
			} else if (service.status === 'red') {
				status = 'off'
				statusGlobalText = 'Problèmes majeurs'
				doWarningMsg = true
			} else {
				if (service.status === 'grey') {
					++greyCount
				}
				++greenCount
			}
		} else {
			if (service.status === 'red' && service.status === 'yellow') {
				++nonEssentialCount
			} else {
				if (service.status === 'grey') {
					++greyCount
				}
				++greenCount
			}
		}
	}

	if (greenCount === statuses.length) {
		if (greyCount === statuses.length) {
			status = 'grey'
			statusGlobalText = 'Inconnu'
		} else {
			status = 'on'
			statusGlobalText = 'Opérationnel'
		}
	}

	if (nonEssentialCount > 0) {
		status = 'yellow'
		statusGlobalText = 'Problèmes mineurs'
	}

	if (doWarningMsg) {
		warningMsg.style.display = ''
	}

	$('.body-sidebar .mojang').fadeOut(150, () => {
		document.querySelector('.mojang .mojang-text .desc span').innerHTML = statusGlobalText;
		document.querySelector('.mojang .mojang-text .desc span').className = (status === 'on' ? 'green' : (status === 'off' ? 'red' : status));
		document.querySelector('.mojang .etat-text .online').className = "online " + status;
		$('.body-sidebar .mojang').fadeIn(250)
	});
}

const refreshServerStatus = async (fade = false) => {
	loggerServer.info('Refreshing Server Status')
	const serv = (await DistroAPI.getDistribution()).getServerById(ConfigManager.getSelectedServer())

	let pVal = 'Fermé'
	let pCount = 0
	let pState = false
	let pPing = 0
	let currentTime = new Date().getTime()

	try {
		const servStat = await getServerStatus(47, serv.hostname, serv.port)
		console.log(servStat)
		pCount = servStat.players.online
		pState = true
		pPing = servStat.retrievedAt - currentTime
		pVal = 'En ligne'
	} catch (err) {
		loggerServer.warn('Unable to refresh server status, assuming offline.')
		loggerServer.debug(err)
	}

	$('.body-sidebar .server').fadeOut(150, () => {
		document.querySelector('.server .etat-text .text').innerHTML = pCount
		document.querySelector('.server .server-text .desc span').innerHTML = pVal
		if (pState) {
			document.querySelector('.server .etat-text .online').classList.add('on')
			document.querySelector('.server .etat-text .online').classList.remove('off')
			document.querySelector('.server .server-text .desc span').classList.add('green')
			document.querySelector('.server .server-text .desc span').classList.remove('red')
			document.querySelector('.server .server-text .desc #ping').innerHTML = '- ' + pPing + 'ms'
		} else {
			document.querySelector('.server .etat-text .online').classList.add('off')
			document.querySelector('.server .etat-text .online').classList.remove('on')
			document.querySelector('.server .server-text .desc #ping').innerHTML = ''
			document.querySelector('.server .server-text .desc span').classList.add('red')
			document.querySelector('.server .server-text .desc span').classList.remove('green')
		}
		$('.body-sidebar .server').fadeIn(250)
	})
}

refreshMojangStatuses()
let mojangStatusListener = setInterval(() => refreshMojangStatuses(true), 60*60*1000)
let serverStatusListener = setInterval(() => refreshServerStatus(true), 300000)

// News
// TODO - Add news
// FIXME - News are not working
const parseNews = async () => { /*
	let news = document.querySelector(".news");
	news.innerHTML = "";
	loggerServer.log("Loading news...");

	try {
		let rss = await fetch("https://gaialaunchernews.blogspot.com/feeds/posts/default").then(res => res.text());
		let rssparse = JSON.parse(convert.xml2json(rss, {
			compact: true
		}));
		if (!rssparse.rss && rssparse.response && rssparse.response.message) {
			let block = document.createElement("div");
			block.classList.add("block");
			if (rssparse.response.message._cdata.indexOf("youtube.com/embed") != -1)
				rssparse.response.message._cdata = rssparse.response.message._cdata.replace(">", " style=\"height: calc((100vmin*1080)/1920)\">");
			block.innerHTML = `
        <div class="news-header">
          <div class="header-text">
            <img class="avatar" src="./assets/images/icon_g_color.png"></img>
            <a class="title" href="https://gaialaunchernews.blogspot.com/">Titre</a>
          </div>
        </div>
        <div class="news-content"><div class="bbWrapper">${rssparse.response.message._cdata}</div></div>
        `;
			news.appendChild(block);
			await sleep(100);
			let anchors = document.querySelectorAll('a[href^="http"]');
			for (let anchor of anchors) {
				anchor.addEventListener("click", (event) => {
					event.preventDefault();
					if (event.target.tagName.toLowerCase() != "a") nw.Shell.openExternal(event.target.parentElement.href);
					else nw.Shell.openExternal(event.target.href);
				});
			}
			return;
		} else rssparse = rssparse.rss;
		if (rssparse.dchannel) rssparse = rssparse.dchannel.item;
		else rssparse = rssparse.channel.item;
		if (!(rssparse instanceof Array)) rssparse = [rssparse];
		if (rssparse.length > 5) rssparse = rssparse.slice(0, 5);
		for await (let item of rssparse) {
			let date = this.toDate(new Date(item["pubDate"]._text));
			let block = document.createElement("div");
			block.classList.add("block");
			let text = item["title"]._text;
			if (text.length > 61) text.slice(0, 61) + "...";
			block.innerHTML = `
        <div class="news-header">
          <div class="header-text">
            <img class="avatar" src="assets/images/avatar.png"></img>
            <a class="title" href="${item["link"]._text}">${item["title"]._text}</a>
          </div>
          <div class="date">
            <div class="day">${date.day}</div>
            <div class="month">${date.month}</div>
          </div>
        </div>
        <div class="news-content">${item["content:encoded"]._cdata.replace(/color: rgb\(255, 255, 255\)/g, "")}</div>
        `;
			let anchors = block.querySelectorAll("a.link.link--external");
			if (anchors.length > 0 && anchors[anchors.length - 1].href.toLowerCase() == item["link"]._text.toLowerCase()) {
				let br = anchors[anchors.length - 1].previousElementSibling;
				anchors[anchors.length - 1].parentElement.removeChild(br);
				anchors[anchors.length - 1].parentElement.removeChild(anchors[anchors.length - 1])
			}
			news.appendChild(block);
		}
	} catch (e) {
		console.error(e);
		let date = this.toDate(new Date());
		let block = document.createElement("div");
		block.classList.add("block");
		block.innerHTML = `
      <div class="news-header error">
        <div class="header-text">
          <img class="avatar" src="./assets/images/icons/error.png"></img>
          <a class="title" href="https://games.valbion.com/launcher">Une erreur est survenue. Merci de réessayer plus tard.</a>
        </div>
      </div>
      `;
		news.appendChild(block);
	}
	let anchors = document.querySelectorAll('a[href^="http"]');
	for (let anchor of anchors) {
		anchor.addEventListener("click", (event) => {
			event.preventDefault();
			if (event.target.tagName.toLowerCase() != "a") nw.Shell.openExternal(event.target.parentElement.href);
			else nw.Shell.openExternal(event.target.href);
		});
	} **/
}

function toDate(date) {
	let months = ["Jan.", "Fév.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Dec."];
	let days = [];
	for (let i = 1; i < 60; i++) days.push(i);
	return {
		day: days[date.getDate() - 1],
		month: months[date.getMonth()]
	}
}

playBtn.addEventListener("click", () => {
	LauncherScript.launchGame()
});

switchBtn.addEventListener("click", async () => {
	await showServerSelector()
});