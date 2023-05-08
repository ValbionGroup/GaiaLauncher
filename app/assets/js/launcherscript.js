/**
 * Launch script
 */

const cp = require('child_process')
const {
	URL
} = require('url')

const {
	RestResponseStatus,
	isDisplayableError
} = require('gaialauncher-core/common')

let sidePlay = document.getElementById('play-button');
let homePlay = document.getElementById('play');

let launch = false;
let launched = false;

/* Launch Progress Wrapper Functions */

/**
 * Checks the current server to ensure that they still have permission to play it (checking server code, if applicable) and open up an error popup.
 * @Param {boolean} whether or not to show the error overlay
 */
function checkCurrentServer(errorPopup = true) {
	const selectedServId = ConfigManager.getSelectedServer()
	if (selectedServId) {
		const selectedServ = DistroManager.getDistribution().getServer(selectedServId)
		if (selectedServ) {
			if (selectedServ.getServerCode() && selectedServ.getServerCode() !== '') {
				if (!ConfigManager.getServerCodes().includes(selectedServ.getServerCode())) {
					setPopupContent(
						'Serveur actuel restreint !',
						'Il semble que vous n\'ayez plus le code serveur requis pour accéder à ce serveur ! Veuillez passer à un autre serveur pour jouer.<br><br>Si vous pensez qu\'il s\'agit d\'une erreur, veuillez contacter l\'administrateur du serveur.',
						'information',
						'Changer de serveur'
					)
					setPopupHandler(() => {
						stopLoading()
						togglePopup(false)
						toggleServerSelection(true)
					})
					setDismissHandler(() => {
						stopLoading()
						togglePopup(false)
					})
					togglePopup(true, true)
					return false
				}
			}
		}
		return true
	}
}

/**
 * Change display to undifined loader percentage
 * 
 * @param {string} text 
 */
function setUndefinedLoader(text = null) {
	sidePlay.classList.remove("twoline");
	sidePlay.classList.add("start");
	sidePlay.innerHTML = `<div class="progress-ring"><svg><circle cx="9" cy="9" r="9"></circle><circle cx="9" cy="9" r="9"></circle></svg></div>`;

	homePlay.classList.add("start");
	homePlay.innerHTML = `<div class="progress-ring"><svg><circle cx="9" cy="9" r="9"></circle><circle cx="9" cy="9" r="9"></circle></svg></div><span></span>`;

	let circles = [
		sidePlay.querySelector(".progress-ring circle:nth-child(2)"),
		homePlay.querySelector(".progress-ring circle:nth-child(2)")
	]

	let span = homePlay.querySelector("span");
	span.innerHTML = text;

	sidePlay.ariaLabel = text;

	let circumference = 18 * Math.PI;

	for (let circle of circles) {
		circle.style.strokeDasharray = `${circumference} ${circumference}`;
		circle.style.strokeDashoffset = circumference;
	}

	let setProgress = (percent) => {
		const offset = circumference - percent / 100 * circumference;
		for (let circle of circles) {
			circle.style.strokeDashoffset = offset;
		}
	}

	let loading = () => {
		let side = sidePlay.querySelector(".progress-ring");
		let home = homePlay.querySelector(".progress-ring");

		let rotate = 0;

		let interval;
		setProgress(15);
		interval = setInterval(() => {
			rotate += 10;
			side.setAttribute("style", `transform: translate(-50%, -50%) rotate(${rotate}deg);`);
			home.setAttribute("style", `transform: rotate(${rotate}deg);`);
			if (rotate >= 360) rotate = 0;
		}, 25);
		return interval;
	}

	setProgress(100);
	let loadinterval = loading();
}

/**
 * Show loading annimation with defined percentage
 * 
 * @param {int} percent Percentage of loading
 * @param {string} text Text to display
 */
