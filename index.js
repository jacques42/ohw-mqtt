/* eslint-env node */

/*
 ** Install Error Handler
 */

process.on('uncaughtException', handleError)

function handleError (error) {
  if (error.response) {
    // The request was made and the server responded with a status code out of range of 2xx
    handleError(new Error('URL GET response: <' + error.response.status + '>'))
  } else if (error.request) {
    switch (error.errno) {
      case 'ENOTFOUND':
        handleError(new Error('Unable to resolve / reach hostname <' + error.hostname + '>'))
        break
      case 'ECONNREFUSED':
        handleError(new Error('Connection refused by server <' + error.address + '>'))
        break
      default:
        handleError(new Error('No URL GET response received <' + error.toJSON() + '>'))
    }
  } else {
    console.error(error.toString())
  }

  process.exit(1) // mandatory (as per the Node.js docs)
}

/*
** Defaults + Commandline
*/

const config = require('./cli.js')

/*
** Establish MQTT Server Connection
*/
const os = require('os')
const mqttLib = require('mqtt')

config.mqttTopic = config.mqttTopic.toLowerCase() + '/' + os.hostname().toLowerCase()

const mqttClient = mqttLib.connect(config.mqttBroker, { username: config.mqttUsername, password: config.mqttPassword })

mqttClient.on('error', function (err) {
  // increase reconnect timer and exit if expired
  handleError(new Error('MQTT ' + err.toString()))
})

mqttClient.on('close', function (err) {
  // do nothing
  return err
})

mqttClient.on('connect', function () {
  // do nothing
})

/*
** Open URL, Read file, send to MQTT
 */

const httpClient = require('axios')

function loopForever () {
  httpClient.get(config.jsonurl)
    .then(verifyServerResponse)
    .then(transformJSONData)
    .then(filterData)
    .then(publishToMQTT)
    .catch(handleError)

  setTimeout(loopForever, config.sendFrequency * 1000)
}
loopForever()

function transformJSONData (data) {
  // no data transformation when raw requested
  if (config.sendRawData) { return data }

  // Transform JSON data - mqttwarn can not process nested structures
  return recursiveParser(data.Children)
}

function recursiveParser (string1, string2 = [], var1 = 0, array1 = []) {
  const object = string1
  // WHY ???
  const branch = JSON.parse(JSON.stringify(string2))
  const level = var1
  let dataArray = array1
  const re = config.cleanValues ? new RegExp('[^0-9,]', 'g') : ''
  const re2 = config.cleanValues ? new RegExp(',', 'g') : ''

  // Recursion clause
  for (var property in object) {
    // recursion if property is object (=> branch in JSON data set)
    if (typeof object[property] === 'object') {
      if (typeof object.Text !== 'undefined') {
        branch.push(object.Text)
        dataArray = recursiveParser(object[property], branch, level + 1, dataArray)
        branch.pop()
      } else {
        dataArray = recursiveParser(object[property], branch, level + 1, dataArray)
      }
    }
  }

  // Exit clause - value field set means measurement found ( => tree leaf node)
  if (typeof object.Value !== 'undefined' && object.Value.length > 0) {
    const jsonString = '{"Value":"' + object.Value.replace(re, '').replace(re2, '.') + '",' +
                            '"Max":"' + object.Max.replace(re, '').replace(re2, '.') + '",' +
                            '"Min":"' + object.Min.replace(re, '').replace(re2, '.') + '"}'

    branch.push(object.Text)
    branch.push(jsonString)
    dataArray.push(branch)
  }

  // catch all return
  return dataArray
}

function filterData (data) {
  // no filter applied for raw data to be sent
  if (typeof config.filterMode === 'undefined') {
    return data
  }

  // filter by ID or Text value - filterMode defines ALLOW or DENY approach when match is found
  return data.filter(element => {
    switch (config.filterType) {
      case 'id':
        if (config.filterPattern.indexOf(element[0]) !== -1) {
          return config.filterMode
        }
        break
      case 'text':
        if (config.filterPattern.filter(pattern => {
          return (element.indexOf(pattern) !== -1)
        }).length > 0) {
          return config.filterMode
        }
        break
      default:
        break
    }

    return !config.filterMode
  })
}

function publishToMQTT (data) {
  // console.log ("###########################################################################################")

  // no data transformation when raw requested
  if (config.sendRawData) {
    mqttClient.publish(config.mqttTopic, JSON.stringify(data))
  } else {
    // Publish by topic
    data.forEach(element => {
      var mqttData = element.pop()
      var mqttTopic = config.mqttTopic + '/' + element.join('/').replace(/[#+]/g, '').replace(/\s/g, '-')
      //        console.log(mqttTopic + " -> " + mqttData)

      mqttClient.publish(mqttTopic, mqttData)
    })
  }
}

function verifyServerResponse (obj) {
  if (obj.headers['content-type'] !== 'application/json') { handleError(new Error('Data from Webserver URL is not in JSON format (content type <' + obj.headers['content-type'] + '>)')) }

  return obj.data
}
