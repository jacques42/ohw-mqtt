/* eslint-env node */

const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')
const filename = require('path').join(__dirname, '\\', 'index.js')
const serviceName = 'ohm-mqtt'

const cliDefinition = [
  { name: 'help', alias: 'h', type: Boolean, description: 'Display this usage guide.' },
  { name: 'install', alias: 'i', type: Boolean, description: 'Install ohm-mqtt as Windows Service' },
  { name: 'uninstall', alias: 'u', type: Boolean, description: 'Uninstall ohm-mqtt Windows Service' },
  { name: 'options', type: String, description: 'Commandline options to pass to script\nKnown bug: first option can not start with \'--\'. To work around use \'-c\' or \'-f\' as first parameter' }
]

const cliParameter = commandLineArgs(cliDefinition)

if (cliParameter.help) {
  showHelp()
}

if (cliParameter.install && cliParameter.uninstall) {
  throw new Error('Conflicting parameter specified')
} else if (cliParameter.install) {
  cliParameter.parameter = cliParameter.options || ''
  installService()
} else if (cliParameter.uninstall) {
  uninstallService()
} else {
  showHelp()
}

function installService () {
  var Service = require('node-windows').Service

  // Create a new service object
  var svc = new Service({
    name: serviceName,
    description: 'Reads Open Hardware Monitor measurements from JSON export and publishes to MQTT broker',
    script: filename,
    scriptOptions: cliParameter.options,
    env: {
      name: 'NODE_ENV',
      value: 'production'
    }
  })

  // Listen for the "install" event, which indicates the
  // process is available as a service.
  svc.on('install', function () {
    svc.start()
  })

  // Just in case this file is run twice.
  svc.on('alreadyinstalled', function () {
    console.log('This service is already installed.')
  })

  // Listen for the "start" event and let us know when the
  // process has actually started working.
  svc.on('start', function () {
    console.log(svc.name + 'has been installed and is running')
  })

  // Install the script as a service.
  svc.install()
}

function uninstallService () {
  var Service = require('node-windows').Service

  // Create a new service object
  var svc = new Service({
    name: serviceName,
    script: filename
  })

  // Listen for the "uninstall" event so we know when it's done.
  svc.on('uninstall', function () {
    console.log('Service uninstall complete.')
    console.log('The service exists: ', svc.exists)
  })

  // Uninstall the service.
  svc.uninstall()
}

function showHelp () {
  const usage = commandLineUsage([
    {
      header: 'ohm-mqtt-service',
      content: 'Install ohm-mqtt as a Windows Service, for start-up at boot time '
    },
    {
      header: 'Options',
      optionList: cliDefinition
    },
    {
      content: 'Project home: {underline https://github.com/jacques42/ohm-mqtt}'
    }
  ])
  console.log(usage)

  process.exit()
}
