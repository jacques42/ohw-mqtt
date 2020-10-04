/* eslint-env node */

/*
 ** Command Line Options
 */

const opsParameter = {
  jsonurl: 'http://127.0.0.1:8085/data.json',
  mqttBroker: 'mqtt://127.0.0.1:1883',
  mqttAuth: false,
  mqttUsername: '',
  mqttPassword: '',
  mqttTopic: 'hosts',
  sendRawData: false,
  sendFrequency: 2
}

const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')
const validator = require('validator')

const cliDefinition = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Display this usage guide.'
  },
  {
    name: 'jsonurl',
    type: String,
    description:
            'HTTP only URL to read the JSON data file from. Defaults to ' +
            opsParameter.jsonurl
  },
  {
    name: 'mqttBroker',
    type: String,
    description: 'MQTT broker URL. Defaults to ' + opsParameter.mqttBroker
  },
  {
    name: 'mqttUsername',
    type: String,
    description: 'Specify MQTT username to enable authentication'
  },
  {
    name: 'mqttPassword',
    type: String,
    description:
            'Specify MQTT Password for authentication. Defaults to an empty string'
  },
  {
    name: 'mqttTopic',
    type: String,
    description:
            'Specify MQTT topic to publish on. Hostname will be appended. Defaults to <' +
            opsParameter.mqttTopic +
            '>'
  },
  {
    name: 'raw',
    alias: 'r',
    type: Boolean,
    description:
            'Send raw JSON data to MQTT. Any filter settings will be ignored.'
  },
  {
    name: 'frequency',
    alias: 'f',
    type: Number,
    description:
            'Frequency to publish to MQTT in [s]. Default is ' +
            opsParameter.sendFrequency
  },
  {
    name: 'filterID',
    type: String,
    description:
            'List of comma-separated IDs to filter. First list item value defines whether list elements are allowed (value = 1) or denied (value = 0). Example: "0,80,82" denies measurement IDs 80 and 82'
  },
  {
    name: 'filterList',
    type: String,
    description:
            'List of comma-separated strings to filter. First list item value defines whether list elements are allowed (value = allow) or denied (value = deny). Example: "allow,Temperature, Mainboard" allows measurements to be published where any node text in a given branch matches one of those strings'
  },
  {
    name: 'cleanValues',
    alias: 'c',
    type: Boolean,
    description: 'Clean measurement values from all non-numeric characters'
  }
]

const cliParameter = commandLineArgs(cliDefinition)

if (cliParameter.help) {
  const usage = commandLineUsage([
    {
      header: 'ohm-mqtt',
      content:
                "A simple tool to read Open Hardware Monitor JSON data from it's webserver and publish to a MQTT server"
    },
    {
      header: 'Options',
      optionList: cliDefinition
    },
    {
      content:
                'Project home: {underline https://github.com/jacques42/ohm-mqtt}'
    }
  ])
  console.log(usage)

  process.exit()
}

if (cliParameter.jsonurl) {
  if (
    !validator.isURL(cliParameter.jsonurl, {
      protocols: ['http'],
      require_protocol: true,
      require_tld: false
    })
  ) {
    throw new Error('Not a valid URL: <' + cliParameter.jsonurl + '>')
  } else {
    opsParameter.jsonurl = cliParameter.jsonurl
  }
}

if (cliParameter.mqttBroker) {
  if (
    !validator.isURL(cliParameter.mqttBroker, {
      protocols: ['mqtt', 'tcp', 'tls', 'mqtts'],
      require_protocol: true,
      require_tld: false
    })
  ) {
    throw new Error(
      'Not a valid MQTT URL: <' + cliParameter.mqttBroker + '>'
    )
  } else {
    opsParameter.mqttBroker = cliParameter.mqttBroker
  }
}