function initDefinedLoader(percent) {
	sidePlay.classList.add("start");
	sidePlay.innerHTML = `<div class="progress-ring"><svg><circle cx="9" cy="9" r="9"></circle><circle cx="9" cy="9" r="9"></circle></svg></div>`;

	homePlay.classList.add("start");
	homePlay.innerHTML = `<div class="progress-ring"><svg><circle cx="9" cy="9" r="9"></circle><circle cx="9" cy="9" r="9"></circle></svg></div><span></span>`;

	let circles = [
		sidePlay.querySelector(".progress-ring circle:nth-child(2)"),
		homePlay.querySelector(".progress-ring circle:nth-child(2)")
	]

	sidePlay.classList.add("twoline");

	let circumference = 18 * Math.PI;

	for (let circle of circles) {
		circle.style.strokeDasharray = `${circumference} ${circumference}`;
		circle.style.strokeDashoffset = circumference;
	}

	let setProgress = (percent) => {
		const offset = circumference - percent / 100 * circumference;
		for (let circle of circles) {
			circle.style.strokeDashoffset = offset;
		}
	}
	setProgress(0);

	let span = homePlay.querySelector("span");
	span.innerHTML = "<b>Téléchargement des fichiers</b> — 0%";

	sidePlay.ariaLabel = "Téléchargement des fichiers — 0%\n0 Mo sur 0 Mo";

	setProgress(percent);
}

function updateDefinedLoader(value, max, percent = ((value / max) * 100)) {
	let circumference = 18 * Math.PI;
	let circles = [
		sidePlay.querySelector(".progress-ring circle:nth-child(2)"),
		homePlay.querySelector(".progress-ring circle:nth-child(2)")
	]

	let setProgress = (percent) => {
		const offset = circumference - percent / 100 * circumference;
		for (let circle of circles) {
			circle.style.strokeDashoffset = offset;
		}
	}
	let span = homePlay.querySelector("span");

	setProgress(percent);
	span.innerHTML = `<b>Téléchargement des fichiers</b> — ${Math.floor(percent)}%`;

	sidePlay.ariaLabel = `Téléchargement des fichiers — ${Math.floor(percent)}%\n${Math.floor(value / 1024 / 1024)} Mo sur ${Math.floor(max / 1024 / 1024)} Mo`;
}

/**
 * Set the value of the OS progress bar and display that on the UI.
 * 
 * @param {number} value The progress value.
 * @param {number} max The total download size.
 * @param {number|string} percent Optional. The percentage to display on the progress label.
 */
function setDownloadPercentage(value, max, percent = ((value / max) * 100)) {
	remote.getCurrentWindow().setProgressBar(value / max)
	updateDefinedLoader(value, max, percent);
}

/**
 * Change the loader text
 * 
 * @param {string} text Text to display
 */
function changeLoaderText(text) {
	sidePlay.classList.remove("twoline");
	let span = homePlay.querySelector("span");
	span.innerHTML = text;

	sidePlay.ariaLabel = text;
}

/**
 * Stop the loading animation.
 */
function stopLoading() {
	sidePlay.classList.remove("start");
	sidePlay.classList.remove("twoline");
	sidePlay.innerHTML = ``;

	homePlay.classList.remove("start");
	homePlay.innerHTML = `JOUER`;

	sidePlay.ariaLabel = "Jouer";

	launch = false;
}

/**
 * Display an error popup
 * 
 * @param {string} title Title of the popup
 * @param {desc} desc Description of the popup
 */
function showLaunchFailure(title, desc){
    setPopupContent(
        title,
        desc,
		'warning',
        'Okay'
    )
    setPopupHandler(() => {
		togglePopup(false)
	})
    togglePopup(true)
    stopLoading()
}

/* System (Java) Scan */

let sysAEx
let scanAt

let extractListener

/**
 * Asynchronously scan the system for valid Java installations.
 * 
 * @param {string} mcVersion The Minecraft version we are scanning for.
 * @param {boolean} launchAfter Whether we should begin to launch after scanning. 
 */
