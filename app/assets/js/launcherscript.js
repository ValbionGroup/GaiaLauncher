/**
 * Launch script
 */

const cp = require('child_process')
const {
	URL
} = require('url')

const {
	RestResponseStatus,
	isDisplayableError,
	validateLocalFile
} = require('gaialauncher-core/common')

const {
	FullRepair,
	DistributionIndexProcessor,
	MojangIndexProcessor,
	downloadFile
} = require('gaialauncher-core/dl')

const {
	validateSelectedJvm,
	ensureJavaDirIsRoot,
	javaExecFromRoot,
	discoverBestJvmInstallation,
	latestOpenJDK,
	extractJdk
} = require('gaialauncher-core/java')

let sidePlay = document.getElementById('play-button');
let homePlay = document.getElementById('play');

let launch = false;
let launched = false;

/* Launch Progress Wrapper Functions */

/**
 * Checks the current server to ensure that they still have permission to play it (checking server code, if applicable) and open up an error popup.
 * @Param {boolean} whether or not to show the error overlay
 */
async function checkCurrentServer(errorPopup = true) {
	const selectedServId = ConfigManager.getSelectedServer()
	if (selectedServId) {
		const selectedServ = (await DistroAPI.getDistribution()).getServerById(selectedServId)
		if (selectedServ) {
			if (selectedServ.rawServer.serverCode && selectedServ.rawServer.serverCode !== '') {
				if (!ConfigManager.getServerCodes().includes(selectedServ.rawServer.serverCode)) {
					if (errorPopup) {
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

	remote.getCurrentWindow().setProgressBar(2);
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

	sidePlay.ariaLabel = "Téléchargement des fichiers — 0%";

	setProgress(percent);
}

/**
 * Permit disabling click on launch area
 * 
 * @param {boolean} bool Whether or not to enable click on launch area
 **/
function toggleLaunchArea(bool) {
	if (bool) {
		homePlay.classList.remove("disabled");
		homePlay.classList.add("enabled");
	} else {
		homePlay.classList.remove("enabled");
		homePlay.classList.add("disabled");
	}
}

function updateDefinedLoader(percent, customText = null) {
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

	if (customText == null) {
		customText = 'Téléchargement des fichiers';
	}

	span.innerHTML = `<b>${customText}</b> — ${Math.floor(percent)}%`;
	sidePlay.ariaLabel = `${customText} — ${Math.floor(percent)}%`;
}

/**
 * Set the value of the OS progress bar and display that on the UI.
 * 
 * @param {number} value The progress value.
 * @param {number} max The total download size.
 * @param {number|string} percent Optional. The percentage to display on the progress label.
 */
function setDownloadPercentage(percent, customText = null) {
	remote.getCurrentWindow().setProgressBar(percent / 100);
	updateDefinedLoader(percent, customText);
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

	remote.getCurrentWindow().setProgressBar(-1);

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
 * @param {boolean} launchAfter Whether we should begin to launch after scanning. 
 */
async function asyncSystemScan(effectiveJavaOptions, launchAfter = true) {

	changeLoaderText('Patienter...')

	const jvmDetails = await discoverBestJvmInstallation(
		ConfigManager.getDataDirectory(),
		effectiveJavaOptions.supported
	)

	if(jvmDetails == null) {

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
			togglePopup(false)
			try {
				downloadJava(effectiveJavaOptions, launchAfter)
			} catch(err) {
				loggerLanding.error('Unhandled error in Java Download', err)
				showLaunchFailure('Error During Java Download', 'See console (CTRL + Shift + i) for more details.')
			}
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
				asyncSystemScan(effectiveJavaOptions, launchAfter)
			})
		})
		togglePopup(true, true)
		
	} else {
		// Java installation found, use this to launch the game.
		const javaExec = javaExecFromRoot(jvmDetails.path)
		ConfigManager.setJavaExecutable(ConfigManager.getSelectedServer(), javaExec)
		ConfigManager.save()

		// We need to make sure that the updated value is on the settings UI.
		// Just incase the settings UI is already open.
		settingsJavaExecVal.value = javaExec
		await populateJavaExecDetails(settingsJavaExecVal.value)

		// TODO Callback hell, refactor
		// TODO Move this out, separate concerns.
		if(launchAfter){
			await dlAsync()
		}
	}
}

async function downloadJava(effectiveJavaOptions, launchAfter = true) {
	
	// TODO Error handling.
    // asset can be null.
    const asset = await latestOpenJDK(
        effectiveJavaOptions.suggestedMajor,
        ConfigManager.getDataDirectory(),
        effectiveJavaOptions.distribution)

    if(asset == null) {
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

        throw new Error('Failed to find OpenJDK distribution.')
    }

    let received = 0
	initDefinedLoader(0)
    await downloadFile(asset.url, asset.path, ({ transferred }) => {
        received = transferred
        setDownloadPercentage(Math.trunc((transferred/asset.size)*100))
    })
    setDownloadPercentage(100)

    if(received != asset.size) {
        loggerLanding.warn(`Java Download: Expected ${asset.size} bytes but received ${received}`)
        if(!await validateLocalFile(asset.path, asset.algo, asset.hash)) {
            log.error(`Hashes do not match, ${asset.id} may be corrupted.`)

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

            // Don't know how this could happen, but report it.
            throw new Error('Downloaded JDK has bad hash, file may be corrupted.')
        }
    }

	// Extract
    // Show installing progress bar.
    remote.getCurrentWindow().setProgressBar(2)

    // Wait for extraction to complete.
    const eLStr = 'Extraction de Java'
    let dotStr = ''
    setUndefinedLoader(eLStr)
    const extractListener = setInterval(() => {
        if(dotStr.length >= 3){
            dotStr = ''
        } else {
            dotStr += '.'
        }
        changeLoaderText(eLStr + dotStr)
    }, 750)

    const newJavaExec = await extractJdk(asset.path)

    // Extraction complete, remove the loading from the OS progress bar.
    remote.getCurrentWindow().setProgressBar(-1)

    // Extraction completed successfully.
    ConfigManager.setJavaExecutable(ConfigManager.getSelectedServer(), newJavaExec)
    ConfigManager.save()

    clearInterval(extractListener)
    setUndefinedLoader('Java installé !')

    // TODO Callback hell
    // Refactor the launch functions
    asyncSystemScan(effectiveJavaOptions, launchAfter)

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

async function dlAsync(login = true) {

	// Login parameter is temporary for debug purposes. Allows testing the validation/downloads without
    // launching the game.

	const loggerLaunchSuite = LoggerUtil.getLogger('LaunchSuite')

	setUndefinedLoader('Chargement...')

	let distro

	try {
        distro = await DistroAPI.refreshDistributionOrFallback()
        onDistroRefresh(distro)
    } catch(err) {
        loggerLaunchSuite.error('Unable to refresh distribution index.', err)
		showLaunchFailure('Erreur fatale', 'Impossible de charger une copie de l\'index de distribution. Consultez la console (CTRL + Shift + i) pour plus de détails.')
        return
    }

	const serv = distro.getServerById(ConfigManager.getSelectedServer())

	if(login) {
        if(ConfigManager.getSelectedAccount() == null){
            loggerLanding.error('You must be logged into an account.')
            return
        }
    }

    setUndefinedLoader('Chargement des informations sur la version...')
    toggleLaunchArea(true)

	const fullRepairModule = new FullRepair(
        ConfigManager.getCommonDirectory(),
        ConfigManager.getInstanceDirectory(),
        ConfigManager.getLauncherDirectory(),
        ConfigManager.getSelectedServer(),
        DistroAPI.isDevMode()
    )

	fullRepairModule.spawnReceiver()

	fullRepairModule.childProcess.on('error', (err) => {
        loggerLaunchSuite.error('Error during launch', err)
		showLaunchFailure('Un problème est survenu', err.message || 'Voir la console (CTRL + Shift + i) pour plus de détails.')
	})
	fullRepairModule.childProcess.on('close', (code, _signal) => {
		if (code !== 0) {
            loggerLaunchSuite.error(`Full Repair Module exited with code ${code}, assuming error.`)
			showLaunchFailure('Un problème est survenu', 'Voir la console (CTRL + Shift + i) pour plus de détails.')
		}
	})

	loggerLaunchSuite.info('Validating files.')
    setUndefinedLoader('Validation de l\'intégrité des assets...')
    let invalidFileCount = 0
    try {
        invalidFileCount = await fullRepairModule.verifyFiles(percent => {
			if (percent === 0) {
				initDefinedLoader(0)
			}
            setDownloadPercentage(percent, 'Validation de l\'intégrité des assets')
        })
        setDownloadPercentage(100, 'Validation de l\'intégrité des assets')
    } catch (err) {
        loggerLaunchSuite.error('Error during file validation.')
        showLaunchFailure('Erreur lors de la vérification du fichier', err.displayable || 'Voir la console (CTRL + Shift + i) pour plus de détails.')
        return
    }
    

    if(invalidFileCount > 0) {
        loggerLaunchSuite.info('Downloading files.')
        initDefinedLoader(0)
        changeLoaderText('Téléchargement des fichiers...')
        try {
            await fullRepairModule.download(percent => {
                setDownloadPercentage(percent)
            })
            setDownloadPercentage(100)
        } catch(err) {
            loggerLaunchSuite.error('Error during file download.')
            showLaunchFailure('Erreur lors du téléchargement d\'un fichier', err.displayable || 'Voir la console (CTRL + Shift + i) pour plus de détails.')
            return
        }
    } else {
        loggerLaunchSuite.info('No invalid files, skipping download.')
    }

    // Remove download bar.
    remote.getCurrentWindow().setProgressBar(-1)

    fullRepairModule.destroyReceiver()

    setUndefinedLoader('Préparation du lancement...')

	const mojangIndexProcessor = new MojangIndexProcessor(
        ConfigManager.getCommonDirectory(),
        serv.rawServer.minecraftVersion)
    const distributionIndexProcessor = new DistributionIndexProcessor(
        ConfigManager.getCommonDirectory(),
        distro,
        serv.rawServer.id
    )

    const forgeData = await distributionIndexProcessor.loadForgeVersionJson(serv)
    const versionData = await mojangIndexProcessor.getVersionJson()

	if(login) {
        const authUser = ConfigManager.getSelectedAccount()
        loggerLaunchSuite.info(`Sending selected account (${authUser.displayName}) to ProcessBuilder.`)
        let pb = new ProcessBuilder(serv, versionData, forgeData, authUser, remote.app.getVersion())
        setUndefinedLoader('Lancement...')

        // const SERVER_JOINED_REGEX = /\[.+\]: \[CHAT\] [a-zA-Z0-9_]{1,16} joined the game/
        const SERVER_JOINED_REGEX = new RegExp(`\\[.+\\]: \\[CHAT\\] ${authUser.displayName} joined the game`)

        const onLoadComplete = () => {
            toggleLaunchArea(false)
            if(hasRPC){
                DiscordWrapper.updateDetails('Chargement du jeu..')
                proc.stdout.on('data', gameStateChange)
            }
            proc.stdout.removeListener('data', tempListener)
            proc.stderr.removeListener('data', gameErrorListener)
        }
        const start = Date.now()

		// Attach a temporary listener to the client output.
        // Will wait for a certain bit of text meaning that
        // the client application has started, and we can hide
        // the progress bar stuff.
        const tempListener = function(data){
            if(GAME_LAUNCH_REGEX.test(data.trim())){
                const diff = Date.now()-start
                if(diff < MIN_LINGER) {
                    setTimeout(onLoadComplete, MIN_LINGER-diff)
                } else {
                    onLoadComplete()
                }
            }
        }

		// Listener for Discord RPC.
		const gameStateChange = function(data){
			data = data.trim()
			if(SERVER_JOINED_REGEX.test(data)){
				DiscordWrapper.updateDetails('Explore le monde !')
			} else if(GAME_JOINED_REGEX.test(data)){
				DiscordWrapper.updateDetails('Explore le monde !')
			}
		}

		const gameErrorListener = function(data){
            data = data.trim()
            if(data.indexOf('Could not find or load main class net.minecraft.launchwrapper.Launch') > -1){
				loggerLaunchSuite.error('Game launch failed, LaunchWrapper was not downloaded properly.')
				showLaunchFailure('Un problème est survenu', 'Le fichier principal, LaunchWrapper, n\'a pas pu être téléchargé correctement. Par conséquent, le jeu ne peut pas être lancé.<br><br>Pour résoudre ce problème, désactivez temporairement votre logiciel antivirus et lancez à nouveau le jeu.<br><br>Si vous avez le temps, veuillez <a href="https://github.com/ValbionGroup/GaiaLauncher/issues">soumettre un problème</a> et nous faire savoir quel logiciel antivirus vous utilisez. Nous allons les contacter et essayer d\'arranger les choses.')
			}
		}

		try {
            // Build Minecraft process.
            proc = pb.build()

            // Bind listeners to stdout.
            proc.stdout.on('data', tempListener)
            proc.stderr.on('data', gameErrorListener)

			setUndefinedLoader('Terminé. Bon jeu !')
			launched = true
			setTimeout(() => {
				stopLoading()
			}, 10000)

            // Init Discord Hook
            if(distro.rawDistribution.discord != null && serv.rawServerdiscord != null){
                DiscordWrapper.initRPC(distro.rawDistribution.discord, serv.rawServer.discord)
                hasRPC = true
                proc.on('close', (code, signal) => {
                    loggerLaunchSuite.info('Shutting down Discord Rich Presence..')
                    DiscordWrapper.shutdownRPC()
                    hasRPC = false
                    proc = null
                })
            }

			proc.on('close', (code, signal) => {
				launched = false
				launch = false
			})

        } catch(err) {

            loggerLaunchSuite.error('Error during launch', err)
			showLaunchFailure('Un problème est survenu', 'Veuillez consulter la console (CTRL + Shift + i) pour plus de détails.')

        }
    }
}

exports.launchGame = async function () {
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

	if (await checkCurrentServer(true)) {
		launch = true;

		try {
            const server = (await DistroAPI.getDistribution()).getServerById(ConfigManager.getSelectedServer())
            const jExe = ConfigManager.getJavaExecutable(ConfigManager.getSelectedServer())
            if(jExe == null){
                await asyncSystemScan(server.effectiveJavaOptions)
            } else {
				changeLoaderText("Merci de patienter...")
                toggleLaunchArea(true)

                const details = await validateSelectedJvm(ensureJavaDirIsRoot(jExe), server.effectiveJavaOptions.supported)
                if(details != null){
                    await dlAsync()

                } else {
                    await asyncSystemScan(server.effectiveJavaOptions)
                }
            }
        } catch(err) {
			console.error('Error during launch', err)
            showLaunchFailure('Erreur lors du lancement', 'Voir la console (CTRL + Shift + i) pour plus de détails.')
        }
	}
}