if (typeof cliParameter.mqttUsername !== 'undefined') {
  if (cliParameter.mqttUsername === null) {
    throw new Error('No MQTT username provided')
  }

  if (
    typeof cliParameter.mqttPassword === 'undefined' ||
        cliParameter.mqttPassword === null
  ) {
    throw new Error('No MQTT password provided')
  }

  validator.trim(cliParameter.mqttUsername)
  validator.trim(cliParameter.mqttPassword)

  if (
    cliParameter.mqttUsername.length > 128 ||
        !validator.isAlphanumeric(cliParameter.mqttUsername)
  ) {
    throw new Error(
      'Not a valid mqttUsername - max. 128 alpha-numeric characters'
    )
  } else {
    opsParameter.mqttUsername = cliParameter.mqttUsername
    opsParameter.mqttAuth = true
  }

  if (
    cliParameter.mqttPassword.length > 128 ||
        !validator.isAlphanumeric(cliParameter.mqttPassword)
  ) {
    throw new Error(
      'Not a valid mqttPassword - max. 128 alpha-numeric characters'
    )
  } else {
    opsParameter.mqttPassword = cliParameter.mqttPassword
  }
}

if (typeof cliParameter.mqttTopic !== 'undefined') {
  if (
    cliParameter.mqttTopic === null ||
        cliParameter.mqttTopic.length > 128
  ) {
    throw new Error('Not a valid mqttTopic - max. 128 characters')
  } else {
    validator.trim(cliParameter.mqttTopic)
    opsParameter.mqttTopic = cliParameter.mqttTopic.toLowerCase()
  }
}

if (cliParameter.raw) {
  opsParameter.sendRawData = true
}

if (cliParameter.frequency) {
  if (
    !Number.isNaN(cliParameter.frequency) &&
        cliParameter.frequency >= 1 &&
        cliParameter.frequency <= 600
  ) {
    opsParameter.sendFrequency = cliParameter.frequency
  } else {
    throw new Error('Frequency out of limits, must be 1-600 seconds')
  }
}

if (cliParameter.frequency) {
  if (
    !Number.isNaN(cliParameter.frequency) &&
        cliParameter.frequency >= 1 &&
        cliParameter.frequency <= 600
  ) {
    opsParameter.sendFrequency = cliParameter.frequency
  } else {
    throw new Error('Frequency out of limits, must be 1-600 seconds')
  }
}

if (
  typeof cliParameter.filterID !== 'undefined' &&
    typeof cliParameter.filterList !== 'undefined'
) {
  throw new Error(
    'Parameter filterID and filterList can not be used together'
  )
}

if (typeof cliParameter.filterID !== 'undefined' && cliParameter.filterID) {
  var filters = cliParameter.filterID.split(',').map(Number)

  switch (filters[0]) {
    case 0:
      opsParameter.filterMode = false
      break
    case 1:
      opsParameter.filterMode = true
      break
    default:
      throw new Error(
        'ID filter first parameter must be 0 (deny) or 1 (allow)'
      )
  }

  filters = filters.filter(function (value) {
    return !Number.isNaN(value)
  })

  filters.shift()

  if (!filters.length) {
    throw new Error('ID filter need at least one valid filter parameter')
  }

  opsParameter.filterPattern = filters
  opsParameter.filterType = 'id'
}

if (typeof cliParameter.filterList !== 'undefined' && cliParameter.filterList) {
  filters = cliParameter.filterList.split(',')

  switch (filters[0]) {
    case 'deny':
      opsParameter.filterMode = false
      break
    case 'allow':
      opsParameter.filterMode = true
      break
    default:
      throw new Error(
        'List filter first parameter must be "deny" or "allow"'
      )
  }

  filters.shift()

  filters = filters.filter(function (value) {
    return validator.isAlphanumeric(value)
  })

  if (!filters.length) {
    throw new Error('List filter need at least one valid filter parameter')
  }

  opsParameter.filterPattern = filters
  opsParameter.filterType = 'text'
}

if (typeof cliParameter.cleanValues !== 'undefined') {
  opsParameter.cleanValues = cliParameter.cleanValues
}

module.exports.jsonurl = opsParameter.jsonurl
module.exports.mqttBroker = opsParameter.mqttBroker
module.exports.mqttAuth = opsParameter.mqttAuth
module.exports.mqttUsername = opsParameter.mqttUsername
module.exports.mqttPassword = opsParameter.mqttPassword
module.exports.mqttTopic = opsParameter.mqttTopic
module.exports.sendRawData = opsParameter.sendRawData
module.exports.sendFrequency = opsParameter.sendFrequency
module.exports.filterMode = opsParameter.filterMode
module.exports.filterPattern = opsParameter.filterPattern
module.exports.filterType = opsParameter.filterType
module.exports.cleanValues = opsParameter.cleanValues