async function asyncSystemScan(effectiveJavaOptions, launchAfter = true) {

	changeLoaderText('Patienter...')

	const jvmDetails = await discoverBestJvmInstallation(
        ConfigManager.getDataDirectory(),
        effectiveJavaOptions.supported
    )

	const forkEnv = JSON.parse(JSON.stringify(process.env))
	forkEnv.CONFIG_DIRECT_PATH = ConfigManager.getLauncherDirectory()

	// Fork a process to run validations.
	sysAEx = cp.fork(path.join(__dirname, 'assetexec.js'), [
		'JavaGuard',
		mcVersion
	], {
		env: forkEnv,
		stdio: 'pipe'
	})
	// Stdout
	sysAEx.stdio[1].setEncoding('utf8')
	sysAEx.stdio[1].on('data', (data) => {
		// loggerSysAEx.log(data)
	})
	// Stderr
	sysAEx.stdio[2].setEncoding('utf8')
	sysAEx.stdio[2].on('data', (data) => {
		// loggerSysAEx.log(data)
	})

	sysAEx.on('message', (m) => {

		if (m.context === 'validateJava') {
			if (m.result == null) {
				// If the result is null, no valid Java installation was found.
				// Show this information to the user.
				setPopupContent(
					'Pas d\'installation Java valide',
					'Afin de rejoindre un serveur, vous avez besoin de Java 8 minimum. Voulez vous installer une version de Java ?',
					'warning',
					'Installer Java',
					'Installer manuellement'
				)
				setPopupHandler(() => {
					changeLoaderText('Préparation du téléchargement de Java...')
					sysAEx.send({
						task: 'changeContext',
						class: 'AssetGuard',
						args: [ConfigManager.getCommonDirectory(), ConfigManager.getJavaExecutable()]
					})
					sysAEx.send({
						task: 'execute',
						function: '_enqueueOpenJDK',
						argsArr: [ConfigManager.getDataDirectory()]
					})
					togglePopup(false)
				})
				setDismissHandler(() => {
					togglePopup(false)
					setPopupContent(
						'Java est requis pour jouer',
						'Une installation valide de Java 8 x64 minimum est requise pour jouer.<br><br>Merci de vous référer à <a href="https://github.com/dscalzi/HeliosLauncher/wiki/Java-Management#manually-installing-a-valid-version-of-java">Java Management Guide</a> pour installer manuellement Java.',
						'information',
						'J\'ai compris',
						'Retour'
					)
					setPopupHandler(() => {
						stopLoading()
						togglePopup(false)
					})
					setDismissHandler(() => {
						togglePopup(false, true)
						asyncSystemScan()
					})
				})
				togglePopup(true, true)

			} else {
				// Java installation found, use this to launch the game.
				ConfigManager.setJavaExecutable(m.result)
				ConfigManager.save()

				// We need to make sure that the updated value is on the settings UI.
				// Just incase the settings UI is already open.
				settingsJavaExecVal.value = m.result
				populateJavaExecDetails(settingsJavaExecVal.value)

				if (launchAfter) {
					dlAsync()
				}
				sysAEx.disconnect()
			}

		} else if (m.context === '_enqueueOpenJDK') {

			if (m.result === true) {

				// Oracle JRE enqueued successfully, begin download.
				changeLoaderText('Téléchargement de Java...')
				sysAEx.send({
					task: 'execute',
					function: 'processDlQueues',
					argsArr: [
						[{
							id: 'java',
							limit: 1
						}]
					]
				})

			} else {

				// Oracle JRE enqueue failed. Probably due to a change in their website format.
				// User will have to follow the guide to install Java.
				setPopupContent(
					'Téléchargement de Java échoué',
					'Malheureusement, nous avons rencontré un problème lors de l\'installation de Java. Vous devrez installer manuellement une copie. Veuillez consulter notre <a href="https://github.com/dscalzi/HeliosLauncher/wiki">Troubleshooting Guide</a> pour plus de détails et d\'instructions.',
					'warning',
					'J\'ai compris',
				)
				setPopupHandler(() => {
					togglePopup(false)
					stopLoading()
				})
				togglePopup(true)
				sysAEx.disconnect()

			}

		} else if (m.context === 'progress') {

			initDefinedLoader(0)

			switch (m.data) {
				case 'download':
					setDownloadPercentage(m.value, m.total, m.percent)
					break
			}

		} else if (m.context === 'complete') {

			switch (m.data) {
				case 'download': {
					remote.getCurrentWindow().setProgressBar(2)

					const eLStr = 'Extracting'
					let dotStr = ''
					changeLoaderText(eLStr)
					extractListener = setInterval(() => {
						if (dotStr.length >= 3) {
							dotStr = ''
						} else {
							dotStr += '.'
						}
						changeLoaderText(eLStr + dotStr)
					}, 750)
					break
				}
				case 'java':
					remote.getCurrentWindow().setProgressBar(-1)

					ConfigManager.setJavaExecutable(m.args[0])
					ConfigManager.save()

					if (extractListener != null) {
						clearInterval(extractListener)
						extractListener = null
					}

					setUndefinedLoader('Java installé')

					setTimeout(() => {
						if (launchAfter) {
							dlAsync()
						}

						sysAEx.disconnect()
					}, 2000)

					break
			}

		} else if (m.context === 'error') {
			console.log(m.error)
		}
	})

	changeLoaderText('Vérification du système...')
	sysAEx.send({
		task: 'execute',
		function: 'validateJava',
		argsArr: [ConfigManager.getDataDirectory()]
	})

}


