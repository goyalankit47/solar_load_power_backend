const express = require('express');
const request = require('request');
// const Promise = require('promise');
const moment = require('moment');
const app = express();
const config = require('./database_config');
const db = require('./database_connection');
const url = require('url');
let initialEpoch = null;
let pool = null;

function getInitialTime() {
    return new Promise((resolve, reject) => {
        let query = `SELECT timestamp FROM public.solar_power order by timestamp limit 1`;
        pool.query(query, (err, res) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(moment((res.rows[0].timestamp), 'YYYY-DD-MM HH:mm:ss').unix());
            }
        })
    })

}

function getSolarData() {
    return new Promise((resolve, reject) => {
        let currentTime = moment().unix();
        let requiredTime = (initialEpoch + ((currentTime - initialEpoch) % 86400)) * 1000;
        let requiredDate = moment(requiredTime).format('YYYY-MM-DD HH:mm:ss');

        let query = `SELECT id,value,timestamp FROM public.solar_power where timestamp <= '${requiredDate}'`;
        pool.query(query, (err, res) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            else {
                resolve(res.rows);
            }
        })
    })
}

function getLoadData() {
    return new Promise((resolve, reject) => {
        let currentTime = moment().unix();
        let requiredTime = (initialEpoch + ((currentTime - initialEpoch) % 86400)) * 1000;
        let requiredDate = moment(requiredTime).format('YYYY-MM-DD HH:mm:ss');

        let query = `SELECT id,value,timestamp FROM public.load_power where timestamp <= '${requiredDate}'`;
        pool.query(query, (err, res) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            else {
                resolve(res.rows);
            }
        })
    })
}

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.get('/v1/graph/1', (req, res) => {
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    if (query.period == 'hour') {
        res.end();
    } else {
        Promise.all([
            getSolarData(),
            getLoadData(),
        ])
            .then((data) => {
                res.json({ "graph_value": [{ "values": data[1] }, { "values": data[0] }] });
            })
            .catch((err) => {
                console.log(err);
            })
    }
});

app.get('/v1/boxVal/1', (req, res) => {
    request(
        { url: ' http://13.234.38.186/v1/boxVal/1' },
        (error, response, body) => {
            if (error || response.statusCode !== 200) {
                return res.json({ type: 'error', message: error.message });
            }
            res.json(JSON.parse(body));
        }
    )
});

db.conn_db('pg', config, (cb) => {
    pool = cb;
    getInitialTime()
        .then((res) => {
            initialEpoch = res;
            const PORT = process.env.PORT || 3000;
            app.listen(PORT, () => console.log(`listening on ${PORT}`));
        })
        .catch((error) => { console.log(error); })
})