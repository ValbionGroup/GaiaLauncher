/**
 * Binds the functionality within the server codes section of the launcher settings
 */
/** function bindServerCodeButtons(){
    // Sets up the onclick listeners for the button to add codes
    document.getElementById('settingsAddServerCode').onclick = () => {
        for(let ele of document.getElementsByClassName('settingsInputServerCodeVal')){
            const code = ele.value
            ele.value = ''
            if(!ConfigManager.getServerCodes().includes(code) && code){
                ConfigManager.getServerCodes().push(code)
                ConfigManager.save()
                prepareLauncherTab()
            } else {
                console.warn('Server code already exists or is empty!')
            }
        }
    }

    // Sets up the onclick listeners for each remove code buttons
    const sEls = document.querySelectorAll('[remcode]')
    Array.from(sEls).map((v, index, arr) => {
        v.onclick = () => {
            if(v.hasAttribute('remcode')){
                const code = v.getAttribute('remcode')
                if(ConfigManager.getServerCodes().includes(code)){
                    ConfigManager.getServerCodes().splice(ConfigManager.getServerCodes().indexOf(code), 1)
                    ConfigManager.save()
                    prepareLauncherTab()
                }
            }
        }
    })
} */

/**
 * Prepare the launcher tab for display.
 */
/** async function prepareLauncherTab() {
    await resolveServerCodesForUI()
    bindServerCodeButtons()
} */