// Keep reference to Minecraft Process
let proc
// Is DiscordRPC enabled
let hasRPC = false
// Joined server regex
// Change this if your server uses something different.
const GAME_JOINED_REGEX = /\[.+\]: Sound engine started/
const GAME_LAUNCH_REGEX = /^\[.+\]: (?:MinecraftForge .+ Initialized|ModLauncher .+ starting: .+)$/
const MIN_LINGER = 5000

let aEx
let serv
let versionData
let forgeData

let progressListener

function dlAsync() {

	changeLoaderText('Chargement...')

	const forkEnv = JSON.parse(JSON.stringify(process.env))
	forkEnv.CONFIG_DIRECT_PATH = ConfigManager.getLauncherDirectory()

	// Start AssetExec to run validations and downloads in a forked process.
	aEx = cp.fork(path.join(__dirname, 'assetexec.js'), [
		'AssetGuard',
		ConfigManager.getCommonDirectory(),
		ConfigManager.getJavaExecutable()
	], {
		env: forkEnv,
		stdio: 'pipe'
	})
	// Stdout
	aEx.stdio[1].setEncoding('utf8')
	aEx.stdio[1].on('data', (data) => {
		// loggerAEx.log(data)
	})
	// Stderr
	aEx.stdio[2].setEncoding('utf8')
	aEx.stdio[2].on('data', (data) => {
		// loggerAEx.log(data)
	})
	aEx.on('error', (err) => {
		// loggerLaunchSuite.error('Error during launch', err)
		showLaunchFailure('Un problème est survenu', err.message || 'Voir la console (CTRL + Shift + i) pour plus de détails.')
	})
	aEx.on('close', (code, signal) => {
		if (code !== 0) {
			// loggerLaunchSuite.error(`AssetExec exited with code ${code}, assuming error.`)
			showLaunchFailure('Un problème est survenu', 'Voir la console (CTRL + Shift + i) pour plus de détails.')
		}
	})

	// Establish communications between the AssetExec and current process.
	initDefinedLoader(0)
	aEx.on('message', (m) => {

		if (m.context === 'validate') {
			switch (m.data) {
				case 'distribution':
					initDefinedLoader(20)
					// loggerLaunchSuite.log('Validated distibution index.')
					changeLoaderText('Chargement des informations sur la version...')
					break
				case 'version':
					initDefinedLoader(40)
					// loggerLaunchSuite.log('Version data loaded.')
					changeLoaderText('Validation de l\'intégrité des assets..')
					break
				case 'assets':
					initDefinedLoader(60)
					// loggerLaunchSuite.log('Asset Validation Complete')
					changeLoaderText('Validation de l\'intégrité de la bibliothèque..')
					break
				case 'libraries':
					initDefinedLoader(80)
					// loggerLaunchSuite.log('Library validation complete.')
					changeLoaderText('Validation de l\'intégrité de divers fichiers...')
					break
				case 'files':
					initDefinedLoader(100)
					// loggerLaunchSuite.log('File validation complete.')
					changeLoaderText('Téléchargement des fichiers...')
					break
			}
		} else if (m.context === 'progress') {
			switch (m.data) {
				case 'assets': {
					const perc = (m.value / m.total) * 20
					updateDefinedLoader(40 + perc, 100, parseInt(40 + perc))
					break
				}
				case 'download':
					setDownloadPercentage(m.value, m.total, m.percent)
					break
				case 'extract': {
					// Show installing progress bar.
					remote.getCurrentWindow().setProgressBar(2)

					// Download done, extracting.
					const eLStr = 'Extraction des bibliothèques'
					let dotStr = ''
					setUndefinedLoader(eLStr)
					progressListener = setInterval(() => {
						if (dotStr.length >= 3) {
							dotStr = ''
						} else {
							dotStr += '.'
						}
						changeLoaderText(eLStr + dotStr)
					}, 750)
					break
				}
			}
		} else if (m.context === 'complete') {
			switch (m.data) {
				case 'download':
					remote.getCurrentWindow().setProgressBar(-1)
					if (progressListener != null) {
						clearInterval(progressListener)
						progressListener = null
					}

					changeLoaderText('Préparation du lancement...')
					break
			}
		} else if (m.context === 'error') {
			switch (m.data) {
				case 'download':
					// loggerLaunchSuite.error('Error while downloading:', m.error)

					if (m.error.code === 'ENOENT') {
						showLaunchFailure(
							'Erreur de téléchargement',
							'Impossible de se connecter au serveur de fichiers.<br/>Assurez-vous que vous êtes connecté à Internet et réessayez.'
						)
					} else {
						showLaunchFailure(
							'Erreur de téléchargement',
							'Consultez la console (CTRL + Shift + i) pour plus de détails. Veuillez réessayer.'
						)
					}

					remote.getCurrentWindow().setProgressBar(-1)

					// Disconnect from AssetExec
					aEx.disconnect()
					break
			}
		} else if (m.context === 'validateEverything') {

			let allGood = true

			if (m.result.forgeData == null || m.result.versionData == null) {
				// loggerLaunchSuite.error('Error during validation:', m.result)

				// loggerLaunchSuite.error('Error during launch', m.result.error)
				showLaunchFailure('Un problème est survenu', 'Consultez la console (CTRL + Shift + i) pour plus de détails. Veuillez réessayer.')

				allGood = false
			}

			forgeData = m.result.forgeData
			versionData = m.result.versionData

			if (allGood) {
				launched = true
				const authUser = ConfigManager.getSelectedAccount()
				// loggerLaunchSuite.log(`Sending selected account (${authUser.displayName}) to ProcessBuilder.`)
				let pb = new ProcessBuilder(serv, versionData, forgeData, authUser, remote.app.getVersion())
				changeLoaderText('Lancement du jeu...')

				const SERVER_JOINED_REGEX = new RegExp(`\\[.+\\]: \\[CHAT\\] ${authUser.displayName} has joined!`)
				const SERVER_LEAVE_REGEX = new RegExp(`\\[.+\\]: \\[CHAT\\] ${authUser.displayName} has left!`)

				const onLoadComplete = () => {
					toggleLaunchArea(false)
					if (hasRPC) {
						DiscordWrapper.startGamePresence(DistroManager.getDistribution().discord, serv.discord)
					}
					gameCrashReportListener()
					proc.stdout.on('data', gameStateChange)
					proc.stdout.removeListener('data', tempListener)
					proc.stderr.removeListener('data', gameErrorListener)
				}
				const start = Date.now()

				// Attach a temporary listener to the client output.
				// Will wait for a certain bit of text meaning that
				// the client application has started, and we can hide
				// the progress bar stuff.
				const tempListener = function (data) {
					if (GAME_LAUNCH_REGEX.test(data.trim())) {
						const diff = Date.now() - start
						if (diff < MIN_LINGER) {
							setTimeout(onLoadComplete, MIN_LINGER - diff)
						} else {
							onLoadComplete()
						}
					}
				}

				// Listener for Discord RPC.
				const gameStateChange = function (data) {
					data = data.trim()
					if (GAME_LAUNCH_REGEX.test(data)) {
						DiscordWrapper.updateDetails('Explore le monde !')
						DiscordWrapper.resetTime()
					}
				}

				// Listener for Crash Reports.
				const gameCrashReportListener = function () {
					const watcher = chokidar.watch(path.join(ConfigManager.getInstanceDirectory(), serv.getID(), 'crash-reports'), {
						persistent: true,
						ignoreInitial: true
					})

					watcher.on('add', path => {
						shell.showItemInFolder(path)
						setPopupContent(
							'Le jeu s\'est arrêté !',
							'Oh oh ! Il semble que votre jeu vienne de crasher. Nous avons ouvert le dossier des rapports de crash afin que vous puissiez facilement le partager avec notre équipe.<br/>Si vous avez des crashs répétés, nous vous recommandons toujours de venir nous voir sur <a href="https://github.com/ValbionGroup/GaiaLauncher">Github !</a><br><br>Pour référence future, l\'emplacement du fichier de votre rapport de crash est le suivant : <br>' + path,
							'information',
							'Ok, merci !',
							'Ouvrir le rapport de crash'
						)
						setPopupHandler(() => {
							stopLoading()
							launched = false
							togglePopup(false)
						})
						setDismissHandler(() => {
							shell.openPath(path)
						})
						togglePopup(true, true)
					})
				}

				const gameErrorListener = function (data) {
					data = data.trim()
					if (data.indexOf('Could not find or load main class net.minecraft.launchwrapper.Launch') > -1) {
						// loggerLaunchSuite.error('Game launch failed, LaunchWrapper was not downloaded properly.')
						showLaunchFailure('Un problème est survenu', 'Le fichier principal, LaunchWrapper, n\'a pas pu être téléchargé correctement. Par conséquent, le jeu ne peut pas être lancé.<br><br>Pour résoudre ce problème, désactivez temporairement votre logiciel antivirus et lancez à nouveau le jeu.<br><br>Si vous avez le temps, veuillez <a href="https://github.com/ValbionGroup/GaiaLauncher/issues">soumettre un problème</a> et nous faire savoir quel logiciel antivirus vous utilisez. Nous allons les contacter et essayer d\'arranger les choses.')
					}
				}

				try {
					// Build Minecraft process.
					proc = pb.build()

					// Bind listeners to stdout.
					proc.stdout.on('data', tempListener)
					proc.stderr.on('data', gameErrorListener)

					changeLoaderText('Terminé. Bon jeu !')
					launched = true
					setTimeout(() => {
						stopLoading()
					}, 10000)
					proc.on('close', (code, signal) => {
						launched = false
						if (hasRPC) {
							const serv = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer())
							DiscordWrapper.stopGamePresence(DistroManager.getDistribution().discord, "Le jeu a été arrêté.")
							DiscordWrapper.updateDetails('Prêt à jouer')
							DiscordWrapper.updateState('> Sur ' + serv.getName())
						}
					})

				} catch (err) {

					// loggerLaunchSuite.error('Error during launch', err)
					showLaunchFailure('Un problème est survenu', 'Veuillez consulter la console (CTRL + Shift + i) pour plus de détails.')

				}
			}

			// Disconnect from AssetExec
			aEx.disconnect()

		}
	})

	// Begin Validations

	// Validate Forge files.
	setUndefinedLoader('Chargement des informations du serveur...')

	refreshDistributionIndex(true, (data) => {
		onDistroRefresh(data)
		serv = data.getServer(ConfigManager.getSelectedServer())
		aEx.send({
			task: 'execute',
			function: 'validateEverything',
			argsArr: [ConfigManager.getSelectedServer(), DistroManager.isDevMode()]
		})
	}, (err) => {
		// loggerLaunchSuite.log('Error while fetching a fresh copy of the distribution index.', err)
		refreshDistributionIndex(false, (data) => {
			onDistroRefresh(data)
			serv = data.getServer(ConfigManager.getSelectedServer())
			aEx.send({
				task: 'execute',
				function: 'validateEverything',
				argsArr: [ConfigManager.getSelectedServer(), DistroManager.isDevMode()]
			})
		}, (err) => {
			// loggerLaunchSuite.error('Unable to refresh distribution index.', err)
			if (DistroManager.getDistribution() == null) {
				showLaunchFailure('Erreur fatale', 'Impossible de charger une copie de l\'index de distribution. Consultez la console (CTRL + Shift + i) pour plus de détails.')

				// Disconnect from AssetExec
				aEx.disconnect()
			} else {
				serv = data.getServer(ConfigManager.getSelectedServer())
				aEx.send({
					task: 'execute',
					function: 'validateEverything',
					argsArr: [ConfigManager.getSelectedServer(), DistroManager.isDevMode()]
				})
			}
		})
	})
}

