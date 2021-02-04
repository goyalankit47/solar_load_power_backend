const express = require('express');
const request = require('request');
const moment = require('moment-timezone');
const app = express();
const path = require('path');
const knex = require('./knex/knex.js');
const url = require('url');
let initialEpoch = null;
let pool = null;

function getInitialTime() {
    return new Promise((resolve, reject) => {
        knex('solar_power').orderBy('timestamp').limit(1).then((res) => {
            resolve(moment((res[0].timestamp), 'YYYY-DD-MM HH:mm:ss').tz("Asia/Kolkata").unix());
        })
            .catch((err) => {
                reject(err)
            })
    })
}

function getSolarData() {
    return new Promise((resolve, reject) => {
        let currentTime = moment().tz("Asia/Kolkata").unix();
        let requiredTime = (initialEpoch + ((currentTime - initialEpoch) % 86400)) * 1000;
        let requiredDate = moment(requiredTime).tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');

        knex('solar_power').where('timestamp', '<=', requiredDate).then((res) => {
            resolve(res);
        })
            .catch((err) => {
                reject(err)
                console.log("not able to get solar data");
            })
    })
}

function getLoadData() {
    return new Promise((resolve, reject) => {
        let currentTime = moment().tz("Asia/Kolkata").unix();
        let requiredTime = (initialEpoch + ((currentTime - initialEpoch) % 86400)) * 1000;
        let requiredDate = moment(requiredTime).tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');

        knex('load_power').where('timestamp', '<=', requiredDate).then((res) => {
            resolve(res);
        })
            .catch((err) => {
                reject(err)
                console.log("not able to load data");
            })
    })
}

function calculateAvgHourData(data) {
    let lastHour = moment().tz("Asia/Kolkata").format('H');
    let resultedData = []
    for (let i = 0; i < data.length; i++) {
        let startHour = -1;
        let sum = 0;
        let count = 0;
        let resultedArray = [];
        for (let j = 0; j < data[i].length; j++) {
            let curHour = parseInt(moment(data[i][j].timestamp).tz("Asia/Kolkata").format('H'));
            if (curHour == lastHour) break;
            if (curHour != startHour) {
                sum += data[i][j].value;
                count += 1;
                obj = {}
                obj.timestamp = data[i][j].timestamp;
                obj.value = (sum / count);
                resultedArray.push(obj);

                sum = 0;
                count = 0;
                startHour = curHour;
            }
            sum += data[i][j].value
            count += 1;
        }
        resultedData.push(resultedArray);
    }

    return resultedData;
}

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.use(express.static('dist/app'))

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/dist/app/index.html'));
});

app.get('/v1/graph/1', (req, res) => {
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    Promise.all([
        getSolarData(),
        getLoadData(),
    ])
        .then((data) => {
            if (query.period == 'hour') {
                data = calculateAvgHourData(data);
            }
            res.json({ "graph_value": [{ "values": data[1] }, { "values": data[0] }] });
        })
        .catch((err) => {
            console.log(err);
        })
});

app.get('/v1/boxVal/1', (req, res) => {
    request(
        { url: ' http://13.234.38.186/v1/boxVal/1' },
        (error, response, body) => {
            if (error || response.statusCode !== 200) {
                console.log("here");
                return res.json({ type: 'error', message: error.message });
            }
            res.json(JSON.parse(body));
        }
    )
});

getInitialTime()
    .then((res) => {
        initialEpoch = res;
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`listening on ${PORT}`));
    })
    .catch((error) => { console.log(error); })
