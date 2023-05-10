const { DistributionAPI } = require('gaialauncher-core/common')

const ConfigManager = require('./configmanager')

// exports.REMOTE_DISTRO_URL = 'https://update.valbion.com/launcher/distribution.json'
exports.REMOTE_DISTRO_URL = 'https://helios-files.geekcorner.eu.org/distribution.json'

const api = new DistributionAPI(
    ConfigManager.getLauncherDirectory(),
    null, // Injected forcefully by the preloader.
    null, // Injected forcefully by the preloader.
    exports.REMOTE_DISTRO_URL,
    false
)

exports.DistroAPI = api