exports.launchGame = function () {
	if (launch) return;

	if (launched) {
		setPopupContent("Jeu déjà lancé", "Hop hop hop papillon !<br/><br/>Le jeu est déjà lancé, ça ne sert à rien de le relancer.<br/>Si vous pensez que c'est une erreur et que le jeu n'est pas lancé, relancer le launcher afin de pouvoir démarrer le jeu.", "warning", "OK");
		setPopupHandler(() => {
			togglePopup(false);
		})
		togglePopup(true, false);
		return;
	}

	setUndefinedLoader("Authentification...");
	const isLoggedIn = Object.keys(ConfigManager.getAuthAccounts()).length > 0

	if (!isLoggedIn) {
		setPopupContent("Aucun compte sélectionné", "Pour pouvoir jouer vous devez vous connecter avec une compte premium <b>Minecraft : Java Edition</b><br/>Veuillez vous connectez.", "warning", "Me connecter", "Annuler");
		setPopupHandler(() => {
			togglePopup(false);
			stopLoading();
			switchView(getCurrentView(), VIEWS.account);
		})
		setDismissHandler(() => {
			togglePopup(false);
			stopLoading();
		});
		togglePopup(true, true);
		return;
	}


	changeLoaderText("Vérification des paramètres...");

	if (checkCurrentServer()) {
		if (ConfigManager.getConsoleOnLaunch()) {
			let window = remote.getCurrentWindow()
			window.toggleDevTools()
		}

		launch = true;
		// logger.log('Launching game...')

		changeLoaderText("Vérification de Java...");

		const mcVersion = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer()).getMinecraftVersion()

		const jExe = ConfigManager.getJavaExecutable()

		if (jExe == null) {
			asyncSystemScan(mcVersion)
		} else {
			const jg = new JavaGuard(mcVersion)
			jg._validateJavaBinary(jExe).then((v) => {
				// logger.log('Java version meta', v)
				if (v.valid) {
					dlAsync()
				} else {
					changeLoaderText("Vérification du système...");
					asyncSystemScan(mcVersion)
				}
			})
		}
	}
}