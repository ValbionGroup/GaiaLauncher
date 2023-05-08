const { DistributionAPI } = require('helios-core/common')

const ConfigManager = require('./configmanager')
const logger        = require('./loggerutil')('%c[DistroManager]', 'color: #a02d2a; font-weight: bold')

exports.REMOTE_DISTRO_URL = 'https://update.valbion.com/launcher/distribution.json'

const api = new DistributionAPI(
    ConfigManager.getLauncherDirectory(),
    null, // Injected forcefully by the preloader.
    null, // Injected forcefully by the preloader.
    exports.REMOTE_DISTRO_URL,
    false
)

exports.DistroAPI = api