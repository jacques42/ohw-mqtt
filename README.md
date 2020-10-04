# ohm-mqtt

Continuously reads Open Hardware Monitor measurements from build in web-server JSON export and publishes to MQTT broker

I wanted to read measurements including temperature. Turns out that many of the tools I found sending data to MQTT were not able to also send temperature information. Since this and more information is easily accessible through Open Hardware Monitor, I decided to pull together this small script to do the transfer.

The main intent of this script is to make data available via MQTT and in un-nested JSON format, best suited to be processed with the wonderful [mqttwarn](https://github.com/jpmens/mqttwarn) (https://github.com/jpmens/mqttwarn)

## Installation

1. Install Open Hardware Monitor from https://openhardwaremonitor.org/
2. Recommended setup for Open Hardware Monitor
   * Start Minimized
   * Minimize to Tray
   * Run On Windows Startup
   * Remote Web Server -> Run

        ![Settings](.github/ohmsetup.png)


3. Install Node.js from https://nodejs.org/ , including NPM packet manager
4. Install Git from https://git-scm.com/ 

4. Use command-line to clone this repository to local machine folder and install dependencies
    ```
    git clone https://github.com/jacques42/ohw-mqtt ohm-mqtt
    cd ohm-mqtt
    npm install
    ```
    
## Usage

Command line options
```
  -h, --help               Display this usage guide.

  --jsonurl string         HTTP only URL to read the JSON data file from. Defaults to
                           http://127.0.0.1:8085/data.json

  --mqttBroker string      MQTT broker URL. Defaults to mqtt://127.0.0.1:1883

  --mqttUsername string    Specify MQTT username to enable authentication
  --mqttPassword string    Specify MQTT Password for authentication. Defaults to an empty string
  --mqttTopic string       Specify MQTT topic to publish on. Hostname will be appended. Defaults to
                           <hosts>

  -r, --raw                Send raw JSON data to MQTT. Any filter settings will be ignored.

  -f, --frequency number   Frequency to publish to MQTT in [s]. Default is 2

  --filterID string        List of comma-separated IDs to filter. First list item value defines whether
                           list elements are allowed (value = 1) or denied (value = 0). Example:
                           "0,80,82" denies measurement IDs 80 and 82
  --filterList string      List of comma-separated strings to filter. First list item value defines
                           whether list elements are allowed (value = allow) or denied (value = deny).
                           Example: "allow,Temperature, Mainboard" allows measurements to be published
                           where any node text in a given branch matches one of those strings

  -c, --cleanValues        Clean measurement values from all non-numeric characters
```

## Install as a Windows Service

Installing as a Windows Service ensures the script starts at system start. To install / uninstall use the script `ohm-mqtt-service.js`.

Known bug: if passing command line options through the command line (`--option`), the first option must not start with `--`. To work around this use such as `-c`or `-f` as first option in the list

### Service installer script
```
ohm-mqtt-service

  Install ohm-mqtt as a Windows Service, for start-up at boot time

Options

  -h, --help         Display this usage guide.
  -i, --install      Install ohm-mqtt as Windows Service
  -u, --uninstall    Uninstall ohm-mqtt Windows Service

  --options string   Commandline options to pass to script
                     Known bug: first parameter can not start with '--'. To work around use '-c'
                     or '-f' as first parameter
```

### Example
```
node ohm-mqtt-service.js -i --options '-c --jsonurl http://10.0.0.10:8085/data.json \
                                          --mqttBroker mqtt://10.0.0.11:1883 \
                                          --mqttUsername username \
                                          --mqttPassword password'
```

## Todo
* Read sensor data from WMI (Windows Management Instrumentation) instead of JSON. 