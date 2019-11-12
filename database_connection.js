var conn = function conn_db(db_name, dbConfig, call_back) {

    if (db_name == 'pg') {
        var { Pool } = require('pg');
    }

    const pool = new Pool({
        user: dbConfig.user,
        host: dbConfig.host,
        database: dbConfig.name,
        password: dbConfig.password,
        port: dbConfig.port,
    });


    pool.connect((err) => {
        if (err) {
            console.log(err);
        } else {
            console.log("Database connection established");
            return call_back(pool);
        }
    });
}

module.exports.conn_db = conn;