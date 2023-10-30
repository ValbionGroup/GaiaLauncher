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
				<div class="icon"><img src="${serv.rawServer.launcherPage.icon}" /></div>
				<div class="title">${serv.rawServer.name}</div>
				<div class="description">${serv.rawServer.description}</div>
				<div class="switch icon-switchServer"></div>
			</div>
		`
}

/**
 * Recursively build the mod UI elements.
 * 
 * @param {Object[]} mdls An array of modules to parse.
 * @param {boolean} submodules Whether or not we are parsing submodules.
 * @param {Object} servConf The server configuration object for this module level.
 */
function parseModulesForUI(mdls, submodules, servConf){

    let reqMods = ''
    let optMods = ''

    for(const mdl of mdls){

        if(mdl.rawModule.type === Type.ForgeMod || mdl.rawModule.type === Type.LiteMod || mdl.rawModule.type === Type.LiteLoader){

            if(mdl.getRequired().value){

                reqMods += `<div id="${mdl.getVersionlessMavenIdentifier()}" class="base-mod settings-${submodules ? 'sub' : ''}mod" enabled>
                    <div class="mod-content">
                        <div class="main-wrapper">
                            <div class="status active"></div>
                            <div class="details">
                                <span class="name">${mdl.rawModule.name}</span>
                                <span class="version">v${mdl.mavenComponents.version}</span>
                            </div>
                        </div>
                        <label class="mod-switch" reqmod>
                            <input type="checkbox" checked>
                            <span class="switch-slider"></span>
                        </label>
                    </div>
                    ${mdl.subModules.length > 0 ? `<div class="base-mod">
                        ${Object.values(parseModulesForUI(mdl.subModules, true, servConf[mdl.getVersionlessMavenIdentifier()])).join('')}
                    </div>` : ''}
                </div>`

            } else {

                const conf = servConf[mdl.getVersionlessMavenIdentifier()]
                const val = typeof conf === 'object' ? conf.value : conf

                optMods += `<div id="${mdl.getVersionlessMavenIdentifier()}" class="base-mod settings-${submodules ? 'sub' : ''}mod" ${val ? 'enabled' : ''}>
                    <div class="mod-content">
                        <div class="main-wrapper">
                            <div class="status ${val ? 'active' : ''}"></div>
                            <div class="details">
                                <span class="name">${mdl.rawModule.name}</span>
                                <span class="version">v${mdl.mavenComponents.version}</span>
                            </div>
                        </div>
                        <label class="mod-switch">
                            <input type="checkbox" formod="${mdl.getVersionlessMavenIdentifier()}" ${val ? 'checked' : ''}>
                            <span class="switch-slider"></span>
                        </label>
                    </div>
                    ${mdl.subModules.length > 0 ? `<div class="base-mod">
                        ${Object.values(parseModulesForUI(mdl.subModules, true, conf.mods)).join('')}
                    </div>` : ''}
                </div>`

            }
        }
    }

    return {
        reqMods,
        optMods
    }

}

/**
 * Bind functionality to mod config toggle switches. Switching the value
 * will also switch the status color on the left of the mod UI.
 */
function bindModsToggleSwitch(){
    const sEls = document.querySelectorAll('[formod]')
    Array.from(sEls).map((v, index, arr) => {
        v.onchange = () => {
            if(v.checked) {
                document.getElementById(v.getAttribute('formod')).setAttribute('enabled', '')
				document.getElementById(v.getAttribute('formod')).querySelector('.status').classList.add('active')
            } else {
                document.getElementById(v.getAttribute('formod')).removeAttribute('enabled')
				document.getElementById(v.getAttribute('formod')).querySelector('.status').classList.remove('active')
            }
        }
    })
}


/**
 * Save the mod configuration based on the UI values.
 */
function saveModConfiguration(){
    const serv = ConfigManager.getSelectedServer()
    const modConf = ConfigManager.getModConfiguration(serv)
    modConf.mods = _saveModConfiguration(modConf.mods)
    ConfigManager.setModConfiguration(serv, modConf)
}

/**
 * Recursively save mod config with submods.
 * 
 * @param {Object} modConf Mod config object to save.
 */
function _saveModConfiguration(modConf){
    for(let m of Object.entries(modConf)){
        const tSwitch = document.querySelectorAll(`[formod='${m[0]}']`)
        if(!tSwitch[0].hasAttribute('dropin')){
            if(typeof m[1] === 'boolean'){
                modConf[m[0]] = tSwitch[0].checked
            } else {
                if(m[1] != null){
                    if(tSwitch.length > 0){
                        modConf[m[0]].value = tSwitch[0].checked
                    }
                    modConf[m[0]].mods = _saveModConfiguration(modConf[m[0]].mods)
                }
            }
        }
    }
    return modConf
}

/**
 * Save mod configuration for the current selected server.
 */
function saveAllModConfigurations() {
    saveModConfiguration()
    ConfigManager.save()
}

/**
 * Resolve and update the mods on the UI.
 */
async function resolveModsForUI(){
    const serv = (await DistroAPI.getDistribution()).getServerById(ConfigManager.getSelectedServer())

    const servConf = ConfigManager.getModConfiguration(ConfigManager.getSelectedServer())

    const modStr = parseModulesForUI(serv.modules, false, servConf.mods)

    document.getElementById('listModsReq').innerHTML = modStr.reqMods
    document.getElementById('listModsOpt').innerHTML = modStr.optMods
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
	await resolveModsForUI()
    // await resolveShaderpacksForUI()
    bindModsToggleSwitch()
}

refreshModsPanel()